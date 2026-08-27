import { formatearImporte } from "./formato";
import type { ResultadoChequeo } from "./actions";

// Solo presentación (sin estado ni handlers) — no necesita "use client" propio,
// aunque cuelga del árbol cliente de PanelImputacion igual.
export default function PanelChequeos({ chequeos }: { chequeos: ResultadoChequeo[] }) {
  if (chequeos.length === 0) return null;

  return (
    <div className="mb-10 rounded-lg border border-line-strong bg-paper-raised px-6 py-6">
      <p className="text-sm font-medium mb-4">Chequeos de suma-cero</p>
      <div className="space-y-2">
        {chequeos.map((c) => (
          <div
            key={c.clasificacion}
            className={`rounded-md px-3 py-2 text-sm ${
              c.ok ? "bg-positive/10 text-positive" : "bg-terracota-tint text-terracota"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{c.nombre}</span>
              <span className="tabular">{c.ok ? "✓ $0" : `Neto: $${formatearImporte(c.neto)}`}</span>
            </div>
            {!c.ok && (
              <ul className="mt-2 list-disc pl-5 text-xs">
                {c.lineas.map((l) => (
                  <li key={l.id}>
                    {l.fecha} — {l.concepto}: ${formatearImporte(l.importe)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
