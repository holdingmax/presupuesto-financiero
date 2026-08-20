"use client";

import { useState } from "react";

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

// Dos tamaños porque cada pantalla ya tenía el suyo antes de compartir este
// componente: "sm" es el de /cuenta (h-11, text-sm, bg-paper), "lg" es el que
// ya usaba el input de Email en /login (h-12, text-[15px], bg-paper-raised)
// — así el campo de Contraseña no queda desparejo contra el resto de cada
// formulario.
const TAMANOS = {
  sm: "h-11 text-sm bg-paper",
  lg: "h-12 text-[15px] bg-paper-raised",
} as const;

// Compartido entre /login y /cuenta (cambio de contraseña) — antes vivía
// duplicado como componente privado de CambiarPasswordForm.tsx.
export default function CampoPassword({
  id,
  name,
  label,
  error,
  required,
  placeholder,
  size = "sm",
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  size?: keyof typeof TAMANOS;
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
          required={required}
          placeholder={placeholder}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className={`w-full rounded-md border px-3.5 pr-11 outline-none focus:ring-2 focus:ring-marino/15 ${TAMANOS[size]} ${
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
