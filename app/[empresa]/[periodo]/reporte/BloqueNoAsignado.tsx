import Link from "next/link";
import { formatearImporte } from "../ejecucion/formato";

type Props = {
  empresaSlug: string;
  periodo: string;
  // De los extractos de ESTA empresa: importes cuya unidad no pertenece a ninguna
  // empresa. No se suman a ningún rubro (ver lib/reporte.ts).
  noAsignado: { unidad: string; importe: number; movimientos: number }[];
  semanasConNoAsignado: number[];
};

// Bloque "No asignado a ninguna empresa", al pie del Reporte (Fase 1 y por
// plantilla).
export default function BloqueNoAsignado({ empresaSlug, periodo, noAsignado, semanasConNoAsignado }: Props) {
  if (noAsignado.length === 0) return null;
  const totalNoAsignado = noAsignado.reduce((suma, n) => suma + n.importe, 0);
  const movimientosNoAsignados = noAsignado.reduce((suma, n) => suma + n.movimientos, 0);
  return (
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
  );
}
