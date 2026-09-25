"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { editarLinea } from "./actions";
import { OPCION_CLASIFICACION_NUEVA } from "./PresupuestoForm";
import CampoImporte from "@/components/CampoImporte";

type Props = {
  lineaId: string;
  valoresIniciales: { concepto: string; detalle: string; importe: number; clasificacion: string };
  clasificacionesDisponibles: string[];
  onCerrar: () => void;
};

// Mismo patrón visual que DesglosePanel.tsx (panel que se expande debajo de
// la fila), y mismo criterio de <select>+"clasificación nueva" que el alta
// en PresupuestoForm.tsx. Si la clasificación actual de la línea no está en
// clasificacionesDisponibles (ej. fue tipeada como "nueva" en su momento, o
// el listado curado cambió después), el <select> arranca ya en la opción
// "nueva" con el valor real precargado en el campo de texto — nunca la deja
// en un <option> que no existe.
export default function EditarLineaPanel({
  lineaId,
  valoresIniciales,
  clasificacionesDisponibles,
  onCerrar,
}: Props) {
  const router = useRouter();
  const { empresa: empresaSlug, periodo: periodoUrl } = useParams<{
    empresa: string;
    periodo: string;
  }>();

  const clasificacionEsConocida = clasificacionesDisponibles.includes(valoresIniciales.clasificacion);

  const [concepto, setConcepto] = useState(valoresIniciales.concepto);
  const [detalle, setDetalle] = useState(valoresIniciales.detalle);
  const [importe, setImporte] = useState(String(valoresIniciales.importe));
  const [clasificacion, setClasificacion] = useState(
    clasificacionEsConocida ? valoresIniciales.clasificacion : OPCION_CLASIFICACION_NUEVA
  );
  const [clasificacionNueva, setClasificacionNueva] = useState(
    clasificacionEsConocida ? "" : valoresIniciales.clasificacion
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

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

    const clasificacionFinal =
      clasificacion === OPCION_CLASIFICACION_NUEVA ? clasificacionNueva.trim() : clasificacion;

    const resultado = await editarLinea(empresaSlug, periodoUrl, lineaId, {
      concepto,
      detalle,
      importe,
      clasificacion: clasificacionFinal,
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
              if (e.target.value !== OPCION_CLASIFICACION_NUEVA) setClasificacionNueva("");
              limpiarError("clasificacion");
            }}
            className={`w-full h-10 rounded-md border bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-marino/15 ${
              errores.clasificacion ? "border-terracota" : "border-line focus:border-marino"
            }`}
          >
            <option value="" disabled>
              Elegí una clasificación
            </option>
            {clasificacionesDisponibles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            <option value={OPCION_CLASIFICACION_NUEVA}>
              + Es una clasificación nueva, no está en la lista
            </option>
          </select>
          {clasificacion === OPCION_CLASIFICACION_NUEVA && (
            <input
              value={clasificacionNueva}
              onChange={(e) => {
                setClasificacionNueva(e.target.value);
                limpiarError("clasificacion");
              }}
              placeholder="Nombre de la clasificación nueva"
              required
              className={`mt-2 w-full h-10 rounded-md border bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-marino/15 ${
                errores.clasificacion ? "border-terracota" : "border-line focus:border-marino"
              }`}
            />
          )}
          {errores.clasificacion && (
            <p className="mt-1 text-xs text-terracota">{errores.clasificacion}</p>
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
