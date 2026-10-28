import type { EstadoPresupuesto } from "@prisma/client";
import { EMPRESAS_CON_CARGA_EN_REPORTE } from "@/lib/config";

// Reglas puras (sin Prisma ni next/*) del flujo de estados de Presupuesto, compartidas por
// Presupuesto y por el Reporte. Las usan presupuestoAcceso.ts (servidor) y las pantallas.

// Quién puede agregar/editar/borrar líneas AHORA: en ABIERTO, cualquiera con acceso a la
// empresa; en EN_REVISION, solo quien revisa; en VALIDADO, nadie. Es la única regla de
// edición por estado: autorizarEdicionLinea (servidor) y PresupuestoForm (cliente) la usan.
export function puedeEditarPresupuestoAhora(estado: EstadoPresupuesto, esRevisor: boolean): boolean {
  return estado === "ABIERTO" || (estado === "EN_REVISION" && esRevisor);
}

// Interruptor por empresa de la carga del gerente en el Reporte (lib/config.ts). Recibe la
// lista como parámetro (por defecto, la de config) para probarla con otra. Vacía = apagado.
export function cargaEnReporteActiva(
  empresaSlug: string,
  activas: readonly string[] = EMPRESAS_CON_CARGA_EN_REPORTE
): boolean {
  return activas.includes(empresaSlug);
}

// ¿Se muestra el bloque del flujo (estado y botones) en el Reporte? ADMIN, FINANZAS y quien
// revisa lo ven siempre; el resto (el gerente) solo si la carga en el Reporte está activa
// para su empresa. Fuera de los períodos habilitados solo lo ven ADMIN y FINANZAS: las
// acciones del flujo rechazan ese período para el resto.
export function mostrarFlujoEnReporte(e: {
  esAdminOFinanzas: boolean;
  esRevisor: boolean;
  cargaActiva: boolean;
  periodoHabilitado: boolean;
}): boolean {
  if (e.esAdminOFinanzas) return true;
  if (!e.periodoHabilitado) return false;
  return e.esRevisor || e.cargaActiva;
}
