"use client";

import { formatearImporte } from "./formato";

export type MovimientoTabla = {
  id: string;
  fecha: string;
  concepto: string;
  importe: number;
  bancoYCuenta: string;
  clasificacion: string;
  unidadNegocio: string;
  detalle: string;
};

type Props = {
  movimientos: MovimientoTabla[];
  soloLectura?: boolean;
  deshabilitado?: boolean;
  clasificacionesDisponibles?: string[];
  onCambiarClasificacion?: (id: string, valor: string) => void;
  onCambiarUnidadNegocio?: (id: string, valor: string) => void;
  onGuardarUnidadNegocio?: (id: string, valor: string) => void;
  onQuitar?: (id: string) => void;
};

export default function TablaMovimientos({
  movimientos,
  soloLectura = false,
  deshabilitado = false,
  clasificacionesDisponibles = [],
  onCambiarClasificacion,
  onCambiarUnidadNegocio,
  onGuardarUnidadNegocio,
  onQuitar,
}: Props) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-ink-muted uppercase tracking-wide">
          <th className="text-left py-2 pr-3 font-normal">Fecha</th>
          <th className="text-left py-2 pr-3 font-normal">Concepto</th>
          <th className="text-left py-2 pr-3 font-normal">Banco</th>
          <th className="text-right py-2 pr-3 font-normal">Importe</th>
          <th className="text-left py-2 pr-3 font-normal">Clasificación</th>
          <th className="text-left py-2 pr-3 font-normal">Unidad de negocio</th>
          {!soloLectura && <th className="py-2" />}
        </tr>
      </thead>
      <tbody>
        {movimientos.map((m) => (
          <tr key={m.id} className="group border-t border-line">
            <td className="py-2 pr-3 whitespace-nowrap text-ink-secondary">{m.fecha}</td>
            <td className="py-2 pr-3 max-w-xs truncate" title={m.concepto}>
              {m.concepto}
            </td>
            <td className="py-2 pr-3 whitespace-nowrap text-ink-secondary">
              {m.bancoYCuenta}
            </td>
            <td
              className={`py-2 pr-3 text-right tabular whitespace-nowrap ${
                m.importe < 0 ? "text-terracota" : "text-ink"
              }`}
            >
              ${formatearImporte(m.importe)}
            </td>
            <td className="py-2 pr-3">
              {soloLectura ? (
                <span>{m.clasificacion}</span>
              ) : (
                <select
                  value={m.clasificacion}
                  disabled={deshabilitado}
                  onChange={(e) => onCambiarClasificacion?.(m.id, e.target.value)}
                  className="w-36 bg-transparent border-b border-transparent hover:border-line focus:border-marino outline-none text-sm disabled:text-ink-muted disabled:cursor-not-allowed"
                >
                  {!clasificacionesDisponibles.includes(m.clasificacion) && (
                    <option value={m.clasificacion}>{m.clasificacion}</option>
                  )}
                  {clasificacionesDisponibles.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </td>
            <td className="py-2 pr-3">
              {soloLectura ? (
                <span>{m.unidadNegocio}</span>
              ) : (
                <input
                  value={m.unidadNegocio}
                  disabled={deshabilitado}
                  onChange={(e) => onCambiarUnidadNegocio?.(m.id, e.target.value)}
                  onBlur={(e) => onGuardarUnidadNegocio?.(m.id, e.target.value)}
                  className="w-32 bg-transparent border-b border-transparent hover:border-line focus:border-marino outline-none text-sm disabled:text-ink-muted"
                />
              )}
            </td>
            {!soloLectura && (
              <td className="py-2">
                {!deshabilitado && onQuitar && (
                  <button
                    onClick={() => onQuitar(m.id)}
                    className="text-xs text-ink-muted opacity-0 group-hover:opacity-100 hover:text-terracota transition"
                  >
                    Quitar
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
