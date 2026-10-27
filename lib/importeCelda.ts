// Parseo del Importe de una celda de la carga masiva del Presupuesto
// (subirLineasMasivo). Distinto de parsearImporteArgentino (lib/numero.ts), que es
// para lo tipeado a mano en la carga línea por línea y no se toca.
//
// Los números de Excel pasan tal cual. Una celda de TEXTO se acepta solo si no hay
// duda de cómo leerla; el caso ambiguo ("150.000", "1.500": ¿ciento cincuenta mil o
// 150?) da error en vez de leerse mal en silencio.
export type ResultadoImporteCelda = { valor: number | null; error?: string };

// Una celda con fórmula viene de ExcelJS como { formula, result, ... } en vez de un número plano.
function esObjetoConResultadoNumerico(valor: unknown): valor is { result: number } {
  return (
    typeof valor === "object" &&
    valor !== null &&
    "result" in valor &&
    typeof (valor as { result: unknown }).result === "number" &&
    Number.isFinite((valor as { result: number }).result)
  );
}

const SOLO_DIGITOS = /^-?\d+$/;
// Argentino: coma decimal; los puntos, si hay, son miles en grupos de 3 ("1.500,00").
const ARGENTINO = /^-?(\d+|\d{1,3}(\.\d{3})+),\d+$/;
// Un solo punto con 1 o 2 decimales: decimal ("1250.75").
const PUNTO_DECIMAL = /^-?\d+\.\d{1,2}$/;
// Coma + exactamente 3 dígitos y ningún otro separador ("1,500"): ¿decimal argentino o miles inglés?
const COMA_AMBIGUA = /^-?\d+,\d{3}$/;
// Puntos en grupos de 3 y sin coma ("150.000", "1.500.000"): no se sabe si son miles o decimales.
const PUNTOS_AMBIGUOS = /^-?\d{1,3}(\.\d{3})+$/;

export function extraerImporteCelda(valorCrudo: unknown): ResultadoImporteCelda {
  if (typeof valorCrudo === "number") {
    return { valor: Number.isFinite(valorCrudo) ? valorCrudo : null };
  }
  if (esObjetoConResultadoNumerico(valorCrudo)) {
    return { valor: valorCrudo.result };
  }
  if (typeof valorCrudo !== "string") return { valor: null };

  const texto = valorCrudo.trim();
  if (!texto) return { valor: null };

  if (SOLO_DIGITOS.test(texto) || PUNTO_DECIMAL.test(texto)) return { valor: Number(texto) };
  if (COMA_AMBIGUA.test(texto)) {
    return {
      valor: null,
      error: `«${texto}» es ambiguo: cargalo como número de Excel o escribí los miles con punto y los decimales con coma (150.000,00)`,
    };
  }
  if (ARGENTINO.test(texto)) return { valor: Number(texto.replace(/\./g, "").replace(",", ".")) };

  if (PUNTOS_AMBIGUOS.test(texto)) {
    return {
      valor: null,
      error: `«${texto}» es ambiguo: cargalo como número de Excel o con coma decimal (${texto},00)`,
    };
  }
  return {
    valor: null,
    error: `«${texto}» no es un importe válido: cargalo como número de Excel o con coma decimal (150.000,00)`,
  };
}
