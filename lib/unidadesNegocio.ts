// Sin imports de servidor (solo lib/texto, puro): este módulo lo usan también
// TablaMovimientos y PanelDesgloseMovimiento, que son "use client".
import { normalizarTexto } from "@/lib/texto";

// Lista CERRADA de unidades de negocio (decisión 2026-10-06, confirmada por
// Leticia) — la ofrecen el <select> de la unidad de cada fila y el panel de
// prorrateo, y la valida el server (actualizarMovimiento /
// guardarDesgloseMovimiento). Es el nombre exacto que se guarda.
// - EXPENSAS: destino aparte, PROVISORIO hasta confirmarlo con Kike (también
//   existe como clasificación). No pertenece a ninguna empresa todavía: el
//   Reporte la muestra en el bloque "No asignado a ninguna empresa".
// - BRADENTON (agregada 2026-10-07): unidad propia de la empresa Bradenton.
// Qué unidad pertenece a qué empresa NO vive acá: es Empresa.unidadesNegocio,
// editable en /admin/unidades-negocio.
// - Fuera a propósito: CREAR, las razones sociales que entraban por la columna
//   EMPRESA (QUINTEROS, WHEELER, GONZALEZ, SIERRA, ESTEVEZ), Gold Seguridad,
//   Cielos y Tucson (razones sociales), "SIN ASIGNAR" (es la marca de vacío),
//   "SPP " con espacio y TEST2. Una fila vieja con uno de esos valores no se
//   rompe: el <select> lo muestra como opción extra (ver opcionesUnidad).
// Las unidades de UNIDAD_POR_CUENTA (más abajo) tienen que estar todas acá.
export const UNIDADES_NEGOCIO = [
  "AVIANOR",
  "BRADENTON",
  "BRILLANTE",
  "EXPENSAS",
  "FREDY",
  "HAVANNA",
  "HWC",
  "JPS",
  "LOGISTICA",
  "MANTENOR",
  "RADIO",
  "SPP",
] as const;

export function esUnidadDeLaLista(valor: string): boolean {
  return (UNIDADES_NEGOCIO as readonly string[]).includes(valor);
}

// Opciones para un <select> de unidad: la lista cerrada + los valores viejos
// fuera de lista que ya tiene el registro (ej. "CREAR", "SIN ASIGNAR"), para no
// romperlo ni cambiarlo en silencio — mismo criterio que el <select> de
// clasificación en TablaMovimientos. Los extras van primero, tal cual.
export function opcionesUnidad(valoresActuales: string[]): string[] {
  const extras = Array.from(
    new Set(valoresActuales.filter((v) => v !== "" && !esUnidadDeLaLista(v)))
  );
  return [...extras, ...UNIDADES_NEGOCIO];
}

// Mismo criterio de normalización que verificarContinuidadSaldo (ejecucion/actions.ts)
// y normalizarClasificacion (lib/clasificaciones.ts): tolera mayúsculas, tildes y
// espacios de más — "Frances 891", "FRANCÉS 891" y "FRANCES  891 " son la misma cuenta.
export function normalizarCuenta(bancoYCuenta: string): string {
  return normalizarTexto(bancoYCuenta);
}

// "Unidad madre" de cada cuenta bancaria, confirmada con el archivo madre de julio
// 2026 (16.521 movimientos): esta unidad acierta en el 96,5% de los movimientos
// (sin contar Panini). Solo cuentas numeradas — son únicas en todo el holding.
// EFECTIVO / CHEQUE / DÓLAR quedan afuera a propósito: se repiten entre empresas,
// así que no tienen una unidad madre posible.
//
// Coincidencia EXACTA de la clave normalizada, no "contiene" (a diferencia de
// REGLAS_CLASIFICACION_AUTOMATICA): con substring, "MACRO 037" matchearía dentro de
// "MACRO 8037". Cada cuenta nueva es un caso confirmado, no una adivinanza — una
// grafía distinta de una cuenta ya listada (ej. "MACRO 37" sin el cero) se agrega
// como clave más, no con lógica difusa. Los valores son el nombre exacto que ya
// existe en la base: "SPP" siempre sin espacio final (hay filas viejas "SPP "
// anteriores al .trim() de subirExtracto, no repetir esa variante acá).
const UNIDAD_POR_CUENTA: Record<string, string> = {
  "MACRO 037": "BRILLANTE",
  "MACRO 8037": "BRILLANTE",
  "BNA 497": "BRILLANTE",
  "BSE 042": "BRILLANTE",
  "MACRO 182": "BRILLANTE",
  "MACRO 247": "BRILLANTE",
  "FRANCES 603": "BRILLANTE",
  "GALICIA 336": "BRILLANTE",

  "MACRO 325": "RADIO",
  "MACRO 924": "RADIO",
  "MACRO 278": "RADIO",
  "MACRO 689": "RADIO",
  "MACRO 931": "RADIO",
  "MACRO 216": "RADIO",

  "MACRO 565": "HAVANNA",
  "GALICIA 548": "HAVANNA",
  "GALICIA 388": "HAVANNA",
  "MACRO 597": "HAVANNA",

  "FRANCES 891": "LOGISTICA",
  "MACRO 777": "LOGISTICA",
  "GALICIA 455": "LOGISTICA",

  "BSE 560": "SPP",
  "MACRO 281": "SPP",
  "GALICIA 285": "SPP",
  "FRANCES 825": "SPP",
  "MACRO 599": "SPP",

  "GALICIA 731": "MANTENOR",
  "MACRO 623": "MANTENOR",
  "MACRO 794": "MANTENOR",
};

// Único punto de uso: subirExtracto (ejecucion/actions.ts), solo cuando el archivo
// no trae unidad (o trae "SIN ASIGNAR") — nunca pisa una unidad explícita. Devuelve
// null si la cuenta no está en el mapa (el llamador cae a "SIN ASIGNAR", igual que
// siempre).
export function proponerUnidadPorCuenta(bancoYCuenta: string): string | null {
  return UNIDAD_POR_CUENTA[normalizarCuenta(bancoYCuenta)] ?? null;
}
