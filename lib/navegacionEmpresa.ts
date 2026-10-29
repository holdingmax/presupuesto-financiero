import { PERIODO_EN_CARGA_GERENTE, PERIODO_POR_DEFECTO } from "@/lib/config";
import { cargaEnReporteActiva } from "@/lib/estadoPresupuesto";
import { plantillaDeEmpresa } from "@/lib/reporte/plantillas";

// Navegación por rol (Etapa 4): cuándo el gerente carga desde el Reporte en vez de Presupuesto.
// Puras (sin Prisma ni next/*) para poder probarlas; las usan el layout de [empresa]/[periodo],
// la página de Presupuesto y "Mis empresas".

// La pestaña Presupuesto se oculta SOLO si se cumplen las tres: quien mira no es ADMIN ni FINANZAS,
// la carga desde el Reporte está activa para la empresa (lib/config.ts) y la empresa tiene Reporte
// por plantilla (sin él no hay dónde cargar). Nunca por rol solamente: Expensas y las demás sin
// plantilla siguen cargando en Presupuesto. Los parámetros por defecto son los de producción; se
// pasan otros para probar.
export function ocultaPestanaPresupuesto(
  esAdminOFinanzas: boolean,
  empresaSlug: string,
  cargaActiva: (slug: string) => boolean = cargaEnReporteActiva,
  tienePlantilla: (slug: string) => boolean = (slug) => plantillaDeEmpresa(slug) !== null
): boolean {
  if (esAdminOFinanzas) return false;
  return cargaActiva(empresaSlug) && tienePlantilla(empresaSlug);
}

// A dónde lleva el link de una empresa en "Mis empresas". ADMIN y FINANZAS: como siempre (Presupuesto
// del período por defecto). Gerente: el mes en curso de carga, en el Reporte si carga ahí y en
// Presupuesto si no.
export function enlaceDeEmpresa(
  esAdminOFinanzas: boolean,
  empresaSlug: string,
  oculta: boolean = ocultaPestanaPresupuesto(esAdminOFinanzas, empresaSlug)
): string {
  if (esAdminOFinanzas) return `/${empresaSlug}/${PERIODO_POR_DEFECTO}/presupuesto`;
  return `/${empresaSlug}/${PERIODO_EN_CARGA_GERENTE}/${oculta ? "reporte" : "presupuesto"}`;
}
