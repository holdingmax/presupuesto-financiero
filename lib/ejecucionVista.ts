import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { centavosDeDecimalTexto } from "@/lib/conteoMovimientos";

// Lectura de movimientos de Ejecución compartida por el módulo global (/ejecucion) y por la
// pestaña de solo lectura de cada empresa (docs/ejecucion_global_plan.md §3.4 y §6). Vive fuera
// de los archivos "use server" porque exporta funciones que no son Server Actions.

export const FILAS_POR_PAGINA = 200;

// Suma en centavos CON signo (aCentavos de lib/prorrateo devuelve la magnitud).
function aCentavosSuma(importes: number[]): number {
  return importes.reduce((acc, n) => acc + Math.round(n * 100), 0);
}

// Lo que viaja al navegador por cada movimiento. NO incluye el saldo: ni el campo existe en el
// objeto (§6). `soloUnidades` (vista de una empresa): de un movimiento prorrateado se ve SOLO la
// porción de esas unidades y el importe de ella, nunca el total ni las porciones de otras.
export function mapearMovimiento(
  m: {
    id: string;
    fecha: Date;
    concepto: string;
    importe: unknown;
    bancoYCuenta: string;
    clasificacion: string;
    unidadNegocio: string;
    detalle: string | null;
    ignorado: boolean;
    sugeridaPorSistema: boolean;
    chequeIvaAmbiguo: boolean;
    unidadSugeridaPorSistema: boolean;
    desglose: { id: string; unidadNegocio: string; importe: unknown }[];
  },
  soloUnidades?: string[]
) {
  let importe = Number(m.importe);
  let desglose = m.desglose;
  let unidadNegocio = m.unidadNegocio;
  if (soloUnidades && m.desglose.length > 0) {
    const propias = new Set(soloUnidades);
    desglose = m.desglose.filter((d) => propias.has(d.unidadNegocio));
    importe = aCentavosSuma(desglose.map((d) => Number(d.importe))) / 100;
    // La unidad propia de un prorrateado puede ser de OTRA empresa (queda guardada detrás del
    // reparto): tampoco viaja; se muestra la de la primera porción propia.
    unidadNegocio = desglose[0]?.unidadNegocio ?? unidadNegocio;
  }
  return {
    id: m.id,
    fecha: m.fecha.toISOString().slice(0, 10),
    concepto: m.concepto,
    importe,
    bancoYCuenta: m.bancoYCuenta,
    clasificacion: m.clasificacion,
    // unidadNegocio: valor único del movimiento en sí, editable inline en la tabla
    // (onCambiarUnidadNegocio/onGuardarUnidadNegocio) — completamente separado de
    // m.desglose de abajo (el reparto en varias unidades, ver
    // guardarDesgloseMovimiento). Ninguno de los dos lee ni escribe al otro.
    unidadNegocio,
    detalle: m.detalle ?? "",
    ignorado: m.ignorado,
    sugeridaPorSistema: m.sugeridaPorSistema,
    chequeIvaAmbiguo: m.chequeIvaAmbiguo,
    unidadSugeridaPorSistema: m.unidadSugeridaPorSistema,
    desglose: desglose.map((d) => ({
      id: d.id,
      unidadNegocio: d.unidadNegocio,
      importe: Number(d.importe),
    })),
  };
}

// Where de los movimientos de UNA empresa: los no prorrateados por su unidad, los prorrateados por
// una porción propia. Se aplica en la consulta: lo demás no sale de la base.
export function filtroDeUnidades(unidades: string[]): Prisma.MovimientoBancarioWhereInput {
  return {
    OR: [
      { desglose: { none: {} }, unidadNegocio: { in: unidades } },
      { desglose: { some: { unidadNegocio: { in: unidades } } } },
    ],
  };
}

// Total en pesos de la vista de una empresa: de la semana, sin ignorados, los movimientos no
// prorrateados de sus unidades más sus porciones de prorrateo (nunca el importe total de un
// prorrateado). Sumado en la base (numeric exacto) y pasado a centavos como texto.
export async function sumarImporteDeUnidades(ejecucionId: string, unidades: string[], soloSinClasificar: boolean) {
  if (unidades.length === 0) return 0;
  const [fila] = await prisma.$queryRaw<{ total: string }[]>`
    SELECT COALESCE(SUM(x.importe), 0)::text AS total FROM (
      SELECT mb.importe FROM "MovimientoBancario" mb
      WHERE mb."ejecucionId" = ${ejecucionId} AND NOT mb.ignorado
        AND (NOT ${soloSinClasificar} OR mb.clasificacion = 'SIN CLASIFICAR')
        AND mb."unidadNegocio" = ANY(${unidades}::text[])
        AND NOT EXISTS (SELECT 1 FROM "MovimientoBancarioDesglose" d WHERE d."movimientoId" = mb.id)
      UNION ALL
      SELECT d.importe FROM "MovimientoBancario" mb
      JOIN "MovimientoBancarioDesglose" d ON d."movimientoId" = mb.id
      WHERE mb."ejecucionId" = ${ejecucionId} AND NOT mb.ignorado
        AND (NOT ${soloSinClasificar} OR mb.clasificacion = 'SIN CLASIFICAR')
        AND d."unidadNegocio" = ANY(${unidades}::text[])
    ) x
  `;
  return centavosDeDecimalTexto(fila.total) / 100;
}
