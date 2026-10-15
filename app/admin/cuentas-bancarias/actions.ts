"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminOFinanzas } from "@/lib/auth";
import { validarCuenta, type DatosCuenta } from "@/lib/cuentasBancarias";
import { proponerUnidadPorCuenta } from "@/lib/unidadesNegocio";

// Lista de cuentas bancarias por empresa (docs/lector_bancos_plan.md §4.1). Solo ADMIN y
// FINANZAS, en CADA Server Action (se invocan directo desde el cliente). No se borra
// nada: se desactiva y se reactiva. Las reglas viven en lib/cuentasBancarias.ts (puras,
// con test); acá solo se consulta la base y se aplican.

export type CuentaDto = {
  id: string;
  empresaId: string;
  nombre: string;
  banco: string;
  terminacion: string;
  activa: boolean;
};

type ResultadoCuenta =
  | { ok: true; cuenta: CuentaDto; avisos: string[] }
  | { ok: false; error: string; reactivarId?: string };

const SELECCION = { id: true, empresaId: true, nombre: true, banco: true, terminacion: true, activa: true } as const;

// Avisos que no bloquean: el nombre ya existe en OTRA empresa (hay cuentas compartidas
// legítimas) y la cuenta no tiene unidad sugerida en UNIDAD_POR_CUENTA.
async function avisosDeCuenta(nombre: string, empresaId: string): Promise<string[]> {
  const avisos: string[] = [];
  const enOtras = await prisma.cuentaBancaria.findMany({
    where: { nombre, empresaId: { not: empresaId } },
    select: { empresa: { select: { nombre: true } } },
  });
  if (enOtras.length > 0) {
    avisos.push(
      `Esa cuenta también está cargada en ${enOtras.map((c) => c.empresa.nombre).join(", ")}. Puede ser una cuenta compartida.`
    );
  }
  if (proponerUnidadPorCuenta(nombre) === null) {
    avisos.push(`${nombre} no tiene unidad sugerida: los movimientos de esta cuenta entrarán como SIN ASIGNAR.`);
  }
  return avisos;
}

export async function crearCuentaBancaria(empresaId: string, datos: DatosCuenta): Promise<ResultadoCuenta> {
  await requireAdminOFinanzas();

  return prisma.$transaction(async (tx) => {
    // "SELECT 1 FROM": pg_advisory_xact_lock devuelve void, que Prisma no deserializa.
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext('cuentas-bancarias'))`;

    const empresa = await tx.empresa.findUnique({ where: { id: empresaId }, select: { id: true, activo: true } });
    if (!empresa || !empresa.activo) return { ok: false as const, error: "No encontré esa empresa o está inactiva." };

    const existentes = await tx.cuentaBancaria.findMany({
      where: { empresaId },
      select: { id: true, nombre: true, activa: true },
    });
    const r = validarCuenta(datos, existentes);
    if (!r.ok) return r;

    const cuenta = await tx.cuentaBancaria.create({
      data: { empresaId, nombre: r.cuenta.nombre, banco: r.cuenta.banco, terminacion: r.cuenta.terminacion },
      select: SELECCION,
    });
    return { ok: true as const, cuenta, avisos: [] as string[] };
  }).then(async (res) => {
    if (!res.ok) return res;
    revalidatePath("/admin/cuentas-bancarias");
    return { ...res, avisos: await avisosDeCuenta(res.cuenta.nombre, empresaId) };
  });
}

// Cambiar el nombre NO reescribe MovimientoBancario.bancoYCuenta de lo ya cargado (son
// textos guardados): la pantalla lo avisa antes de confirmar.
export async function editarCuentaBancaria(id: string, datos: DatosCuenta): Promise<ResultadoCuenta> {
  await requireAdminOFinanzas();

  const res = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext('cuentas-bancarias'))`;

    const actual = await tx.cuentaBancaria.findUnique({ where: { id }, select: { id: true, empresaId: true } });
    if (!actual) return { ok: false as const, error: "No encontré esa cuenta." };

    const existentes = await tx.cuentaBancaria.findMany({
      where: { empresaId: actual.empresaId },
      select: { id: true, nombre: true, activa: true },
    });
    const r = validarCuenta(datos, existentes, id);
    if (!r.ok) return r;

    const cuenta = await tx.cuentaBancaria.update({
      where: { id },
      data: { nombre: r.cuenta.nombre, banco: r.cuenta.banco, terminacion: r.cuenta.terminacion },
      select: SELECCION,
    });
    return { ok: true as const, cuenta, avisos: [] as string[] };
  });
  if (!res.ok) return res;
  revalidatePath("/admin/cuentas-bancarias");
  return { ...res, avisos: await avisosDeCuenta(res.cuenta.nombre, res.cuenta.empresaId) };
}

// Desactivar / reactivar. No existe acción de borrar.
export async function cambiarEstadoCuentaBancaria(id: string, activa: boolean): Promise<ResultadoCuenta> {
  await requireAdminOFinanzas();
  const existe = await prisma.cuentaBancaria.findUnique({ where: { id }, select: { id: true } });
  if (!existe) return { ok: false, error: "No encontré esa cuenta." };
  const cuenta = await prisma.cuentaBancaria.update({ where: { id }, data: { activa }, select: SELECCION });
  revalidatePath("/admin/cuentas-bancarias");
  return { ok: true, cuenta, avisos: [] };
}
