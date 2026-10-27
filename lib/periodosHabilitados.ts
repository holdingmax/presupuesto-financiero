import { PERIODOS_HABILITADOS } from "@/lib/config";

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
