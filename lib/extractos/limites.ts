// Frenos de la subida de extractos por la web (Ejecución global). Funciones puras, sin base de
// datos ni ExcelJS: se evalúan en el servidor ANTES de leer el archivo (tamaño) y apenas se
// lee (filas). Causa: la subida de la madre real (16.521 filas, 1,28 MB) superó los 512 MB de
// memoria de Render y tiró el servicio.
//
// Dos juegos de topes, los mismos para todos los roles (ADMIN incluido):
//   - Extracto de un banco: los 6 extractos reales de Flavia tienen entre 6 y 25 filas y entre 1 KB
//     y 42 KB, así que 1 MB / 1.000 filas dan un margen de decenas de veces.
//   - Archivo madre de uso diario (opción "Archivo madre" del selector, solo ADMIN y FINANZAS):
//     3.000 filas / 512 KB. Medido 2026-10-29 (solo lectura, sin base): leer la madre cuesta unos
//     13,5 KB de RSS por fila (16.521 filas: pico 335 MB; 2.553 filas: 149 MB) y el servidor ya
//     parte de ~202 MB. Producción puede tener otra memoria que testing: si cambia, se cambia acá.
// El histórico (decenas de miles de filas) se carga con el script
// prisma/scripts/cargar-madre-historial.ts, que usa lib/extractos/madre.ts.
//
// ÚNICO LUGAR donde se cambian los topes.

export const MAX_BYTES_EXTRACTO = 1024 * 1024; // 1 MB
export const MAX_FILAS_EXTRACTO = 1000;

export const MAX_BYTES_MADRE = 512 * 1024; // 512 KB
export const MAX_FILAS_MADRE = 3000;

export const MENSAJE_MADRE_POR_SCRIPT =
  "Los archivos madre más grandes (el histórico) se cargan por script, no por la web.";

export type ResultadoLimite = { ok: true } | { ok: false; error: string };

const OK: ResultadoLimite = { ok: true };

function formatearTamano(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2).replace(".", ",")} MB`;
}

function formatearFilas(n: number): string {
  return n.toLocaleString("es-AR");
}

// Qué decirle a quien subió una madre por el camino del extracto de un banco.
export function mensajeUsarOpcionMadre(): string {
  return `Si es un archivo madre, elegí la opción «Archivo madre» del selector (hasta ${formatearFilas(MAX_FILAS_MADRE)} filas y ${formatearTamano(MAX_BYTES_MADRE)}; solo ADMIN y FINANZAS). ${MENSAJE_MADRE_POR_SCRIPT}`;
}

// Antes de leer el archivo.
export function verificarTamanoArchivo(bytes: number): ResultadoLimite {
  if (bytes <= MAX_BYTES_EXTRACTO) return OK;
  return {
    ok: false,
    error: `El archivo pesa ${formatearTamano(bytes)} y un extracto de banco no pasa de ${formatearTamano(MAX_BYTES_EXTRACTO)}. ${mensajeUsarOpcionMadre()}`,
  };
}

// Sin cuenta elegida: puede ser una madre subida por el camino equivocado.
export function verificarCuentaElegida(cuentaElegida: string): ResultadoLimite {
  if (cuentaElegida.trim() !== "") return OK;
  return { ok: false, error: `Elegí la cuenta del extracto antes de subir el archivo. ${mensajeUsarOpcionMadre()}` };
}

// Después de leer: cantidad de filas del extracto de banco.
export function verificarCantidadFilas(filas: number): ResultadoLimite {
  if (filas <= MAX_FILAS_EXTRACTO) return OK;
  return {
    ok: false,
    error: `El extracto tiene ${formatearFilas(filas)} filas y el máximo por la web es ${formatearFilas(MAX_FILAS_EXTRACTO)}. Dividilo en períodos más cortos.`,
  };
}

// Archivo madre, antes de leerlo.
export function verificarTamanoMadre(bytes: number): ResultadoLimite {
  if (bytes <= MAX_BYTES_MADRE) return OK;
  return {
    ok: false,
    error: `El archivo madre pesa ${formatearTamano(bytes)} y por la web el máximo es ${formatearTamano(MAX_BYTES_MADRE)}. ${MENSAJE_MADRE_POR_SCRIPT}`,
  };
}

// Archivo madre, después de leerlo.
export function verificarCantidadFilasMadre(filas: number): ResultadoLimite {
  if (filas <= MAX_FILAS_MADRE) return OK;
  return {
    ok: false,
    error: `El archivo madre tiene ${formatearFilas(filas)} filas y por la web el máximo es ${formatearFilas(MAX_FILAS_MADRE)}. ${MENSAJE_MADRE_POR_SCRIPT}`,
  };
}
