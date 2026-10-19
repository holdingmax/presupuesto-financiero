// Backtest de SOLO LECTURA de lib/clasificacionHistorial.ts (sugerencia de clasificación por historial).
// No escribe nada: solo SELECT. Aborta si la base es la de testing (compara el host de .env con el de
// .env.testing.local; nunca imprime URLs). Uso: npx tsx prisma/scripts/backtest-clasificacion-historial.ts
//
// Entrena con lo anterior a CORTE y evalúa con lo posterior; si alguno de los dos lados es muy poco, usa un 20%
// aleatorio con semilla fija. Filas idénticas (fecha + concepto + importe + banco) se deduplican para no
// inflar con duplicados de prueba. Solo se evalúa sobre filas con clasificación real confirmada.

import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { proponerClasificacionAutomatica } from "@/lib/clasificaciones";
import {
  construirIndice,
  sugerir,
  normalizarConcepto,
  signoDeImporte,
  type IndiceHistorial,
  type MovimientoParaIndice,
  type UmbralesSugerencia,
} from "@/lib/clasificacionHistorial";

const CORTE = new Date("2026-07-01T00:00:00.000Z");
const MIN_FILAS_EVALUACION = 1000; // por debajo, se usa el 20% aleatorio
const SEMILLA = 20261018;

const COMBINACIONES: { nombre: string; u: UmbralesSugerencia }[] = [
  { nombre: "3 apariciones · 90%", u: { minApariciones: 3, minDominancia: 0.9 } },
  { nombre: "2 apariciones · 80%", u: { minApariciones: 2, minDominancia: 0.8 } },
  { nombre: "5 apariciones · 95%", u: { minApariciones: 5, minDominancia: 0.95 } },
];

// ---------- guarda de host ----------
function hostDe(archivo: string): string | null {
  try {
    const texto = fs.readFileSync(path.resolve(process.cwd(), archivo), "utf8");
    const linea = texto.split(/\r?\n/).find((l) => /DATABASE_URL\s*=/.test(l));
    const m = linea?.match(/@([^:/?\s"']+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}
function verificarBaseLocal() {
  const local = hostDe(".env");
  const testing = hostDe(".env.testing.local");
  if (!local) throw new Error("No pude determinar el host de .env: aborto por seguridad.");
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes(`@${testing ?? "\u0000"}`)) {
    throw new Error("La conexión apunta a la base de testing: aborto.");
  }
  if (testing && local === testing) throw new Error("El host de .env es el de testing: aborto.");
  console.log("Host de la conexión: distinto de testing (base local). Solo SELECT.");
}

// ---------- utilidades ----------
function generadorAleatorio(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pct = (n: number, d: number) => (d === 0 ? "—" : `${((100 * n) / d).toFixed(1)}%`);

type Fila = MovimientoParaIndice & { fecha: Date; banco: string; unidad: string };

type Medicion = { total: number; sugeridas: number; aciertos: number };
const nuevaMedicion = (): Medicion => ({ total: 0, sugeridas: 0, aciertos: 0 });
function medir(m: Medicion, sugerida: string | null, real: string) {
  m.total++;
  if (sugerida !== null) {
    m.sugeridas++;
    if (sugerida === real) m.aciertos++;
  }
}
const resumen = (m: Medicion) =>
  `cobertura ${pct(m.sugeridas, m.total)} (${m.sugeridas}/${m.total}) · precisión ${pct(m.aciertos, m.sugeridas)} (${m.aciertos}/${m.sugeridas})`;

async function main() {
  verificarBaseLocal();

  const crudas = await prisma.$queryRaw<
    { fecha: Date; concepto: string; importe: string; banco: string; clasificacion: string; unidad: string; ignorado: boolean; sugerida: boolean }[]
  >`
    SELECT fecha, concepto, importe::text AS importe, "bancoYCuenta" AS banco, clasificacion,
           upper(btrim("unidadNegocio")) AS unidad, ignorado, "sugeridaPorSistema" AS sugerida
    FROM "MovimientoBancario"
  `;
  console.log(`Movimientos en la base: ${crudas.length}`);

  // Deduplicación: fecha + concepto + importe + banco.
  const vistos = new Set<string>();
  const filas: Fila[] = [];
  for (const c of crudas) {
    const k = [c.fecha.toISOString().slice(0, 10), c.concepto, c.importe, c.banco].join("|");
    if (vistos.has(k)) continue;
    vistos.add(k);
    filas.push({
      fecha: c.fecha,
      concepto: c.concepto,
      importe: Number(c.importe),
      banco: c.banco,
      clasificacion: c.clasificacion,
      unidad: c.unidad,
      ignorado: c.ignorado,
      sugeridaPorSistema: c.sugerida,
    });
  }
  console.log(`Tras deduplicar filas idénticas: ${filas.length} (se descartaron ${crudas.length - filas.length})`);

  const confirmada = (f: Fila) => !f.ignorado && !f.sugeridaPorSistema && f.clasificacion !== "SIN CLASIFICAR" && f.clasificacion.trim() !== "";
  const confirmadas = filas.filter(confirmada);
  const fechas = confirmadas.map((f) => f.fecha.getTime());
  console.log(
    `Con clasificación confirmada: ${confirmadas.length} (de ${new Date(Math.min(...fechas)).toISOString().slice(0, 10)} a ${new Date(Math.max(...fechas)).toISOString().slice(0, 10)})`
  );

  // División entrenamiento / evaluación.
  let entrenamiento: Fila[];
  let evaluacion: Fila[];
  const posteriores = confirmadas.filter((f) => f.fecha >= CORTE);
  let criterio: string;
  const anteriores = confirmadas.length - posteriores.length;
  if (posteriores.length >= MIN_FILAS_EVALUACION && anteriores >= MIN_FILAS_EVALUACION) {
    entrenamiento = confirmadas.filter((f) => f.fecha < CORTE);
    evaluacion = posteriores;
    criterio = `temporal: entrenamiento < 2026-07-01 (${entrenamiento.length}), evaluación >= 2026-07-01 (${evaluacion.length})`;
  } else {
    const azar = generadorAleatorio(SEMILLA);
    entrenamiento = [];
    evaluacion = [];
    for (const f of confirmadas) (azar() < 0.2 ? evaluacion : entrenamiento).push(f);
    criterio = `20% aleatorio con semilla ${SEMILLA} (el corte temporal no sirve: hay ${anteriores} filas anteriores y ${posteriores.length} posteriores a 2026-07-01, y se necesitan al menos ${MIN_FILAS_EVALUACION} de cada lado): entrenamiento ${entrenamiento.length}, evaluación ${evaluacion.length}`;
  }
  console.log(`\nDivisión usada → ${criterio}\n`);

  const indice: IndiceHistorial = construirIndice(entrenamiento);
  console.log(`Claves en el índice (concepto normalizado + signo): ${indice.size}\n`);

  // ---- Keywords actuales (proponerClasificacionAutomatica) sobre las mismas filas ----
  const kw = nuevaMedicion();
  for (const f of evaluacion) medir(kw, proponerClasificacionAutomatica(f.concepto), f.clasificacion);
  console.log("== Motor actual de keywords (solo archivo madre hoy), mismas filas de evaluación ==");
  console.log(`  ${resumen(kw)}\n`);

  // ---- Combinaciones de umbrales ----
  console.log("== Índice por historial: combinaciones de umbrales (total) ==");
  console.log("  combinación                 cobertura   precisión   sugeridas   aciertos");
  for (const c of COMBINACIONES) {
    const m = nuevaMedicion();
    for (const f of evaluacion) medir(m, sugerir(f.concepto, f.importe, indice, c.u)?.clasificacion ?? null, f.clasificacion);
    console.log(
      `  ${c.nombre.padEnd(26)}  ${pct(m.sugeridas, m.total).padStart(8)}   ${pct(m.aciertos, m.sugeridas).padStart(8)}   ${String(m.sugeridas).padStart(9)}   ${String(m.aciertos).padStart(8)}`
    );
  }

  // ---- Por unidad (umbral inicial) y errores ----
  const U = COMBINACIONES[0].u;
  const total = nuevaMedicion();
  const porUnidad = new Map<string, { idx: Medicion; kw: Medicion }>();
  const errores = new Map<string, { concepto: string; sugerido: string; real: string; n: number }>();
  for (const f of evaluacion) {
    const s = sugerir(f.concepto, f.importe, indice, U)?.clasificacion ?? null;
    medir(total, s, f.clasificacion);
    const u = porUnidad.get(f.unidad) ?? { idx: nuevaMedicion(), kw: nuevaMedicion() };
    medir(u.idx, s, f.clasificacion);
    medir(u.kw, proponerClasificacionAutomatica(f.concepto), f.clasificacion);
    porUnidad.set(f.unidad, u);
    if (s !== null && s !== f.clasificacion) {
      const k = `${normalizarConcepto(f.concepto)}|${signoDeImporte(f.importe)}|${s}|${f.clasificacion}`;
      const e = errores.get(k) ?? { concepto: f.concepto, sugerido: s, real: f.clasificacion, n: 0 };
      e.n++;
      errores.set(k, e);
    }
  }
  console.log(`\n== Por unidad (umbral ${COMBINACIONES[0].nombre}); entre paréntesis, el motor de keywords ==`);
  const unidades = [...porUnidad].sort((a, b) => b[1].idx.total - a[1].idx.total);
  for (const [unidad, m] of unidades) {
    console.log(
      `  ${unidad.padEnd(14)} n=${String(m.idx.total).padStart(5)} · historial: cobertura ${pct(m.idx.sugeridas, m.idx.total).padStart(6)} precisión ${pct(m.idx.aciertos, m.idx.sugeridas).padStart(6)}   (keywords: cobertura ${pct(m.kw.sugeridas, m.kw.total).padStart(6)} precisión ${pct(m.kw.aciertos, m.kw.sugeridas).padStart(6)})`
    );
  }

  console.log(`\n== 15 errores más frecuentes (umbral ${COMBINACIONES[0].nombre}) ==`);
  console.log(`  total de errores: ${total.sugeridas - total.aciertos}`);
  for (const e of [...errores.values()].sort((a, b) => b.n - a.n).slice(0, 15)) {
    console.log(`  ${String(e.n).padStart(4)} · "${e.concepto.slice(0, 60)}" · sugerido: ${e.sugerido} · real: ${e.real}`);
  }

  // ---- Las 18 filas de MACRO 599 del 1/10/2026 (semana 1 de 2026-10) ----
  // El índice de esta parte se entrena con TODO el historial confirmado (no solo el de entrenamiento).
  const indiceCompleto = construirIndice(confirmadas);
  const nuevas = await prisma.$queryRaw<{ fecha: Date; concepto: string; importe: string; clasificacion: string }[]>`
    SELECT mb.fecha, mb.concepto, mb.importe::text AS importe, mb.clasificacion
    FROM "MovimientoBancario" mb
    JOIN "EjecucionSemanal" es ON es.id = mb."ejecucionId"
    WHERE es.periodo = '2026-10' AND es."numeroSemana" = 1 AND mb."bancoYCuenta" = 'MACRO 599'
    ORDER BY mb.fecha, mb.id
  `;
  console.log(`\n== Filas de MACRO 599 en la semana 1 de 2026-10: ${nuevas.length} (índice entrenado con todo el historial) ==`);
  console.log("  (A) 3 apar. · 90%   (B) 2 apar. · 80%   (C) 1 apar. · cualquier dominancia, solo informativo");
  let conA = 0;
  let conB = 0;
  for (const n of nuevas) {
    const imp = Number(n.importe);
    const a = sugerir(n.concepto, imp, indiceCompleto, COMBINACIONES[0].u);
    const b = sugerir(n.concepto, imp, indiceCompleto, COMBINACIONES[1].u);
    const c = sugerir(n.concepto, imp, indiceCompleto, { minApariciones: 1, minDominancia: 0 });
    if (a) conA++;
    if (b) conB++;
    const f = (s: typeof a) => (s ? `${s.clasificacion} (${s.apariciones}×, ${(s.dominancia * 100).toFixed(0)}%)` : "—");
    console.log(`  ${n.fecha.toISOString().slice(0, 10)} · ${n.importe.padStart(14)} · ${n.concepto.slice(0, 48)}`);
    console.log(`        A: ${f(a)}   B: ${f(b)}   C: ${f(c)}`);
  }
  console.log(`  Con sugerencia: A ${conA}/${nuevas.length} · B ${conB}/${nuevas.length}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
