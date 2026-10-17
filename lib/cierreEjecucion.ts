import { normalizarCuenta } from "@/lib/unidadesNegocio";

// Chequeos del cierre semanal (docs/ejecucion_global_plan.md §3.5, D-6). Puros.
//   - BLOQUEA: movimientos no ignorados con una unidad que no pertenece a ninguna empresa
//     activa (SIN ASIGNAR, valores viejos), contando las porciones de prorrateo.
//   - SOLO AVISA: movimientos SIN CLASIFICAR y sugerencias sin confirmar.

export type FilaParaCierre = {
  ignorado: boolean;
  unidadNegocio: string;
  clasificacion: string;
  sugeridaPorSistema: boolean;
  unidadSugeridaPorSistema: boolean;
  desglose: { unidadNegocio: string }[];
};

export type SinUnidad = { unidad: string; movimientos: number };

// Misma regla que la consulta SQL de lib/reporte.ts (contarSinUnidadEnSemana): un movimiento
// prorrateado cuenta por sus porciones (nunca además por su unidad propia), uno sin
// prorrateo por su unidad; los ignorados no cuentan. Agrupado por unidad normalizada.
export function unidadesSinEmpresa(filas: FilaParaCierre[], unidadesConEmpresa: string[]): SinUnidad[] {
  const conEmpresa = new Set(unidadesConEmpresa.map(normalizarCuenta));
  const porUnidad = new Map<string, number>();
  for (const f of filas) {
    if (f.ignorado) continue;
    const unidades =
      f.desglose.length > 0 ? new Set(f.desglose.map((d) => normalizarCuenta(d.unidadNegocio))) : [normalizarCuenta(f.unidadNegocio)];
    for (const u of unidades) {
      if (!conEmpresa.has(u)) porUnidad.set(u, (porUnidad.get(u) ?? 0) + 1);
    }
  }
  return Array.from(porUnidad, ([unidad, movimientos]) => ({ unidad, movimientos })).sort(
    (a, b) => b.movimientos - a.movimientos || a.unidad.localeCompare(b.unidad, "es")
  );
}

export type ConteosParaCierre = {
  sinUnidad: SinUnidad[];
  // No ignorados con clasificación "SIN CLASIFICAR".
  sinClasificar: number;
  // Con clasificación sugerida por el sistema sin confirmar / unidad sugerida sin confirmar.
  clasificacionesSugeridas: number;
  unidadesSugeridas: number;
};

export function contarParaCierre(filas: FilaParaCierre[], unidadesConEmpresa: string[]): ConteosParaCierre {
  const vivas = filas.filter((f) => !f.ignorado);
  return {
    sinUnidad: unidadesSinEmpresa(filas, unidadesConEmpresa),
    sinClasificar: vivas.filter((f) => f.clasificacion === "SIN CLASIFICAR").length,
    clasificacionesSugeridas: vivas.filter((f) => f.sugeridaPorSistema).length,
    unidadesSugeridas: vivas.filter((f) => f.unidadSugeridaPorSistema).length,
  };
}

export type EvaluacionCierre =
  | { puedeCerrar: false; bloqueos: SinUnidad[]; mensajeBloqueo: string; avisos: string[] }
  | { puedeCerrar: true; bloqueos: []; avisos: string[] };

export function evaluarCierre(c: ConteosParaCierre): EvaluacionCierre {
  const avisos: string[] = [];
  if (c.sinClasificar > 0) avisos.push(`${c.sinClasificar} movimientos están SIN CLASIFICAR.`);
  if (c.clasificacionesSugeridas > 0) {
    avisos.push(`${c.clasificacionesSugeridas} movimientos tienen una clasificación sugerida sin confirmar.`);
  }
  if (c.unidadesSugeridas > 0) {
    avisos.push(`${c.unidadesSugeridas} movimientos tienen una unidad sugerida sin confirmar.`);
  }
  if (c.sinUnidad.length > 0) {
    const total = c.sinUnidad.reduce((a, s) => a + s.movimientos, 0);
    const detalle = c.sinUnidad.map((s) => `${s.unidad} (${s.movimientos})`).join(", ");
    return {
      puedeCerrar: false,
      bloqueos: c.sinUnidad,
      mensajeBloqueo: `No se puede cerrar la semana: ${total} movimientos tienen una unidad que no pertenece a ninguna empresa: ${detalle}. Asignales una unidad antes de cerrar (o ignoralos).`,
      avisos,
    };
  }
  return { puedeCerrar: true, bloqueos: [], avisos };
}
