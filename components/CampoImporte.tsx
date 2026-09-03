"use client";

// Dos tamaños porque los 3 lugares que usan esto no comparten el mismo alto/
// tipografía: "lg" es el campo principal de Importe en el alta de Presupuesto
// (h-12, text-[15px]), "sm" son las sub-líneas de los paneles de desglose
// (h-10, text-sm) — mismo criterio que CampoPassword.tsx.
const TAMANOS = {
  sm: "h-10 text-sm",
  lg: "h-12 text-[15px]",
} as const;

type Props = {
  id?: string;
  value: string;
  onChange: (valor: string) => void;
  onBlur?: (valor: string) => void;
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
  size?: keyof typeof TAMANOS;
};

// El "$" es un prefijo puramente visual, fuera del <input> — nunca forma
// parte del texto editable. Bug real (2026-09-02): antes el "$" podía
// terminar como parte del valor tipeado (pegado, o remanente de un
// autocompletado del navegador), y como el campo es texto libre (necesario
// para aceptar "1.500.000" en formato argentino, ver lib/numero.ts),
// nada lo bloqueaba — rompía el parseo en silencio. parsearImporteArgentino()
// ya lo descarta como red de seguridad, pero sacarlo de la vista acá evita
// que vuelva a colarse desde el vamos.
export default function CampoImporte({
  id,
  value,
  onChange,
  onBlur,
  placeholder = "0",
  hasError,
  disabled,
  size = "sm",
}: Props) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
        $
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur ? (e) => onBlur(e.target.value) : undefined}
        placeholder={placeholder}
        className={`w-full rounded-md border bg-paper pl-6 pr-3 tabular outline-none focus:ring-2 focus:ring-marino/15 disabled:text-ink-muted ${TAMANOS[size]} ${
          hasError ? "border-terracota" : "border-line focus:border-marino"
        }`}
      />
    </div>
  );
}
