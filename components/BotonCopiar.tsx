"use client";

import { useState } from "react";

// Copia exactamente `texto` (sin espacios ni saltos de línea que arrastraría
// seleccionar a mano el texto en pantalla). Pensado para la contraseña temporal.
export default function BotonCopiar({ texto }: { texto: string }) {
  const [estado, setEstado] = useState<"idle" | "ok" | "error">("idle");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setEstado("ok");
    } catch {
      setEstado("error");
    }
    setTimeout(() => setEstado("idle"), 2500);
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="ml-2 h-7 px-2.5 rounded-md border border-marino/30 text-xs font-medium text-marino hover:bg-paper transition"
    >
      {estado === "ok" ? "¡Copiada!" : estado === "error" ? "No se pudo copiar" : "Copiar"}
    </button>
  );
}
