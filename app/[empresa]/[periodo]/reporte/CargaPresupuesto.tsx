"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { guardarPresupuestoDelReporte } from "./actionsCarga";
import { HayCambiosSinGuardarContext } from "../CargaPresupuestoContexto";
import {
  MAX_ACLARACION,
  type CapitalVista,
  type CeldaVistaCarga as CeldaVista,
  type EntradaCarga,
  type FilaSinFilaVista,
} from "@/lib/reporte/cargaGerente";

// Carga del Presupuestado en el Reporte (Etapas 2 y 3). El Reporte es un componente de servidor; acá
// vive lo que necesita estado: los valores tipeados de todas las celdas, el botón "Guardar" (UNA
// sola acción para todo el mes) y el aviso de cambios sin guardar que lee AccionesFlujo.

type Valor = { importe: string; aclaracion: string };

type Contexto = {
  valores: Record<string, Valor>;
  celdas: Map<string, CeldaVista>;
  guardando: boolean;
  cambiar: (id: string, parcial: Partial<Valor>) => void;
  cantidadCambios: number;
  mensaje: { tipo: "ok" | "error"; texto: string } | null;
  guardar: () => Promise<void>;
};

const CargaContext = createContext<Contexto | null>(null);

function valoresIniciales(celdas: CeldaVista[]): Record<string, Valor> {
  return Object.fromEntries(celdas.map((c) => [c.id, { importe: c.importeInicial, aclaracion: c.aclaracionInicial }]));
}

// Cambió si el importe es distinto del que se cargó la pantalla; la aclaración solo cuenta si hay
// un importe (con importe vacío la celda se borra y la aclaración no se usa).
function cambio(celda: CeldaVista, valor: Valor): boolean {
  if (valor.importe.trim() !== celda.importeInicial.trim()) return true;
  return (
    celda.requiereAclaracion &&
    valor.importe.trim() !== "" &&
    valor.aclaracion.trim() !== celda.aclaracionInicial.trim()
  );
}

export function ProveedorCarga({
  empresaSlug,
  periodo,
  celdas,
  huella,
  children,
}: {
  empresaSlug: string;
  periodo: string;
  celdas: CeldaVista[];
  // Cambia cada vez que el servidor manda valores distintos (después de guardar y refrescar):
  // los valores tipeados se reemplazan por los guardados.
  huella: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [valores, setValores] = useState(() => valoresIniciales(celdas));
  const [huellaVista, setHuellaVista] = useState(huella);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  // Corta un segundo clic ANTES de que React deshabilite el botón; el servidor igual no duplica.
  const guardandoRef = useRef(false);

  if (huella !== huellaVista) {
    setHuellaVista(huella);
    setValores(valoresIniciales(celdas));
  }

  const porId = new Map(celdas.map((c) => [c.id, c]));
  const modificadas = celdas.filter((c) => valores[c.id] && cambio(c, valores[c.id]));
  const hayCambios = modificadas.length > 0;

  function cambiar(id: string, parcial: Partial<Valor>) {
    setMensaje(null);
    setValores((prev) => ({ ...prev, [id]: { ...prev[id], ...parcial } }));
  }

  async function guardar() {
    if (guardandoRef.current || !hayCambios) return;
    guardandoRef.current = true;
    setGuardando(true);
    setMensaje(null);
    const entradas: EntradaCarga[] = modificadas.map((c) => ({
      destino: c.destino,
      clave: c.clave,
      importe: valores[c.id].importe,
      ...(c.requiereAclaracion ? { aclaracion: valores[c.id].aclaracion } : {}),
      // Filas manuales y Capital: lo que la pantalla mostraba, para que el servidor detecte si
      // otra persona lo cambió mientras tanto.
      ...(c.destino === "manual" || c.destino === "capital" ? { base: c.importeInicial } : {}),
    }));
    try {
      const r = await guardarPresupuestoDelReporte(empresaSlug, periodo, entradas);
      if (!r.ok) {
        setMensaje({ tipo: "error", texto: r.error });
      } else {
        setMensaje({ tipo: "ok", texto: "Guardado." });
        router.refresh();
      }
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo guardar. Revisá la conexión y probá de nuevo." });
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  }

  return (
    <HayCambiosSinGuardarContext.Provider value={hayCambios}>
      <CargaContext.Provider
        value={{ valores, celdas: porId, guardando, cambiar, cantidadCambios: modificadas.length, mensaje, guardar }}
      >
        {children}
      </CargaContext.Provider>
    </HayCambiosSinGuardarContext.Provider>
  );
}

// Botón "Guardar presupuesto": UNA acción para todas las celdas que cambiaron.
export function BarraGuardarPresupuesto() {
  const { guardando, cantidadCambios, mensaje, guardar } = useCarga();
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={guardar}
        disabled={cantidadCambios === 0 || guardando}
        className="h-10 rounded-md bg-marino px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-marino-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        {guardando ? "Guardando..." : "Guardar presupuesto"}
      </button>
      <span className="text-xs text-ink-muted">
        {cantidadCambios > 0
          ? `${cantidadCambios} ${cantidadCambios === 1 ? "cambio" : "cambios"} sin guardar`
          : "Tipeá tu presupuesto en la última columna (Presupuestado) y guardá."}
      </span>
      {mensaje && (
        <span className={`text-sm ${mensaje.tipo === "error" ? "text-terracota" : "text-verde"}`} role="status">
          {mensaje.texto}
        </span>
      )}
    </div>
  );
}

function useCarga(): Contexto {
  const c = useContext(CargaContext);
  if (!c) throw new Error("La celda editable va dentro de ProveedorCarga.");
  return c;
}

const CLASE_INPUT =
  "h-8 rounded-md border border-line bg-paper px-2 text-right text-sm tabular outline-none focus:border-marino focus:ring-2 focus:ring-marino/15 disabled:opacity-60";

// Input de una celda: va en la columna Presupuestado del último mes. "Otros" lleva además una
// aclaración obligatoria (se guarda como detalle de la línea).
export function CeldaPresupuestoEditable({ id, nombre }: { id: string; nombre: string }) {
  const { valores, celdas, guardando, cambiar } = useCarga();
  const celda = celdas.get(id);
  const valor = valores[id];
  if (!celda || !valor) return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <input
        value={valor.importe}
        onChange={(e) => cambiar(id, { importe: e.target.value })}
        inputMode="decimal"
        placeholder="0"
        disabled={guardando}
        aria-label={`Presupuestado: ${nombre}`}
        className={`w-32 ${CLASE_INPUT}`}
      />
      {celda.leyenda && <span className="text-[10px] font-normal text-ink-muted">{celda.leyenda}</span>}
      {celda.requiereAclaracion && valor.importe.trim() !== "" && (
        <input
          value={valor.aclaracion}
          onChange={(e) => cambiar(id, { aclaracion: e.target.value })}
          maxLength={MAX_ACLARACION}
          placeholder="Aclaración (obligatoria)"
          disabled={guardando}
          aria-label={`Aclaración de ${nombre}`}
          className={`w-44 text-left ${CLASE_INPUT}`}
        />
      )}
    </div>
  );
}

// "Sin fila en este reporte": categorías de Presupuesto que la plantilla no tiene como fila. Se
// guardan igual como línea, pero NO entran en los totales del Reporte (sí en la barra de Presupuesto).
export function BloqueSinFila({
  filas,
  fueraDeLista,
}: {
  filas: FilaSinFilaVista[];
  fueraDeLista: { valor: string; lineas: number } | null;
}) {
  if (filas.length === 0 && !fueraDeLista) return null;
  return (
    <div className="mt-8 rounded-md border border-line-strong bg-paper-raised px-5 py-4">
      <p className="text-sm font-medium">Sin fila en este reporte</p>
      <p className="mt-1 text-xs text-ink-secondary">
        Gastos e ingresos que tu reporte no tiene como fila. Se guardan en tu presupuesto, pero no entran
        en los totales de la tabla de arriba.
      </p>
      <ul className="mt-3 divide-y divide-line-hairline">
        {filas.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
            <span>{f.texto}</span>
            {f.soloLectura ? (
              <span className="text-right">
                <span className="tabular">{f.soloLectura.valor}</span>
                <span className="block text-[10px] text-ink-muted">{f.soloLectura.motivo}</span>
              </span>
            ) : (
              <CeldaPresupuestoEditable id={f.id} nombre={f.texto} />
            )}
          </li>
        ))}
        {fueraDeLista && (
          <li className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
            <span>Otras clasificaciones (fuera de la lista)</span>
            <span className="text-right">
              <span className="tabular">{fueraDeLista.valor}</span>
              <span className="block text-[10px] text-ink-muted">
                {fueraDeLista.lineas} {fueraDeLista.lineas === 1 ? "línea" : "líneas"} · se carga en Presupuesto
              </span>
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}

// "Capital de trabajo propuesto": la única fila de Cierre que carga el gerente. Va aparte de la
// tabla (Cierre sigue reservado). Si la plantilla tiene fórmula, un valor tipeado la reemplaza y
// vacío vuelve a la fórmula; en las demás se tipea a mano.
export function BloqueCapital({ capital }: { capital: CapitalVista }) {
  return (
    <div className="mt-8 rounded-md border border-line-strong bg-paper-raised px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <p className="text-sm font-medium">{capital.texto}</p>
          <p className="mt-1 text-xs text-ink-secondary">
            {capital.conFormula
              ? capital.sugerido !== null
                ? `Si lo dejás vacío se usa la fórmula del reporte: ${capital.sugerido}. Si cargás un valor, reemplaza a la fórmula.`
                : "Si lo dejás vacío se usa la fórmula del reporte. Si cargás un valor, reemplaza a la fórmula."
              : "Se carga a mano."}
          </p>
        </div>
        <CeldaPresupuestoEditable id={capital.id} nombre={capital.texto} />
      </div>
    </div>
  );
}
