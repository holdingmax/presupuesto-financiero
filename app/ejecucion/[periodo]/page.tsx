import { redirect } from "next/navigation";
import { obtenerNumeroSemanaAbierta } from "@/app/ejecucion/actions";
import { AccesoDenegadoError } from "@/lib/auth";

type Props = {
  params: Promise<{ periodo: string }>;
};

// Único lugar que resuelve-o-crea la semana abierta del período (solo para quien opera; ADMIN y
// FINANZAS sin permiso de operar ven la última semana que exista). Redirige a la URL numerada
// para que /ejecucion/[periodo]/[numeroSemana] sea siempre de solo lectura en la consulta.
export default async function EjecucionGlobalIndexPage({ params }: Props) {
  const { periodo } = await params;

  let numeroSemana;
  try {
    numeroSemana = await obtenerNumeroSemanaAbierta(periodo);
  } catch (error) {
    // El layout ya muestra el panel de "sin acceso" o de período inválido; esto solo evita que se
    // vea como un error sin manejar cuando el chequeo defensivo vuelve a fallar acá.
    if (error instanceof AccesoDenegadoError) return null;
    throw error;
  }

  if (numeroSemana === null) {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <p className="text-sm text-ink-muted">Todavía no hay ninguna semana cargada para este período.</p>
      </div>
    );
  }

  redirect(`/ejecucion/${periodo}/${numeroSemana}`);
}
