"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { cambiarPassword, type ResultadoCambiarPassword } from "./actions";
import CampoPassword from "@/components/CampoPassword";

const ESTADO_INICIAL: ResultadoCambiarPassword | null = null;

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
