import { centavosDeNumero } from "@/lib/conteoMovimientos";
import type { Celda } from "./tipos";

// Números de los extractos de banco → centavos ENTEROS, sin pasar por float cuando
// vienen como texto. Formato argentino: miles con punto, decimal con coma.

export type CentavosLeidos = { centavos: number; redondeado: boolean };

const MILES_Y_DECIMAL = /^\d{1,3}(\.\d{3})+(,\d+)?$/; // 1.234.567,89 · 1.234
const SIN_MILES = /^\d+(,\d+)?$/; // 1234567,89 · 4280727 (Santiago)

// Devuelve null si el texto no tiene una forma reconocida (no se adivina: "1234.56" o
// "1,234.56" se rechazan en vez de leerse como otra cosa). En estos bancos un "." solo
// es separador de miles y una "," sola es el decimal.
// Negativos: "-1.234,56", "(1.234,56)" y "1.234,56-". El "$" y los espacios (incluido el
// espacio duro) se ignoran: "$ -36.000.000,00".
export function centavosDeTextoArgentino(texto: string): CentavosLeidos | null {
  let t = texto.replace(/[\s $]/g, "");
  let negativo = false;

  if (t.startsWith("(") && t.endsWith(")")) {
    negativo = true;
    t = t.slice(1, -1);
  }
  if (/^[-−]/.test(t)) {
    if (negativo) return null;
    negativo = true;
    t = t.slice(1);
  }
  if (/[-−]$/.test(t)) {
    if (negativo) return null;
    negativo = true;
    t = t.slice(0, -1);
  }
  if (t.startsWith("+")) t = t.slice(1);

  if (!MILES_Y_DECIMAL.test(t) && !SIN_MILES.test(t)) return null;

  const [parteEntera, decimales = ""] = t.split(",");
  const entero = parteEntera.replace(/\./g, "");
  if (entero.length > 13) return null; // no entra en centavos exactos de un double

  let centavos = Number(entero) * 100 + Number((decimales + "00").slice(0, 2));
  const resto = decimales.slice(2);
  const redondeado = /[1-9]/.test(resto);
  if (redondeado && resto[0] >= "5") centavos += 1; // mitad lejos del cero

  return { centavos: negativo && centavos !== 0 ? -centavos : centavos, redondeado };
}

export function esCeldaVacia(celda: Celda): boolean {
  return celda === null || (typeof celda === "string" && celda.trim() === "");
}

// Celda numérica o de texto → centavos. null = no se pudo leer (celda vacía NO: eso se
// consulta antes con esCeldaVacia). Las celdas numéricas pasan por centavosDeNumero, que
// ya existe (redondea como Postgres: 1.005 → 101 y no 100 por el binario).
export function centavosDeCelda(celda: Celda): CentavosLeidos | null {
  if (typeof celda === "number") {
    if (!Number.isFinite(celda)) return null;
    const centavos = centavosDeNumero(celda);
    // Más de 2 decimales "de verdad" (no el ruido de un cálculo en coma flotante).
    const redondeado = Math.abs(celda * 100 - Math.round(celda * 100)) > 1e-3;
    return { centavos, redondeado };
  }
  if (typeof celda === "string") return centavosDeTextoArgentino(celda);
  return null;
}
