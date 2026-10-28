import type { Plantilla } from "@/lib/reporte/motor";
import { PLANTILLA_AVIANOR } from "./avianor";
import { PLANTILLA_BRADENTON } from "./bradenton";
import { PLANTILLA_BRILLANTE } from "./brillante";
import { PLANTILLA_CONEXION } from "./conexion";
import { PLANTILLA_FREDY } from "./fredy";
import { PLANTILLA_HAVANNA } from "./havanna";
import { PLANTILLA_HWC } from "./hwc";
import { PLANTILLA_MANTENOR } from "./mantenor";
import { PLANTILLA_PLATE_SILVER } from "./plateSilver";
import { PLANTILLA_RADIO } from "./radio";

// Plantilla por SLUG de empresa (lib/slug.ts), no por id: los uuid cambian entre
// las bases (local, testing, producción). Slugs verificados el 2026-10-07 contra
// los nombres de la base local; los alias de otras bases se agregan a mano (sin
// match por prefijo: "havanna-peru" no debe tomar la plantilla de Havanna). Avianor tiene
// plantilla propia (slug confirmado en testing). Empresas sin plantilla (Expensas, Gold Seguridad)
// siguen con el Reporte de la Fase 1. Plate Silver y Bradenton (en dólares) tienen plantilla propia,
// sin cartel ni formato de moneda por ahora. JPS ya no es una empresa activa.
export const PLANTILLAS_POR_SLUG: Record<string, Plantilla> = {
  avianor: PLANTILLA_AVIANOR,
  "conexion-logistica": PLANTILLA_CONEXION,
  "conexion-logistica-spp": PLANTILLA_CONEXION, // slug en testing
  brillante: PLANTILLA_BRILLANTE,
  havanna: PLANTILLA_HAVANNA,
  radio: PLANTILLA_RADIO,
  "fredy-publicidad": PLANTILLA_FREDY,
  hwc: PLANTILLA_HWC,
  mantenor: PLANTILLA_MANTENOR,
  "plate-silver": PLANTILLA_PLATE_SILVER,
  bradenton: PLANTILLA_BRADENTON,
};

export function plantillaDeEmpresa(slug: string): Plantilla | null {
  return PLANTILLAS_POR_SLUG[slug] ?? null;
}
