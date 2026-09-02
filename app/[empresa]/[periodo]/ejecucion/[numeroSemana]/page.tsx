import PanelImputacion from "../PanelImputacion";
import TablaMovimientos from "../TablaMovimientos";
import Paginacion from "../Paginacion";
import { formatearImporte } from "../formato";
import { obtenerDatosSemana, calcularChequeosSumaCero } from "../actions";
import { AccesoDenegadoError } from "@/lib/auth";

type Props = {
  params: Promise<{ empresa: string; periodo: string; numeroSemana: string }>;
  searchParams: Promise<{ pagina?: string }>;
};

function parsearPagina(paginaParam: string | undefined) {
  const pagina = Number(paginaParam);
  return Number.isInteger(pagina) && pagina >= 1 ? pagina : 1;
}

// Solo lectura en la consulta: nunca crea una semana (eso lo hace únicamente
// el índice en ../page.tsx). Renderiza editable solo si la semana está ABIERTA
// Y el usuario puede operar Ejecución de esta empresa — cualquier otra
// combinación (cerrada, o abierta pero sin permiso de operar) cae en el mismo
// bloque de solo lectura.
export default async function EjecucionSemanaPage({ params, searchParams }: Props) {
  const { empresa, periodo, numeroSemana: numeroSemanaParam } = await params;
  const { pagina: paginaParam } = await searchParams;
  const numeroSemana = Number(numeroSemanaParam);

  if (!Number.isInteger(numeroSemana) || numeroSemana < 1) {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <p className="text-sm text-terracota bg-terracota-tint rounded-md px-3 py-2">
          &quot;{numeroSemanaParam}&quot; no es un número de semana válido.
        </p>
      </div>
    );
  }

  let datos;
  try {
    datos = await obtenerDatosSemana(empresa, periodo, numeroSemana, parsearPagina(paginaParam));
  } catch (error) {
    // Ver el comentario equivalente en presupuesto/page.tsx: el layout ya
    // muestra el panel de "sin acceso", esto solo evita que se vea como un
    // error sin manejar cuando el chequeo defensivo vuelve a fallar acá.
    if (error instanceof AccesoDenegadoError) return null;
    throw error;
  }

  if (!datos) {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <p className="text-sm text-ink-muted">
          No encontré la semana {numeroSemana}.
        </p>
      </div>
    );
  }

  if (datos.estado === "ABIERTA" && datos.puedeOperar) {
    const chequeos = await calcularChequeosSumaCero(empresa, periodo, numeroSemana);
    return (
      <PanelImputacion
        empresaNombre={datos.empresaNombre}
        numeroSemana={datos.numeroSemana}
        estado={datos.estado}
        movimientosIniciales={datos.movimientos}
        clasificacionesDisponibles={datos.clasificacionesDisponibles}
        totalMovimientos={datos.totalMovimientos}
        totalImporte={datos.totalImporte}
        pagina={datos.pagina}
        totalPaginas={datos.totalPaginas}
        chequeos={chequeos}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="flex items-center gap-2 text-xs tracking-[0.15em] text-ink-secondary uppercase mb-1">
            <span className="w-2 h-2 bg-plata" />
            {datos.empresaNombre} · Semana {datos.numeroSemana}
          </p>
          <h1 className="text-4xl font-serif font-semibold tracking-tight">
            {datos.estado === "CERRADA" ? "Historial de ejecución" : "Ejecución (solo lectura)"}
          </h1>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-md ${
            datos.estado === "CERRADA"
              ? "bg-terracota-tint text-terracota"
              : "bg-marino-tint text-marino"
          }`}
        >
          {datos.estado === "CERRADA" ? "Cerrada" : "Abierta"}
        </span>
      </div>

      <div>
        <div className="flex items-start justify-between mb-2">
          <h2 className="pt-1 text-sm font-medium text-ink-secondary">
            Movimientos ({datos.totalMovimientos})
          </h2>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint mb-0.5">
              Total
            </p>
            <p
              className={`tabular text-2xl font-semibold ${
                datos.totalImporte < 0
                  ? "text-negative"
                  : datos.totalImporte > 0
                    ? "text-positive"
                    : "text-ink"
              }`}
            >
              ${formatearImporte(datos.totalImporte)}
            </p>
          </div>
        </div>

        {datos.totalMovimientos === 0 ? (
          <p className="text-sm text-ink-muted py-6 border-t border-line-strong">
            Esta semana no tiene movimientos cargados.
          </p>
        ) : (
          <>
            <div className="border-t border-line-strong overflow-x-auto">
              <TablaMovimientos
                movimientos={datos.movimientos}
                numeroSemana={datos.numeroSemana}
                soloLectura
              />
            </div>
            <Paginacion
              empresaSlug={empresa}
              periodo={periodo}
              numeroSemana={datos.numeroSemana}
              pagina={datos.pagina}
              totalPaginas={datos.totalPaginas}
            />
          </>
        )}
      </div>
    </div>
  );
}
