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

  redirect(`/${empresa}/${periodo}/ejecucion/${numeroSemana}`);
}
