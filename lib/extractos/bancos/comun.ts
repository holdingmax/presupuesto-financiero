import { normalizarEncabezado } from "../encabezados";
import { avisoDeRangoLejano, fechaDeCelda, type OpcionesFecha } from "../fechas";
import { centavosDeCelda, esCeldaVacia } from "../numero";
import {
  ErrorExtracto,
  type BancoExtracto,
  type Celda,
  type FilaExtracto,
  type HojaGrilla,
  type LecturaExtracto,
  type OpcionesLectura,
} from "../tipos";

// Piezas compartidas por los lectores de cada banco (plan §3.1).

const FILAS_BUSQUEDA_ENCABEZADO = 40;

export type Predicado = (textoNormalizado: string) => boolean;
export const igual =
  (...opciones: string[]): Predicado =>
  (t) =>
    opciones.includes(t);

export function textoDeCelda(celda: Celda): string {
  if (celda === null) return "";
  if (celda instanceof Date) return celda.toISOString();
  return String(celda).trim();
}

export function textoNormalizado(celda: Celda): string {
  return normalizarEncabezado(textoDeCelda(celda));
}

export type Encabezado = { indiceFila: number; col: Record<string, number> };

// Busca por TEXTO (no por número de fila) la primera fila de las primeras ~40 que contenga
// todas las columnas obligatorias. Las columnas se ubican por el texto de su celda, así los
// huecos de las celdas combinadas (Macro) no importan.
export function buscarEncabezado(
  filas: Celda[][],
  obligatorias: Record<string, Predicado>,
  opcionales: Record<string, Predicado> = {}
): Encabezado | null {
  const limite = Math.min(filas.length, FILAS_BUSQUEDA_ENCABEZADO);
  for (let i = 0; i < limite; i++) {
    const textos = filas[i].map(textoNormalizado);
    const col: Record<string, number> = {};
    let completa = true;
    for (const [campo, pred] of Object.entries(obligatorias)) {
      const idx = textos.findIndex(pred);
      if (idx < 0) {
        completa = false;
        break;
      }
      col[campo] = idx;
    }
    if (!completa) continue;
    for (const [campo, pred] of Object.entries(opcionales)) {
      const idx = textos.findIndex(pred);
      if (idx >= 0) col[campo] = idx;
    }
    return { indiceFila: i, col };
  }
  return null;
}

export function exigirEncabezado(
  filas: Celda[][],
  nombreBanco: string,
  obligatorias: Record<string, Predicado>,
  opcionales: Record<string, Predicado> = {}
): Encabezado {
  const enc = buscarEncabezado(filas, obligatorias, opcionales);
  if (!enc) {
    throw new ErrorExtracto(
      `No encontré la fila de encabezados de ${nombreBanco} (${Object.keys(obligatorias).join(", ")}). ¿Es el archivo correcto?`
    );
  }
  return enc;
}

export type FilaCruda = { fila: Celda[]; numeroFila: number; fecha: Date };

// Filas de datos: desde el encabezado hasta la primera fila SIN fecha válida (corta el pie
// de Macro y la línea de descarga de Santander). Una fecha con forma de fecha pero inválida
// frena la carga con el número de fila.
export function filasDeDatos(
  hoja: HojaGrilla,
  enc: Encabezado,
  colFecha: number,
  opciones: OpcionesFecha
): FilaCruda[] {
  const datos: FilaCruda[] = [];
  let i = enc.indiceFila + 1;
  for (; i < hoja.filas.length; i++) {
    const celda = hoja.filas[i][colFecha] ?? null;
    const r = fechaDeCelda(celda, { ...opciones, date1904: hoja.date1904 });
    if (r.estado === "vacia") break;
    if (r.estado === "invalida") {
      throw new ErrorExtracto(`Fila ${i + 1}: fecha inválida (${r.motivo}).`);
    }
    datos.push({ fila: hoja.filas[i], numeroFila: i + 1, fecha: r.fecha });
  }
  // Red de seguridad: si después del corte aparece otra fila con fecha válida, no se
  // descarta en silencio.
  for (let j = i + 1; j < hoja.filas.length; j++) {
    const r = fechaDeCelda(hoja.filas[j][colFecha] ?? null, { ...opciones, date1904: hoja.date1904 });
    if (r.estado === "ok") {
      throw new ErrorExtracto(
        `Fila ${j + 1}: hay una fecha después de una fila sin fecha (fila ${i + 1}). No sé si el archivo tiene datos cortados; revisalo.`
      );
    }
  }
  return datos;
}

// Importe/saldo obligatorio u opcional. Celda con valor ilegible → frena con la fila.
export function leerCentavos(
  celda: Celda,
  numeroFila: number,
  columna: string,
  avisos: Set<string>
): number | null {
  if (esCeldaVacia(celda)) return null;
  const r = centavosDeCelda(celda);
  if (!r) {
    throw new ErrorExtracto(`Fila ${numeroFila}: no pude leer ${columna} ("${textoDeCelda(celda)}").`);
  }
  if (r.redondeado) {
    avisos.add(`Hay valores de ${columna} con más de 2 decimales: se redondearon al centavo.`);
  }
  return r.centavos;
}

export function referenciaDeCelda(celda: Celda): string | null {
  if (celda === null) return null;
  const t = typeof celda === "number" ? String(celda) : textoDeCelda(celda);
  return t === "" ? null : t;
}

export function soloDigitos(texto: string): string | null {
  const d = texto.replace(/\D/g, "");
  return d === "" ? null : d;
}

// Decide el orden cronológico: por las fechas del archivo (primera vs última); si todas
// caen el mismo día se usa el orden habitual del banco. Devuelve la lista cronológica.
export function enOrdenCronologico<T extends { fecha: Date }>(
  filasEnOrdenDeArchivo: T[],
  ordenHabitual: "asc" | "desc"
): T[] {
  if (filasEnOrdenDeArchivo.length < 2) return filasEnOrdenDeArchivo;
  const primera = filasEnOrdenDeArchivo[0].fecha.getTime();
  const ultima = filasEnOrdenDeArchivo[filasEnOrdenDeArchivo.length - 1].fecha.getTime();
  const orden = primera < ultima ? "asc" : primera > ultima ? "desc" : ordenHabitual;
  return orden === "asc" ? filasEnOrdenDeArchivo : [...filasEnOrdenDeArchivo].reverse();
}

export function armarLectura(
  banco: BancoExtracto,
  filas: FilaExtracto[],
  datos: { cuentaEnArchivo: string | null; cuitEnArchivo: string | null; avisos: Set<string> },
  opciones: OpcionesLectura
): LecturaExtracto {
  if (filas.length === 0) throw new ErrorExtracto("El extracto no tiene movimientos.");
  const avisos = [...datos.avisos];
  const lejano = avisoDeRangoLejano(
    filas.map((f) => f.fecha),
    opciones.hoy ?? new Date()
  );
  if (lejano) avisos.push(lejano);
  return { banco, filas, cuentaEnArchivo: datos.cuentaEnArchivo, cuitEnArchivo: datos.cuitEnArchivo, avisos };
}

export function conceptoOVacio(celda: Celda): string {
  return textoDeCelda(celda) || "(sin concepto)";
}
