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

// Banco Nación (.xls BIFF), código BNA. Fecha en texto dd/mm/aaaa, Monto y Saldo en TEXTO
// ("$ -36.000.000,00"). El Saldo es el de ANTES del movimiento (los enlaces cierran así):
// se convierte a "después" sumándole el importe. Del más nuevo al más viejo. No trae
// número de cuenta.

export const COLUMNAS_NACION = {
  fecha: igual("FECHA"),
  referencia: igual("COMPROBANTE"),
  concepto: igual("CONCEPTO"),
  monto: igual("MONTO"),
  saldo: igual("SALDO"),
};

export function leerNacion(hoja: HojaGrilla, opciones: OpcionesLectura = {}): LecturaExtracto {
  const enc = exigirEncabezado(hoja.filas, "Nación", COLUMNAS_NACION);
  const avisos = new Set<string>();
  const crudas = filasDeDatos(hoja, enc, enc.col.fecha, { separadorTexto: "/" });

  const filas: FilaExtracto[] = crudas.map(({ fila, numeroFila, fecha }) => {
    const importe = leerCentavos(fila[enc.col.monto] ?? null, numeroFila, "el monto", avisos);
    if (importe === null) throw new ErrorExtracto(`Fila ${numeroFila}: falta el monto.`);
    const saldoPrevio = leerCentavos(fila[enc.col.saldo] ?? null, numeroFila, "el saldo", avisos);
    return {
      numeroFila,
      fecha,
      concepto: conceptoOVacio(fila[enc.col.concepto] ?? null),
      importeCentavos: importe,
      saldoCentavos: saldoPrevio === null ? null : saldoPrevio + importe,
      referencia: referenciaDeCelda(fila[enc.col.referencia] ?? null),
      causal: null,
      detalle: null,
    };
  });

  return armarLectura(
    "BNA",
    enOrdenCronologico(filas, "desc"),
    { cuentaEnArchivo: null, cuitEnArchivo: null, avisos },
    opciones
  );
}
