import { obtenerDatos } from "./actions";
import { AccesoDenegadoError } from "@/lib/auth";
import PresupuestoForm from "./PresupuestoForm";

type Props = {
  params: Promise<{ empresa: string; periodo: string }>;
};

export default async function PresupuestoPage({ params }: Props) {
  const { empresa, periodo } = await params;

  let datos;
  try {
    datos = await obtenerDatos(empresa, periodo);
  } catch (error) {
    // El layout ya validó el acceso y muestra su propio panel de "sin
    // acceso" — este chequeo (repetido adentro de obtenerDatos, defensivo
    // para cuando se invoca como Server Action) puede volver a fallar acá
    // porque Next arranca a resolver esta página en paralelo con el layout.
    // No hay nada más para renderizar en ese caso: el layout ya lo cubre.
    if (error instanceof AccesoDenegadoError) return null;
    throw error;
  }

  return (
    <PresupuestoForm
      empresaNombre={datos.empresaNombre}
      periodo={datos.periodo}
      estado={datos.estado}
      lineasIniciales={datos.lineas}
      clasificacionesDisponibles={datos.clasificacionesDisponibles}
    />
  );
}
