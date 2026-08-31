"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { guardarDesglose, eliminarDesglose } from "./actions";

type SubLinea = { detalle: string; importe: string };

type Props = {
  lineaId: string;
  importeLinea: number;
  desgloseInicial: { id: string; detalle: string; importe: number }[];
  onCerrar: () => void;
};

function formatearImporte(valor: number) {
  return valor.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

export default function DesglosePanel({ lineaId, importeLinea, desgloseInicial, onCerrar }: Props) {
  const router = useRouter();
  const { empresa: empresaSlug, periodo: periodoUrl } = useParams<{
    empresa: string;
    periodo: string;
  }>();

  const [sublineas, setSublineas] = useState<SubLinea[]>(
    desgloseInicial.length > 0
      ? desgloseInicial.map((s) => ({ detalle: s.detalle, importe: String(s.importe) }))
      : [
          { detalle: "", importe: "" },
          { detalle: "", importe: "" },
        ]
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [quitando, setQuitando] = useState(false);

  const suma = sublineas.reduce((acc, s) => {
    const n = Number(s.importe);
    return acc + (Number.isNaN(n) ? 0 : n);
  }, 0);
  const coincide = Math.abs(suma - importeLinea) < 0.01;

  function actualizarSublinea(i: number, campo: keyof SubLinea, valor: string) {
    setSublineas((prev) => prev.map((s, idx) => (idx === i ? { ...s, [campo]: valor } : s)));
    setErrores((prev) => {
      const { [`${campo}_${i}`]: _omitido, general: _g, ...resto } = prev;
      return resto;
    });
  }

  function agregarSublinea() {
    setSublineas((prev) => [...prev, { detalle: "", importe: "" }]);
  }

  function quitarSublinea(i: number) {
    setSublineas((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function guardar() {
    setGuardando(true);
    setErrores({});

    const resultado = await guardarDesglose(empresaSlug, periodoUrl, lineaId, sublineas);

    if (!resultado.ok) {
      setErrores(resultado.errores);
      setGuardando(false);
      return;
    }

    setGuardando(false);
    router.refresh();
    onCerrar();
  }

  async function quitarDesglose() {
    setQuitando(true);
    await eliminarDesglose(empresaSlug, periodoUrl, lineaId);
    setQuitando(false);
    router.refresh();
    onCerrar();
  }

  return (
    <div className="mb-3 rounded-md border border-line-strong border-l-4 border-l-marino bg-paper-cool px-4 py-4">
      <p className="mb-3 text-sm font-medium text-ink">Desglose de la línea</p>

      {errores.general && (
        <p className="mb-3 text-sm text-terracota bg-terracota-tint rounded-md px-3 py-2">
          {errores.general}
        </p>
      )}

      <div className="space-y-2.5">
        {sublineas.map((s, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="flex-1">
              <input
                value={s.detalle}
                onChange={(e) => actualizarSublinea(i, "detalle", e.target.value)}
                placeholder="Detalle de este concepto"
                className={`w-full h-10 rounded-md border bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-marino/15 ${
                  errores[`detalle_${i}`] ? "border-terracota" : "border-line focus:border-marino"
                }`}
              />
              {errores[`detalle_${i}`] && (
                <p className="mt-1 text-xs text-terracota">{errores[`detalle_${i}`]}</p>
              )}
            </div>
            <div className="w-36">
              <input
                type="number"
                step="0.01"
                value={s.importe}
                onChange={(e) => actualizarSublinea(i, "importe", e.target.value)}
                placeholder="0,00"
                className={`w-full h-10 rounded-md border bg-paper px-3 text-sm tabular outline-none focus:ring-2 focus:ring-marino/15 ${
                  errores[`importe_${i}`] ? "border-terracota" : "border-line focus:border-marino"
                }`}
              />
              {errores[`importe_${i}`] && (
                <p className="mt-1 text-xs text-terracota">{errores[`importe_${i}`]}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => quitarSublinea(i)}
              disabled={sublineas.length === 1}
              className="h-10 px-2 text-xs text-ink-muted hover:text-terracota transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={agregarSublinea}
        className="mt-3 text-sm text-marino hover:text-marino-dark underline underline-offset-2"
      >
        + Agregar sub-línea
      </button>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span className="text-xs">
          <span className="text-ink-muted">Desglosado: </span>
          <span className="tabular font-medium text-ink">${formatearImporte(suma)}</span>
          <span className="text-ink-muted"> de ${formatearImporte(importeLinea)}</span>
          {coincide ? (
            <span className="ml-2 font-medium text-verde">✓ Coincide</span>
          ) : (
            <span className="ml-2 text-terracota">
              Difiere por ${formatearImporte(Math.abs(importeLinea - suma))}
            </span>
          )}
        </span>

        <div className="flex items-center gap-3">
          {desgloseInicial.length > 0 && (
            <button
              type="button"
              onClick={quitarDesglose}
              disabled={quitando || guardando}
              className="text-xs text-ink-muted hover:text-terracota transition disabled:opacity-50"
            >
              {quitando ? "Quitando..." : "Quitar desglose"}
            </button>
          )}
          <button
            type="button"
            onClick={onCerrar}
            className="h-9 px-3 rounded-md text-sm text-ink-secondary hover:text-ink transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={!coincide || guardando}
            className="h-9 px-4 rounded-md bg-marino text-white text-sm font-medium hover:bg-marino-dark transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {guardando ? "Guardando..." : "Guardar desglose"}
          </button>
        </div>
      </div>
    </div>
  );
}
