import { parsearImporteArgentino } from "@/lib/numero";

// Aritmética del prorrateo de un movimiento entre unidades de negocio (panel
// PanelDesgloseMovimiento + guardarDesgloseMovimiento). Todo en ENTEROS para que
// la suma del reparto dé EXACTO el importe del movimiento, sin errores de float:
// - montos en centavos (1.234,56 → 123456), siempre en magnitud positiva — el
//   signo del movimiento lo aplica el server al guardar;
// - porcentajes en centésimas de punto (33,33% → 3333; 100% → 10000).
// Lo único que se persiste es el importe de cada línea; el porcentaje se deriva.
// Sin imports de servidor: lo usa también el cliente.

export const CIEN_POR_CIENTO = 10000;

// Magnitud en centavos de un importe que ya tiene como mucho 2 decimales (lo que
// guarda MovimientoBancario.importe, Decimal(18,2)).
export function aCentavos(importe: number): number {
  return Math.round(Math.abs(importe) * 100);
}

// Monto tipeado en formato argentino ("1.500.000,50") → centavos positivos, o
// null si no es un número válido o tiene más de 2 decimales (no se redondea en
// silencio un monto que el usuario escribió).
export function parsearMontoACentavos(texto: string): number | null {
  if (!texto.trim()) return null;
  const n = parsearImporteArgentino(texto);
  if (!Number.isFinite(n)) return null;
  const centavos = Math.abs(n) * 100;
  const redondeado = Math.round(centavos);
  if (Math.abs(centavos - redondeado) > 1e-6) return null;
  return Number.isSafeInteger(redondeado) ? redondeado : null;
}

// "33,33" / "33.33" / "33,33 %" → 3333. Acá un punto es decimal (un porcentaje
// nunca lleva separador de miles), a diferencia de parsearImporteArgentino. Hasta
// 2 decimales y como máximo 100; null si no cumple.
export function parsearPorcentaje(texto: string): number | null {
  const limpio = texto.trim().replace(/[%\s]/g, "").replace(",", ".");
  const m = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(limpio);
  if (!m) return null;
  const valor = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return valor <= CIEN_POR_CIENTO ? valor : null;
}

// Reparte `total` centavos según porcentajes (centésimas). Cada línea recibe
// floor(total × p / 100%); si los porcentajes suman exactamente 100%, los
// centavos que sobran por el redondeo van, de a uno, a las líneas con mayor
// resto (método del mayor resto) — desempate por orden de la línea, así el
// resultado es determinístico y la suma da EXACTO el total. Si no suman 100%,
// devuelve solo los floor (el panel igual muestra la diferencia y no deja
// guardar). BigInt: total × p puede pasar 2^53 con importes grandes.
export function repartirPorPorcentajes(total: number, porcentajes: number[]): number[] {
  const T = BigInt(total);
  const cien = BigInt(CIEN_POR_CIENTO);
  const base = porcentajes.map((p) => (T * BigInt(p)) / cien);
  const resto = porcentajes.map((p) => (T * BigInt(p)) % cien);
  const sumaPorcentajes = porcentajes.reduce((a, p) => a + p, 0);
  if (sumaPorcentajes === CIEN_POR_CIENTO) {
    let falta = T - base.reduce((a, b) => a + b, BigInt(0));
    const orden = porcentajes
      .map((_, i) => i)
      .sort((a, b) => (resto[b] > resto[a] ? 1 : resto[b] < resto[a] ? -1 : a - b));
    for (const i of orden) {
      if (falta <= BigInt(0)) break;
      base[i] += BigInt(1);
      falta -= BigInt(1);
    }
  }
  return base.map((b) => Number(b));
}

// Porcentaje (centésimas, redondeado al más cercano) que representa `parte` sobre
// `total` — solo para mostrar.
export function porcentajeDeCentavos(parte: number, total: number): number {
  if (total === 0) return 0;
  const P = BigInt(parte);
  const T = BigInt(total);
  return Number((P * BigInt(2 * CIEN_POR_CIENTO) + T) / (T * BigInt(2)));
}

// Divide `total` (centavos o centésimas) en `n` partes enteras que suman exacto:
// el resto de la división va de a 1 a las primeras líneas.
export function partesIguales(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const resto = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < resto ? 1 : 0));
}

const FORMATO_DOS_DECIMALES: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

// "1.234,56" — lo vuelve a leer parsearMontoACentavos sin ambigüedad (tiene coma).
export function formatearCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("es-AR", FORMATO_DOS_DECIMALES);
}

// "33,33" — lo vuelve a leer parsearPorcentaje.
export function formatearPorcentaje(centesimas: number): string {
  return (centesimas / 100).toLocaleString("es-AR", FORMATO_DOS_DECIMALES);
}

// Centavos (magnitud) + signo → string decimal exacto para Prisma ("-1234.56"),
// sin pasar por float.
export function centavosADecimal(centavos: number, signo: 1 | -1): string {
  const pesos = Math.floor(centavos / 100);
  const cent = String(centavos % 100).padStart(2, "0");
  return `${signo < 0 && centavos > 0 ? "-" : ""}${pesos}.${cent}`;
}
