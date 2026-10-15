import { buscarEncabezado, igual, textoNormalizado } from "./bancos/comun";
import { COLUMNAS_BBVA, leerBbva } from "./bancos/bbva";
import { leerGalicia } from "./bancos/galicia";
import { COLUMNAS_MACRO, leerMacro } from "./bancos/macro";
import { COLUMNAS_NACION, leerNacion } from "./bancos/nacion";
import { COLUMNAS_SANTANDER, leerSantander } from "./bancos/santander";
import { COLUMNAS_SANTIAGO, leerSantiago } from "./bancos/santiago";
import {
  ErrorExtracto,
  type BancoExtracto,
  type HojaGrilla,
  type LecturaExtracto,
  type OpcionesLectura,
} from "./tipos";

// Capa 2 (plan §3.1): qué banco es, por CONTENIDO. La primera firma que coincide gana; si
// ninguna, null (el llamador responde "no reconozco este formato" sin cargar nada).

export type FormatoDetectado = "MADRE" | BancoExtracto;

// Firma del madre: fila 1 con Concepto e Importe y (BANCO Y CTA o UNIDAD DE NEG).
export function esFirmaMadre(hoja: HojaGrilla): boolean {
  const textos = (hoja.filas[0] ?? []).map(textoNormalizado);
  return (
    textos.includes("CONCEPTO") &&
    textos.includes("IMPORTE") &&
    (textos.includes("BANCO Y CTA") || textos.includes("UNIDAD DE NEG"))
  );
}

function hayTextoEnPreambulo(hoja: HojaGrilla, hastaFila: number, fragmento: string): boolean {
  return hoja.filas.slice(0, hastaFila).some((fila) => fila.some((c) => textoNormalizado(c).includes(fragmento)));
}

export function detectarFormato(hoja: HojaGrilla): FormatoDetectado | null {
  if (esFirmaMadre(hoja)) return "MADRE";

  const f = hoja.filas;
  if (buscarEncabezado(f, { debitos: igual("DEBITOS"), creditos: igual("CREDITOS") })) {
    return "GALICIA";
  }
  if (buscarEncabezado(f, COLUMNAS_BBVA)) return "FRANCES";

  // Macro: el encabezado NO está en la fila 1 (hay preámbulo). Así un madre recortado de una
  // sola cuenta, que tiene esas mismas columnas en la fila 1, no se confunde con un crudo.
  const macro = buscarEncabezado(f, COLUMNAS_MACRO);
  if (macro && macro.indiceFila > 0) return "MACRO";

  const nacion = buscarEncabezado(f, COLUMNAS_NACION);
  if (nacion && hayTextoEnPreambulo(hoja, nacion.indiceFila, "BANCO NACION")) return "BNA";

  if (buscarEncabezado(f, COLUMNAS_SANTANDER)) return "SANT";
  if (buscarEncabezado(f, COLUMNAS_SANTIAGO)) return "BSE";
  return null;
}

export function leerCrudo(
  hoja: HojaGrilla,
  banco: BancoExtracto,
  opciones: OpcionesLectura = {}
): LecturaExtracto {
  switch (banco) {
    case "MACRO":
      return leerMacro(hoja, opciones);
    case "GALICIA":
      return leerGalicia(hoja, opciones);
    case "FRANCES":
      return leerBbva(hoja, opciones);
    case "BNA":
      return leerNacion(hoja, opciones);
    case "SANT":
      return leerSantander(hoja, opciones);
    case "BSE":
      return leerSantiago(hoja, opciones);
  }
}

// Atajo: detecta y lee. Lanza ErrorExtracto si no reconoce el formato o si es el madre
// (el madre sigue por su propio camino, lib/extractos/madre.ts).
export function leerExtractoCrudo(hoja: HojaGrilla, opciones: OpcionesLectura = {}): LecturaExtracto {
  const formato = detectarFormato(hoja);
  if (formato === null) {
    throw new ErrorExtracto(
      "No reconozco este formato de extracto. Los bancos soportados son Macro, Galicia, BBVA Francés, Nación, Santander y Santiago del Estero (descargados tal cual del banco), y el archivo madre."
    );
  }
  if (formato === "MADRE") throw new ErrorExtracto("Es el archivo madre, no un extracto crudo de un banco.");
  return leerCrudo(hoja, formato, opciones);
}
