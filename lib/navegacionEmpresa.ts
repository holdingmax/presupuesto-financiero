import {
  OCULTAR_PRESUPUESTO_TAMBIEN_PARA_ADMIN_Y_FINANZAS,
  PERIODO_EN_CARGA_GERENTE,
  PERIODO_POR_DEFECTO,
} from "@/lib/config";
import { cargaEnReporteActiva } from "@/lib/estadoPresupuesto";
import { plantillaDeEmpresa } from "@/lib/reporte/plantillas";

// Navegación por rol (Etapa 4): cuándo el gerente carga desde el Reporte en vez de Presupuesto.
// Puras (sin Prisma ni next/*) para poder probarlas; las usan el layout de [empresa]/[periodo],
// la página de Presupuesto y "Mis empresas".

// La pestaña Presupuesto se oculta SOLO si la carga desde el Reporte está activa para la empresa
// (lib/config.ts) y la empresa tiene Reporte por plantilla (sin él no hay dónde cargar). Nunca por rol
// solamente: Expensas y las demás sin plantilla siguen cargando en Presupuesto. Rige para todos los roles
// mientras OCULTAR_PRESUPUESTO_TAMBIEN_PARA_ADMIN_Y_FINANZAS esté en true; en false, ADMIN y FINANZAS
// conservan la pestaña (solo se oculta para el gerente). Los parámetros por defecto son los de
// producción; se pasan otros para probar.
export function ocultaPestanaPresupuesto(
  esAdminOFinanzas: boolean,
  empresaSlug: string,
  cargaActiva: (slug: string) => boolean = cargaEnReporteActiva,
  tienePlantilla: (slug: string) => boolean = (slug) => plantillaDeEmpresa(slug) !== null,
  ocultarTambienParaAdmin: boolean = OCULTAR_PRESUPUESTO_TAMBIEN_PARA_ADMIN_Y_FINANZAS
): boolean {
  if (esAdminOFinanzas && !ocultarTambienParaAdmin) return false;
  return cargaActiva(empresaSlug) && tienePlantilla(empresaSlug);
}

// A dónde lleva el link de una empresa en "Mis empresas". Con la pestaña oculta, al Reporte para todos los
// roles. Si no: ADMIN y FINANZAS, a Presupuesto del período por defecto; el gerente, a Presupuesto del mes en
// curso de carga. Con la pestaña oculta, ADMIN y FINANZAS van al período por defecto y el gerente al mes en curso.
export function enlaceDeEmpresa(
  esAdminOFinanzas: boolean,
  empresaSlug: string,
  oculta: boolean = ocultaPestanaPresupuesto(esAdminOFinanzas, empresaSlug)
): string {
  const segmento = oculta ? "reporte" : "presupuesto";
  if (esAdminOFinanzas) return `/${empresaSlug}/${PERIODO_POR_DEFECTO}/${segmento}`;
  return `/${empresaSlug}/${PERIODO_EN_CARGA_GERENTE}/${segmento}`;
}
