// Reglas puras de las semanas globales por período (docs/ejecucion_global_plan.md §3.1 y
// §3.4). Sin Prisma: las usan lib/ejecucion.ts y subirExtracto, y tienen test.

// "AAAA-MM" de una fecha guardada como medianoche UTC (así se guardan los movimientos;
// getters UTC, no locales, por el mismo motivo que en aplicarCruceChequeIva).
export function periodoDeFecha(fecha: Date): string {
  return fecha.toISOString().slice(0, 7);
}

export function ordenarPeriodos(periodos: Iterable<string>): string[] {
  return Array.from(new Set(periodos)).sort();
}

// Próximo número de semana de un período: el mayor existente + 1 (1 si no hay ninguna).
export function siguienteNumeroSemana(numerosExistentes: number[]): number {
  return numerosExistentes.length === 0 ? 1 : Math.max(...numerosExistentes) + 1;
}

export type EstadoSemanaDelPeriodo = "ABIERTA" | "CERRADA";

export type DestinoDelPeriodo =
  // La semana donde se está subiendo el archivo (la de la URL): siempre abierta.
  | { periodo: string; tipo: "actual" }
  // El mes ya tiene una semana abierta: las filas de ese mes van ahí.
  | { periodo: string; tipo: "abierta" }
  // El mes no tiene ninguna semana: se crea la primera.
  | { periodo: string; tipo: "crear" }
  // El mes tiene semanas y todas están cerradas: por ahora no se carga (los movimientos
  // tardíos son la Fase 4). Frena la subida.
  | { periodo: string; tipo: "bloqueado" };

// Decide a qué semana va cada mes que trae el archivo (§3.4: "cada fila va a la semana
// abierta de SU mes"). `periodosConFilas`: meses de las filas NUEVAS (lo ya cargado no se
// reparte). `semanasPorPeriodo`: estados de las semanas existentes de cada mes.
export function resolverDestinos(
  periodoActual: string,
  periodosConFilas: Iterable<string>,
  semanasPorPeriodo: Map<string, EstadoSemanaDelPeriodo[]>
): DestinoDelPeriodo[] {
  return ordenarPeriodos(periodosConFilas).map((periodo): DestinoDelPeriodo => {
    if (periodo === periodoActual) return { periodo, tipo: "actual" };
    const semanas = semanasPorPeriodo.get(periodo) ?? [];
    if (semanas.length === 0) return { periodo, tipo: "crear" };
    if (semanas.includes("ABIERTA")) return { periodo, tipo: "abierta" };
    return { periodo, tipo: "bloqueado" };
  });
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// "2026-09" → "septiembre 2026".
export function nombreDePeriodo(periodo: string): string {
  const [anio, mes] = periodo.split("-").map(Number);
  return `${MESES[mes - 1] ?? periodo} ${anio}`;
}

// Mensaje de la subida frenada porque un mes ya no tiene ninguna semana abierta.
export function mensajeMesesCerrados(bloqueados: { periodo: string; filas: number }[]): string {
  const lista = bloqueados.map((b) => `${nombreDePeriodo(b.periodo)} (${b.filas} filas)`).join(", ");
  return `El archivo trae movimientos nuevos de un mes que ya tiene todas sus semanas cerradas: ${lista}. Por ahora no se cargan movimientos con fecha de un mes cerrado, y no se cargó nada. Subí solo los días del mes abierto, o consultá con Finanzas.`;
}

// Cuántas filas va a cada período, para la vista previa y el resultado ("septiembre: N filas;
// octubre: M filas").
export function repartoPorPeriodo(fechas: Date[]): { periodo: string; filas: number }[] {
  const cuenta = new Map<string, number>();
  for (const f of fechas) {
    const p = periodoDeFecha(f);
    cuenta.set(p, (cuenta.get(p) ?? 0) + 1);
  }
  return ordenarPeriodos(cuenta.keys()).map((periodo) => ({ periodo, filas: cuenta.get(periodo)! }));
}
