import { formatearImporte } from "@/app/ejecucion/formato";

// Estilos del Reporte con el diseño nuevo, para las pantallas que no pasan por
// ReportePlantilla (hoy: la Fase 1 de las empresas sin plantilla). Los valores
// replican los de ReportePlantilla.tsx (FilaTabla / CeldasMes), que no los importa.

// Clases literales (Tailwind no detecta las armadas por interpolación). Azul de título: #D6E2F0.
export const CLASE_FILA_TITULO = "border-t border-line-strong bg-[#D6E2F0] font-bold";
export const CLASE_CELDA_TITULO = "sticky left-0 z-10 bg-[#D6E2F0] py-1.5 pr-3 text-xs font-bold tracking-[0.15em] uppercase";

export const CLASE_FILA = "border-t border-line-hairline";
export const CLASE_CELDA_CONCEPTO = "sticky left-0 z-10 bg-paper py-1.5 pr-4 whitespace-nowrap";
export const CLASE_CELDA_NUMERO = "py-1.5 px-3 text-right tabular whitespace-nowrap";
export const CLASE_BORDE_MES = "border-l border-line-hairline";

export const CLASE_CABECERA_MES = "pt-2 px-3 text-center font-medium border-l border-line-hairline";
export const CLASE_CABECERA_CONCEPTO = "sticky left-0 z-10 bg-paper text-left py-2 pr-3 font-medium";
export const CLASE_CABECERA_COLUMNA = "text-right py-2 px-3 font-medium";

// Pesos sin decimales, sin "$" y con "−" si es negativo (igual que ReportePlantilla).
export function importePesos(pesos: number) {
  const texto = formatearImporte(Math.abs(pesos));
  return pesos < 0 ? `−${texto}` : texto;
}
