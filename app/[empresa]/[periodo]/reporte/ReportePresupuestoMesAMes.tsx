import { nombreParaMostrar } from "@/lib/clasificaciones";
import { formatearImporte } from "../ejecucion/formato";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatearPeriodo(periodo: string) {
  const [anio, mes] = periodo.split("-");
  const nombreMes = MESES[Number(mes) - 1] ?? mes;
  return `${nombreMes.charAt(0).toUpperCase()}${nombreMes.slice(1)} ${anio}`;
}

// El "$" es texto literal antes de formatearImporte(), así que un negativo
// (posible acá: "Falta ejecutar" da negativo cuando real > presupuestado, un
// rubro que se pasó del presupuesto) quedaría "$-500" en vez de "-$500" —
// formatearImporte ya devuelve el "-" incluido vía toLocaleString. Separar
// el signo del monto absoluto antes de anteponer el "$" evita eso.
function formatearImporteConSigno(valor: number) {
  return valor < 0 ? `-$${formatearImporte(Math.abs(valor))}` : `$${formatearImporte(valor)}`;
}

type FilaReporte = {
  clasificacion: string;
  presupuestado: number;
  real: number;
};

type Props = {
  empresaNombre: string;
  periodo: string;
  filas: FilaReporte[];
};

export default function ReportePresupuestoMesAMes({ empresaNombre, periodo, filas }: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-10">
        <p className="flex items-center gap-2 text-xs tracking-[0.15em] text-ink-secondary uppercase">
          <span className="h-2 w-2 bg-plata" />
          {empresaNombre} · {formatearPeriodo(periodo)}
        </p>
        <h1 className="mt-1 text-4xl font-serif font-semibold tracking-tight">
          Presupuesto mes a mes
        </h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Egresos — presupuestado vs. real ejecutado (semanas cerradas de Ejecución).
        </p>
      </div>

      <div className="overflow-x-auto border-t border-line-strong">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-xs text-ink-faint uppercase tracking-wide">
              <th className="text-left py-2 pr-3 font-medium">Rubro</th>
              <th className="text-right py-2 px-3 font-medium">Presupuestado</th>
              <th className="text-right py-2 px-3 font-medium">Real</th>
              <th className="text-right py-2 px-3 font-medium">% Avance</th>
              <th className="text-right py-2 pl-3 font-medium">Falta ejecutar</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const faltaEjecutar = f.presupuestado - f.real;
              const avance = f.presupuestado === 0 ? null : (f.real / f.presupuestado) * 100;
              return (
                <tr key={f.clasificacion} className="border-t border-line-hairline">
                  <td className="py-2 pr-3">{nombreParaMostrar(f.clasificacion)}</td>
                  <td className="py-2 px-3 text-right tabular whitespace-nowrap">
                    ${formatearImporte(f.presupuestado)}
                  </td>
                  <td className="py-2 px-3 text-right tabular whitespace-nowrap">
                    ${formatearImporte(f.real)}
                  </td>
                  <td className="py-2 px-3 text-right tabular whitespace-nowrap">
                    {avance === null ? "—" : `${formatearImporte(avance)}%`}
                  </td>
                  <td className="py-2 pl-3 text-right tabular whitespace-nowrap">
                    {formatearImporteConSigno(faltaEjecutar)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-8 text-xs text-ink-muted">Disponibilidades e Ingresos: próximamente</p>
    </div>
  );
}
