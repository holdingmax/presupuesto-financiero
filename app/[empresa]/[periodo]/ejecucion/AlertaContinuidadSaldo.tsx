"use client";

import { useState } from "react";
import { formatearImporte } from "./formato";
import type { ResultadoContinuidadSaldo } from "./actions";

// Mismo trazo que el resto de los íconos a mano del sistema (IconoChevronDerecha
// en PanelChequeos.tsx) — reutilizado tal cual para no introducir un lenguaje
// visual nuevo.
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

function FilaCuenta({ cuenta, esUltima }: { cuenta: ResultadoContinuidadSaldo; esUltima: boolean }) {
  const [expandido, setExpandido] = useState(false);

  return (
    <div className="border-l-2 border-l-negative">
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className={`flex w-full items-center gap-2 py-2 pl-3 pr-3 text-left transition-colors cursor-pointer hover:bg-surface-hover ${
          !esUltima ? "border-b border-line-hairline" : ""
        }`}
      >
        <IconoChevronDerecha expandido={expandido} />
        <span className="truncate text-sm font-medium text-ink">{cuenta.bancoYCuenta}</span>
        <span className="whitespace-nowrap text-xs text-ink-muted">
          {cuenta.cantidad} ruptura{cuenta.cantidad === 1 ? "" : "s"}
        </span>
      </button>
      {expandido && (
        <ul
          className={`list-disc pl-9 pb-2 pr-3 text-xs text-ink-secondary ${
            !esUltima ? "border-b border-line-hairline" : ""
          }`}
        >
          {cuenta.rupturas.map((r, i) => (
            <li key={i}>
              {r.fechaAnterior} → {r.fechaSiguiente} ({r.concepto}): esperaba $
              {formatearImporte(r.saldoEsperado)}, el archivo trae ${formatearImporte(r.saldoReal)} —
              difiere ${formatearImporte(Math.abs(r.diferencia))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AlertaContinuidadSaldo({
  continuidadSaldo,
}: {
  continuidadSaldo: ResultadoContinuidadSaldo[];
}) {
  if (continuidadSaldo.length === 0) return null;

  return (
    <div className="mt-3 rounded-md border border-line-strong bg-paper-raised">
      <p className="px-3 pt-2.5 pb-2 text-sm text-terracota">
        Posible salto de saldo en{" "}
        {continuidadSaldo.length === 1 ? "1 cuenta" : `${continuidadSaldo.length} cuentas`} — no
        bloquea la carga, revisá:
      </p>
      <div className="border-t border-line-hairline">
        {continuidadSaldo.map((c, i) => (
          <FilaCuenta key={c.bancoYCuenta} cuenta={c} esUltima={i === continuidadSaldo.length - 1} />
        ))}
      </div>
    </div>
  );
}
