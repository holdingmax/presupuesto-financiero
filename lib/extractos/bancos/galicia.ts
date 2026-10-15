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
} from "./comun";

// Galicia (.xlsx): fila 1 con Fecha · Descripción · … · Débitos · Créditos · … · Número de
// Comprobante · … · Saldo. Débitos y Créditos vienen AMBOS positivos: importe = créditos −
// débitos. Saldo POSTERIOR; del más viejo al más nuevo. No trae número de cuenta. La fecha
// es una celda de fecha: se ignora el formato visible ("mm-dd-yy").

export const COLUMNAS_GALICIA = {
  fecha: igual("FECHA"),
  concepto: igual("DESCRIPCION"),
  debitos: igual("DEBITOS"),
  creditos: igual("CREDITOS"),
  saldo: igual("SALDO"),
};

export function leerGalicia(hoja: HojaGrilla, opciones: OpcionesLectura = {}): LecturaExtracto {
  const enc = exigirEncabezado(hoja.filas, "Galicia", COLUMNAS_GALICIA, {
    referencia: igual("NUMERO DE COMPROBANTE"),
  });
  const avisos = new Set<string>();
  const crudas = filasDeDatos(hoja, enc, enc.col.fecha, {});

  const filas: FilaExtracto[] = crudas.map(({ fila, numeroFila, fecha }) => {
    const debitos = leerCentavos(fila[enc.col.debitos] ?? null, numeroFila, "los débitos", avisos);
    const creditos = leerCentavos(fila[enc.col.creditos] ?? null, numeroFila, "los créditos", avisos);
    if (debitos === null && creditos === null) {
      throw new ErrorExtracto(`Fila ${numeroFila}: no tiene ni débitos ni créditos.`);
    }
    return {
      numeroFila,
      fecha,
      concepto: conceptoOVacio(fila[enc.col.concepto] ?? null),
      importeCentavos: Math.abs(creditos ?? 0) - Math.abs(debitos ?? 0),
      saldoCentavos: leerCentavos(fila[enc.col.saldo] ?? null, numeroFila, "el saldo", avisos),
      referencia: enc.col.referencia === undefined ? null : referenciaDeCelda(fila[enc.col.referencia] ?? null),
      causal: null,
      detalle: null,
    };
  });

  return armarLectura(
    "GALICIA",
    enOrdenCronologico(filas, "asc"),
    { cuentaEnArchivo: null, cuitEnArchivo: null, avisos },
    opciones
  );
}
