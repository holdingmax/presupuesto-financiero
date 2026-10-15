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

// BBVA Francés (.xls BIFF), código FRANCES. Preámbulo "Empresa: / Cuenta: / …", tabla con
// Fecha (TEXTO dd-mm-aaaa) · Fecha Valor · Concepto · … · Número Documento · … · Crédito ·
// Débito · Detalle. El débito ya viene negativo, el crédito positivo, la celda vacía es "".
// NO trae saldo por fila (el "Saldo:" del encabezado no cuadra con los movimientos).

export const COLUMNAS_BBVA = {
  fecha: igual("FECHA"),
  fechaValor: igual("FECHA VALOR"),
  concepto: igual("CONCEPTO"),
  credito: igual("CREDITO"),
  debito: igual("DEBITO"),
};

export function leerBbva(hoja: HojaGrilla, opciones: OpcionesLectura = {}): LecturaExtracto {
  const enc = exigirEncabezado(hoja.filas, "BBVA", COLUMNAS_BBVA, {
    referencia: igual("NUMERO DOCUMENTO"),
    detalle: igual("DETALLE"),
  });
  const avisos = new Set<string>();
  const crudas = filasDeDatos(hoja, enc, enc.col.fecha, { separadorTexto: "-" });

  const filas: FilaExtracto[] = crudas.map(({ fila, numeroFila, fecha }) => {
    const credito = leerCentavos(fila[enc.col.credito] ?? null, numeroFila, "el crédito", avisos);
    const debito = leerCentavos(fila[enc.col.debito] ?? null, numeroFila, "el débito", avisos);
    if (credito === null && debito === null) {
      throw new ErrorExtracto(`Fila ${numeroFila}: no tiene ni crédito ni débito.`);
    }
    // |crédito| − |débito|: como el débito ya viene negativo, abs evita invertirlo si algún
    // día viene positivo.
    const detalle = enc.col.detalle === undefined ? "" : textoDeCelda(fila[enc.col.detalle] ?? null);
    const concepto = conceptoOVacio(fila[enc.col.concepto] ?? null);
    return {
      numeroFila,
      fecha,
      concepto: detalle ? `${concepto} ${detalle}` : concepto,
      importeCentavos: Math.abs(credito ?? 0) - Math.abs(debito ?? 0),
      saldoCentavos: null,
      referencia: enc.col.referencia === undefined ? null : referenciaDeCelda(fila[enc.col.referencia] ?? null),
      causal: null,
      detalle: detalle || null,
    };
  });

  let cuentaEnArchivo: string | null = null;
  let cuitEnArchivo: string | null = null;
  for (let i = 0; i < enc.indiceFila; i++) {
    const fila = hoja.filas[i];
    const clave = textoNormalizado(fila[0] ?? null);
    const valor = textoDeCelda(fila[1] ?? null);
    if (clave === "CUENTA:") {
      // "223-008789/1(CC $)" → los dígitos de antes del paréntesis.
      cuentaEnArchivo = soloDigitos(valor.split("(")[0]);
    } else if (clave === "EMPRESA:") {
      cuitEnArchivo = /\((\d{11})\)/.exec(valor)?.[1] ?? null;
    }
  }

  // El archivo trae el orden de la descarga; sin saldo por fila se confía en las fechas y,
  // si caen el mismo día, en el orden del archivo (como viene).
  return armarLectura(
    "FRANCES",
    enOrdenCronologico(filas, "asc"),
    { cuentaEnArchivo, cuitEnArchivo, avisos },
    opciones
  );
}
