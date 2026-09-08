"use client";

import { useMemo, useState } from "react";
import { formatearImporte } from "./formato";

// Sin librería de íconos en el proyecto — SVG a mano, mismo criterio que
// IconoMenu/IconoChevron en TablaMovimientos.tsx.
function IconoAlerta() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function IconoChevron() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export type FilaSugerencia = {
  id: string;
  fecha: string;
  concepto: string;
  bancoYCuenta: string;
  importe: number;
  clasificacion: string;
  chequeIvaAmbiguo: boolean;
};

type Props = {
  sugerencias: FilaSugerencia[];
  clasificacionesDisponibles: string[];
  // Se llama tanto cuando el <select> de una fila cambia de valor de verdad
  // (onChange normal) como cuando se aprieta "Confirmar" reeligiendo el
  // mismo valor que ya tenía — en los dos casos hay que mandar `valor` igual,
  // porque actualizarMovimiento (el server action detrás de esto en
  // PanelImputacion) limpia sugeridaPorSistema sin excepción cuando
  // clasificacion viene en el payload, sin comparar contra el valor anterior.
  onConfirmarFila: (id: string, valor: string) => void;
  // Bulk: no cambia el valor de clasificacion, solo confirma tal cual.
  onConfirmarGrupo: (ids: string[]) => void;
};

export default function PanelSugerenciasPendientes({
  sugerencias,
  clasificacionesDisponibles,
  onConfirmarFila,
  onConfirmarGrupo,
}: Props) {
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  // Solo trackea lo que el usuario todavía no confirmó: en cuanto se
  // confirma una fila (individual o en lote), sale de `sugerencias` en el
  // próximo render y este estado para esa fila queda simplemente sin usar.
  const [valores, setValores] = useState<Record<string, string>>({});

  const grupos = useMemo(() => {
    const porClasificacion = new Map<string, FilaSugerencia[]>();
    for (const f of sugerencias) {
      const grupo = porClasificacion.get(f.clasificacion);
      if (grupo) grupo.push(f);
      else porClasificacion.set(f.clasificacion, [f]);
    }
    return Array.from(porClasificacion.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "es")
    );
  }, [sugerencias]);

  if (sugerencias.length === 0) return null;

  function toggleGrupo(clasificacion: string) {
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(clasificacion)) next.delete(clasificacion);
      else next.add(clasificacion);
      return next;
    });
  }

  function valorDe(f: FilaSugerencia) {
    return valores[f.id] ?? f.clasificacion;
  }

  return (
    <div className="mb-8 rounded-lg border border-line-strong border-l-4 border-l-marino bg-paper-raised px-5 py-4">
      <p className="text-sm font-medium mb-1">
        Sugerencias pendientes ({sugerencias.length})
      </p>
      <p className="text-xs text-ink-muted mb-3">
        Clasificaciones propuestas automáticamente, todavía sin confirmar. Revisá por grupo y
        confirmá de una, o corregí una fila puntual antes de confirmar el resto.
      </p>
      <div className="space-y-2">
        {grupos.map(([clasificacion, filas]) => {
          const abierto = abiertos.has(clasificacion);
          const confirmablesEnLote = filas.filter((f) => !f.chequeIvaAmbiguo);

          return (
            <div key={clasificacion} className="rounded-md border border-line-hairline bg-paper">
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <button
                  type="button"
                  onClick={() => toggleGrupo(clasificacion)}
                  className="flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink"
                >
                  <span className={`transition-transform ${abierto ? "rotate-0" : "-rotate-90"}`}>
                    <IconoChevron />
                  </span>
                  {clasificacion} ({filas.length})
                </button>
                {confirmablesEnLote.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onConfirmarGrupo(confirmablesEnLote.map((f) => f.id))}
                    className="h-7 shrink-0 px-3 rounded-md bg-marino text-white text-xs font-medium hover:bg-marino-dark active:scale-[0.99] transition"
                  >
                    Confirmar las {confirmablesEnLote.length}
                  </button>
                )}
              </div>

              {abierto && (
                <div className="overflow-x-auto border-t border-line-hairline">
                  <table className="w-full min-w-[640px] text-xs">
                    <tbody>
                      {filas.map((f) => (
                        <tr key={f.id} className="border-t border-line-hairline first:border-t-0">
                          <td className="py-1.5 pl-3 pr-2 whitespace-nowrap text-ink-secondary">
                            {f.fecha}
                          </td>
                          <td className="py-1.5 pr-2 max-w-[240px] truncate" title={f.concepto}>
                            {f.chequeIvaAmbiguo && (
                              <span
                                title="Esta referencia tiene más de un cheque real con el mismo N° e importe en la planilla de Macchi — confirmá solo después de revisarla a mano."
                                className="mr-1 inline-block align-middle text-terracota"
                              >
                                <IconoAlerta />
                              </span>
                            )}
                            {f.concepto}
                          </td>
                          <td className="py-1.5 pr-2 whitespace-nowrap text-ink-secondary">
                            {f.bancoYCuenta}
                          </td>
                          <td
                            className={`py-1.5 pr-2 text-right tabular whitespace-nowrap ${
                              f.importe < 0 ? "text-negative" : "text-positive"
                            }`}
                          >
                            ${formatearImporte(f.importe)}
                          </td>
                          <td className="py-1.5 pr-2">
                            <select
                              value={valorDe(f)}
                              onChange={(e) => {
                                setValores((prev) => ({ ...prev, [f.id]: e.target.value }));
                                onConfirmarFila(f.id, e.target.value);
                              }}
                              className="w-36 rounded-md border border-line bg-transparent px-1.5 py-1 text-xs outline-none focus:border-marino"
                            >
                              {!clasificacionesDisponibles.includes(valorDe(f)) && (
                                <option value={valorDe(f)}>{valorDe(f)}</option>
                              )}
                              {clasificacionesDisponibles.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1.5 pr-3">
                            <button
                              type="button"
                              onClick={() => onConfirmarFila(f.id, valorDe(f))}
                              className="h-6 whitespace-nowrap px-2 rounded-md border border-line text-ink-secondary hover:bg-paper-cool hover:text-ink transition"
                            >
                              Confirmar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
