import type { Celda } from "./tipos";

// Fechas de los extractos. Formato FIJO por banco, nunca new Date(texto): ese constructor
// lee "01/10/2026" como mes/día (10 de enero). Con un solo formato posible por banco,
// "día/mes vs mes/día" no es una adivinanza.

const ANIO_MIN = 2000;
const ANIO_MAX = 2100;
const MS_DIA = 86_400_000;

export type ResultadoFecha =
  | { estado: "ok"; fecha: Date }
  // La celda no parece una fecha (vacía, texto de pie de página…): corta la tabla.
  | { estado: "vacia" }
  // Parece una fecha pero no lo es (31/02, año fuera de 2000–2100, serial absurdo): error.
  | { estado: "invalida"; motivo: string };

export type OpcionesFecha = {
  // Separador del texto: "/" (Nación, Santander, Santiago) o "-" (BBVA). Si se omite, la
  // columna no admite texto (Macro y Galicia traen celdas de fecha).
  separadorTexto?: "/" | "-";
  date1904?: boolean;
};

function fechaUtc(anio: number, mes: number, dia: number): Date | null {
  if (anio < ANIO_MIN || anio > ANIO_MAX || mes < 1 || mes > 12 || dia < 1) return null;
  const f = new Date(Date.UTC(anio, mes - 1, dia));
  // Date.UTC desborda (31/02 → 3/03): se rechaza si el día cambió.
  return f.getUTCMonth() === mes - 1 && f.getUTCDate() === dia ? f : null;
}

function enRango(f: Date): boolean {
  return f.getUTCFullYear() >= ANIO_MIN && f.getUTCFullYear() <= ANIO_MAX;
}

// Serial de Excel → medianoche UTC del día. Se usa la parte entera y NINGÚN formato visible.
// Modo 1900: serial 1 = 01/01/1900 y se cuenta desde 30/12/1899 (el bug del 29/02/1900
// no afecta fechas posteriores a marzo de 1900).
export function fechaDeSerial(serial: number, date1904 = false): Date {
  const base = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  return new Date(base + Math.floor(serial) * MS_DIA);
}

export function fechaDeCelda(celda: Celda, opciones: OpcionesFecha = {}): ResultadoFecha {
  if (celda instanceof Date) {
    if (Number.isNaN(celda.getTime())) return { estado: "invalida", motivo: "fecha ilegible" };
    // ExcelJS entrega fechas UTC: se usan las componentes UTC.
    const f = new Date(Date.UTC(celda.getUTCFullYear(), celda.getUTCMonth(), celda.getUTCDate()));
    return enRango(f)
      ? { estado: "ok", fecha: f }
      : { estado: "invalida", motivo: `año ${f.getUTCFullYear()} fuera de ${ANIO_MIN}–${ANIO_MAX}` };
  }

  if (typeof celda === "number") {
    if (!Number.isFinite(celda) || celda < 1) return { estado: "invalida", motivo: `valor ${celda} no es una fecha` };
    const f = fechaDeSerial(celda, opciones.date1904);
    return enRango(f)
      ? { estado: "ok", fecha: f }
      : { estado: "invalida", motivo: `año ${f.getUTCFullYear()} fuera de ${ANIO_MIN}–${ANIO_MAX}` };
  }

  if (typeof celda === "string") {
    const texto = celda.trim();
    const m = /^(\d{1,2})([/-])(\d{1,2})\2(\d{4})$/.exec(texto);
    if (!m) return { estado: "vacia" };
    if (opciones.separadorTexto !== m[2]) {
      return { estado: "invalida", motivo: `"${texto}" no tiene el formato esperado` };
    }
    const f = fechaUtc(Number(m[4]), Number(m[3]), Number(m[1]));
    return f ? { estado: "ok", fecha: f } : { estado: "invalida", motivo: `"${texto}" no es una fecha válida` };
  }

  return { estado: "vacia" };
}

// Aviso si el rango del archivo está a más de ~400 días de hoy (un archivo viejo o una
// fecha mal leída). No bloquea.
export function avisoDeRangoLejano(fechas: Date[], hoy: Date): string | null {
  if (fechas.length === 0) return null;
  const MAX_DIAS = 400;
  const lejos = fechas.some((f) => Math.abs(f.getTime() - hoy.getTime()) > MAX_DIAS * MS_DIA);
  if (!lejos) return null;
  const ms = fechas.map((f) => f.getTime());
  const desde = new Date(Math.min(...ms)).toISOString().slice(0, 10);
  const hasta = new Date(Math.max(...ms)).toISOString().slice(0, 10);
  return `Las fechas del archivo (${desde} a ${hasta}) están a más de un año de hoy: revisá que sea el archivo correcto.`;
}
