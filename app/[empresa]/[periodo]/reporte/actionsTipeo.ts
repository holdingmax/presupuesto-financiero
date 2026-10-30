"use server";

import { requireAdminOFinanzas, requireAccesoEmpresa, esAdminOFinanzas } from "@/lib/auth";
import { resolverEmpresaPorSlug } from "@/lib/slug";
import { plantillaDeEmpresaConExtras } from "@/lib/reporte/plantillaConExtras";
import { motivoRechazoTipeo, type EntradaTipeo } from "@/lib/reporte/tipeoDirecto";
import { guardarValoresManuales, type ResultadoCarga } from "./carga/actions";

const FORMATO_PERIODO = /^\d{4}-\d{2}$/;

// Guarda lo que ADMIN/FINANZAS tipean directo en el Reporte: el Real manual de las filas de la plantilla y,
// en las filas extra, también el Presupuestado. Solo agrega las guardas propias del tipeo (interruptor de la
// empresa, qué celdas se pueden tipear, Disponibilidades solo si la empresa las ve) y delega en
// guardarValoresManuales: ahí están la validación contra la plantilla, los importes, la transacción y la regla
// de bloqueo (carga única en cerrado, Presupuesto validado bloquea la columna P, sin override de admin).
export async function guardarTipeoDelReporte(
  empresaSlug: string,
  periodo: string,
  entradas: EntradaTipeo[]
): Promise<ResultadoCarga> {
  // Rechaza al gerente antes de mirar nada más.
  const usuario = await requireAdminOFinanzas();
  if (!FORMATO_PERIODO.test(periodo)) return { ok: false, error: "Período inválido." };
  const empresa = await resolverEmpresaPorSlug(empresaSlug);
  if (!empresa) return { ok: false, error: "No encontré esa empresa." };
  await requireAccesoEmpresa(empresa.id);
  // La plantilla del Reporte del mes, con las filas extra: son las únicas filas de Presupuestado tipeable.
  const plantilla = await plantillaDeEmpresaConExtras(empresa.id, empresaSlug, periodo);
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
