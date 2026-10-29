import { PERIODOS_HABILITADOS, PERIODO_EN_CARGA_GERENTE } from "@/lib/config";

// Períodos de Presupuesto habilitados para quien no es ADMIN ni FINANZAS. Puras (sin Prisma
// ni next/*) para poder probarlas; las usan presupuesto/page.tsx, resolverEmpresaYPresupuesto
// (actions.ts) y el selector de mes. Reciben la lista como parámetro (por defecto, la de
// lib/config.ts) para probarlas con otra.

export function esPeriodoHabilitado(periodo: string, habilitados: readonly string[] = PERIODOS_HABILITADOS): boolean {
  return habilitados.includes(periodo);
}

// ADMIN y FINANZAS abren cualquier período; el resto, solo los habilitados.
export function puedeVerPeriodo(
  periodo: string,
  esAdminOFinanzas: boolean,
  habilitados: readonly string[] = PERIODOS_HABILITADOS
): boolean {
  return esAdminOFinanzas || esPeriodoHabilitado(periodo, habilitados);
}

// Quién puede EDITAR el presupuesto de un período: ADMIN y FINANZAS, cualquiera; el resto (el
// gerente, también si revisa), solo el período en curso de carga (PERIODO_EN_CARGA_GERENTE). Es una
// puerta ADICIONAL: el estado del presupuesto (en revisión, validado) se sigue controlando aparte.
// Comparación exacta de texto: "2026-9" o " 2026-11" no valen.
export function puedeEditarPeriodoComoGerente(
  periodo: string,
  esAdminOFinanzas: boolean,
  enCarga: string = PERIODO_EN_CARGA_GERENTE
): boolean {
  return esAdminOFinanzas || periodo === enCarga;
}

// Mensaje cuando un gerente intenta editar un período que no es el de carga.
export function mensajePeriodoSoloLectura(enCarga: string = PERIODO_EN_CARGA_GERENTE): string {
  return `Solo se puede cargar el mes en curso (${enCarga}). Los demás meses se ven en solo lectura.`;
}

// Lo lanza resolverEmpresaYPresupuesto; presupuesto/page.tsx lo atrapa y muestra el aviso.
export class PeriodoNoHabilitadoError extends Error {
  constructor(public readonly periodo: string) {
    super(`El período ${periodo} no está habilitado.`);
    this.name = "PeriodoNoHabilitadoError";
  }
}

export type EnlacePeriodo = { periodo: string; href: string; activo: boolean };

// Links del selector de mes, en el orden de la lista. `activo` marca el período que se está
// viendo (ninguno, si es uno fuera de la lista que abrió un ADMIN o FINANZAS).
export function enlacesDePeriodos(
  empresaSlug: string,
  periodoActual: string,
  habilitados: readonly string[] = PERIODOS_HABILITADOS
): EnlacePeriodo[] {
  return habilitados.map((periodo) => ({
    periodo,
    href: `/${empresaSlug}/${periodo}/presupuesto`,
    activo: periodo === periodoActual,
  }));
}
