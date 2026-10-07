import { prisma } from "@/lib/prisma";
import { centavosDeDecimalTexto } from "@/lib/conteoMovimientos";
import { normalizarCuenta } from "@/lib/unidadesNegocio";

// REAL del Reporte por UNIDAD DE NEGOCIO, no por empresa del extracto (decisión
// 2026-10-07). Una cuenta bancaria puede mezclar unidades: un gasto de RADIO
// pagado desde un banco cargado en Havanna es REAL de Radio, no de Havanna. Por
// eso el REAL de una empresa suma, del período, en semanas CERRADAS y sin
// ignorados, de CUALQUIER empresa:
//   - los movimientos NO prorrateados cuya unidad pertenece a la empresa;
//   - las porciones de MovimientoBancarioDesglose cuya unidad pertenece a ella.
// Un movimiento prorrateado cuenta SOLO por sus porciones, nunca además por su
// unidad propia. Qué unidades tiene cada empresa: Empresa.unidadesNegocio
// (/admin/unidades-negocio), donde cada unidad pertenece a una sola empresa —
// así ningún importe se suma en dos reportes.
//
// Todo se suma en la base (numeric exacto) y vuelve como texto → centavos: nada
// de float para sumar, y ninguna fila individual viaja al servidor.
// upper(btrim()): una variante vieja como "SPP " (espacio final) cuenta como SPP.

// Todas las unidades que hoy pertenecen a alguna empresa (normalizadas). Lo que
// no esté acá (SIN ASIGNAR, valores viejos fuera de lista, EXPENSAS mientras no
// tenga empresa) no entra en el REAL de nadie.
export async function obtenerUnidadesConEmpresa(): Promise<string[]> {
  const filas = await prisma.$queryRaw<{ unidad: string }[]>`
    SELECT DISTINCT unnest("unidadesNegocio") AS unidad FROM "Empresa"
  `;
  return filas.map((f) => normalizarCuenta(f.unidad));
}

// Centavos (con signo) por clasificación. El llamador decide cómo mostrarlos.
export async function calcularRealPorRubro(
  periodo: string,
  unidades: string[],
  rubros: readonly string[]
): Promise<Map<string, number>> {
  if (unidades.length === 0) return new Map();
  const filas = await prisma.$queryRaw<{ clasificacion: string; total: string | null }[]>`
    WITH mov AS (
      SELECT mb.id, mb.clasificacion, mb.importe, mb."unidadNegocio"
      FROM "MovimientoBancario" mb
      JOIN "EjecucionSemanal" es ON mb."ejecucionId" = es.id
      JOIN "PresupuestoMensual" pm ON es."presupuestoId" = pm.id
      WHERE pm.periodo = ${periodo} AND es.estado = 'CERRADA' AND NOT mb.ignorado
        AND mb.clasificacion = ANY(${[...rubros]}::text[])
    )
    SELECT x.clasificacion, SUM(x.importe)::text AS total FROM (
      SELECT m.clasificacion, m.importe FROM mov m
      WHERE upper(btrim(m."unidadNegocio")) = ANY(${unidades}::text[])
        AND NOT EXISTS (SELECT 1 FROM "MovimientoBancarioDesglose" d WHERE d."movimientoId" = m.id)
      UNION ALL
      SELECT m.clasificacion, d.importe FROM mov m
      JOIN "MovimientoBancarioDesglose" d ON d."movimientoId" = m.id
      WHERE upper(btrim(d."unidadNegocio")) = ANY(${unidades}::text[])
    ) x
    GROUP BY x.clasificacion
  `;
  return new Map(
    filas.map((f) => [f.clasificacion, f.total === null ? 0 : centavosDeDecimalTexto(f.total)])
  );
}

export type NoAsignado = { unidad: string; centavos: number; movimientos: number };

// Bloque "No asignado a ninguna empresa" del Reporte: SOLO de los extractos de
// ESTA empresa (sus semanas cerradas) — lo mismo que el gerente ya ve en
// Ejecución, nunca detalle de extractos de otra empresa. Mismo criterio de
// prorrateo que el REAL: un movimiento prorrateado aporta sus porciones, no su
// unidad propia. Agrupado por unidad, ya normalizada.
export async function calcularNoAsignadoDelExtracto(
  empresaId: string,
  periodo: string,
  rubros: readonly string[],
  unidadesConEmpresa: string[]
): Promise<{ porUnidad: NoAsignado[]; semanas: number[] }> {
  const filas = await prisma.$queryRaw<
    { unidad: string; total: string | null; movimientos: number; semanas: number[] }[]
  >`
    WITH mov AS (
      SELECT mb.id, mb.importe, mb."unidadNegocio", es."numeroSemana"
      FROM "MovimientoBancario" mb
      JOIN "EjecucionSemanal" es ON mb."ejecucionId" = es.id
      JOIN "PresupuestoMensual" pm ON es."presupuestoId" = pm.id
      WHERE pm."empresaId" = ${empresaId} AND pm.periodo = ${periodo}
        AND es.estado = 'CERRADA' AND NOT mb.ignorado
        AND mb.clasificacion = ANY(${[...rubros]}::text[])
    )
    SELECT x.unidad, SUM(x.importe)::text AS total, COUNT(DISTINCT x.id)::int AS movimientos,
           array_agg(DISTINCT x."numeroSemana" ORDER BY x."numeroSemana") AS semanas
    FROM (
      SELECT m.id, m.importe, upper(btrim(m."unidadNegocio")) AS unidad, m."numeroSemana" FROM mov m
      WHERE NOT (upper(btrim(m."unidadNegocio")) = ANY(${unidadesConEmpresa}::text[]))
        AND NOT EXISTS (SELECT 1 FROM "MovimientoBancarioDesglose" d WHERE d."movimientoId" = m.id)
      UNION ALL
      SELECT m.id, d.importe, upper(btrim(d."unidadNegocio")), m."numeroSemana" FROM mov m
      JOIN "MovimientoBancarioDesglose" d ON d."movimientoId" = m.id
      WHERE NOT (upper(btrim(d."unidadNegocio")) = ANY(${unidadesConEmpresa}::text[]))
    ) x
    GROUP BY x.unidad
    ORDER BY x.unidad
  `;
  const semanas = Array.from(new Set(filas.flatMap((f) => f.semanas))).sort((a, b) => a - b);
  return {
    porUnidad: filas.map((f) => ({
      unidad: f.unidad,
      centavos: f.total === null ? 0 : centavosDeDecimalTexto(f.total),
      movimientos: f.movimientos,
    })),
    semanas,
  };
}

export type SinUnidadEnSemana = { unidad: string; movimientos: number };

// Aviso de Ejecución ANTES de cerrar (decisión 2026-10-07: las semanas cerradas
// no se pueden editar, así que el aviso del Reporte llegaría tarde): cuántos
// movimientos de la semana, no ignorados, tienen una unidad que no pertenece a
// ninguna empresa — no van a entrar en el Reporte de nadie. Todas las
// clasificaciones (no solo los rubros de egresos): es un problema de asignación.
export async function contarSinUnidadEnSemana(
  ejecucionId: string,
  unidadesConEmpresa: string[]
): Promise<SinUnidadEnSemana[]> {
  return prisma.$queryRaw<SinUnidadEnSemana[]>`
    SELECT x.unidad, COUNT(DISTINCT x.id)::int AS movimientos FROM (
      SELECT mb.id, upper(btrim(mb."unidadNegocio")) AS unidad
      FROM "MovimientoBancario" mb
      WHERE mb."ejecucionId" = ${ejecucionId} AND NOT mb.ignorado
        AND NOT (upper(btrim(mb."unidadNegocio")) = ANY(${unidadesConEmpresa}::text[]))
        AND NOT EXISTS (SELECT 1 FROM "MovimientoBancarioDesglose" d WHERE d."movimientoId" = mb.id)
      UNION ALL
      SELECT mb.id, upper(btrim(d."unidadNegocio"))
      FROM "MovimientoBancario" mb
      JOIN "MovimientoBancarioDesglose" d ON d."movimientoId" = mb.id
      WHERE mb."ejecucionId" = ${ejecucionId} AND NOT mb.ignorado
        AND NOT (upper(btrim(d."unidadNegocio")) = ANY(${unidadesConEmpresa}::text[]))
    ) x
    GROUP BY x.unidad
    ORDER BY movimientos DESC, x.unidad
  `;
}
