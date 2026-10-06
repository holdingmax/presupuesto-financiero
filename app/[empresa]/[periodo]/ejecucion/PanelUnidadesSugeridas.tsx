"use client";

import type { GrupoUnidadSugerida } from "./actions";

type Props = {
  // Viene armado del server (obtenerDatosSemana → agruparUnidadesSugeridas)
  // sobre TODA la semana, no sobre la página que se está viendo — a diferencia
  // de PanelSugerenciasPendientes, que filtra las filas de la página actual.
  grupos: GrupoUnidadSugerida[];
  // Bulk por cuenta: no cambia la unidad, solo confirma tal cual. Una fila
  // puntual se corrige directo en la tabla (editarla confirma esa sola).
  onConfirmarCuenta: (grupo: GrupoUnidadSugerida) => void;
  confirmando: string | null;
};

export function claveGrupo(g: GrupoUnidadSugerida) {
  return `${g.cuenta}|${g.unidadNegocio}`;
}

export default function PanelUnidadesSugeridas({ grupos, onConfirmarCuenta, confirmando }: Props) {
  if (grupos.length === 0) return null;

  const total = grupos.reduce((suma, g) => suma + g.cantidad, 0);

  return (
    <div className="mb-8 rounded-lg border border-line-strong border-l-4 border-l-marino bg-paper-raised px-5 py-4">
      <p className="text-sm font-medium mb-1">Unidades de negocio sugeridas ({total})</p>
      <p className="text-xs text-ink-muted mb-3">
        Movimientos que vinieron sin unidad de negocio y tomaron la unidad madre de su cuenta
        bancaria. Confirmá por cuenta, o corregí una fila puntual en la tabla antes de confirmar
        el resto.
      </p>
      <div className="rounded-md border border-line-hairline bg-paper">
        <table className="w-full text-sm">
          <tbody>
            {grupos.map((g) => {
              const clave = claveGrupo(g);
              return (
                <tr key={clave} className="border-t border-line-hairline first:border-t-0">
                  <td className="py-2 pl-3 pr-2 whitespace-nowrap text-ink-secondary">{g.cuenta}</td>
                  <td className="py-2 pr-2 whitespace-nowrap">→ {g.unidadNegocio}</td>
                  <td className="py-2 pr-2 w-full text-xs text-ink-muted">
                    {g.cantidad === 1 ? "1 movimiento" : `${g.cantidad} movimientos`}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <button
                      type="button"
                      disabled={confirmando !== null}
                      onClick={() => onConfirmarCuenta(g)}
                      className="h-7 whitespace-nowrap px-3 rounded-md bg-marino text-white text-xs font-medium hover:bg-marino-dark active:scale-[0.99] transition disabled:opacity-50"
                    >
                      {confirmando === clave ? "Confirmando..." : `Confirmar las ${g.cantidad}`}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
