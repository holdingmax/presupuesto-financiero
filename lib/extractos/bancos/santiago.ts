import type { FilaExtracto, HojaGrilla, LecturaExtracto, OpcionesLectura } from "../tipos";
import { ErrorExtracto } from "../tipos";
import {
  armarLectura,
  conceptoOVacio,
  enOrdenCronologico,
  exigirEncabezado,
  filasDeDatos,
  leerCentavos,
  referenciaDeCelda,
  soloDigitos,
  textoDeCelda,
} from "./comun";

// Banco de Santiago del Estero (.csv, código BSE): latin-1, separador ";", campos con relleno
// de espacios. Fecha texto dd/mm/aaaa; Monto con coma decimal y sin miles ("-4280727,00");
// Saldo POSTERIOR; del más viejo al más nuevo. La columna Cuenta ("E.P.J. $ 2700000000002560")
// y CUIT Cuenta traen el número y el CUIT.

export const COLUMNAS_SANTIAGO = {
  cuenta: (t: string) => t === "CUENTA",
  cuit: (t: string) => t === "CUIT CUENTA",
  fecha: (t: string) => t === "FECHA",
  monto: (t: string) => t === "MONTO",
  concepto: (t: string) => t === "DESCRIPCION",
  saldo: (t: string) => t === "SALDO",
};

export function leerSantiago(hoja: HojaGrilla, opciones: OpcionesLectura = {}): LecturaExtracto {
  const enc = exigirEncabezado(hoja.filas, "Santiago del Estero", COLUMNAS_SANTIAGO, {
    referencia: (t) => /^N.{0,2} DE COMPROBANTE$/.test(t),
  });
  const avisos = new Set<string>();
  const crudas = filasDeDatos(hoja, enc, enc.col.fecha, { separadorTexto: "/" });

  const cuentas = new Set<string>();
  let cuitEnArchivo: string | null = null;

  const filas: FilaExtracto[] = crudas.map(({ fila, numeroFila, fecha }) => {
    const importe = leerCentavos(fila[enc.col.monto] ?? null, numeroFila, "el monto", avisos);
    if (importe === null) throw new ErrorExtracto(`Fila ${numeroFila}: falta el monto.`);
    const cuenta = textoDeCelda(fila[enc.col.cuenta] ?? null);
    if (cuenta) cuentas.add(cuenta);
    cuitEnArchivo ??= soloDigitos(textoDeCelda(fila[enc.col.cuit] ?? null));
    return {
      numeroFila,
      fecha,
      concepto: conceptoOVacio(fila[enc.col.concepto] ?? null),
      importeCentavos: importe,
      saldoCentavos: leerCentavos(fila[enc.col.saldo] ?? null, numeroFila, "el saldo", avisos),
      referencia: enc.col.referencia === undefined ? null : referenciaDeCelda(fila[enc.col.referencia] ?? null),
      causal: null,
      detalle: null,
    };
  });

  if (cuentas.size > 1) {
    throw new ErrorExtracto(
      `El archivo trae más de una cuenta (${[...cuentas].join(" · ")}). Cargalas por separado.`
    );
  }
  const [cuenta] = [...cuentas];
  const cuentaEnArchivo = cuenta ? (/(\d{6,})\s*$/.exec(cuenta)?.[1] ?? null) : null;

  return armarLectura(
    "BSE",
    enOrdenCronologico(filas, "asc"),
    { cuentaEnArchivo, cuitEnArchivo, avisos },
    opciones
  );
}
