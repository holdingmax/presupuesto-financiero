import type { Bloque, FilaLinea, FilaTitulo, FilaTotal, FuentePresupuesto, FuenteReal } from "@/lib/reporte/motor";

// Atajos para escribir las plantillas fila por fila, en el mismo orden que la
// planilla de Macchi.

export const clasif = (...clasificaciones: string[]): FuenteReal => ({ tipo: "clasificaciones", clasificaciones });
export const cat = (...categorias: string[]): FuentePresupuesto => ({ tipo: "categorias", categorias });
export const SIN_REAL: FuenteReal = { tipo: "ninguna" };
export const MANUAL_2B: FuenteReal = { tipo: "manual2b" };
export const ESPEJO_2B: FuenteReal = { tipo: "espejo2b" };
export const SIN_PRESUPUESTO: FuentePresupuesto = { tipo: "ninguna" };

type Extra = Pick<FilaLinea, "pendiente" | "parcial" | "nota">;

export function titulo(clave: string, bloque: Bloque, texto: string): FilaTitulo {
  return { clave, bloque, tipo: "titulo", texto };
}

export function total(clave: string, bloque: Bloque, texto: string, suma: string[]): FilaTotal {
  return { clave, bloque, tipo: "total", texto, suma };
}

export function ingreso(
  clave: string,
  texto: string,
  real: FuenteReal,
  presupuesto: FuentePresupuesto,
  extra: Extra = {}
): FilaLinea {
  return { clave, bloque: "INGRESOS", tipo: "linea", texto, signo: 1, real, presupuesto, ...extra };
}

export function egreso(
  clave: string,
  texto: string,
  real: FuenteReal,
  presupuesto: FuentePresupuesto,
  extra: Extra = {}
): FilaLinea {
  return { clave, bloque: "EGRESOS", tipo: "linea", texto, signo: -1, real, presupuesto, ...extra };
}

// Bloque de abajo (entre TOTAL EGRESOS OPERATIVOS y TOTAL EGRESOS): sin título
// en la planilla, todas son salidas de caja.
export function abajo(
  clave: string,
  texto: string,
  real: FuenteReal,
  presupuesto: FuentePresupuesto,
  extra: Extra = {}
): FilaLinea {
  return { clave, bloque: "ABAJO", tipo: "linea", texto, signo: -1, real, presupuesto, ...extra };
}
