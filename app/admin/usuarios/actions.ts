"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { generarPasswordTemporal } from "@/lib/password";
import type { Rol } from "@prisma/client";

const ROLES_VALIDOS: Rol[] = ["ADMIN", "GERENTE", "FINANZAS"];
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type DatosUsuario = {
  nombre: string;
  email: string;
  rol: string;
  empresaIds: string[];
};

// Comunes a alta y edición. No valida unicidad de email acá (depende de si
// hay que excluir al propio usuario) — eso lo hace cada action llamante.
function validarCampos(datos: DatosUsuario) {
  const errores: Record<string, string> = {};
  if (!datos.nombre.trim()) errores.nombre = "Completá el nombre.";
  if (!datos.email.trim() || !EMAIL_VALIDO.test(datos.email.trim())) {
    errores.email = "Ingresá un email válido.";
  }
  if (!ROLES_VALIDOS.includes(datos.rol as Rol)) {
    errores.rol = "Elegí un rol válido.";
  }
  return errores;
}

function leerDatos(formData: FormData): DatosUsuario {
  return {
    nombre: String(formData.get("nombre") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    rol: String(formData.get("rol") ?? ""),
    empresaIds: formData.getAll("empresaIds").map(String),
  };
}

// Sin empresas asignadas para un rol no-ADMIN: se permite guardar igual,
// solo se avisa (el resto del sistema ya tolera ese estado sin romperse —
// la landing "Mis empresas" ya maneja 0 empresas con un mensaje vacío).
function advertenciaSinEmpresas(datos: DatosUsuario) {
  return datos.rol !== "ADMIN" && datos.empresaIds.length === 0
    ? "Este usuario no va a poder ver ninguna empresa hasta que le asignes al menos una."
    : undefined;
}

export type ResultadoCrear =
  | { ok: true; passwordTemporal: string; advertencia?: string }
  | { ok: false; errores: Record<string, string> };

export async function crearUsuario(
  _estadoPrevio: ResultadoCrear | null,
  formData: FormData
): Promise<ResultadoCrear> {
  await requireAdmin();
  const datos = leerDatos(formData);

  const errores = validarCampos(datos);
  if (Object.keys(errores).length === 0) {
    const existe = await prisma.usuario.findUnique({ where: { email: datos.email } });
    if (existe) errores.email = "Ya existe un usuario con ese email.";
  }
  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  const passwordTemporal = generarPasswordTemporal();
  const passwordHash = await hashPassword(passwordTemporal);

  await prisma.usuario.create({
    data: {
      nombre: datos.nombre,
      email: datos.email,
      rol: datos.rol as Rol,
      passwordHash,
      debeActualizarPassword: true,
      empresas:
        datos.rol === "ADMIN"
          ? undefined
          : { create: datos.empresaIds.map((empresaId) => ({ empresaId })) },
    },
  });

  revalidatePath("/admin/usuarios");
  return { ok: true, passwordTemporal, advertencia: advertenciaSinEmpresas(datos) };
}

export type ResultadoActualizar =
  | { ok: true; advertencia?: string }
  | { ok: false; errores: Record<string, string> };

export async function actualizarUsuario(
  id: string,
  _estadoPrevio: ResultadoActualizar | null,
  formData: FormData
): Promise<ResultadoActualizar> {
  const admin = await requireAdmin();
  const datos = leerDatos(formData);
  const activo = formData.get("activo") === "on";

  const errores = validarCampos(datos);
  if (Object.keys(errores).length === 0) {
    const existe = await prisma.usuario.findFirst({
      where: { email: datos.email, NOT: { id } },
    });
    if (existe) errores.email = "Ya existe un usuario con ese email.";
  }
  // No se puede quitar el propio rol de ADMIN: si el único admin se
  // degradara a sí mismo, nadie podría volver a entrar a esta pantalla.
  if (id === admin.id && datos.rol !== "ADMIN") {
    errores.rol = "No podés quitarte tu propio rol de administrador.";
  }
  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  await prisma.$transaction([
    prisma.usuario.update({
      where: { id },
      data: { nombre: datos.nombre, email: datos.email, rol: datos.rol as Rol, activo },
    }),
    prisma.usuarioEmpresa.deleteMany({ where: { usuarioId: id } }),
    ...(datos.rol === "ADMIN"
      ? []
      : [
          prisma.usuarioEmpresa.createMany({
            data: datos.empresaIds.map((empresaId) => ({ usuarioId: id, empresaId })),
          }),
        ]),
  ]);

  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${id}`);
  return { ok: true, advertencia: advertenciaSinEmpresas(datos) };
}

export type ResultadoReset = { ok: true; passwordTemporal: string } | { ok: false; error: string };

// Restablece la contraseña de OTRO usuario (no la propia — eso es
// cambiarPassword en app/cuenta/actions.ts) y fuerza el cierre de todas sus
// sesiones activas: tiene sentido si se está restableciendo la contraseña
// porque la perdió, o por sospecha de acceso indebido.
export async function restablecerPassword(id: string): Promise<ResultadoReset> {
  await requireAdmin();

  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) {
    return { ok: false, error: "No encontré ese usuario." };
  }

  const passwordTemporal = generarPasswordTemporal();
  const passwordHash = await hashPassword(passwordTemporal);

  await prisma.$transaction([
    prisma.usuario.update({
      where: { id },
      data: { passwordHash, debeActualizarPassword: true },
    }),
    prisma.sesion.deleteMany({ where: { usuarioId: id } }),
  ]);

  revalidatePath(`/admin/usuarios/${id}`);
  return { ok: true, passwordTemporal };
}
