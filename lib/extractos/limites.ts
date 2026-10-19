// Frenos de la subida de extractos por la web (Ejecución global). Funciones puras, sin base de
// datos ni ExcelJS: se evalúan en el servidor ANTES de leer el archivo (tamaño) y apenas se
// lee (filas). Causa: la subida de la madre real (16.521 filas, 1,28 MB) superó los 512 MB de
// memoria de Render y tiró el servicio.
//
// El tope es el mismo para todos los roles (ADMIN incluido): los 6 extractos reales de Flavia
// tienen entre 6 y 25 filas y entre 1 KB y 42 KB, así que 1 MB / 1.000 filas dan un margen de
// decenas de veces. El archivo madre NO se sube por la web para nadie: se carga con el script
// (prisma/scripts/cargar-madre-historial.ts, que usa lib/extractos/madre.ts).

export const MAX_BYTES_EXTRACTO = 1024 * 1024; // 1 MB
export const MAX_FILAS_EXTRACTO = 1000;

export const MENSAJE_MADRE_POR_SCRIPT = "El archivo madre se carga por script, no por la web.";

export type ResultadoLimite = { ok: true } | { ok: false; error: string };

const OK: ResultadoLimite = { ok: true };

function formatearTamano(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2).replace(".", ",")} MB`;
}

function formatearFilas(n: number): string {
  return n.toLocaleString("es-AR");
}

// Antes de leer el archivo.
export function verificarTamanoArchivo(bytes: number): ResultadoLimite {
  if (bytes <= MAX_BYTES_EXTRACTO) return OK;
  return {
    ok: false,
    error: `El archivo pesa ${formatearTamano(bytes)} y un extracto de banco no pasa de ${formatearTamano(MAX_BYTES_EXTRACTO)}. ${MENSAJE_MADRE_POR_SCRIPT}`,
  };
}

// Sin cuenta elegida solo podría ser la madre: se frena antes de leer nada.
export function verificarCuentaElegida(cuentaElegida: string): ResultadoLimite {
  if (cuentaElegida.trim() !== "") return OK;
  return { ok: false, error: `Elegí la cuenta del extracto antes de subir el archivo. ${MENSAJE_MADRE_POR_SCRIPT}` };
}

// Después de leer: cantidad de filas del extracto de banco.
export function verificarCantidadFilas(filas: number): ResultadoLimite {
  if (filas <= MAX_FILAS_EXTRACTO) return OK;
  return {
    ok: false,
    error: `El extracto tiene ${formatearFilas(filas)} filas y el máximo por la web es ${formatearFilas(MAX_FILAS_EXTRACTO)}. Dividilo en períodos más cortos.`,
  };
}
