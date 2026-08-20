import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Devuelve la última EjecucionSemanal de este presupuesto si está ABIERTA,
// o crea la siguiente si no hay ninguna o la última ya está CERRADA. Es el
// único lugar de todo el flujo de ejecución que crea algo.
export async function obtenerOCrearEjecucionAbierta(presupuestoId: string) {
  const ultima = await prisma.ejecucionSemanal.findFirst({
    where: { presupuestoId },
    orderBy: { numeroSemana: "desc" },
  });

  if (ultima && ultima.estado === "ABIERTA") {
    return ultima;
  }

  return prisma.ejecucionSemanal.create({
    data: {
      presupuestoId,
      numeroSemana: ultima ? ultima.numeroSemana + 1 : 1,
    },
  });
}

// Solo lectura: nunca crea nada. Devuelve null si esa semana no existe
// todavía para este presupuesto.
export const obtenerEjecucionPorSemana = cache(
  async (presupuestoId: string, numeroSemana: number) => {
    return prisma.ejecucionSemanal.findUnique({
      where: { presupuestoId_numeroSemana: { presupuestoId, numeroSemana } },
    });
  }
);

// Solo lectura: busca la última semana existente sin crear ninguna — a
// diferencia de obtenerOCrearEjecucionAbierta, nunca escribe. Para usuarios
// sin permiso de operar, cuya sola navegación no debe generar una semana
// nueva (devuelve null si el presupuesto todavía no tiene ninguna).
export const obtenerUltimaEjecucion = cache(async (presupuestoId: string) => {
  return prisma.ejecucionSemanal.findFirst({
    where: { presupuestoId },
    orderBy: { numeroSemana: "desc" },
  });
});
