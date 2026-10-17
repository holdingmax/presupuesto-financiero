// Verificación de SOLO LECTURA de Ejecución global (docs/ejecucion_global_plan.md §3.4 y §3.7),
// para correr contra una base DESPUÉS de aplicar la migración 20261020120000_ejecucion_global.
// No escribe nada: solo SELECT. Uso: npx tsx prisma/scripts/verificar-ejecucion-global.ts
//
// 1. Caracterización del Real del Reporte: la consulta VIEJA (período por PresupuestoMensual) y la
//    NUEVA (período propio de la semana, lib/reporte.ts) tienen que dar exactamente lo mismo, por
//    empresa y período, en neto, créditos y débitos. Y lo mismo para las semanas cerradas.
// 2. Cierre: la regla pura (lib/cierreEjecucion.ts) coincide con la consulta SQL del aviso
//    (contarSinUnidadEnSemana) en cada semana ABIERTA.
// Si algo no coincide, el script termina con código 1 y muestra la diferencia.

import { prisma } from "@/lib/prisma";
import {
  calcularRealPorClasificacion,
  contarSemanasCerradasPorPeriodo,
  contarSinUnidadEnSemana,
  obtenerUnidadesConEmpresa,
  type RealDelMes,
} from "@/lib/reporte";
import { centavosDeDecimalTexto } from "@/lib/conteoMovimientos";
import { claveEquivalencia } from "@/lib/reporte/motor";
import { unidadesSinEmpresa } from "@/lib/cierreEjecucion";

type FilaReal = { periodo: string; clasificacion: string; total: string | null; creditos: string | null; debitos: string | null };

// Réplica EXACTA de la consulta anterior a Ejecución global (JOIN PresupuestoMensual, pm.periodo).
async function realConsultaVieja(periodos: string[], unidades: string[], clasificaciones: string[]) {
  const resultado = new Map<string, RealDelMes>(
    periodos.map((p) => [p, { neto: new Map(), creditos: new Map(), debitos: new Map() }])
  );
  if (unidades.length === 0 || periodos.length === 0 || clasificaciones.length === 0) return resultado;
  const pedidas = new Set(clasificaciones.map(claveEquivalencia));
  const guardadas = await prisma.$queryRaw<{ clasificacion: string }[]>`
    SELECT DISTINCT mb.clasificacion
    FROM "MovimientoBancario" mb
    JOIN "EjecucionSemanal" es ON mb."ejecucionId" = es.id
    JOIN "PresupuestoMensual" pm ON es."presupuestoId" = pm.id
    WHERE pm.periodo = ANY(${periodos}::text[])
  `;
  const crudas = guardadas.map((f) => f.clasificacion).filter((c) => pedidas.has(claveEquivalencia(c)));
  if (crudas.length === 0) return resultado;
  const filas = await prisma.$queryRaw<FilaReal[]>`
    WITH mov AS (
      SELECT mb.id, pm.periodo, mb.clasificacion, mb.importe, mb."unidadNegocio"
      FROM "MovimientoBancario" mb
      JOIN "EjecucionSemanal" es ON mb."ejecucionId" = es.id
      JOIN "PresupuestoMensual" pm ON es."presupuestoId" = pm.id
      WHERE pm.periodo = ANY(${periodos}::text[]) AND es.estado = 'CERRADA' AND NOT mb.ignorado
        AND mb.clasificacion = ANY(${crudas}::text[])
    )
    SELECT x.periodo, x.clasificacion, SUM(x.importe)::text AS total,
           SUM(CASE WHEN x.importe > 0 THEN x.importe ELSE 0 END)::text AS creditos,
           SUM(CASE WHEN x.importe < 0 THEN x.importe ELSE 0 END)::text AS debitos FROM (
      SELECT m.periodo, m.clasificacion, m.importe FROM mov m
      WHERE upper(btrim(m."unidadNegocio")) = ANY(${unidades}::text[])
        AND NOT EXISTS (SELECT 1 FROM "MovimientoBancarioDesglose" d WHERE d."movimientoId" = m.id)
      UNION ALL
      SELECT m.periodo, m.clasificacion, d.importe FROM mov m
      JOIN "MovimientoBancarioDesglose" d ON d."movimientoId" = m.id
      WHERE upper(btrim(d."unidadNegocio")) = ANY(${unidades}::text[])
    ) x
    GROUP BY x.periodo, x.clasificacion
  `;
  const c = (t: string | null) => (t === null ? 0 : centavosDeDecimalTexto(t));
  for (const f of filas) {
    const delMes = resultado.get(f.periodo);
    if (!delMes) continue;
    delMes.neto.set(f.clasificacion, c(f.total));
    delMes.creditos.set(f.clasificacion, c(f.creditos));
    delMes.debitos.set(f.clasificacion, c(f.debitos));
  }
  return resultado;
}

async function semanasCerradasViejo(periodos: string[]) {
  const r = new Map<string, number>(periodos.map((p) => [p, 0]));
  const filas = await prisma.$queryRaw<{ periodo: string; semanas: number }[]>`
    SELECT pm.periodo, COUNT(*)::int AS semanas
    FROM "EjecucionSemanal" es
    JOIN "PresupuestoMensual" pm ON es."presupuestoId" = pm.id
    WHERE pm.periodo = ANY(${periodos}::text[]) AND es.estado = 'CERRADA'
    GROUP BY pm.periodo
  `;
  for (const f of filas) r.set(f.periodo, f.semanas);
  return r;
}

const aObjeto = (m: Map<string, number>) => Object.fromEntries([...m].sort(([a], [b]) => a.localeCompare(b)));
const igualesMapas = (a: Map<string, number>, b: Map<string, number>) =>
  JSON.stringify(aObjeto(a)) === JSON.stringify(aObjeto(b));

async function main() {
  let diferencias = 0;

  // Contexto: semanas por período.
  const semanas = await prisma.$queryRaw<
    { periodo: string; numeroSemana: number; estado: string; origen: string | null; movimientos: number }[]
  >`
    SELECT es.periodo, es."numeroSemana", es.estado::text AS estado, e.nombre AS origen,
           (SELECT COUNT(*)::int FROM "MovimientoBancario" mb WHERE mb."ejecucionId" = es.id) AS movimientos
    FROM "EjecucionSemanal" es
    LEFT JOIN "PresupuestoMensual" pm ON pm.id = es."presupuestoId"
    LEFT JOIN "Empresa" e ON e.id = pm."empresaId"
    ORDER BY es.periodo, es."numeroSemana"
  `;
  console.log("Semanas (período · n° · estado · origen · movimientos):");
  for (const s of semanas) {
    console.log(`  ${s.periodo} · ${s.numeroSemana} · ${s.estado} · ${s.origen ?? "global"} · ${s.movimientos}`);
  }
  const periodos = Array.from(new Set(semanas.map((s) => s.periodo))).sort();

  // Más de una abierta por período: no debería pasar nunca.
  const abiertasPorPeriodo = new Map<string, number>();
  for (const s of semanas) if (s.estado === "ABIERTA") abiertasPorPeriodo.set(s.periodo, (abiertasPorPeriodo.get(s.periodo) ?? 0) + 1);
  for (const [p, n] of abiertasPorPeriodo) {
    if (n > 1) {
      diferencias++;
      console.log(`DIFERENCIA: el período ${p} tiene ${n} semanas abiertas`);
    }
  }

  // 1. Real del Reporte, viejo vs nuevo, por empresa con unidades.
  const todasLasClasificaciones = (
    await prisma.$queryRaw<{ clasificacion: string }[]>`SELECT DISTINCT clasificacion FROM "MovimientoBancario"`
  ).map((f) => f.clasificacion);
  const empresas = await prisma.empresa.findMany({
    where: { activo: true },
    select: { nombre: true, unidadesNegocio: true },
    orderBy: { nombre: "asc" },
  });
  let celdasComparadas = 0;
  for (const e of empresas) {
    if (e.unidadesNegocio.length === 0 || periodos.length === 0) continue;
    const [viejo, nuevo] = await Promise.all([
      realConsultaVieja(periodos, e.unidadesNegocio, todasLasClasificaciones),
      calcularRealPorClasificacion(periodos, e.unidadesNegocio, todasLasClasificaciones),
    ]);
    for (const p of periodos) {
      for (const campo of ["neto", "creditos", "debitos"] as const) {
        celdasComparadas += viejo.get(p)![campo].size;
        if (!igualesMapas(viejo.get(p)![campo], nuevo.get(p)![campo])) {
          diferencias++;
          console.log(`DIFERENCIA en el Real de ${e.nombre} ${p} (${campo}):`);
          console.log("  viejo:", aObjeto(viejo.get(p)![campo]));
          console.log("  nuevo:", aObjeto(nuevo.get(p)![campo]));
        }
      }
    }
  }
  console.log(`Real del Reporte: ${celdasComparadas} valores por clasificación comparados (viejo vs nuevo).`);

  const [cerradasViejo, cerradasNuevo] = await Promise.all([
    semanasCerradasViejo(periodos),
    contarSemanasCerradasPorPeriodo(periodos),
  ]);
  for (const p of periodos) {
    if (cerradasViejo.get(p) !== cerradasNuevo.get(p)) {
      diferencias++;
      console.log(`DIFERENCIA en semanas cerradas de ${p}: viejo ${cerradasViejo.get(p)} · nuevo ${cerradasNuevo.get(p)}`);
    }
  }
  console.log("Semanas cerradas por período:", Object.fromEntries(cerradasNuevo));

  // 2. Cierre: regla pura vs SQL, en cada semana abierta.
  const unidadesConEmpresa = await obtenerUnidadesConEmpresa();
  const abiertas = await prisma.ejecucionSemanal.findMany({ where: { estado: "ABIERTA" }, select: { id: true, periodo: true, numeroSemana: true } });
  for (const a of abiertas) {
    const filas = await prisma.movimientoBancario.findMany({
      where: { ejecucionId: a.id },
      select: {
        ignorado: true,
        unidadNegocio: true,
        clasificacion: true,
        sugeridaPorSistema: true,
        unidadSugeridaPorSistema: true,
        desglose: { select: { unidadNegocio: true } },
      },
    });
    const pura = unidadesSinEmpresa(filas, unidadesConEmpresa);
    const sql = await contarSinUnidadEnSemana(a.id, unidadesConEmpresa);
    const ordenar = (x: { unidad: string; movimientos: number }[]) =>
      JSON.stringify([...x].sort((p, q) => p.unidad.localeCompare(q.unidad)));
    console.log(`Cierre ${a.periodo} sem. ${a.numeroSemana}: ${filas.length} movimientos; sin empresa → ${JSON.stringify(sql)}`);
    if (ordenar(pura) !== ordenar(sql)) {
      diferencias++;
      console.log("DIFERENCIA entre la regla pura y la consulta SQL:", { pura, sql });
    }
  }

  console.log(diferencias === 0 ? "\nOK: sin diferencias." : `\nHAY ${diferencias} DIFERENCIA(S).`);
  process.exitCode = diferencias === 0 ? 0 : 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
