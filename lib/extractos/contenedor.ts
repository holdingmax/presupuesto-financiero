import type ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { ErrorExtracto, type Celda, type HojaGrilla } from "./tipos";

// Capa 1 (plan §3.1): bytes → grilla de celdas. Detecta el contenedor por CONTENIDO (los
// primeros bytes), no por la extensión: dos de los "".xls"" de los bancos ni siquiera son
// Excel (Santander es texto tabulado, Santiago un .csv).
//
// SheetJS (paquete "xlsx", 0.20.3 desde cdn.sheetjs.com, versión y hash fijos en
// package-lock.json) se usa SOLO para .xls binario (OLE2), y siempre leyendo el valor
// crudo de la celda (cell.v), nunca el texto formateado (cell.w): el formato visual de
// una celda ("0", "mm-dd-yy") redondea o cambia lo que se ve, no el dato.

export const LIMITE_BYTES = 10 * 1024 * 1024; // 10 MB para .xls y texto
export const LIMITE_FILAS = 50_000;

export type TipoContenedor = "xlsx" | "xls" | "html" | "texto";

const FIRMA_ZIP = [0x50, 0x4b, 0x03, 0x04];
const FIRMA_OLE2 = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

function empiezaCon(bytes: Uint8Array, firma: number[]) {
  return firma.every((b, i) => bytes[i] === b);
}

export function tipoContenedor(bytes: Uint8Array): TipoContenedor {
  if (empiezaCon(bytes, FIRMA_ZIP)) return "xlsx";
  if (empiezaCon(bytes, FIRMA_OLE2)) return "xls";
  // Un ".xls" que en realidad es HTML (algunos portales exportan así): no se adivina.
  const inicio = new TextDecoder("latin1").decode(bytes.subarray(0, 1024)).toLowerCase();
  if (inicio.includes("<html") || inicio.includes("<table") || inicio.includes("<!doctype html")) return "html";
  return "texto";
}

export function verificarTamano(bytes: Uint8Array) {
  if (bytes.byteLength > LIMITE_BYTES) {
    throw new ErrorExtracto("El archivo es demasiado grande para un extracto (más de 10 MB).");
  }
}

// --- .xls binario (BIFF / OLE2) y .xlsx crudo, vía SheetJS ---------------------------------
//
// OJO con los .xlsx: ExcelJS lee MAL las celdas de fecha de tipo t="d" (ISO 8601 en el XML,
// como las escribe Galicia): hace parseFloat("2026-10-01T…") = 2026 y devuelve el año 1905.
// Ese es el "1905" que veía Flavia. SheetJS las lee bien, así que los .xlsx de un banco se
// leen con SheetJS; ExcelJS queda para el camino madre y para detectar el formato.

export function grillasDeSheetJs(bytes: Uint8Array): HojaGrilla[] {
  verificarTamano(bytes);
  let libro: XLSX.WorkBook;
  try {
    libro = XLSX.read(bytes, {
      type: "buffer",
      raw: true, // valor crudo: nunca el texto formateado
      cellDates: false, // fechas como serial: las convierte fechas.ts con componentes UTC
      cellFormula: false,
      cellHTML: false,
      cellNF: false,
      cellStyles: false,
      cellText: false,
      bookVBA: false,
      sheetRows: LIMITE_FILAS + 1,
    });
  } catch {
    throw new ErrorExtracto("No pude leer el archivo .xls: está dañado o no es un extracto de Excel.");
  }

  const date1904 = Boolean(libro.Workbook?.WBProps?.date1904);
  return libro.SheetNames.map((nombre) => {
    const hoja = libro.Sheets[nombre];
    const ref = hoja["!ref"];
    if (!ref) return { nombre, filas: [], date1904 };
    // Se fuerza el rango a empezar en A1 para que índice de fila/columna = posición real.
    const rango = XLSX.utils.decode_range(ref);
    rango.s = { r: 0, c: 0 };
    hoja["!ref"] = XLSX.utils.encode_range(rango);
    const crudas = XLSX.utils.sheet_to_json<unknown[]>(hoja, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: true,
    });
    if (crudas.length > LIMITE_FILAS) {
      throw new ErrorExtracto(`El archivo tiene más de ${LIMITE_FILAS} filas: no parece un extracto.`);
    }
    return { nombre, filas: crudas.map((fila) => fila.map(celdaDeValor)), date1904 };
  });
}

function celdaDeValor(valor: unknown): Celda {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (typeof valor === "string") return valor;
  if (valor instanceof Date) return valor;
  if (typeof valor === "boolean") return valor ? "VERDADERO" : "FALSO";
  return null;
}

// --- .xlsx (OOXML) vía ExcelJS ----------------------------------------------------------

function valorDeCeldaExcelJs(valor: ExcelJS.CellValue): Celda {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) return valor;
  if (typeof valor === "number" || typeof valor === "string") return valor;
  if (typeof valor === "boolean") return valor ? "VERDADERO" : "FALSO";
  if (typeof valor === "object") {
    if ("result" in valor) return valorDeCeldaExcelJs(valor.result as ExcelJS.CellValue);
    if ("richText" in valor) return valor.richText.map((t) => t.text).join("");
    if ("text" in valor) return String(valor.text);
    // { error: "#REF!" } y cualquier otra cosa: sin dato.
  }
  return null;
}

// Solo para DETECTAR el formato (encabezados en las primeras filas): sus fechas no son
// confiables (ver arriba), por eso `maxFilas` corta la lectura en las primeras filas.
export function grillaDeHojaExcelJs(hoja: ExcelJS.Worksheet, maxFilas?: number): HojaGrilla {
  const filas: Celda[][] = [];
  const total = Math.min(hoja.rowCount, maxFilas ?? Infinity);
  if (maxFilas === undefined && total > LIMITE_FILAS) {
    throw new ErrorExtracto(`La hoja tiene más de ${LIMITE_FILAS} filas: no parece un extracto crudo.`);
  }
  for (let r = 1; r <= total; r++) {
    const fila: Celda[] = [];
    hoja.getRow(r).eachCell({ includeEmpty: false }, (celda, col) => {
      while (fila.length < col - 1) fila.push(null);
      fila[col - 1] = valorDeCeldaExcelJs(celda.value);
    });
    filas.push(fila);
  }
  return { nombre: hoja.name, filas, date1904: false };
}

// --- Texto (CSV / TSV / "xls" de texto) -------------------------------------------------

export function decodificarTexto(bytes: Uint8Array): string {
  let texto: string;
  try {
    // UTF-8 ESTRICTO: si el archivo no es UTF-8 válido, falla en vez de mostrar "?".
    texto = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // windows-1252 cubre latin-1 (Santander y Santiago del Estero).
    texto = new TextDecoder("windows-1252").decode(bytes);
  }
  return texto.replace(/^﻿/, "");
}

function contar(linea: string, caracter: string) {
  return linea.split(caracter).length - 1;
}

export function detectarSeparador(lineas: string[]): string | null {
  const muestra = lineas.filter((l) => l.trim() !== "").slice(0, 12);
  const candidatos = ["\t", ";", ","];
  let mejor: string | null = null;
  let mejorCuenta = 0;
  for (const c of candidatos) {
    const cuenta = muestra.reduce((acc, l) => acc + contar(l, c), 0);
    if (cuenta > mejorCuenta) {
      mejor = c;
      mejorCuenta = cuenta;
    }
  }
  return mejor;
}

// Parte una línea por el separador respetando campos entre comillas dobles.
function partirLinea(linea: string, separador: string): string[] {
  const campos: string[] = [];
  let actual = "";
  let entreComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (entreComillas) {
      if (c === '"' && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else if (c === '"') {
        entreComillas = false;
      } else {
        actual += c;
      }
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === separador) {
      campos.push(actual);
      actual = "";
    } else {
      actual += c;
    }
  }
  campos.push(actual);
  return campos;
}

export function grillaDeTexto(bytes: Uint8Array): HojaGrilla[] {
  verificarTamano(bytes);
  const lineas = decodificarTexto(bytes).split(/\r\n|\n|\r/);
  if (lineas.length > LIMITE_FILAS) {
    throw new ErrorExtracto(`El archivo tiene más de ${LIMITE_FILAS} filas: no parece un extracto.`);
  }
  const separador = detectarSeparador(lineas);
  const filas: Celda[][] = lineas.map((linea) => {
    const campos = separador ? partirLinea(linea, separador) : [linea];
    // Texto tal cual (incluidos los ceros a la izquierda); vacío → null.
    return campos.map((c) => (c.trim() === "" ? null : c.trim()));
  });
  return [{ nombre: "Texto", filas, date1904: false }];
}

// Entrada única bytes → hojas para un extracto crudo (los tests y subirExtracto).
export function grillasDeBytes(bytes: Uint8Array): HojaGrilla[] {
  const tipo = tipoContenedor(bytes);
  if (tipo === "html") {
    throw new ErrorExtracto(
      "Formato no soportado: el archivo es una página web guardada como .xls. Descargalo de nuevo desde el banco o guardalo como .xlsx desde Excel."
    );
  }
  if (tipo === "xls" || tipo === "xlsx") return grillasDeSheetJs(bytes);
  return grillaDeTexto(bytes);
}
