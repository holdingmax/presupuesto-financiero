"use client";

import { useState } from "react";
import { formatearImporte } from "./formato";
import type { ResultadoChequeo } from "./actions";

// Sin librería de íconos en el proyecto — SVG a mano, mismo criterio que
// IconoOjo/IconoMenu/IconoFlechaArriba.
function IconoFlechaDerecha({ expandido }: { expandido: boolean }) {
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
// que expandir para los que sí dan $0 (el botón queda deshabilitado, sin
// flecha, para no sugerir una acción que no hace nada).
function FilaChequeo({ chequeo }: { chequeo: ResultadoChequeo }) {
  const [expandido, setExpandido] = useState(false);
  const tieneDetalle = chequeo.lineas.length > 0;

  return (
    <div className={`rounded-md text-sm ${chequeo.ok ? "bg-positive/10 text-positive" : "bg-terracota-tint text-terracota"}`}>
      <button
        type="button"
        onClick={() => tieneDetalle && setExpandido((v) => !v)}
        disabled={!tieneDetalle}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left disabled:cursor-default"
      >
        <span className="flex items-center gap-1.5 font-medium">
          {tieneDetalle ? (
            <IconoFlechaDerecha expandido={expandido} />
          ) : (
            <span className="inline-block w-[12px]" />
          )}
          {chequeo.nombre}
        </span>
        <span className="flex items-center gap-2 whitespace-nowrap tabular">
          <span className="text-xs font-normal opacity-75">
            {chequeo.cantidad} línea{chequeo.cantidad === 1 ? "" : "s"}
          </span>
          {chequeo.ok ? "✓ $0" : `Neto: $${formatearImporte(chequeo.neto)}`}
        </span>
      </button>
      {expandido && tieneDetalle && (
        <ul className="list-disc pl-9 pb-3 pr-3 text-xs">
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
    <div className="mb-10 rounded-lg border border-line-strong bg-paper-raised px-6 py-6">
      <p className="text-sm font-medium mb-4">Chequeos de suma-cero</p>
      <div className="space-y-2">
        {chequeos.map((c) => (
          <FilaChequeo key={c.clasificacion} chequeo={c} />
        ))}
      </div>
    </div>
  );
}
