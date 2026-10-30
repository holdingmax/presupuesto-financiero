import { EMPRESAS_CON_FILAS_EXTRA } from "@/lib/config";
import type { Plantilla } from "@/lib/reporte/motor";
import { plantillaDeEmpresa } from "@/lib/reporte/plantillas";
import { conFilasExtra, extrasVisibles, type FilaExtra } from "@/lib/reporte/filasExtra";

// Resolver de la plantilla de una empresa para un mes: la estática (lib/reporte/plantillas) más las filas
// extra que ese mes ya se ven. Sin el interruptor de la empresa (lib/config.ts) NO consulta la base y
// devuelve la plantilla de siempre; con el interruptor y sin filas, también la misma plantilla (misma
// referencia). `leer` se puede reemplazar en los tests.

export type LectorFilasExtra = (empresaId: string, periodo: string) => Promise<FilaExtra[]>;

// Todas las filas extra de la empresa que ya empezaron en `periodo`, en el orden en que se crearon.
const leerDeLaBase: LectorFilasExtra = async (empresaId, periodo) => {
  const { prisma } = await import("@/lib/prisma");
  const filas = await prisma.filaExtraReporte.findMany({
    where: {
      empresaId,
      desdePeriodo: { lte: periodo },
      OR: [{ hastaPeriodo: null }, { hastaPeriodo: { gte: periodo } }],
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, bloque: true, nombre: true, desdePeriodo: true, hastaPeriodo: true },
  });
  return filas;
};

export async function plantillaDeEmpresaConExtras(
  empresaId: string,
  empresaSlug: string,
  periodo: string,
  opciones: { interruptores?: readonly string[]; leer?: LectorFilasExtra } = {}
): Promise<Plantilla | null> {
  const base = plantillaDeEmpresa(empresaSlug);
  if (!base) return null;
  const interruptores = opciones.interruptores ?? EMPRESAS_CON_FILAS_EXTRA;
  if (!interruptores.includes(empresaSlug)) return base;
  const extras = await (opciones.leer ?? leerDeLaBase)(empresaId, periodo);
  return conFilasExtra(base, extrasVisibles(extras, periodo));
}
