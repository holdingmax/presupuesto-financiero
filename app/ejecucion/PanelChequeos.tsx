"use client";

import { useState } from "react";
import { formatearImporte } from "./formato";
import type { ResultadoChequeo } from "./actions";

// Mismo trazo que el resto de los íconos a mano (IconoOjo, IconoMenu) — alineado
// con el chevron que ya usa el <select> de Clasificación en TablaMovimientos.
function IconoChevronDerecha({ expandido }: { expandido: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform ${expandido ? "rotate-90" : ""}`}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

// Colapsado por defecto — incluso cuando no da $0. El detalle solo llega del
// server cuando !ok (ver calcularChequeosSumaCero), así que acá no hay nada
// que expandir para los que sí dan $0 (sin chevron, botón deshabilitado). La
// fila OK mantiene el mismo alto/tipografía que las demás a propósito — un
// spacer del ancho del chevron ocupa su lugar, y el label "NETO" + el número
// se renderizan igual, para que no se sienta "menos" que las otras dos.
function FilaChequeo({ chequeo, esUltima }: { chequeo: ResultadoChequeo; esUltima: boolean }) {
  const [expandido, setExpandido] = useState(false);
  const tieneDetalle = chequeo.lineas.length > 0;

  return (
    <div className={`border-l-2 ${chequeo.ok ? "border-l-positive" : "border-l-negative"}`}>
      <button
        type="button"
        onClick={() => tieneDetalle && setExpandido((v) => !v)}
        disabled={!tieneDetalle}
        className={`flex w-full items-center justify-between gap-3 py-2.5 pl-3 pr-3 text-left transition-colors ${
          tieneDetalle ? "cursor-pointer hover:bg-surface-hover" : "cursor-default"
        } ${!esUltima ? "border-b border-line-hairline" : ""}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {tieneDetalle ? (
            <IconoChevronDerecha expandido={expandido} />
          ) : (
            <span className="inline-block w-[12px] shrink-0" />
          )}
          <span className="truncate text-sm font-medium text-ink">{chequeo.nombre}</span>
          <span className="whitespace-nowrap text-xs text-ink-muted">
            {chequeo.cantidad} línea{chequeo.cantidad === 1 ? "" : "s"}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-ink-faint">
            Neto
          </span>
          <span
            className={`tabular text-base font-semibold ${chequeo.ok ? "text-positive" : "text-negative"}`}
          >
            {chequeo.ok && "✓ "}${formatearImporte(chequeo.neto)}
          </span>
        </span>
      </button>
      {expandido && tieneDetalle && (
        <ul
          className={`list-disc pl-9 pb-3 pr-3 text-xs text-ink-secondary ${
            !esUltima ? "border-b border-line-hairline" : ""
          }`}
        >
          {chequeo.lineas.map((l) => (
            <li key={l.id}>
              {l.fecha} — {l.concepto}: ${formatearImporte(l.importe)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PanelChequeos({ chequeos }: { chequeos: ResultadoChequeo[] }) {
  if (chequeos.length === 0) return null;

  return (
    <div className="mb-10 rounded-lg border border-line-strong bg-paper-raised px-6 py-5">
      <p className="mb-3 text-sm font-medium">Chequeos de suma-cero</p>
      <div>
        {chequeos.map((c, i) => (
          <FilaChequeo key={c.clasificacion} chequeo={c} esUltima={i === chequeos.length - 1} />
        ))}
      </div>
    </div>
  );
}
