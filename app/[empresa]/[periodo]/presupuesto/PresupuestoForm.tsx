"use client";

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  agregarLinea,
  eliminarLinea,
  enviarARevision,
  marcarRevisionCompletada,
  confirmarVersionFinal,
  pedirCambios,
  subirLineasMasivo,
} from "./actions";
import { esElegibleParaDesglose } from "@/lib/clasificaciones";
import {
  CLASIFICACIONES_PRESUPUESTO_INGRESO,
  CLASIFICACIONES_PRESUPUESTO_EGRESO,
  obtenerAyudaClasificacion,
} from "./clasificacionesPresupuesto";
import DesglosePanel from "./DesglosePanel";
import EditarLineaPanel from "./EditarLineaPanel";
import BarraTotales from "./BarraTotales";
import type { TotalesPresupuesto } from "@/lib/presupuestoTotales";
import CampoImporte from "@/components/CampoImporte";
import { formatearDiaMes, textoTrazabilidad } from "@/lib/fecha";
import { MAX_MENSAJE_PEDIDO_CAMBIOS } from "@/lib/pedidoCambiosPresupuesto";

type Linea = {
  id: string;
  concepto: string;
  detalle: string;
  importe: number;
  clasificacion: string;
  desglose: { id: string; detalle: string; importe: number }[];
};

// Mismo trazo que el resto de los íconos a mano del sistema (IconoChevronDerecha
// en PanelChequeos.tsx) — reutilizado tal cual para no introducir un lenguaje
// visual nuevo para "expandir/colapsar".
function IconoChevronDerecha({ expandido }: { expandido: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform ${expandido ? "rotate-90" : ""}`}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

type Props = {
  empresaNombre: string;
  periodo: string;
  estado: string;
  fueModificadoPorRevisor: boolean;
  revisionCompletada: boolean;
  // Trazabilidad: quién confirmó la versión final y cuándo (null si no está validado).
  validacion: { fecha: string; por: string | null } | null;
  // Último pedido de cambios del revisor (null si nunca hubo). Solo se muestra en ABIERTO.
  pedidoCambios: { mensaje: string; fecha: string; por: string | null } | null;
  esRevisor: boolean;
  lineasIniciales: Linea[];
  // Totales de las líneas guardadas, calculados en el servidor (barra fija).
  totales: TotalesPresupuesto;
};

// Sin opción "+ clasificación nueva" (decisión 2026-10-07, pedido de Kike: los
// gerentes no cargan categorías propias). El server rechaza un valor fuera de la
// lista para una línea nueva (ver agregarLinea).

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatearPeriodo(periodo: string) {
  const [anio, mes] = periodo.split("-");
  const nombreMes = MESES[Number(mes) - 1] ?? mes;
  return `${nombreMes.charAt(0).toUpperCase()}${nombreMes.slice(1)} ${anio}`;
}

function formatearImporte(valor: number) {
  return valor.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

export default function PresupuestoForm({
  empresaNombre,
  periodo,
  estado,
  fueModificadoPorRevisor,
  revisionCompletada,
  validacion,
  pedidoCambios,
  esRevisor,
  lineasIniciales,
  totales,
}: Props) {
  const router = useRouter();
  const { empresa: empresaSlug, periodo: periodoUrl } = useParams<{
    empresa: string;
    periodo: string;
  }>();
  const [modo, setModo] = useState<"linea" | "masiva">("linea");
  const [eliminando, setEliminando] = useState<Set<string>>(new Set());
  const [guardando, setGuardando] = useState(false);
  const [desgloseAbiertoId, setDesgloseAbiertoId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [concepto, setConcepto] = useState("");
  const [detalle, setDetalle] = useState("");
  const [importe, setImporte] = useState("");
  const [clasificacion, setClasificacion] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});

  // Borra solo el error de ESE campo apenas el usuario lo modifica — no espera a un
  // nuevo submit ni pisa errores de otros campos que todavía puedan estar vigentes.
  function limpiarError(campo: string) {
    setErrores((prev) => {
      if (!(campo in prev)) return prev;
      const { [campo]: _omitido, ...resto } = prev;
      return resto;
    });
  }

  const [subiendoMasiva, setSubiendoMasiva] = useState(false);
  const [errorMasiva, setErrorMasiva] = useState("");
  const [erroresPorFilaMasiva, setErroresPorFilaMasiva] = useState<
    { fila: number; error: string }[]
  >([]);
  const [mensajeExitoMasiva, setMensajeExitoMasiva] = useState("");
  const archivoMasivoRef = useRef<HTMLInputElement>(null);

  const [totalReferencia, setTotalReferencia] = useState("");
  const [errorValidar, setErrorValidar] = useState("");
  // Panel "Pedir cambios" (solo revisor, solo EN_REVISION). El error se muestra
  // adentro del panel y no lo cierra, para no perder el texto escrito.
  const [panelPedidoAbierto, setPanelPedidoAbierto] = useState(false);
  const [mensajePedido, setMensajePedido] = useState("");
  const [errorPedido, setErrorPedido] = useState("");
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  // Puramente informativo: no transforma el valor de `importe` en ningún
  // momento (el gerente sigue tipeando el número en positivo, como siempre)
  // ni se persiste — editar una línea existente (EditarLineaPanel) no tiene
  // este toggle, así que no hace falta recordar esta elección entre sesiones.
  // Sirve de recordatorio visual y para sugerir la clasificación típica de
  // cada tipo (ver texto de ayuda debajo del campo Clasificación).
  const [tipoLinea, setTipoLinea] = useState<"ingreso" | "egreso">("egreso");

  const validado = estado === "VALIDADO";
  const enRevision = estado === "EN_REVISION";
  // Quién puede agregar/editar/borrar líneas AHORA (gate del cliente, solo
  // para mostrar/ocultar controles — el server repite exactamente esta misma
  // regla en autorizarEdicionLinea, ver actions.ts): en ABIERTO, cualquiera
  // con acceso (como siempre); en EN_REVISION, solo el revisor; en VALIDADO,
  // nadie.
  const puedeEditarAhora = estado === "ABIERTO" || (enRevision && esRevisor);
  const ayudaClasificacion = clasificacion ? obtenerAyudaClasificacion(clasificacion) : null;
  const lineas = lineasIniciales.filter((l) => !eliminando.has(l.id));
  const totalCargado = lineas.reduce((acc, l) => acc + l.importe, 0);

  const totalReferenciaNumero = totalReferencia.trim() === "" ? null : Number(totalReferencia);
  const coincideTotal =
    totalReferenciaNumero !== null && !Number.isNaN(totalReferenciaNumero)
      ? Math.abs(totalReferenciaNumero - totalCargado) < 0.01
      : null;

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setErrores({});

    const resultado = await agregarLinea(empresaSlug, periodoUrl, {
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

    setConcepto("");
    setDetalle("");
    setImporte("");
    setClasificacion("");
    setGuardando(false);
    router.refresh();
  }

  async function quitar(id: string) {
    setEliminando((prev) => new Set(prev).add(id));
    const resultado = await eliminarLinea(empresaSlug, periodoUrl, id);
    if (!resultado.ok) {
      alert(resultado.error);
      setEliminando((prev) => {
        const siguiente = new Set(prev);
        siguiente.delete(id);
        return siguiente;
      });
      return;
    }
    router.refresh();
  }

  async function handleSubirMasivo(e: React.FormEvent) {
    e.preventDefault();
    const archivo = archivoMasivoRef.current?.files?.[0];
    if (!archivo) {
      setErrorMasiva("Elegí un archivo antes de subir.");
      return;
    }

    // La carga masiva siempre SUMA líneas, nunca reemplaza las existentes: avisar antes
    // de que alguien suba dos veces el mismo archivo sin darse cuenta.
    if (
      lineas.length > 0 &&
      !confirm(
        `Ya tenés ${lineas.length} líneas cargadas; esta carga va a sumar las del archivo. ¿Continuar?`
      )
    ) {
      return;
    }

    setSubiendoMasiva(true);
    setErrorMasiva("");
    setErroresPorFilaMasiva([]);
    setMensajeExitoMasiva("");

    const formData = new FormData();
    formData.append("archivo", archivo);

    const resultado = await subirLineasMasivo(empresaSlug, periodoUrl, formData);

    setSubiendoMasiva(false);
    if (!resultado.ok) {
      setErrorMasiva(resultado.error);
      setErroresPorFilaMasiva(resultado.erroresPorFila ?? []);
      return;
    }

    setMensajeExitoMasiva(`Se importaron ${resultado.filasImportadas} líneas.`);
    if (archivoMasivoRef.current) archivoMasivoRef.current.value = "";
    router.refresh();
  }

  async function handleEnviarARevision() {
    if (!confirm("¿Enviar este presupuesto a revisión? Vos ya no vas a poder seguir editándolo mientras dure.")) {
      return;
    }
    setErrorValidar("");
    const resultado = await enviarARevision(empresaSlug, periodoUrl);
    if (!resultado.ok) {
      setErrorValidar(resultado.error);
      return;
    }
    router.refresh();
  }

  async function handleTerminarRevision() {
    setErrorValidar("");
    const resultado = await marcarRevisionCompletada(empresaSlug, periodoUrl);
    if (!resultado.ok) {
      setErrorValidar(resultado.error);
      return;
    }
    router.refresh();
  }

  function cerrarPanelPedido() {
    setPanelPedidoAbierto(false);
    setMensajePedido("");
    setErrorPedido("");
  }

  async function handleEnviarPedido() {
    setEnviandoPedido(true);
    setErrorPedido("");
    const resultado = await pedirCambios(empresaSlug, periodoUrl, mensajePedido);
    setEnviandoPedido(false);
    if (!resultado.ok) {
      setErrorPedido(resultado.error);
      return;
    }
    cerrarPanelPedido();
    router.refresh();
  }

  async function handleConfirmarVersionFinal() {
    if (!confirm("¿Confirmar la versión final? Después de esto no se puede editar para atrás.")) {
      return;
    }
    setErrorValidar("");
    const resultado = await confirmarVersionFinal(empresaSlug, periodoUrl);
    if (!resultado.ok) {
      setErrorValidar(resultado.error);
      return;
    }
    router.refresh();
  }

  // Se muestra al lado de "Terminé de revisar" (y también cuando la revisión ya está
  // completada: el revisor puede arrepentirse, ver puedePedirCambios).
  const botonPedirCambios =
    enRevision && esRevisor ? (
      <button
        onClick={() => setPanelPedidoAbierto(true)}
        disabled={enviandoPedido || panelPedidoAbierto}
        className="h-14 px-6 rounded-md border border-line-strong text-base font-semibold tracking-wide text-ink transition hover:bg-paper-raised disabled:cursor-not-allowed disabled:opacity-50"
      >
        Pedir cambios
      </button>
    ) : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pb-10">
      <BarraTotales totales={totales} />
      <div className="mb-10 mt-4 flex items-start justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs tracking-[0.15em] text-ink-secondary uppercase">
            <span className="h-2 w-2 bg-plata" />
            {empresaNombre} · {formatearPeriodo(periodo)}
          </p>
          <h1 className="mt-1 text-4xl font-serif font-semibold tracking-tight">
            Cargar presupuesto
          </h1>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-md ${
            validado
              ? "bg-terracota-tint text-terracota"
              : enRevision
                ? "bg-plata/20 text-ink-secondary"
                : "bg-marino-tint text-marino"
          }`}
        >
          {validado ? "Validado" : enRevision ? "En revisión" : "Abierto"}
        </span>
      </div>

      {estado === "ABIERTO" && pedidoCambios && (
        <div className="mb-6 text-sm text-terracota bg-terracota-tint rounded-md px-3 py-2">
          <p className="font-medium">
            {pedidoCambios.por
              ? `Pedido de cambios de ${pedidoCambios.por} el ${formatearDiaMes(pedidoCambios.fecha)}`
              : `Pedido de cambios del ${formatearDiaMes(pedidoCambios.fecha)}`}
          </p>
          <p className="mt-1 whitespace-pre-line">{pedidoCambios.mensaje}</p>
        </div>
      )}

      {validado && (
        <p className="mb-6 text-sm text-terracota bg-terracota-tint rounded-md px-3 py-2">
          Este presupuesto ya fue validado. Cualquier corrección se carga en el período
          siguiente.
          {validacion && (
            <span className="mt-1 block text-xs">
              {textoTrazabilidad("Validado", validacion.fecha, validacion.por)}.
            </span>
          )}
        </p>
      )}

      {enRevision && !esRevisor && (
        <div className="mb-6 space-y-2">
          <p className="text-sm text-ink-secondary bg-plata/20 rounded-md px-3 py-2">
            {revisionCompletada
              ? "La revisión de este presupuesto está terminada. Revisá la versión final y confirmá."
              : "Este presupuesto está en revisión — no podés editarlo mientras dure."}
          </p>
          {fueModificadoPorRevisor && (
            <p className="text-xs text-ink-muted">Se hicieron cambios en este presupuesto durante la revisión.</p>
          )}
        </div>
      )}

      {enRevision && esRevisor && (
        <p className="mb-6 text-sm text-ink-secondary bg-plata/20 rounded-md px-3 py-2">
          Este presupuesto está en revisión — estás editando como revisor.
        </p>
      )}

      {puedeEditarAhora && (
        <div className="mb-10 rounded-lg border border-line-strong border-l-4 border-l-marino bg-paper-raised px-6 py-8 shadow-md shadow-ink/10 sm:px-8 sm:py-10">
          <div className="flex gap-1 mb-6 border-b border-line">
            <button
              onClick={() => setModo("linea")}
              className={`px-3 py-2 text-sm border-b-2 -mb-px transition ${
                modo === "linea"
                  ? "border-marino text-ink font-medium"
                  : "border-transparent text-ink-secondary hover:text-ink"
              }`}
            >
              Cargar línea por línea
            </button>
            <button
              onClick={() => setModo("masiva")}
              className={`px-3 py-2 text-sm border-b-2 -mb-px transition ${
                modo === "masiva"
                  ? "border-marino text-ink font-medium"
                  : "border-transparent text-ink-secondary hover:text-ink"
              }`}
            >
              Carga masiva (Excel)
            </button>
          </div>

          {modo === "linea" ? (
            <form onSubmit={agregar} className="space-y-5">
              {errores.general && (
                <p className="text-sm text-terracota bg-terracota-tint rounded-md px-3 py-2">
                  {errores.general}
                </p>
              )}

              <div>
                <label htmlFor="concepto" className="block text-sm text-ink-secondary mb-1.5">
                  Concepto
                </label>
                <input
                  id="concepto"
                  value={concepto}
                  onChange={(e) => {
                    setConcepto(e.target.value);
                    limpiarError("concepto");
                  }}
                  placeholder="Ej: Sueldo administrativo"
                  className={`w-full h-12 rounded-md border bg-paper px-3.5 text-[15px] outline-none focus:ring-2 focus:ring-marino/15 ${
                    errores.concepto ? "border-terracota" : "border-line focus:border-marino"
                  }`}
                />
                {errores.concepto && <p className="mt-1 text-xs text-terracota">{errores.concepto}</p>}
              </div>

              <div>
                <label htmlFor="detalle" className="block text-sm text-ink-secondary mb-1.5">
                  Detalle <span className="text-ink-muted">(aclaración)</span>
                </label>
                <input
                  id="detalle"
                  value={detalle}
                  onChange={(e) => {
                    setDetalle(e.target.value);
                    limpiarError("detalle");
                  }}
                  placeholder="Ej: cheque legajo 1526 - Gomez Mariano"
                  className={`w-full h-12 rounded-md border bg-paper px-3.5 text-[15px] outline-none focus:ring-2 focus:ring-marino/15 ${
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="importe" className="block text-sm text-ink-secondary">
                      Importe
                    </label>
                    <div className="inline-flex rounded-md border border-line p-0.5">
                      <button
                        type="button"
                        onClick={() => setTipoLinea("ingreso")}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                          tipoLinea === "ingreso"
                            ? "bg-positive/10 text-positive"
                            : "text-ink-secondary hover:text-ink"
                        }`}
                      >
                        Ingreso
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoLinea("egreso")}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                          tipoLinea === "egreso"
                            ? "bg-negative/10 text-negative"
                            : "text-ink-secondary hover:text-ink"
                        }`}
                      >
                        Egreso
                      </button>
                    </div>
                  </div>
                  <CampoImporte
                    id="importe"
                    size="lg"
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
                  <label htmlFor="clasificacion" className="block text-sm text-ink-secondary mb-1.5">
                    Clasificación
                  </label>
                  <select
                    id="clasificacion"
                    value={clasificacion}
                    onChange={(e) => {
                      setClasificacion(e.target.value);
                      limpiarError("clasificacion");
                    }}
                    className={`w-full h-12 rounded-md border bg-paper px-3.5 text-[15px] outline-none focus:ring-2 focus:ring-marino/15 ${
                      errores.clasificacion ? "border-terracota" : "border-line focus:border-marino"
                    }`}
                  >
                    <option value="" disabled>
                      Elegí una clasificación
                    </option>
                    {(tipoLinea === "ingreso"
                      ? CLASIFICACIONES_PRESUPUESTO_INGRESO
                      : CLASIFICACIONES_PRESUPUESTO_EGRESO
                    ).map((o) => (
                      <option key={o.valorPersistido} value={o.valorPersistido}>
                        {o.textoVisible}
                      </option>
                    ))}
                  </select>
                  {errores.clasificacion && (
                    <p className="mt-1 text-xs text-terracota">{errores.clasificacion}</p>
                  )}
                  <p className="mt-1 text-xs text-ink-muted">
                    {tipoLinea === "ingreso"
                      ? "Lo más común: Cobranzas"
                      : "Lo más común: Proveedores, Sueldos, Impuestos"}
                  </p>
                  {ayudaClasificacion && (
                    <p className="mt-1 text-xs text-ink-muted">{ayudaClasificacion}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={guardando}
                className="h-12 px-6 rounded-md bg-marino text-base font-semibold tracking-wide text-white shadow-sm transition hover:bg-marino-dark hover:shadow-md active:scale-[0.99] disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Agregar línea"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubirMasivo} className="rounded-md border border-dashed border-line-strong bg-paper px-6 py-8 text-center">
              <p className="text-sm text-ink-secondary mb-1">
                Subí tu Excel con las columnas Concepto, Detalle, Importe y Clasificación.
              </p>
              <p className="text-xs text-ink-muted mb-4">
                No hace falta que uses nuestro formulario — si ya tenés la info en tu propio
                Excel, estructurala con esas 4 columnas (en cualquier orden) y subila
                directamente.{" "}
                <a
                  href="/plantillas/presupuesto-excel"
                  className="text-marino underline underline-offset-2 hover:text-marino-dark"
                >
                  Descargar plantilla de ejemplo
                </a>
                .
              </p>

              <div className="flex items-center justify-center gap-3">
                <input
                  ref={archivoMasivoRef}
                  type="file"
                  accept=".xlsx"
                  className="text-sm text-ink-secondary file:mr-3 file:h-9 file:px-3 file:rounded-md file:border file:border-line file:bg-paper file:text-sm file:text-ink-secondary hover:file:border-line-strong"
                />
                <button
                  type="submit"
                  disabled={subiendoMasiva}
                  className="h-9 px-4 rounded-md bg-marino text-white text-sm font-medium hover:bg-marino-dark transition disabled:opacity-50 whitespace-nowrap"
                >
                  {subiendoMasiva ? "Subiendo..." : "Subir archivo"}
                </button>
              </div>

              {errorMasiva && (
                <div className="mt-4 text-left text-sm text-terracota bg-terracota-tint rounded-md px-3 py-2">
                  <p>{errorMasiva}</p>
                  {erroresPorFilaMasiva.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-xs">
                      {erroresPorFilaMasiva.map((e) => (
                        <li key={e.fila}>
                          Fila {e.fila}: {e.error}.
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {mensajeExitoMasiva && (
                <p className="mt-4 text-sm text-verde bg-marino-tint rounded-md px-3 py-2">
                  {mensajeExitoMasiva}
                </p>
              )}
            </form>
          )}
        </div>
      )}

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-sm font-medium text-ink-secondary">
            Líneas cargadas ({lineas.length})
          </h2>
          <span className="tabular text-base font-semibold text-ink-secondary">
            Total ${formatearImporte(totalCargado)}
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 mb-4">
          <label htmlFor="totalReferencia" className="text-xs text-ink-muted">
            Total de referencia (solo para chequear, no se guarda)
          </label>
          <input
            id="totalReferencia"
            value={totalReferencia}
            onChange={(e) => setTotalReferencia(e.target.value)}
            placeholder="0"
            className="w-32 h-8 rounded-md border border-line bg-paper px-2.5 text-sm tabular text-right outline-none focus:border-marino focus:ring-2 focus:ring-marino/15"
          />
          {coincideTotal === true && (
            <span className="text-xs font-medium text-verde">✓ Coincide</span>
          )}
          {coincideTotal === false && (
            <span className="text-xs text-ink-muted">
              Difiere por ${formatearImporte(Math.abs((totalReferenciaNumero ?? 0) - totalCargado))}
            </span>
          )}
        </div>

        {lineas.length === 0 ? (
          <p className="text-sm text-ink-muted py-6 border-t border-line-strong">
            Todavía no cargaste ninguna línea.
          </p>
        ) : (
          <div className="border-t border-line-strong">
            {lineas.map((linea) => {
              const elegible = esElegibleParaDesglose(linea.clasificacion);
              const desglosada = linea.desglose.length > 0;
              const expandida = desgloseAbiertoId === linea.id;
              const editando = editandoId === linea.id;
              // Mismo gate que "Quitar" y que el server (autorizarEdicionLinea):
              // en ABIERTO cualquiera con acceso, en EN_REVISION solo el revisor.
              const puedeEditarEstaLinea = puedeEditarAhora;
              return (
                <div key={linea.id} className="border-b border-line">
                  <div className="group grid grid-cols-[auto_1fr_auto_auto_auto] items-baseline gap-x-3 py-3">
                    {elegible && puedeEditarAhora ? (
                      <button
                        type="button"
                        onClick={() => setDesgloseAbiertoId(expandida ? null : linea.id)}
                        className="text-ink-muted hover:text-marino transition"
                        aria-label={expandida ? "Colapsar desglose" : "Desglosar línea"}
                      >
                        <IconoChevronDerecha expandido={expandida} />
                      </button>
                    ) : (
                      <span className="inline-block w-[12px]" />
                    )}
                    <div>
                      <p className="text-sm">{linea.concepto}</p>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {linea.detalle} · {linea.clasificacion}
                        {desglosada && (
                          <span className="text-marino"> · desglosada en {linea.desglose.length}</span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`tabular text-sm text-right ${
                        linea.importe < 0 ? "text-terracota" : "text-ink"
                      }`}
                    >
                      ${formatearImporte(linea.importe)}
                    </span>
                    <span className="w-0" />
                    {/* Siempre visibles en pantallas táctiles (sin hover); con mouse, solo al pasar por la fila. */}
                    <div className="flex items-center gap-3 transition pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100">
                      {puedeEditarEstaLinea && (
                        <button
                          onClick={() => setEditandoId(editando ? null : linea.id)}
                          className="text-xs text-ink-muted hover:text-marino transition"
                        >
                          Editar
                        </button>
                      )}
                      {puedeEditarAhora && (
                        <button
                          onClick={() => quitar(linea.id)}
                          className="text-xs text-ink-muted hover:text-terracota transition"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  </div>
                  {editando && (
                    <div className="pb-3 pl-6">
                      <EditarLineaPanel
                        lineaId={linea.id}
                        valoresIniciales={{
                          concepto: linea.concepto,
                          detalle: linea.detalle,
                          importe: linea.importe,
                          clasificacion: linea.clasificacion,
                        }}
                        onCerrar={() => setEditandoId(null)}
                      />
                    </div>
                  )}
                  {expandida && (
                    <div className="pb-3 pl-6">
                      <DesglosePanel
                        lineaId={linea.id}
                        importeLinea={linea.importe}
                        desgloseInicial={linea.desglose}
                        onCerrar={() => setDesgloseAbiertoId(null)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!validado && (
        <div className="mt-10 border-t border-line pt-6">
          {errorValidar && (
            <p className="mb-4 text-sm text-terracota bg-terracota-tint rounded-md px-3 py-2">
              {errorValidar}
            </p>
          )}

          {estado === "ABIERTO" && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-muted max-w-xs">
                Una vez que la envíes a revisión, vos ya no vas a poder editarla más. Cualquier
                corrección la carga quien revisa.
              </p>
              <button
                onClick={handleEnviarARevision}
                disabled={lineas.length === 0}
                className="h-14 px-6 rounded-md bg-ink text-base font-semibold tracking-wide text-paper shadow-sm transition hover:bg-ink/90 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30"
              >
                Enviar a revisión
              </button>
            </div>
          )}

          {enRevision && esRevisor && !revisionCompletada && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-muted max-w-xs">
                Cuando termines de revisar, marcalo acá — recién ahí se puede confirmar la versión
                final.
              </p>
              <div className="flex items-center gap-3">
                {botonPedirCambios}
                <button
                  onClick={handleTerminarRevision}
                  disabled={enviandoPedido}
                  className="h-14 px-6 rounded-md bg-ink text-base font-semibold tracking-wide text-paper shadow-sm transition hover:bg-ink/90 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Terminé de revisar
                </button>
              </div>
            </div>
          )}

          {enRevision && esRevisor && panelPedidoAbierto && (
            <div className="mt-6 rounded-md border border-line-strong bg-paper-raised px-4 py-4">
              <label htmlFor="mensajePedido" className="block text-sm text-ink-secondary mb-1.5">
                Qué cambios necesitás
              </label>
              <textarea
                id="mensajePedido"
                value={mensajePedido}
                onChange={(e) => {
                  setMensajePedido(e.target.value);
                  setErrorPedido("");
                }}
                maxLength={MAX_MENSAJE_PEDIDO_CAMBIOS}
                rows={5}
                disabled={enviandoPedido}
                className={`w-full rounded-md border bg-paper px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-marino/15 disabled:opacity-60 ${
                  errorPedido ? "border-terracota" : "border-line focus:border-marino"
                }`}
              />
              <div className="mt-1 flex items-start justify-between gap-4">
                <p className="text-xs text-ink-muted">
                  El presupuesto vuelve al gerente para que lo corrija. Vas a tener que revisarlo de
                  nuevo cuando lo reenvíe.
                </p>
                <span className="tabular shrink-0 text-xs text-ink-muted">
                  {mensajePedido.length}/{MAX_MENSAJE_PEDIDO_CAMBIOS}
                </span>
              </div>
              {errorPedido && (
                <p className="mt-3 text-sm text-terracota bg-terracota-tint rounded-md px-3 py-2">
                  {errorPedido}
                </p>
              )}
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleEnviarPedido}
                  disabled={enviandoPedido}
                  className="h-11 px-5 rounded-md bg-ink text-sm font-semibold text-paper transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {enviandoPedido ? "Enviando..." : "Enviar pedido"}
                </button>
                <button
                  onClick={cerrarPanelPedido}
                  disabled={enviandoPedido}
                  className="h-11 px-4 rounded-md border border-line-strong text-sm text-ink-secondary transition hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Ojo con esRevisor acá: NO es el mismo gate que el botón de
              arriba. confirmarVersionFinal no exige ser revisor (cualquiera
              con acceso puede confirmar una vez revisionCompletada) — a
              propósito, porque alguien que es gerente Y revisor a la vez de
              la misma empresa (ej. Kike en Handy Way, o cualquier ADMIN, que
              siempre pasa puedeRevisarPresupuesto) tiene que poder terminar
              su propio flujo solo, sin quedar sin botón. Gatearlo con
              !esRevisor dejaría a esas personas trabadas para siempre. */}
          {enRevision && revisionCompletada && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-muted max-w-xs">
                Una vez que confirmes, el presupuesto de este mes queda cerrado. Cualquier
                corrección se carga en el período siguiente.
              </p>
              <div className="flex items-center gap-3">
                {esRevisor && botonPedirCambios}
                <button
                  onClick={handleConfirmarVersionFinal}
                  disabled={enviandoPedido}
                  className="h-14 px-6 rounded-md bg-ink text-base font-semibold tracking-wide text-paper shadow-sm transition hover:bg-ink/90 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Confirmar versión final
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
