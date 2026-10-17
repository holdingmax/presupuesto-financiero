import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { siguienteNumeroSemana } from "@/lib/ejecucionSemanas";

// Semanas globales por período (docs/ejecucion_global_plan.md §3.1): la semana cuelga del
// PERÍODO ("AAAA-MM", de todo el holding), no de una empresa. Hay UNA sola abierta por
// período; su numeración es 1, 2, 3… dentro del período. EjecucionSemanal.presupuestoId
// solo conserva el origen histórico de las semanas viejas.

// Lock por período: dos personas entrando a la vez al mismo período no crean dos semanas
// abiertas. pg_advisory_xact_lock se libera solo al terminar la transacción. "SELECT 1
// FROM ...": devuelve void, que Prisma no sabe deserializar.
export async function bloquearPeriodo(tx: Prisma.TransactionClient, periodo: string) {
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${"ejecucion:" + periodo}))`;
}

// Devuelve la semana ABIERTA del período, o crea la siguiente si no hay ninguna abierta.
// El llamador ya tiene el lock del período (bloquearPeriodo).
export async function obtenerOCrearAbiertaEnTx(tx: Prisma.TransactionClient, periodo: string) {
  const abierta = await tx.ejecucionSemanal.findFirst({
    where: { periodo, estado: "ABIERTA" },
    orderBy: { numeroSemana: "desc" },
  });
  if (abierta) return abierta;
  const existentes = await tx.ejecucionSemanal.findMany({ where: { periodo }, select: { numeroSemana: true } });
  return tx.ejecucionSemanal.create({
    data: { periodo, numeroSemana: siguienteNumeroSemana(existentes.map((s) => s.numeroSemana)) },
  });
}

// Único lugar del flujo de ejecución (junto con subirExtracto, que reparte por mes) que
// crea una semana: resuelve-o-crea la semana abierta del período con lock por período.
export async function obtenerOCrearEjecucionAbierta(periodo: string) {
  return prisma.$transaction(async (tx) => {
    await bloquearPeriodo(tx, periodo);
    return obtenerOCrearAbiertaEnTx(tx, periodo);
  });
}

// Solo lectura: nunca crea nada. Devuelve null si esa semana no existe todavía en el período.
export const obtenerEjecucionPorSemana = cache(async (periodo: string, numeroSemana: number) => {
  return prisma.ejecucionSemanal.findUnique({
    where: { periodo_numeroSemana: { periodo, numeroSemana } },
  });
});

// Solo lectura: la última semana existente del período, sin crear ninguna. Para usuarios
// sin permiso de operar, cuya sola navegación no debe generar una semana nueva (null si el
// período todavía no tiene ninguna).
export const obtenerUltimaEjecucion = cache(async (periodo: string) => {
  return prisma.ejecucionSemanal.findFirst({
    where: { periodo },
    orderBy: { numeroSemana: "desc" },
  });
});
