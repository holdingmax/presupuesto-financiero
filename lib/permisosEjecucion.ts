import type { Rol } from "@prisma/client";

// Permisos de Ejecución global (docs/ejecucion_global_plan.md §3.3, D-3 y D-4).
// Puros (sin Prisma ni next/headers) para poder probarlos; lib/auth.ts los usa en
// requireOperadorEjecucionGlobal y requireCierreEjecucion.

type ConRol = { rol: Rol };
type ConPermisoDeOperar = ConRol & { operaEjecucion: boolean };

// Operar (subir extractos, clasificar, asignar unidades, ignorar): ADMIN siempre, o
// quien tiene Usuario.operaEjecucion. Ninguna migración le da el permiso a nadie.
export function puedeOperarEjecucionGlobal(usuario: ConPermisoDeOperar): boolean {
  return usuario.rol === "ADMIN" || usuario.operaEjecucion;
}

// Cierre definitivo de una semana: solo FINANZAS y ADMIN (D-4). Quien opera sin ser
// FINANZAS ni ADMIN (Flavia) no cierra.
export function puedeCerrarEjecucion(usuario: ConRol): boolean {
  return usuario.rol === "ADMIN" || usuario.rol === "FINANZAS";
}

// Quien ve TODO Ejecución (todas las unidades, saldos y cuentas): ADMIN, FINANZAS y
// quien opera. El resto (gerentes) ve solo los movimientos de su empresa (§6).
export function veTodoEjecucion(usuario: ConPermisoDeOperar): boolean {
  return puedeCerrarEjecucion(usuario) || puedeOperarEjecucionGlobal(usuario);
}

// Quien ve los bloques Disponibilidades y Cierre del Reporte (saldo, capital de
// trabajo, disponible): solo ADMIN y FINANZAS (§3.4 y §6). Operar Ejecución no alcanza.
export function veBloquesReservadosDelReporte(usuario: ConRol): boolean {
  return puedeCerrarEjecucion(usuario);
}
