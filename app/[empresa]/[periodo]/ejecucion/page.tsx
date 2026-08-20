import { redirect } from "next/navigation";
import { obtenerNumeroSemanaAbierta } from "./actions";
import { AccesoDenegadoError } from "@/lib/auth";

type Props = {
  params: Promise<{ empresa: string; periodo: string }>;
};

// Único lugar que resuelve-o-crea la semana abierta; redirige a la URL numerada
// para que /ejecucion/[numeroSemana] sea siempre de solo lectura en la consulta.
export default async function EjecucionIndexPage({ params }: Props) {
  const { empresa, periodo } = await params;

  let numeroSemana;
  try {
    numeroSemana = await obtenerNumeroSemanaAbierta(empresa, periodo);
  } catch (error) {
    // Ver el comentario equivalente en presupuesto/page.tsx: el layout ya
    // muestra el panel de "sin acceso", esto solo evita que se vea como un
    // error sin manejar cuando el chequeo defensivo vuelve a fallar acá.
    if (error instanceof AccesoDenegadoError) return null;
    throw error;
  }

  // Quien no puede operar no dispara la creación de una semana nueva (ver
  // obtenerNumeroSemanaAbierta) — si el presupuesto todavía no tiene ninguna, no hay
  // adónde redirigir.
  if (numeroSemana === null) {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <p className="text-sm text-ink-muted">
          Todavía no hay ninguna semana cargada para esta empresa.
        </p>
      </div>
    );
  }

  redirect(`/${empresa}/${periodo}/ejecucion/${numeroSemana}`);
}
