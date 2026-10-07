import Link from "next/link";
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
  empresaSlug: string;
  periodo: string;
  filas: FilaReporte[];
  // La empresa no tiene ninguna unidad de negocio asignada (Empresa.unidadesNegocio
  // vacío): su REAL siempre da $0 — se avisa para que no parezca un error.
  sinUnidades: boolean;
  // De los extractos de ESTA empresa: importes cuya unidad no pertenece a ninguna
  // empresa. No se suman a ningún rubro (ver lib/reporte.ts).
  noAsignado: { unidad: string; importe: number; movimientos: number }[];
  semanasConNoAsignado: number[];
};

export default function ReportePresupuestoMesAMes({
  empresaNombre,
  empresaSlug,
  periodo,
  filas,
  sinUnidades,
  noAsignado,
  semanasConNoAsignado,
}: Props) {
  const totalNoAsignado = noAsignado.reduce((suma, n) => suma + n.importe, 0);
  const movimientosNoAsignados = noAsignado.reduce((suma, n) => suma + n.movimientos, 0);
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
          Egresos — presupuestado vs. real ejecutado (semanas cerradas de Ejecución). El real
          suma los movimientos de las unidades de negocio de esta empresa, de cualquier
          extracto del período.
        </p>
      </div>

      {sinUnidades && (
        <p className="mb-6 text-sm text-terracota bg-terracota-tint rounded-md px-3 py-2">
          Esta empresa no tiene unidades de negocio asignadas, así que el real va a dar $0. Un
          administrador las asigna en Administración → Unidades de negocio.
        </p>
      )}

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

      {noAsignado.length > 0 && (
        <div className="mt-8 rounded-md border border-line-strong border-l-4 border-l-terracota bg-paper-raised px-5 py-4">
          <p className="text-sm font-medium">No asignado a ninguna empresa</p>
          <p className="mt-1 text-xs text-ink-muted">
            En los extractos de esta empresa hay ${formatearImporte(totalNoAsignado)}{" "}
            {`(${movimientosNoAsignados === 1 ? "1 movimiento" : `${movimientosNoAsignados} movimientos`})`}{" "}
            con una unidad de negocio que no pertenece a ninguna empresa. No se suman a ningún rubro
            de ningún reporte.
          </p>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {noAsignado.map((n) => (
                <tr key={n.unidad} className="border-t border-line-hairline first:border-t-0">
                  <td className="py-1.5 pr-3">{n.unidad}</td>
                  <td className="py-1.5 pr-3 text-xs text-ink-muted">
                    {n.movimientos === 1 ? "1 movimiento" : `${n.movimientos} movimientos`}
                  </td>
                  <td className="py-1.5 text-right tabular whitespace-nowrap">
                    ${formatearImporte(n.importe)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-ink-muted">
            Están en semanas ya cerradas, que no se pueden editar:{" "}
            {semanasConNoAsignado.map((numero, i) => (
              <span key={numero}>
                {i > 0 && ", "}
                <Link
                  href={`/${empresaSlug}/${periodo}/ejecucion/${numero}`}
                  className="text-marino underline underline-offset-2 hover:text-marino-dark"
                >
                  semana {numero}
                </Link>
              </span>
            ))}
            . En las próximas semanas, asigná la unidad (o prorrateá) antes del cierre semanal.
          </p>
        </div>
      )}

      <p className="mt-8 text-xs text-ink-muted">Disponibilidades e Ingresos: próximamente</p>
    </div>
  );
}
