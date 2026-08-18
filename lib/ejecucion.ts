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
