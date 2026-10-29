import { PERIODOS_HABILITADOS } from "@/lib/config";
import { periodosHasta } from "@/lib/reporte/motor";

// Vista del Reporte por plantilla (Etapa 5 B): cuántos meses se muestran lado a lado. Solo decide
// columnas: no cambia permisos ni qué se puede editar (eso lo siguen decidiendo avisoPeriodoSoloLectura
// y el servidor). Puras (sin Prisma ni next/*) para poder probarlas.
//
// "actual" = solo el mes de la URL (el que elige el selector de mes). "todo" = los MESES_EN_TODO meses
// que terminan en el de la URL.

export type VistaReporte = "actual" | "todo";

export const MESES_EN_TODO = 3;

export const VISTAS: readonly VistaReporte[] = ["actual", "todo"];

// Valor por defecto: el gerente ve el período actual (pantalla corta); ADMIN y FINANZAS, todo (como siempre).
export function vistaPorDefecto(esAdminOFinanzas: boolean): VistaReporte {
  return esAdminOFinanzas ? "todo" : "actual";
}

// El parámetro ?vista= de la URL. Cualquier valor que no sea exactamente "actual" o "todo" (repetido,
// con mayúsculas, vacío) vuelve al valor por defecto.
export function resolverVista(
  valor: string | string[] | undefined,
  esAdminOFinanzas: boolean
): VistaReporte {
  if (valor === "actual" || valor === "todo") return valor;
  return vistaPorDefecto(esAdminOFinanzas);
}

// Cuántos meses se muestran (el último es el de la URL). En "todo", el gerente queda limitado a los
// períodos habilitados: se corta en el primer mes anterior que no lo esté. ADMIN y FINANZAS no tienen tope.
export function cantidadDeMeses(
  vista: VistaReporte,
  periodo: string,
  esAdminOFinanzas: boolean,
  habilitados: readonly string[] = PERIODOS_HABILITADOS
): number {
  if (vista === "actual") return 1;
  if (esAdminOFinanzas) return MESES_EN_TODO;
  const meses = periodosHasta(periodo, MESES_EN_TODO);
  let cantidad = 0;
  for (let i = meses.length - 1; i >= 0 && habilitados.includes(meses[i]); i--) cantidad++;
  return Math.max(1, cantidad);
}
