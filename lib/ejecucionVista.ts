import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { centavosDeDecimalTexto } from "@/lib/conteoMovimientos";
import { ordenarPorCadenaDeSaldo } from "@/lib/ordenSaldo";

// Lectura de movimientos de Ejecución compartida por el módulo global (/ejecucion) y por la
// pestaña de solo lectura de cada empresa (docs/ejecucion_global_plan.md §3.4 y §6). Vive fuera
// de los archivos "use server" porque exporta funciones que no son Server Actions.

export const FILAS_POR_PAGINA = 200;

// Suma en centavos CON signo (aCentavos de lib/prorrateo devuelve la magnitud).
function aCentavosSuma(importes: number[]): number {
  return importes.reduce((acc, n) => acc + Math.round(n * 100), 0);
}

// Ids de TODA la semana en el orden de la vista: fecha + id, y dentro de cada fecha y cuenta, el
// orden de la cadena de saldo cuando cierra completa (lib/ordenSaldo.ts). Es solo de
// visualización (no toca lo guardado) y no depende del rol: corre igual para todos. Se arma sobre
// la semana entera y recién después se filtra y pagina, así un día que cae entre dos páginas queda
// ordenado igual y el filtro "sin clasificar" no corta la cadena.
export async function idsEnOrdenDeVista(ejecucionId: string, soloSinClasificar: boolean): Promise<string[]> {
  const filas = await prisma.movimientoBancario.findMany({
    where: { ejecucionId },
    orderBy: [{ fecha: "asc" }, { id: "asc" }],
    select: { id: true, fecha: true, bancoYCuenta: true, importe: true, saldo: true, clasificacion: true },
  });
  const ordenadas = ordenarPorCadenaDeSaldo(
    filas.map((m) => ({
      id: m.id,
      clasificacion: m.clasificacion,
      fecha: m.fecha.toISOString().slice(0, 10),
      bancoYCuenta: m.bancoYCuenta,
      importeCentavos: centavosDeDecimalTexto(m.importe.toFixed(2)),
      saldoCentavos: m.saldo === null ? null : centavosDeDecimalTexto(m.saldo.toFixed(2)),
    }))
  );
  return ordenadas.filter((m) => !soloSinClasificar || m.clasificacion === "SIN CLASIFICAR").map((m) => m.id);
}

// Lo que viaja al navegador por cada movimiento. El saldo SOLO viaja con `verSaldo` (§6: ADMIN,
// FINANZAS y quien opera, ver veTodoEjecucion); por defecto la clave `saldo` ni existe en el objeto
// (no es null ni se oculta con CSS). Con `verSaldo`, un saldo que la fila no trae (BBVA) viaja como
// null. `soloUnidades` (vista de una empresa): de un movimiento prorrateado se ve SOLO la
// porción de esas unidades y el importe de ella, nunca el total ni las porciones de otras.
export function mapearMovimiento(
  m: {
    id: string;
    fecha: Date;
    concepto: string;
    importe: unknown;
    saldo?: unknown;
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
  soloUnidades?: string[],
  { verSaldo = false }: { verSaldo?: boolean } = {}
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
    ...(verSaldo ? { saldo: m.saldo === null || m.saldo === undefined ? null : Number(m.saldo) } : {}),
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
