"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  subirExtracto,
  actualizarMovimiento,
  eliminarMovimiento,
  cerrarSemana,
  confirmarClasificacionesEnLote,
  confirmarUnidadesEnLote,
  type GrupoUnidadSugerida,
  type ResultadoChequeo,
  type ResultadoContinuidadSaldo,
  type ResultadoLiquidacionAmbigua,
  type PosibleDuplicado,
  type CuentaCompartida,
} from "./actions";
import TablaMovimientos from "./TablaMovimientos";
import Paginacion from "./Paginacion";
import PanelChequeos from "./PanelChequeos";
import PanelSugerenciasPendientes from "./PanelSugerenciasPendientes";
import PanelUnidadesSugeridas, { claveGrupo } from "./PanelUnidadesSugeridas";
import AlertaContinuidadSaldo from "./AlertaContinuidadSaldo";
import { formatearImporte } from "./formato";

// Sin librería de íconos en el proyecto — SVG a mano, mismo criterio que
// IconoOjo/IconoMenu.
function IconoFlechaArriba() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5" />
      <path d="M6 11l6-6 6 6" />
    </svg>
  );
}

type Movimiento = {
  id: string;
  fecha: string;
  concepto: string;
  importe: number;
  bancoYCuenta: string;
  clasificacion: string;
  unidadNegocio: string;
  detalle: string;
  ignorado: boolean;
  sugeridaPorSistema: boolean;
  chequeIvaAmbiguo: boolean;
  unidadSugeridaPorSistema: boolean;
  desglose: { id: string; unidadNegocio: string; importe: number }[];
};

type Props = {
  empresaNombre: string;
  numeroSemana: number;
  estado: string;
  movimientosIniciales: Movimiento[];
  clasificacionesDisponibles: string[];
  totalMovimientos: number;
  totalImporte: number;
  pagina: number;
  totalPaginas: number;
  soloSinClasificar: boolean;
  chequeos: ResultadoChequeo[];
  unidadesSugeridas: GrupoUnidadSugerida[];
  // Movimientos de toda la semana cuya unidad no pertenece a ninguna empresa
  // (ver contarSinUnidadEnSemana en lib/reporte.ts) — se avisa antes del cierre.
  sinUnidadAsignada: { unidad: string; movimientos: number }[];
};

export default function PanelImputacion({
  empresaNombre,
  numeroSemana,
  estado,
  movimientosIniciales,
  clasificacionesDisponibles,
  totalMovimientos,
  totalImporte,
  pagina,
  totalPaginas,
  soloSinClasificar,
  chequeos,
  unidadesSugeridas,
  sinUnidadAsignada,
}: Props) {
  const router = useRouter();
  const { empresa: empresaSlug, periodo } = useParams<{
    empresa: string;
    periodo: string;
  }>();
  const [movimientos, setMovimientos] = useState(movimientosIniciales);
  // Jerarquía visual: con movimientos ya cargados, la tarjeta grande de subida
  // estorba más de lo que ayuda — colapsa a un botón compacto junto al Total.
  // Solo el estado inicial se deriva de si ya había datos al entrar; a partir
  // de ahí el toggle es manual (mostrarSubida), no se auto-colapsa después de
  // subir un archivo para no tapar el mensaje de éxito/duplicados.
  const [mostrarSubida, setMostrarSubida] = useState(movimientosIniciales.length === 0);

  // Al cambiar de página (o tras un router.refresh() con datos nuevos del servidor),
  // el segmento de ruta es el mismo — React puede reconciliar este componente como una
  // actualización, no un remount, y useState ignora `movimientosIniciales` después del
  // primer render. Este efecto resincroniza explícitamente en vez de depender de eso.
  // No pisa ediciones optimistas en curso: actualizarCampoLocal/guardarCampo no navegan
  // ni refrescan, así que `movimientosIniciales` no cambia mientras se está editando.
  useEffect(() => {
    setMovimientos(movimientosIniciales);
  }, [movimientosIniciales]);
  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [posiblesDuplicados, setPosiblesDuplicados] = useState<PosibleDuplicado[]>([]);
  const [cantidadPosiblesDuplicados, setCantidadPosiblesDuplicados] = useState(0);
  // Aviso previo a cargar: cuentas del archivo que ya tienen movimientos en otra
  // empresa. Mientras está visible no se cargó nada — "Cargar igual" reenvía el
  // mismo archivo (y la misma hoja) con la confirmación.
  const [cuentasCompartidas, setCuentasCompartidas] = useState<{
    cuentas: CuentaCompartida[];
    filasNuevas: number;
    archivo: File;
    hoja?: string;
  } | null>(null);
  const [continuidadSaldo, setContinuidadSaldo] = useState<ResultadoContinuidadSaldo[]>([]);
  const [liquidacionesAmbiguas, setLiquidacionesAmbiguas] = useState<ResultadoLiquidacionAmbigua[]>(
    []
  );
  // Archivo con más de una hoja y ninguna llamada "Hoja1": se guarda acá el File ya elegido
  // del disco para poder reenviarlo con la hoja que el usuario elija, sin que tenga que
  // volver a seleccionarlo desde el input.
  const [hojasDisponibles, setHojasDisponibles] = useState<string[]>([]);
  const [archivoAmbiguo, setArchivoAmbiguo] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();
  // Clave (cuenta|unidad) del grupo que se está confirmando en el panel de
  // unidades sugeridas — deshabilita los botones mientras dura el round-trip.
  const [confirmandoUnidad, setConfirmandoUnidad] = useState<string | null>(null);

  const cerrada = estado === "CERRADA";
  const semanaAnterior = numeroSemana - 1;

  // Único camino de subida: la primera vez desde el form, y los reintentos con la
  // hoja elegida (archivo con varias hojas) o con la confirmación de cuentas
  // compartidas — en los dos se reenvía el mismo File ya elegido del disco, sin que
  // el usuario tenga que volver a seleccionarlo.
  async function enviarArchivo(archivo: File, hoja?: string, confirmarCuentas = false) {
    setSubiendo(true);
    setErrorSubida("");
    setMensajeExito("");
    setPosiblesDuplicados([]);
    setCantidadPosiblesDuplicados(0);
    setContinuidadSaldo([]);
    setLiquidacionesAmbiguas([]);
    setHojasDisponibles([]);
    setArchivoAmbiguo(null);
    setCuentasCompartidas(null);

    const formData = new FormData();
    formData.append("archivo", archivo);

    const resultado = await subirExtracto(
      empresaSlug,
      periodo,
      numeroSemana,
      formData,
      hoja,
      confirmarCuentas
    );

    setSubiendo(false);

    if (!resultado.ok) {
      if ("requiereSeleccionHoja" in resultado) {
        setHojasDisponibles(resultado.hojas);
        setArchivoAmbiguo(archivo);
        return;
      }
      if ("requiereConfirmacionCuentas" in resultado) {
        setCuentasCompartidas({
          cuentas: resultado.cuentas,
          filasNuevas: resultado.filasNuevas,
          archivo,
          hoja,
        });
        return;
      }
      setErrorSubida(resultado.error);
      return;
    }

    const deLaHoja = resultado.hoja ? ` (hoja "${resultado.hoja}")` : "";
    const { filasNuevas: nuevas, filasYaCargadas: ya } = resultado;
    setMensajeExito(
      nuevas === 0
        ? ya === 1
          ? `No había movimientos nuevos${deLaHoja}: el único movimiento del archivo ya estaba cargado.`
          : `No había movimientos nuevos${deLaHoja}: los ${ya} del archivo ya estaban cargados.`
        : `${nuevas === 1 ? "1 movimiento nuevo cargado" : `${nuevas} movimientos nuevos cargados`}${deLaHoja} · ${
            ya === 1 ? "1 ya estaba cargado" : `${ya} ya estaban cargados`
          } (no se duplicaron).`
    );
    setPosiblesDuplicados(resultado.posiblesDuplicados);
    setCantidadPosiblesDuplicados(resultado.cantidadPosiblesDuplicados);
    setContinuidadSaldo(resultado.continuidadSaldo);
    setLiquidacionesAmbiguas(resultado.liquidacionesAmbiguas);
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  async function handleSubir(e: React.FormEvent) {
    e.preventDefault();
    const archivo = fileInputRef.current?.files?.[0];
    if (!archivo) {
      setErrorSubida("Elegí un archivo antes de subir.");
      return;
    }
    await enviarArchivo(archivo);
  }

  // Reintento tras el selector de hoja: mismo archivo, ahora con el nombre de hoja
  // explícito para que subirExtracto no vuelva a ambigüar.
  async function elegirHoja(nombreHoja: string) {
    if (!archivoAmbiguo) return;
    await enviarArchivo(archivoAmbiguo, nombreHoja);
  }

  function actualizarCampoLocal(id: string, campo: "clasificacion" | "unidadNegocio", valor: string) {
    setMovimientos((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              [campo]: valor,
              // Cualquier edición de clasificacion —desde la tabla normal o
              // desde el panel de sugerencias pendientes— cuenta como
              // confirmación, mismo criterio que el server en
              // actualizarMovimiento (ver ese comentario para el motivo del
              // "sin excepción").
              ...(campo === "clasificacion" ? { sugeridaPorSistema: false } : {}),
            }
          : m
      )
    );
  }

  // Confirma en lote: no cambia el valor de clasificacion, solo limpia
  // sugeridaPorSistema — optimista primero (para que el panel de
  // sugerencias reaccione al toque), y si el server la rechaza (ej. la
  // semana se cerró en otra pestaña justo antes) se resincroniza con
  // router.refresh() en vez de intentar revertir a mano.
  async function confirmarGrupoSugerido(ids: string[]) {
    setMovimientos((prev) =>
      prev.map((m) => (ids.includes(m.id) ? { ...m, sugeridaPorSistema: false } : m))
    );
    const resultado = await confirmarClasificacionesEnLote(empresaSlug, periodo, numeroSemana, ids);
    if (!resultado.ok) {
      router.refresh();
    }
  }

  // Confirma por cuenta sobre TODA la semana (no solo esta página): el panel
  // viene del server, así que acá no hay estado optimista que valga para él —
  // se espera la respuesta y se refresca. Lo optimista es solo la marca de
  // "sugerida" en las filas de la página visible.
  async function confirmarCuentaSugerida(grupo: GrupoUnidadSugerida) {
    setConfirmandoUnidad(claveGrupo(grupo));
    const resultado = await confirmarUnidadesEnLote(
      empresaSlug,
      periodo,
      numeroSemana,
      grupo.cuentasCrudas,
      grupo.unidadNegocio
    );
    if (resultado.ok) {
      setMovimientos((prev) =>
        prev.map((m) =>
          m.unidadSugeridaPorSistema &&
          m.unidadNegocio === grupo.unidadNegocio &&
          grupo.cuentasCrudas.includes(m.bancoYCuenta)
            ? { ...m, unidadSugeridaPorSistema: false }
            : m
        )
      );
    }
    setConfirmandoUnidad(null);
    router.refresh();
  }

  function guardarCampo(id: string, campo: "clasificacion" | "unidadNegocio", valor: string) {
    startTransition(() => {
      actualizarMovimiento(empresaSlug, periodo, numeroSemana, id, { [campo]: valor });
    });
  }

  // Quitar sigue borrando la fila igual que siempre (decisión 2026-10-07), pero
  // avisa antes: como subirExtracto reconoce lo ya cargado CONTANDO, una fila
  // quitada vuelve a cargarse si se sube de nuevo un extracto que la contiene.
  // Ignorar es lo que sobrevive a las resubidas.
  async function quitar(id: string) {
    if (
      !confirm(
        "Este movimiento puede volver a aparecer si subís de nuevo el extracto. Para sacarlo de los cálculos de forma permanente, usá Ignorar.\n\n¿Quitarlo igual?"
      )
    ) {
      return;
    }
    setMovimientos((prev) => prev.filter((m) => m.id !== id));
    await eliminarMovimiento(empresaSlug, periodo, numeroSemana, id);
    router.refresh();
  }

  // A diferencia de guardarCampo (clasificación/unidad de negocio), esto sí espera la
  // respuesta del server y refresca — ignorar una línea cambia el Total $ del header
  // (que viene del aggregate del server, no de este estado local), así que necesita
  // el mismo router.refresh() que quitar().
  async function toggleIgnorado(id: string, valorNuevo: boolean) {
    setMovimientos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ignorado: valorNuevo } : m))
    );
    await actualizarMovimiento(empresaSlug, periodo, numeroSemana, id, { ignorado: valorNuevo });
    router.refresh();
  }

  const cantidadSinUnidad = sinUnidadAsignada.reduce((suma, s) => suma + s.movimientos, 0);

  async function handleCerrarSemana() {
    const avisoSinUnidad =
      cantidadSinUnidad > 0
        ? `\n\nAtención: ${cantidadSinUnidad === 1 ? "1 movimiento no tiene" : `${cantidadSinUnidad} movimientos no tienen`} una unidad de negocio asignada a una empresa — no van a entrar en el Reporte de ninguna empresa y después del cierre ya no se pueden corregir.`
        : "";
    if (
      !confirm(
        `¿Confirmás el cierre semanal de la semana ${numeroSemana}? Después de cerrarla no se puede editar para atrás — cualquier corrección va a la semana siguiente.${avisoSinUnidad}`
      )
    ) {
      return;
    }
    const resultado = await cerrarSemana(empresaSlug, periodo, numeroSemana);
    if (!resultado.ok) {
      alert(resultado.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="flex items-center gap-2 text-xs tracking-[0.15em] text-ink-secondary uppercase mb-1">
            <span className="w-2 h-2 bg-plata" />
            {empresaNombre} · Semana {numeroSemana}
          </p>
          <h1 className="text-4xl font-serif font-semibold tracking-tight">
            Panel de imputación
          </h1>
          {semanaAnterior >= 1 && (
            <Link
              href={`/${empresaSlug}/${periodo}/ejecucion/${semanaAnterior}`}
              className="mt-2 inline-block text-sm text-marino hover:text-marino-dark underline underline-offset-2"
            >
              ← Ver semana {semanaAnterior}
            </Link>
          )}
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-md ${
            cerrada ? "bg-terracota-tint text-terracota" : "bg-marino-tint text-marino"
          }`}
        >
          {cerrada ? "Cerrada" : "Abierta"}
        </span>
      </div>

      {cerrada && (
        <p className="mb-6 text-sm text-terracota bg-terracota-tint rounded-md px-3 py-2">
          Esta semana ya está cerrada. Cualquier corrección se carga en la semana siguiente.
        </p>
      )}

      {!cerrada && !mostrarSubida && (
        <div className="mb-10">
          <button
            type="button"
            onClick={() => setMostrarSubida(true)}
            className="flex h-10 items-center gap-2 rounded-md bg-marino px-4 text-sm font-medium text-white hover:bg-marino-dark active:scale-[0.99] transition"
          >
            <IconoFlechaArriba />
            Subir extracto
          </button>
        </div>
      )}

      {!cerrada && mostrarSubida && (
        <form
          onSubmit={handleSubir}
          className="mb-10 rounded-lg border border-line-strong border-l-4 border-l-marino bg-paper-raised shadow-md shadow-ink/10 px-6 py-6"
        >
          <div className="flex items-start justify-between mb-1">
            <p className="text-sm font-medium">Subir extracto bancario</p>
            {totalMovimientos > 0 && (
              <button
                type="button"
                onClick={() => setMostrarSubida(false)}
                aria-label="Cerrar"
                className="text-ink-muted hover:text-ink transition"
              >
                ✕
              </button>
            )}
          </div>
          <p className="text-xs text-ink-muted mb-4">
            Archivo .xlsx con las columnas Fecha, Concepto, Importe, Clasificacion, Unidad de
            Neg, etc.
          </p>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="text-sm text-ink-secondary file:mr-3 file:h-9 file:px-3 file:rounded-md file:border file:border-line file:bg-paper file:text-sm file:text-ink-secondary hover:file:border-line-strong"
            />
            <button
              type="submit"
              disabled={subiendo}
              className="h-10 px-4 rounded-md bg-marino text-white text-sm font-medium hover:bg-marino-dark active:scale-[0.99] transition disabled:opacity-50 whitespace-nowrap"
            >
              {subiendo ? "Subiendo..." : "Subir extracto"}
            </button>
          </div>
          {hojasDisponibles.length > 0 && (
            <div className="mt-3 text-sm bg-marino-tint text-marino rounded-md px-3 py-2">
              <p>
                Este archivo tiene varias hojas y ninguna se llama &quot;Hoja1&quot;. ¿Cuál
                corresponde a esta semana?
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {hojasDisponibles.map((nombreHoja) => (
                  <button
                    key={nombreHoja}
                    type="button"
                    disabled={subiendo}
                    onClick={() => elegirHoja(nombreHoja)}
                    className="h-8 px-3 rounded-md bg-marino text-white text-xs font-medium hover:bg-marino-dark active:scale-[0.99] transition disabled:opacity-50"
                  >
                    {nombreHoja}
                  </button>
                ))}
              </div>
            </div>
          )}
          {errorSubida && (
            <p className="mt-3 text-sm text-terracota bg-terracota-tint rounded-md px-3 py-2">
              {errorSubida}
            </p>
          )}
          {mensajeExito && (
            <p className="mt-3 text-sm text-marino bg-marino-tint rounded-md px-3 py-2">
              {mensajeExito}
            </p>
          )}
          {cuentasCompartidas && (
            <div className="mt-3 text-sm text-terracota bg-terracota-tint rounded-md px-3 py-2">
              <p className="font-medium">
                Todavía no se cargó nada: algunas cuentas de este archivo ya tienen
                movimientos en otra empresa.
              </p>
              <p className="mt-1 text-xs">
                Puede ser una cuenta compartida (ej. el extracto propio de Fredy trae cuentas
                de otras unidades) o que el archivo se esté subiendo en la empresa
                equivocada. Si muchas filas son idénticas, es casi seguro lo segundo.
              </p>
              <ul className="mt-2 list-disc pl-5 text-xs">
                {cuentasCompartidas.cuentas.map((c) => (
                  <li key={`${c.cuenta}|${c.empresa}`}>
                    <span className="font-medium">{c.cuenta}</span>: {c.filasEnOtraEmpresa}{" "}
                    movimientos cargados en <span className="font-medium">{c.empresa}</span>
                    {" · "}
                    {c.identicas} de las {c.filasNuevasDeLaCuenta} filas nuevas de esta cuenta
                    son idénticas
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={subiendo}
                  onClick={() =>
                    enviarArchivo(cuentasCompartidas.archivo, cuentasCompartidas.hoja, true)
                  }
                  className="h-8 px-3 rounded-md bg-terracota text-white text-xs font-medium hover:opacity-90 active:scale-[0.99] transition disabled:opacity-50"
                >
                  Cargar igual ({cuentasCompartidas.filasNuevas} movimientos nuevos)
                </button>
                <button
                  type="button"
                  disabled={subiendo}
                  onClick={() => {
                    setCuentasCompartidas(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="h-8 px-3 rounded-md border border-terracota text-terracota text-xs font-medium hover:bg-paper transition disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
          {cantidadPosiblesDuplicados > 0 && (
            <div className="mt-3 text-sm text-terracota bg-terracota-tint rounded-md px-3 py-2">
              <p>
                {cantidadPosiblesDuplicados === 1
                  ? "1 movimiento nuevo se parece"
                  : `${cantidadPosiblesDuplicados} movimientos nuevos se parecen`}{" "}
                a uno ya cargado (misma cuenta, fecha e importe, pero distinto concepto,
                referencia o saldo) — se cargaron igual, revisalos:
              </p>
              <ul className="mt-2 list-disc pl-5 text-xs">
                {posiblesDuplicados.slice(0, 20).map((d) => (
                  <li key={d.fila}>
                    Fila {d.fila}: {d.fecha}, {d.bancoYCuenta}, ${formatearImporte(d.importe)} —{" "}
                    {d.concepto}
                  </li>
                ))}
              </ul>
              {cantidadPosiblesDuplicados > 20 && (
                <p className="mt-1 text-xs">y {cantidadPosiblesDuplicados - 20} más.</p>
              )}
            </div>
          )}
          <AlertaContinuidadSaldo continuidadSaldo={continuidadSaldo} />
          {liquidacionesAmbiguas.length > 0 && (
            <div className="mt-3 text-sm text-terracota bg-terracota-tint rounded-md px-3 py-2">
              <p>
                {liquidacionesAmbiguas.length === 1
                  ? "1 movimiento podría ser una liquidación final, pero hay más de una posible"
                  : `${liquidacionesAmbiguas.length} movimientos podrían ser liquidaciones finales, pero hay más de una posible`}{" "}
                para la misma fecha e importe — no se asignó la clasificación automática, revisalos:
              </p>
              <ul className="mt-2 list-disc pl-5 text-xs">
                {liquidacionesAmbiguas.map((l) => (
                  <li key={l.fila}>
                    Fila {l.fila}: {l.fecha}, ${formatearImporte(l.importe)} — podría ser{" "}
                    {l.candidatos.join(" o ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      )}

      <div>
        <div className="flex items-start justify-between mb-2">
          <h2 className="pt-1 text-sm font-medium text-ink-secondary">
            Movimientos ({totalMovimientos})
          </h2>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint mb-0.5">
              Total
            </p>
            <p
              className={`tabular text-2xl font-semibold ${
                totalImporte < 0 ? "text-negative" : totalImporte > 0 ? "text-positive" : "text-ink"
              }`}
            >
              ${formatearImporte(totalImporte)}
            </p>
          </div>
        </div>

        <div className="mb-4 inline-flex rounded-md border border-line p-0.5">
          <Link
            href="?"
            className={`px-2.5 py-1 rounded text-xs font-medium transition ${
              !soloSinClasificar ? "bg-marino-tint text-marino" : "text-ink-secondary hover:text-ink"
            }`}
          >
            Todos
          </Link>
          <Link
            href="?filtro=sin_clasificar"
            className={`px-2.5 py-1 rounded text-xs font-medium transition ${
              soloSinClasificar ? "bg-marino-tint text-marino" : "text-ink-secondary hover:text-ink"
            }`}
          >
            Solo sin clasificar
          </Link>
        </div>

        {!cerrada && (
          <PanelSugerenciasPendientes
            sugerencias={movimientos.filter((m) => m.sugeridaPorSistema)}
            clasificacionesDisponibles={clasificacionesDisponibles}
            onConfirmarFila={(id, valor) => {
              actualizarCampoLocal(id, "clasificacion", valor);
              guardarCampo(id, "clasificacion", valor);
            }}
            onConfirmarGrupo={confirmarGrupoSugerido}
          />
        )}

        {!cerrada && (
          <PanelUnidadesSugeridas
            grupos={unidadesSugeridas}
            onConfirmarCuenta={confirmarCuentaSugerida}
            confirmando={confirmandoUnidad}
          />
        )}

        {!cerrada && <PanelChequeos chequeos={chequeos} />}

        {totalMovimientos === 0 ? (
          <p className="text-sm text-ink-muted py-6 border-t border-line-strong">
            Todavía no hay movimientos cargados en esta semana. Subí un extracto para empezar.
          </p>
        ) : (
          <>
            <div className="border-t border-line-strong overflow-x-auto">
              <TablaMovimientos
                movimientos={movimientos}
                numeroSemana={numeroSemana}
                deshabilitado={cerrada}
                clasificacionesDisponibles={clasificacionesDisponibles}
                onCambiarClasificacion={(id, valor) => {
                  actualizarCampoLocal(id, "clasificacion", valor);
                  guardarCampo(id, "clasificacion", valor);
                }}
                onCambiarUnidadNegocio={(id, valor) => {
                  // El <select> de TablaMovimientos solo dispara con un cambio
                  // real — así que esto ya es una corrección: deja de ser
                  // sugerencia (mismo criterio que el server en actualizarMovimiento).
                  actualizarCampoLocal(id, "unidadNegocio", valor);
                  setMovimientos((prev) =>
                    prev.map((m) => (m.id === id ? { ...m, unidadSugeridaPorSistema: false } : m))
                  );
                  guardarCampo(id, "unidadNegocio", valor);
                }}
                onQuitar={quitar}
                onToggleIgnorado={toggleIgnorado}
              />
            </div>
            <Paginacion
              empresaSlug={empresaSlug}
              periodo={periodo}
              numeroSemana={numeroSemana}
              pagina={pagina}
              totalPaginas={totalPaginas}
              filtro={soloSinClasificar ? "sin_clasificar" : undefined}
            />
          </>
        )}
      </div>

      {!cerrada && cantidadSinUnidad > 0 && (
        <div className="mt-10 rounded-md border border-line-strong border-l-4 border-l-terracota bg-paper-raised px-5 py-4 text-sm">
          <p className="font-medium">
            {cantidadSinUnidad === 1
              ? "1 movimiento sin unidad asignada"
              : `${cantidadSinUnidad} movimientos sin unidad asignada`}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Su unidad de negocio no pertenece a ninguna empresa, así que no van a entrar en el
            Reporte de nadie. Asignales una unidad (o prorrateálos) antes del cierre semanal: una
            semana cerrada ya no se puede editar.
          </p>
          <p className="mt-2 text-xs text-ink-secondary">
            {sinUnidadAsignada.map((s) => `${s.unidad} (${s.movimientos})`).join(" · ")}
          </p>
        </div>
      )}

      {!cerrada && (
        <div className="mt-10 flex items-center justify-between border-t border-line-strong pt-6">
          <p className="text-xs text-ink-muted max-w-xs">
            Al cerrar la semana, cualquier corrección posterior se carga en la semana siguiente
            — no se puede editar para atrás.
          </p>
          <button
            onClick={handleCerrarSemana}
            disabled={totalMovimientos === 0}
            className="h-14 px-6 rounded-md bg-ink text-paper text-base font-semibold tracking-wide disabled:opacity-30 disabled:cursor-not-allowed hover:bg-ink/90 active:scale-[0.99] transition shadow-sm hover:shadow-md"
          >
            Cierre semanal
          </button>
        </div>
      )}
    </div>
  );
}
