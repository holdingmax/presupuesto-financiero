import type { FilaExtracto, HojaGrilla, LecturaExtracto, OpcionesLectura } from "../tipos";
import { ErrorExtracto } from "../tipos";
import {
  armarLectura,
  conceptoOVacio,
  enOrdenCronologico,
  exigirEncabezado,
  filasDeDatos,
  igual,
  leerCentavos,
  referenciaDeCelda,
  soloDigitos,
  textoDeCelda,
  textoNormalizado,
} from "./comun";

// Macro (.xls BIFF): preámbulo de ~7 filas, tabla con celdas combinadas, pie con CUIT.
// Fecha = celda de fecha (serial), Importe con signo, Saldo POSTERIOR al movimiento,
// del más nuevo al más viejo.

export const COLUMNAS_MACRO = {
  fecha: igual("FECHA"),
  referencia: igual("NRO. DE REFERENCIA", "NRO DE REFERENCIA", "NRO REFERENCIA", "NRO, DE REFERENCIA"),
  causal: igual("CAUSAL"),
  concepto: igual("CONCEPTO"),
  importe: igual("IMPORTE"),
  saldo: igual("SALDO"),
};

export function leerMacro(hoja: HojaGrilla, opciones: OpcionesLectura = {}): LecturaExtracto {
  const enc = exigirEncabezado(hoja.filas, "Macro", COLUMNAS_MACRO);
  const avisos = new Set<string>();
  const crudas = filasDeDatos(hoja, enc, enc.col.fecha, {});

  const filas: FilaExtracto[] = crudas.map(({ fila, numeroFila, fecha }) => {
    const importe = leerCentavos(fila[enc.col.importe] ?? null, numeroFila, "el importe", avisos);
    if (importe === null) throw new ErrorExtracto(`Fila ${numeroFila}: falta el importe.`);
    return {
      numeroFila,
      fecha,
      concepto: conceptoOVacio(fila[enc.col.concepto] ?? null),
      importeCentavos: importe,
      saldoCentavos: leerCentavos(fila[enc.col.saldo] ?? null, numeroFila, "el saldo", avisos),
      referencia: referenciaDeCelda(fila[enc.col.referencia] ?? null),
      causal: referenciaDeCelda(fila[enc.col.causal] ?? null),
      detalle: null,
    };
  });

  // Número de cuenta: en el preámbulo, la fila "Número" + valor. CUIT: en el pie,
  // "Empresa: 30707414738 - RAZÓN SOCIAL".
  let cuentaEnArchivo: string | null = null;
  for (let i = 0; i < enc.indiceFila && !cuentaEnArchivo; i++) {
    const fila = hoja.filas[i];
    if (textoNormalizado(fila[0] ?? null) === "NUMERO") {
      const valor = fila.slice(1).find((c) => c !== null && textoDeCelda(c) !== "");
      cuentaEnArchivo = valor === undefined ? null : soloDigitos(textoDeCelda(valor ?? null));
    }
  }
  let cuitEnArchivo: string | null = null;
  for (const fila of hoja.filas) {
    const m = /^EMPRESA:\s*(\d{11})\b/i.exec(textoDeCelda(fila[0] ?? null));
    if (m) cuitEnArchivo = m[1];
  }

  return armarLectura(
    "MACRO",
    enOrdenCronologico(filas, "desc"),
    { cuentaEnArchivo, cuitEnArchivo, avisos },
    opciones
  );
}
