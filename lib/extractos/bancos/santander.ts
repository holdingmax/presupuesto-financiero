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
} from "./comun";

// Santander (código SANT): "xls" que en realidad es TEXTO tabulado en latin-1. Fecha texto
// dd/mm/aaaa; Importe y Saldo en texto argentino con negativos entre paréntesis
// "(74.223,22)". Saldo POSTERIOR; del más nuevo al más viejo. Número de cuenta en el
// preámbulo: "Cuenta corriente en Pesos Nro. 069-008609/9". Sin CUIT.

export const COLUMNAS_SANTANDER = {
  fecha: igual("FECHA"),
  sucursal: igual("SUC. ORIGEN"),
  codigo: igual("COD. OPERATIVO"),
  concepto: igual("CONCEPTO"),
  importe: igual("IMPORTE"),
  saldo: igual("SALDO"),
};

export function leerSantander(hoja: HojaGrilla, opciones: OpcionesLectura = {}): LecturaExtracto {
  const enc = exigirEncabezado(hoja.filas, "Santander", COLUMNAS_SANTANDER, {
    referencia: igual("REFERENCIA"),
  });
  const avisos = new Set<string>();
  const crudas = filasDeDatos(hoja, enc, enc.col.fecha, { separadorTexto: "/" });

  const filas: FilaExtracto[] = crudas.map(({ fila, numeroFila, fecha }) => {
    const importe = leerCentavos(fila[enc.col.importe] ?? null, numeroFila, "el importe", avisos);
    if (importe === null) throw new ErrorExtracto(`Fila ${numeroFila}: falta el importe.`);
    return {
      numeroFila,
      fecha,
      concepto: conceptoOVacio(fila[enc.col.concepto] ?? null),
      importeCentavos: importe,
      saldoCentavos: leerCentavos(fila[enc.col.saldo] ?? null, numeroFila, "el saldo", avisos),
      referencia: enc.col.referencia === undefined ? null : referenciaDeCelda(fila[enc.col.referencia] ?? null),
      causal: referenciaDeCelda(fila[enc.col.codigo] ?? null),
      detalle: null,
    };
  });

  let cuentaEnArchivo: string | null = null;
  for (let i = 0; i < enc.indiceFila && !cuentaEnArchivo; i++) {
    const m = /\bNRO\.?\s*([\d\-/.]+)/i.exec(textoDeCelda(hoja.filas[i][0] ?? null));
    if (m) cuentaEnArchivo = soloDigitos(m[1]);
  }

  return armarLectura(
    "SANT",
    enOrdenCronologico(filas, "desc"),
    { cuentaEnArchivo, cuitEnArchivo: null, avisos },
    opciones
  );
}
