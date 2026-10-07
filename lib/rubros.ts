import { normalizarTexto } from "@/lib/texto";

// Equivalencias de clasificación para el Reporte (decisión 2026-10-07,
// confirmadas por Kike). Presupuesto guarda los valores de su lista propia
// (clasificacionesPresupuesto.ts) y Ejecución los técnicos que vienen del
// extracto ("COM Y GTOS BRIOS", "LIQ FINAL", …): para el mismo concepto pueden
// ser strings distintos, y el Reporte los emparejaba por igualdad exacta. Esta
// tabla dice qué clasificaciones guardadas cuentan para cada rubro — SOLO al
// leer, sin tocar ningún dato guardado.
//
// Regla general: la comparación ignora mayúsculas, tildes y espacios
// (normalizarTexto) — así "DIVIDENDOS"/"Dividendos" o "JUICIOS"/"Juicios" ya
// empatan sin una entrada acá. Las entradas de abajo son solo los alias que
// difieren en el texto mismo; cada una es un caso confirmado, nunca una
// adivinanza. Fuera a propósito (pendientes de Kike): "Intereses FCI" vs "FCI",
// "Préstamo Cocos". Y "MS" solo NO es "Préstamo MS": son gastos de Martín
// Salas, otro concepto.
//
// Pensada para reusarse: la lista de rubros (filas) la decide quien llama —
// hoy los 12 egresos del Reporte; mañana la plantilla por empresa.
const ALIAS_POR_RUBRO: Record<string, string[]> = {
  "Gastos bancarios": ["COM Y GTOS BRIOS"],
  "Liquidación final": ["LIQ FINAL"],
  "Prestamos y tarjetas": ["PREST BRIOS Y TC"],
  "Préstamo MS": ["PRESTAMOS MS"],
};

export type IndiceRubros = Map<string, string>;

// Índice clasificación normalizada → rubro, para una lista de rubros dada. Si
// dos rubros reclamaran la misma clasificación gana el primero de la lista
// (determinístico); con la tabla de hoy no pasa.
export function armarIndiceRubros(rubros: readonly string[]): IndiceRubros {
  const indice: IndiceRubros = new Map();
  for (const rubro of rubros) {
    for (const valor of [rubro, ...(ALIAS_POR_RUBRO[rubro] ?? [])]) {
      const clave = normalizarTexto(valor);
      if (!indice.has(clave)) indice.set(clave, rubro);
    }
  }
  return indice;
}

// Rubro al que pertenece una clasificación guardada, o null si no es de
// ninguno de los rubros del índice.
export function rubroDe(indice: IndiceRubros, clasificacion: string): string | null {
  return indice.get(normalizarTexto(clasificacion)) ?? null;
}
