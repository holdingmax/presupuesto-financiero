"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { guardarDesgloseMovimiento, eliminarDesgloseMovimiento } from "./actions";
import { parsearImporteArgentino } from "@/lib/numero";
import CampoImporte from "@/components/CampoImporte";

type SubLinea = { unidadNegocio: string; importe: string };

type Props = {
  numeroSemana: number;
  movimientoId: string;
  importeMovimiento: number;
  desgloseInicial: { id: string; unidadNegocio: string; importe: number }[];
  onCerrar: () => void;
};

function formatearImporte(valor: number) {
  return valor.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

// Mismo patrón que DesglosePanel.tsx (Presupuesto), solo cambia detalle por
// unidadNegocio — no toca en ningún momento MovimientoBancario.unidadNegocio
// propio de la fila (eso se sigue editando aparte, en el <input> de
// TablaMovimientos). Ver el comentario en guardarDesgloseMovimiento.
export default function PanelDesgloseMovimiento({
  numeroSemana,
  movimientoId,
  importeMovimiento,
  desgloseInicial,
  onCerrar,
}: Props) {
  const router = useRouter();
  const { empresa: empresaSlug, periodo: periodoUrl } = useParams<{
    empresa: string;
    periodo: string;
  }>();

  // Se guarda con el mismo signo que el movimiento padre (ver
  // guardarDesgloseMovimiento), pero el campo siempre muestra/recibe la
  // magnitud positiva — Math.abs() acá es para que, al reabrir un desglose
  // ya guardado, el campo vuelva a mostrar el mismo número positivo que se
  // tipeó, no el valor con signo tal cual quedó en la base.
  const [sublineas, setSublineas] = useState<SubLinea[]>(
    desgloseInicial.length > 0
      ? desgloseInicial.map((s) => ({ unidadNegocio: s.unidadNegocio, importe: String(Math.abs(s.importe)) }))
      : [
          { unidadNegocio: "", importe: "" },
          { unidadNegocio: "", importe: "" },
        ]
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [quitando, setQuitando] = useState(false);

  // MovimientoBancario.importe siempre trae el signo del banco (negativo en un
  // débito — el caso típico de SUELDOS/EXPENSAS) pero Macchi piensa en montos
  // positivos ("$2M para Mantenor"), no en débitos negativos. Por eso se suma
  // por magnitud (abs) acá y también al guardar en el server — no por el
  // valor tal cual tipeado.
  const suma = sublineas.reduce((acc, s) => {
    const n = parsearImporteArgentino(s.importe);
    return acc + (Number.isNaN(n) ? 0 : Math.abs(n));
  }, 0);
  const coincide = Math.abs(suma - Math.abs(importeMovimiento)) < 0.01;

  function actualizarSublinea(i: number, campo: keyof SubLinea, valor: string) {
    setSublineas((prev) => prev.map((s, idx) => (idx === i ? { ...s, [campo]: valor } : s)));
    setErrores((prev) => {
      const { [`${campo}_${i}`]: _omitido, general: _g, ...resto } = prev;
      return resto;
    });
  }

  function agregarSublinea() {
    setSublineas((prev) => [...prev, { unidadNegocio: "", importe: "" }]);
  }

  function quitarSublinea(i: number) {
    setSublineas((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function guardar() {
    setGuardando(true);
    setErrores({});

    const resultado = await guardarDesgloseMovimiento(
      empresaSlug,
      periodoUrl,
      numeroSemana,
      movimientoId,
      sublineas
    );

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
    await eliminarDesgloseMovimiento(empresaSlug, periodoUrl, numeroSemana, movimientoId);
    setQuitando(false);
    router.refresh();
    onCerrar();
  }

  return (
    <div className="rounded-md border border-line-strong border-l-4 border-l-marino bg-paper-cool px-4 py-4">
      <p className="mb-3 text-sm font-medium text-ink">Desglose por unidad de negocio</p>

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
                value={s.unidadNegocio}
                onChange={(e) => actualizarSublinea(i, "unidadNegocio", e.target.value)}
                placeholder="Unidad de negocio"
                className={`w-full h-10 rounded-md border bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-marino/15 ${
                  errores[`unidadNegocio_${i}`] ? "border-terracota" : "border-line focus:border-marino"
                }`}
              />
              {errores[`unidadNegocio_${i}`] && (
                <p className="mt-1 text-xs text-terracota">{errores[`unidadNegocio_${i}`]}</p>
              )}
            </div>
            <div className="w-36">
              <CampoImporte
                value={s.importe}
                onChange={(valor) => actualizarSublinea(i, "importe", valor)}
                hasError={Boolean(errores[`importe_${i}`])}
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
        + Agregar unidad de negocio
      </button>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span className="text-xs">
          <span className="text-ink-muted">Desglosado: </span>
          <span className="tabular font-medium text-ink">${formatearImporte(suma)}</span>
          <span className="text-ink-muted"> de ${formatearImporte(Math.abs(importeMovimiento))}</span>
          {coincide ? (
            <span className="ml-2 font-medium text-verde">✓ Coincide</span>
          ) : (
            <span className="ml-2 text-terracota">
              Difiere por ${formatearImporte(Math.abs(Math.abs(importeMovimiento) - suma))}
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
