import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import type { Usuario } from "@prisma/client";

export { hashPassword, verifyPassword } from "@/lib/password";

const NOMBRE_COOKIE = "sesion";
const DURACION_SESION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días fijos desde el login

function claveFirma() {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto) {
    throw new Error("Falta SESSION_SECRET en las variables de entorno.");
  }
  return new TextEncoder().encode(secreto);
}

// Crea la fila de Sesion en base y la referencia firmada (jose) en una cookie
// httpOnly — borrar la fila (cerrarSesion) invalida la sesión al instante,
// sin necesitar un blocklist aparte para un JWT sin estado.
export async function crearSesion(usuarioId: string) {
  const expiresAt = new Date(Date.now() + DURACION_SESION_MS);
  const sesion = await prisma.sesion.create({
    data: { usuarioId, expiresAt },
  });

  const token = await new SignJWT({ sessionId: sesion.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(claveFirma());

  (await cookies()).set(NOMBRE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

// cache() deduplica esta consulta dentro de un mismo request — el layout y
// cada Server Action pueden llamarla sin pegarle dos veces a la base.
// Solo lectura: nunca crea ni renueva nada; devuelve null ante cualquier
// cookie ausente, inválida, expirada o de un usuario dado de baja.
export const obtenerUsuarioActual = cache(async (): Promise<Usuario | null> => {
  const token = (await cookies()).get(NOMBRE_COOKIE)?.value;
  if (!token) return null;

  let sessionId: string;
  try {
    const { payload } = await jwtVerify(token, claveFirma());
    if (typeof payload.sessionId !== "string") return null;
    sessionId = payload.sessionId;
  } catch {
    return null;
  }

  const sesion = await prisma.sesion.findUnique({
    where: { id: sessionId },
    include: { usuario: true },
  });

  if (!sesion || sesion.expiresAt < new Date() || !sesion.usuario.activo) {
    return null;
  }

  return sesion.usuario;
});

export const requireUsuario = cache(async (): Promise<Usuario> => {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) {
    redirect("/login");
  }
  return usuario;
});

// Como requireUsuario, pero además manda a /cuenta si el usuario todavía
// tiene pendiente definir su propia contraseña (alta reciente o reset de un
// admin) — así no puede navegar a ningún otro lado hasta hacerlo. /cuenta y
// /login NO usan esta función (usan requireUsuario directo): /cuenta tiene
// que seguir siendo alcanzable justamente cuando este flag está prendido.
export const requireUsuarioAlDia = cache(async (): Promise<Usuario> => {
  const usuario = await requireUsuario();
  if (usuario.debeActualizarPassword) {
    redirect("/cuenta");
  }
  return usuario;
});

// Un ADMIN ve todas las empresas — no necesita fila en UsuarioEmpresa (ver
// comentario en schema.prisma). El resto depende de tener una fila real.
export async function puedeAccederEmpresa(usuario: Usuario, empresaId: string) {
  if (usuario.rol === "ADMIN") return true;
  const acceso = await prisma.usuarioEmpresa.findUnique({
    where: { usuarioId_empresaId: { usuarioId: usuario.id, empresaId } },
  });
  return acceso !== null;
}

// Clase propia (en vez de un Error genérico) para que los page.tsx de lectura
// puedan distinguir "sin acceso" de cualquier otro error real y responder
// devolviendo null — el layout es quien ya muestra el panel de "sin acceso";
// ver el comentario en cada page.tsx que atrapa este error puntual.
export class AccesoDenegadoError extends Error {}

// Único punto de autorización para las Server Actions que tocan datos de una
// empresa: redirige a /login si no hay sesión, o tira AccesoDenegadoError si
// la hay pero sin acceso a esa empresa (mismo estilo que ya usan
// resolverPresupuesto/resolverEmpresaYPresupuesto para una empresa
// inexistente). El layout no usa esta función directamente porque necesita
// mostrar un panel en vez de tirar un error — usa requireUsuario +
// puedeAccederEmpresa por separado.
export const requireAccesoEmpresa = cache(async (empresaId: string): Promise<Usuario> => {
  const usuario = await requireUsuario();
  if (!(await puedeAccederEmpresa(usuario, empresaId))) {
    throw new AccesoDenegadoError("No tenés acceso a esta empresa.");
  }
  return usuario;
});

// Hermana de AccesoDenegadoError, para el mismo propósito: los page.tsx de
// lectura bajo /admin/usuarios la atrapan y devuelven null en vez de dejar
// que se vea como un error sin manejar (ver comentario en esos archivos).
export class PermisoDenegadoError extends Error {}

// Único punto de autorización para las Server Actions de /admin/usuarios y
// para el chequeo defensivo en cada page.tsx de lectura bajo esa ruta (Next
// arranca a renderizar la página en paralelo con el layout que la envuelve,
// así que el layout solo decide qué se ve — no evita que la página intente
// leer datos si no repite el chequeo). app/admin/layout.tsx no usa esta
// función para SU PROPIO render: necesita mostrar un panel en vez de tirar
// un error, así que usa requireUsuarioAlDia + el chequeo de rol por separado.
export const requireAdmin = cache(async (): Promise<Usuario> => {
  const usuario = await requireUsuarioAlDia();
  if (usuario.rol !== "ADMIN") {
    throw new PermisoDenegadoError("No tenés permisos de administrador.");
  }
  return usuario;
});

export async function cerrarSesion() {
  const token = (await cookies()).get(NOMBRE_COOKIE)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, claveFirma());
      if (typeof payload.sessionId === "string") {
        await prisma.sesion.delete({ where: { id: payload.sessionId } }).catch(() => {});
      }
    } catch {
      // Cookie inválida o ya expirada: no hay nada que borrar en base.
    }
  }
  (await cookies()).delete(NOMBRE_COOKIE);
}
