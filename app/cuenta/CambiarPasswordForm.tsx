"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { cambiarPassword, type ResultadoCambiarPassword } from "./actions";

const ESTADO_INICIAL: ResultadoCambiarPassword | null = null;

// Sin librería de íconos en el proyecto — SVGs a mano, mismo trazo fino en
// las dos variantes (abierto/tachado) para que el toggle no salte de tamaño.
function IconoOjo({ tachado }: { tachado: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
      {tachado && <line x1="3" y1="21" x2="21" y2="3" />}
    </svg>
  );
}

function CampoPassword({
  id,
  name,
  label,
  error,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  error?: string;
  onChange?: (valor: string) => void;
}) {
  const [mostrar, setMostrar] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-sm text-ink-secondary mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={mostrar ? "text" : "password"}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className={`w-full h-11 rounded-md border bg-paper px-3.5 pr-11 text-sm outline-none focus:ring-2 focus:ring-marino/15 ${
            error ? "border-terracota" : "border-line focus:border-marino"
          }`}
        />
        <button
          type="button"
          onClick={() => setMostrar((v) => !v)}
          aria-label={mostrar ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted hover:text-ink-secondary"
        >
          <IconoOjo tachado={!mostrar} />
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-terracota">{error}</p>}
    </div>
  );
}

export default function CambiarPasswordForm() {
  const [estado, formAction, pendiente] = useActionState(cambiarPassword, ESTADO_INICIAL);
  const erroresCampo = estado && !estado.ok ? estado.errores : {};

  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const coincide = confirmar.length > 0 ? confirmar === nueva : null;

  if (estado?.ok) {
    return (
      <div>
        <p className="text-sm text-marino bg-marino-tint rounded-md px-3 py-2 mb-6">
          Contraseña actualizada.
        </p>
        <Link href="/" className="text-sm text-marino underline underline-offset-2">
          Ir a mis empresas
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <CampoPassword id="actual" name="actual" label="Contraseña actual" error={erroresCampo.actual} />

      <CampoPassword
        id="nueva"
        name="nueva"
        label="Contraseña nueva"
        error={erroresCampo.nueva}
        onChange={setNueva}
      />

      <div>
        <CampoPassword
          id="confirmar"
          name="confirmar"
          label="Confirmar contraseña nueva"
          error={erroresCampo.confirmar}
          onChange={setConfirmar}
        />
        {/* Solo feedback visual anticipado — la validación real sigue en el
            servidor (cambiarPassword ya compara "nueva" con "confirmar"). */}
        {coincide === true && (
          <p className="mt-1 text-xs font-medium text-verde">✓ Coinciden</p>
        )}
        {coincide === false && (
          <p className="mt-1 text-xs text-ink-muted">No coinciden todavía</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pendiente}
        className="h-11 px-5 rounded-md bg-marino text-white text-sm font-medium hover:bg-marino-dark transition disabled:opacity-60"
      >
        {pendiente ? "Guardando..." : "Cambiar contraseña"}
      </button>
    </form>
  );
}
