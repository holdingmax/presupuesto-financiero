"use server";

import { requireAdminOFinanzas, esAdminOFinanzas } from "@/lib/auth";
import { plantillaDeEmpresa } from "@/lib/reporte/plantillas";
import { motivoRechazoTipeo, type EntradaTipeo } from "@/lib/reporte/tipeoDirecto";
import { guardarValoresManuales, type ResultadoCarga } from "./carga/actions";

// Guarda el Real manual que ADMIN/FINANZAS tipean directo en el Reporte. Solo agrega las guardas propias
// del tipeo (interruptor de la empresa, solo columna REAL, Disponibilidades solo si la empresa las ve) y
// delega en guardarValoresManuales, que no se modifica: ahí están la validación contra la plantilla, los
// importes, la transacción y la regla de bloqueo (carga única en cerrado, sin override de admin).
export async function guardarTipeoDelReporte(
  empresaSlug: string,
  periodo: string,
  entradas: EntradaTipeo[]
): Promise<ResultadoCarga> {
  // Rechaza al gerente antes de mirar nada más.
  const usuario = await requireAdminOFinanzas();
  const plantilla = plantillaDeEmpresa(empresaSlug);
  if (!plantilla) return { ok: false, error: "Esta empresa no tiene reporte por plantilla." };
  const motivo = motivoRechazoTipeo({
    empresaSlug,
    plantilla,
    esAdminOFinanzas: esAdminOFinanzas(usuario),
    entradas,
  });
  if (motivo) return { ok: false, error: motivo };
  return guardarValoresManuales(empresaSlug, periodo, entradas);
}
