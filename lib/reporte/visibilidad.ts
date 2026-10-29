import {
  EMPRESAS_QUE_VEN_CIERRE_EN_REPORTE,
  EMPRESAS_QUE_VEN_DISPONIBILIDADES_EN_REPORTE,
} from "@/lib/config";
import type { AccesoReservados } from "@/lib/reporte/motor";

// Qué bloques reservados del Reporte (Disponibilidades y Cierre) llegan a quien mira (Etapa 5 B).
// Pura (sin Prisma ni next/*) para poder probarla; recibe las listas como parámetro (por defecto,
// las de lib/config.ts).

export type InterruptoresReservados = {
  disponibilidades: readonly string[];
  cierre: readonly string[];
};

const DE_CONFIG: InterruptoresReservados = {
  disponibilidades: EMPRESAS_QUE_VEN_DISPONIBILIDADES_EN_REPORTE,
  cierre: EMPRESAS_QUE_VEN_CIERRE_EN_REPORTE,
};

// `veTodo`: ADMIN y FINANZAS (veBloquesReservadosDelReporte). Para el resto, solo lo que prenden los
// interruptores de la empresa; con las dos listas vacías da `false`, igual que antes de esta etapa.
// Cierre sin Disponibilidades no existe: se descarta (nunca se muestra el Saldo sin su base).
export function accesoReservadosDelReporte(
  veTodo: boolean,
  empresaSlug: string,
  interruptores: InterruptoresReservados = DE_CONFIG
): AccesoReservados {
  if (veTodo) return true;
  const disponibilidades = interruptores.disponibilidades.includes(empresaSlug);
  const cierre = disponibilidades && interruptores.cierre.includes(empresaSlug);
  if (!disponibilidades) return false;
  return { disponibilidades, cierre };
}
