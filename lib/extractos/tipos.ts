// Tipos y constantes compartidos de los lectores de extractos crudos (plan:
// docs/lector_bancos_plan.md §3.1). Sin imports de servidor: lo usan también
// componentes "use client" (pantalla de cuentas, selector de subida).

// Una celda ya tipada, venga de un .xlsx, un .xls binario o un texto/CSV.
export type Celda = number | string | Date | null;

export type HojaGrilla = {
  nombre: string;
  // filas[0] es la fila 1 del archivo y filas[i][0] la columna A: el índice + 1 es el
  // número real de fila (el que se muestra en los mensajes de error).
  filas: Celda[][];
  // Solo para celdas numéricas de fecha de un .xls; los .xlsx de ExcelJS ya traen Date.
  date1904: boolean;
};

// El código del banco es EXACTAMENTE la primera palabra del nombre canónico de cuenta del
// madre de Kike ("MACRO 599", "FRANCES 891" para BBVA, "SANT 099", "BSE 560"): así
// UNIDAD_POR_CUENTA y el reconocimiento de lo ya cargado siguen funcionando sin cambios.
export const BANCOS_EXTRACTO = ["MACRO", "GALICIA", "FRANCES", "BNA", "SANT", "BSE"] as const;
export type BancoExtracto = (typeof BANCOS_EXTRACTO)[number];

export const NOMBRE_BANCO: Record<BancoExtracto, string> = {
  MACRO: "Macro",
  GALICIA: "Galicia",
  FRANCES: "BBVA Francés",
  BNA: "Nación",
  SANT: "Santander",
  BSE: "Santiago del Estero",
};

export function esBancoExtracto(valor: string): valor is BancoExtracto {
  return (BANCOS_EXTRACTO as readonly string[]).includes(valor);
}

export type FilaExtracto = {
  numeroFila: number; // fila real del archivo (para mensajes de error)
  fecha: Date; // medianoche UTC del día, igual que el madre
  concepto: string;
  importeCentavos: number; // con signo, exacto
  saldoCentavos: number | null; // SIEMPRE "después del movimiento"; null si el banco no lo da
  referencia: string | null; // texto, conserva ceros a la izquierda
  causal: string | null;
  detalle: string | null;
};

export type LecturaExtracto = {
  banco: BancoExtracto;
  filas: FilaExtracto[]; // en orden CRONOLÓGICO (se invierte si el archivo viene al revés)
  cuentaEnArchivo: string | null; // solo dígitos, p. ej. "315909409281599"
  cuitEnArchivo: string | null;
  avisos: string[];
};

// Error de lectura con un mensaje pensado para mostrarse tal cual al usuario.
export class ErrorExtracto extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorExtracto";
  }
}

export type OpcionesLectura = {
  // "hoy" inyectable para que los tests no dependan del reloj.
  hoy?: Date;
};
