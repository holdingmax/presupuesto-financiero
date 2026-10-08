import type { Plantilla } from "@/lib/reporte/motor";
import { PLANTILLA_BRILLANTE } from "./brillante";
import { PLANTILLA_CONEXION } from "./conexion";
import { PLANTILLA_FREDY } from "./fredy";
import { PLANTILLA_HAVANNA } from "./havanna";
import { PLANTILLA_HWC } from "./hwc";
import { PLANTILLA_MANTENOR } from "./mantenor";
import { PLANTILLA_RADIO } from "./radio";

// Plantilla por SLUG de empresa (lib/slug.ts), no por id: los uuid cambian entre
// las bases (local, testing, producción). Slugs verificados el 2026-10-07 contra
// los nombres de la base local. Empresas sin plantilla (Avianor, Bradenton, Gold
// Seguridad, JPS) siguen con el Reporte de la Fase 1.
export const PLANTILLAS_POR_SLUG: Record<string, Plantilla> = {
  "conexion-logistica": PLANTILLA_CONEXION,
  brillante: PLANTILLA_BRILLANTE,
  havanna: PLANTILLA_HAVANNA,
  radio: PLANTILLA_RADIO,
  "fredy-publicidad": PLANTILLA_FREDY,
  hwc: PLANTILLA_HWC,
  mantenor: PLANTILLA_MANTENOR,
};

export function plantillaDeEmpresa(slug: string): Plantilla | null {
  return PLANTILLAS_POR_SLUG[slug] ?? null;
}
