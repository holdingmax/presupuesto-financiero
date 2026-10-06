import { quitarDiacriticos } from "@/lib/slug";

// Mismo criterio de normalización que verificarContinuidadSaldo (ejecucion/actions.ts)
// y normalizarClasificacion (lib/clasificaciones.ts): tolera mayúsculas, tildes y
// espacios de más — "Frances 891", "FRANCÉS 891" y "FRANCES  891 " son la misma cuenta.
export function normalizarCuenta(bancoYCuenta: string): string {
  return quitarDiacriticos(bancoYCuenta).trim().toUpperCase().replace(/\s+/g, " ");
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
