"use client";

import { useEffect, useRef, useState } from "react";
import { formatearImporte } from "./formato";

// Sin librería de íconos en el proyecto — SVG a mano, mismo criterio que
// IconoOjo (components/CampoPassword.tsx).
function IconoMenu() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
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

// Reemplaza los botones "Ignorar"/"Quitar" sueltos: esos dos, uno de ellos solo
// visible en hover, dependían del ancho disponible en la columna de acciones y
// se comprimían/cortaban en pantallas angostas (la tabla es w-full con
// table-layout automático — sin esta columna a ancho fijo, el navegador achica
// la que no tenga contenido protegido en vez de desbordar). El botón ⋯ es de
// ancho fijo y siempre visible — no depende del viewport ni del hover.
function MenuAcciones({
  ignorado,
  onToggleIgnorado,
  onQuitar,
}: {
  ignorado: boolean;
  onToggleIgnorado?: () => void;
  onQuitar?: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function alClickearAfuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", alClickearAfuera);
    return () => document.removeEventListener("mousedown", alClickearAfuera);
  }, [abierto]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Acciones"
        className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-paper-cool hover:text-ink transition"
      >
        <IconoMenu />
      </button>
      {abierto && (
        // Fondo explícito por style (no solo la clase bg-paper-raised) + isolation:
        // "isolate" fuerza un stacking context propio para este panel, blindándolo
        // contra cualquier bleed-through del contenido de la fila de abajo dentro
        // de la tabla — no lo pude reproducir en local (dev ni build de producción,
        // el background-color computado ya daba blanco sólido), pero esto es
        // a prueba de balas independientemente de la causa real en testing.
        <div
          className="absolute right-0 top-full z-30 mt-1 w-36 rounded-md border border-line-strong bg-paper-raised py-1 shadow-lg shadow-ink/15"
          style={{ backgroundColor: "#ffffff", isolation: "isolate" }}
        >
          {onToggleIgnorado && (
            <button
              type="button"
              onClick={() => {
                onToggleIgnorado();
                setAbierto(false);
              }}
              className="block w-full px-3 py-1.5 text-left text-xs text-ink-secondary hover:bg-paper-cool hover:text-ink"
            >
              {ignorado ? "Reactivar" : "Ignorar"}
            </button>
          )}
          {onQuitar && (
            <button
              type="button"
              onClick={() => {
                onQuitar();
                setAbierto(false);
              }}
              className="block w-full px-3 py-1.5 text-left text-xs text-terracota hover:bg-terracota-tint"
            >
              Quitar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export type MovimientoTabla = {
  id: string;
  fecha: string;
  concepto: string;
  importe: number;
  bancoYCuenta: string;
  clasificacion: string;
  unidadNegocio: string;
  detalle: string;
  ignorado: boolean;
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
  onToggleIgnorado?: (id: string, valor: boolean) => void;
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
  onToggleIgnorado,
}: Props) {
  return (
    <table className="w-full min-w-[880px] text-sm">
      <thead>
        <tr className="text-xs text-ink-faint uppercase tracking-wide">
          <th className="text-left py-2 pr-3 font-medium">Fecha</th>
          <th className="text-left py-2 pr-3 font-medium">Concepto</th>
          <th className="text-left py-2 pr-3 font-medium">Banco</th>
          <th className="text-right py-2 pr-3 font-medium">Importe</th>
          <th className="text-left py-2 pr-3 font-medium">Clasificación</th>
          <th className="text-left py-2 pr-3 font-medium">Unidad de negocio</th>
          {!soloLectura && <th className="py-2 w-10" />}
        </tr>
      </thead>
      <tbody>
        {movimientos.map((m) => (
          <tr
            key={m.id}
            className={`group border-t border-line-hairline hover:bg-surface-hover transition-colors ${
              m.ignorado ? "line-through text-ink-muted opacity-60" : ""
            }`}
          >
            <td className="py-2 pr-3 whitespace-nowrap text-ink-secondary">{m.fecha}</td>
            <td className="py-2 pr-3 max-w-xs truncate" title={m.concepto}>
              {m.concepto}
            </td>
            <td className="py-2 pr-3 whitespace-nowrap text-ink-secondary">
              {m.bancoYCuenta}
            </td>
            <td
              className={`py-2 pr-3 text-right tabular whitespace-nowrap ${
                m.importe < 0 ? "text-negative" : "text-positive"
              }`}
            >
              ${formatearImporte(m.importe)}
            </td>
            <td className="py-2 pr-3">
              {soloLectura ? (
                <span>{m.clasificacion}</span>
              ) : (
                <div className="relative inline-block">
                  <select
                    value={m.clasificacion}
                    disabled={deshabilitado}
                    onChange={(e) => onCambiarClasificacion?.(m.id, e.target.value)}
                    className="w-40 appearance-none rounded-md border border-transparent bg-transparent py-1 pl-2 pr-6 text-sm outline-none transition hover:border-line hover:bg-surface-hover focus:border-marino focus:bg-paper-raised disabled:cursor-not-allowed disabled:text-ink-muted disabled:hover:bg-transparent"
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
                  <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-ink-faint">
                    <IconoChevron />
                  </span>
                </div>
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
                  className="w-32 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm outline-none transition hover:border-line hover:bg-surface-hover focus:border-marino focus:bg-paper-raised disabled:text-ink-muted"
                />
              )}
            </td>
            {!soloLectura && (
              <td className="py-2">
                {!deshabilitado && (
                  <MenuAcciones
                    ignorado={m.ignorado}
                    onToggleIgnorado={
                      onToggleIgnorado ? () => onToggleIgnorado(m.id, !m.ignorado) : undefined
                    }
                    onQuitar={onQuitar ? () => onQuitar(m.id) : undefined}
                  />
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
