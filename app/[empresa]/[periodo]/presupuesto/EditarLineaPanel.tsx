"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { editarLinea } from "./actions";
import {
  CLASIFICACIONES_PRESUPUESTO_TODAS,
  obtenerAyudaClasificacion,
} from "./clasificacionesPresupuesto";
import CampoImporte from "@/components/CampoImporte";

type Props = {
  lineaId: string;
  valoresIniciales: { concepto: string; detalle: string; importe: number; clasificacion: string };
  onCerrar: () => void;
};

// Mismo patrón visual que DesglosePanel.tsx (panel que se expande debajo de
// la fila). Este panel no tiene toggle Ingreso/Egreso (edita una línea ya
// cargada, no tiene sentido re-tipificarla acá) — muestra las 22 opciones
// combinadas (Ingreso + Egreso) sin filtrar, a propósito. Lista cerrada
// (decisión 2026-10-07): sin "+ clasificación nueva". Si la línea tiene una
// categoría vieja fuera de la lista, se muestra como opción extra (elegida) y
// se puede guardar tal cual — el server la acepta solo si no cambió (ver
// editarLinea); no se rompe ni se cambia en silencio.
export default function EditarLineaPanel({ lineaId, valoresIniciales, onCerrar }: Props) {
  const router = useRouter();
  const { empresa: empresaSlug, periodo: periodoUrl } = useParams<{
    empresa: string;
    periodo: string;
  }>();

  const clasificacionEsConocida = CLASIFICACIONES_PRESUPUESTO_TODAS.some(
    (o) => o.valorPersistido === valoresIniciales.clasificacion
  );

  const [concepto, setConcepto] = useState(valoresIniciales.concepto);
  const [detalle, setDetalle] = useState(valoresIniciales.detalle);
  const [importe, setImporte] = useState(String(valoresIniciales.importe));
  const [clasificacion, setClasificacion] = useState(valoresIniciales.clasificacion);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const ayudaClasificacion = clasificacion ? obtenerAyudaClasificacion(clasificacion) : null;

  function limpiarError(campo: string) {
    setErrores((prev) => {
      if (!(campo in prev)) return prev;
      const { [campo]: _omitido, ...resto } = prev;
      return resto;
    });
  }

  async function guardar() {
    setGuardando(true);
    setErrores({});

    const resultado = await editarLinea(empresaSlug, periodoUrl, lineaId, {
      concepto,
      detalle,
      importe,
      clasificacion,
    });

    if (!resultado.ok) {
      setErrores(resultado.errores);
      setGuardando(false);
      return;
    }

    setGuardando(false);
    router.refresh();
    onCerrar();
  }

  return (
    <div className="mb-3 space-y-3 rounded-md border border-line-strong border-l-4 border-l-marino bg-paper-cool px-4 py-4">
      <p className="text-sm font-medium text-ink">Editar línea</p>

      {errores.general && (
        <p className="text-sm text-terracota bg-terracota-tint rounded-md px-3 py-2">
          {errores.general}
        </p>
      )}

      <div>
        <input
          value={concepto}
          onChange={(e) => {
            setConcepto(e.target.value);
            limpiarError("concepto");
          }}
          placeholder="Concepto"
          className={`w-full h-10 rounded-md border bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-marino/15 ${
            errores.concepto ? "border-terracota" : "border-line focus:border-marino"
          }`}
        />
        {errores.concepto && <p className="mt-1 text-xs text-terracota">{errores.concepto}</p>}
      </div>

      <div>
        <input
          value={detalle}
          onChange={(e) => {
            setDetalle(e.target.value);
            limpiarError("detalle");
          }}
          placeholder="Detalle"
          className={`w-full h-10 rounded-md border bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-marino/15 ${
            errores.detalle ? "border-terracota" : "border-line focus:border-marino"
          }`}
        />
        {errores.detalle && <p className="mt-1 text-xs text-terracota">{errores.detalle}</p>}
        {clasificacion === "OTROS" && !errores.detalle && (
          <p className="mt-1 text-xs text-ink-muted">
            Para «Otros» el detalle es obligatorio: explicá qué es este gasto.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <CampoImporte
            value={importe}
            onChange={(valor) => {
              setImporte(valor);
              limpiarError("importe");
            }}
            hasError={Boolean(errores.importe)}
          />
          {errores.importe && <p className="mt-1 text-xs text-terracota">{errores.importe}</p>}
        </div>
        <div>
          <select
            value={clasificacion}
            onChange={(e) => {
              setClasificacion(e.target.value);
              limpiarError("clasificacion");
            }}
            className={`w-full h-10 rounded-md border bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-marino/15 ${
              errores.clasificacion ? "border-terracota" : "border-line focus:border-marino"
            }`}
          >
            <option value="" disabled>
              Elegí una clasificación
            </option>
            {!clasificacionEsConocida && (
              <option value={valoresIniciales.clasificacion}>
                {valoresIniciales.clasificacion} (fuera de la lista)
              </option>
            )}
            {CLASIFICACIONES_PRESUPUESTO_TODAS.map((o) => (
              <option key={o.valorPersistido} value={o.valorPersistido}>
                {o.textoVisible}
              </option>
            ))}
          </select>
          {errores.clasificacion && (
            <p className="mt-1 text-xs text-terracota">{errores.clasificacion}</p>
          )}
          {ayudaClasificacion && (
            <p className="mt-1 text-xs text-ink-muted">{ayudaClasificacion}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-line pt-3">
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
          disabled={guardando}
          className="h-9 px-4 rounded-md bg-marino text-white text-sm font-medium hover:bg-marino-dark transition disabled:opacity-40"
        >
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
