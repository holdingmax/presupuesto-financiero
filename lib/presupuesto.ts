import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Busca o crea el PresupuestoMensual de una empresa+período. A diferencia de
// la versión vieja (que además creaba la Empresa si no existía), esta NO
// toca la tabla Empresa — resolver la empresa es responsabilidad de
// lib/slug.ts, que es de solo lectura porque el slug viene de una URL.
export const obtenerOCrearPresupuesto = cache(
  async (empresaId: string, periodo: string) => {
    let presupuesto = await prisma.presupuestoMensual.findUnique({
      where: { empresaId_periodo: { empresaId, periodo } },
    });
    if (!presupuesto) {
      presupuesto = await prisma.presupuestoMensual.create({
        data: { empresaId, periodo },
      });
    }
    return presupuesto;
  }
);
