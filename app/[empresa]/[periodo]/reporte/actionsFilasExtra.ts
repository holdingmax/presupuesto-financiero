"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminOFinanzas, requireAccesoEmpresa, esAdminOFinanzas } from "@/lib/auth";
import { resolverEmpresaPorSlug } from "@/lib/slug";
import { periodoActual } from "@/lib/reporte/bloqueo";
import { plantillaDeEmpresa } from "@/lib/reporte/plantillas";
import { semanasDelPeriodo } from "@/lib/reporte/valoresManuales";
import { claveDeFilaExtra } from "@/lib/reporte/filasExtra";
import { decidirBorradoFilaExtra, validarCreacionFilaExtra } from "@/lib/reporte/accionesFilasExtra";

export type ResultadoCrearFila = { ok: true; id: string; nombre: string } | { ok: false; error: string };
export type ResultadoBorrarFila = { ok: true } | { ok: false; error: string };

const FORMATO_PERIODO = /^\d{4}-\d{2}$/;

// Agrega UNA fila extra al Reporte de la empresa (la ve desde `periodo` en adelante). Solo ADMIN y FINANZAS con
// acceso a la empresa. Todas las reglas (interruptor, bloque, nombre, mes no bloqueado) están en
// lib/reporte/accionesFilasExtra.ts y se aplican acá, en el servidor: la pantalla no decide nada.
export async function crearFilaExtra(
  empresaSlug: string,
  periodo: string,
  bloque: string,
  nombre: string
): Promise<ResultadoCrearFila> {
  // Rechaza al gerente antes de mirar nada más.
  const usuario = await requireAdminOFinanzas();
  if (!FORMATO_PERIODO.test(periodo)) return { ok: false, error: "Período inválido." };
  const empresa = await resolverEmpresaPorSlug(empresaSlug);
  if (!empresa) return { ok: false, error: "No encontré esa empresa." };
  await requireAccesoEmpresa(empresa.id);
  const plantilla = plantillaDeEmpresa(empresaSlug);
  if (!plantilla) return { ok: false, error: "Esta empresa no tiene reporte por plantilla." };

  const [extras, semanas] = await Promise.all([
    prisma.filaExtraReporte.findMany({ where: { empresaId: empresa.id }, select: { nombre: true } }),
    semanasDelPeriodo([periodo]),
  ]);
  const v = validarCreacionFilaExtra({
    empresaSlug,
    plantilla,
    esAdminOFinanzas: esAdminOFinanzas(usuario),
    bloque,
    nombre,
    extras,
    periodo,
    actual: periodoActual(),
    semanas: semanas.get(periodo) ?? { abiertas: 0, cerradas: 0 },
  });
  if (!v.ok) return v;

  try {
    const fila = await prisma.filaExtraReporte.create({
      data: {
        empresaId: empresa.id,
        bloque: v.bloque,
        nombre: v.nombre,
        nombreClave: v.nombreClave,
        desdePeriodo: periodo,
        creadoPorId: usuario.id,
      },
      select: { id: true, nombre: true },
    });
    revalidatePath(`/${empresaSlug}/${periodo}/reporte`);
    return { ok: true, id: fila.id, nombre: fila.nombre };
  } catch (error) {
    // Dos personas con el mismo nombre a la vez: lo ataja el único (empresa, nombre).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: `Ya existe una fila «${v.nombre}» en esta empresa.` };
    }
    throw error;
  }
}

// Borra una fila extra SOLO si no tiene ningún valor (en ningún mes ni columna). El conteo y el borrado van en la
// misma transacción, serializable: un valor que alguien guarde justo en ese momento no se pierde en silencio.
export async function borrarFilaExtra(empresaSlug: string, periodo: string, id: string): Promise<ResultadoBorrarFila> {
  // Rechaza al gerente antes de mirar nada más.
  const usuario = await requireAdminOFinanzas();
  if (!FORMATO_PERIODO.test(periodo)) return { ok: false, error: "Período inválido." };
  if (typeof id !== "string" || id === "" || id.length > 64) return { ok: false, error: "No encontré esa fila." };
  const empresa = await resolverEmpresaPorSlug(empresaSlug);
  if (!empresa) return { ok: false, error: "No encontré esa empresa." };
  await requireAccesoEmpresa(empresa.id);
  const plantilla = plantillaDeEmpresa(empresaSlug);
  if (!plantilla) return { ok: false, error: "Esta empresa no tiene reporte por plantilla." };

  try {
    const decision = await prisma.$transaction(
      async (tx) => {
        const fila = await tx.filaExtraReporte.findFirst({ where: { id, empresaId: empresa.id }, select: { id: true } });
        const cantidadDeValores = fila
          ? await tx.valorManualReporte.count({ where: { empresaId: empresa.id, filaClave: claveDeFilaExtra(id) } })
          : 0;
        const d = decidirBorradoFilaExtra({
          empresaSlug,
          plantilla,
          esAdminOFinanzas: esAdminOFinanzas(usuario),
          existe: fila !== null,
          cantidadDeValores,
        });
        if (d.ok) await tx.filaExtraReporte.delete({ where: { id } });
        return d;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
    if (decision.ok) revalidatePath(`/${empresaSlug}/${periodo}/reporte`);
    return decision;
  } catch (error) {
    // Conflicto de serialización: alguien guardó un valor o borró la fila a la vez.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { ok: false, error: "Otra persona cambió esta fila al mismo tiempo. Probá de nuevo." };
    }
    throw error;
  }
}
