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
  type GrupoSugerenciaClasificacion,
  type ResultadoChequeo,
  type ResultadoContinuidadSaldo,
  type ResultadoLiquidacionAmbigua,
  type PosibleDuplicado,
  type VistaPreviaExtracto,
  type FilaSinUnidad,
} from "./actions";
import TablaMovimientos from "./TablaMovimientos";
import Paginacion from "./Paginacion";
import { nombreDePeriodo } from "@/lib/ejecucionSemanas";
import { verificarTamanoArchivo } from "@/lib/extractos/limites";
import PanelChequeos from "./PanelChequeos";
import PanelSugerenciasPendientes from "./PanelSugerenciasPendientes";
import PanelUnidadesSugeridas, { claveGrupo } from "./PanelUnidadesSugeridas";
import AlertaContinuidadSaldo from "./AlertaContinuidadSaldo";
import { formatearImporte, formatearImporteConCentavos } from "./formato";

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
  // Solo FINANZAS y ADMIN ven el botón de cierre (D-4).
  puedeCerrar: boolean;
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
  // Sugerencias de clasificación de TODA la semana (no de la página), armadas
  // en el server — ver agruparSugerenciasClasificacion en actions.ts.
  sugerenciasClasificacion: GrupoSugerenciaClasificacion[];
  // Cuentas activas de la empresa, para el selector del extracto crudo.
  cuentasBancarias: { nombre: string; banco: string }[];
};

export default function PanelImputacion({
  puedeCerrar,
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
  sugerenciasClasificacion,
  cuentasBancarias,
}: Props) {
  const router = useRouter();
  const { periodo } = useParams<{ periodo: string }>();
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
  // Nombre canónico de la cuenta del extracto. "" = todavía no eligió: no se puede subir (el
  // archivo madre no se sube por la web).
  const [cuenta, setCuenta] = useState("");
  const faltaElegirCuenta = cuenta === "";
  // Resumen de un extracto crudo antes de cargarlo: mientras está visible no se cargó nada.
  const [vistaPrevia, setVistaPrevia] = useState<{
    vista: VistaPreviaExtracto;
    archivo: File;
    hoja?: string;
  } | null>(null);
  const [avisosSubida, setAvisosSubida] = useState<string[]>([]);
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
  // hoja elegida (archivo con varias hojas) o con la confirmación de la vista previa —
  // en los dos se reenvía el mismo File ya elegido del disco, sin que el usuario tenga
  // que volver a seleccionarlo.
  async function enviarArchivo(
    archivo: File,
    hoja?: string,
    confirmarPrevia = false
  ) {
    // Mismo tope y mensaje que el servidor (lib/extractos/limites.ts), pero sin viajar: si Next corta
    // el pedido por bodySizeLimit, la pantalla solo vería el mensaje genérico de "no respondió".
    const frenoTamano = verificarTamanoArchivo(archivo.size);
    if (!frenoTamano.ok) {
      setMensajeExito("");
      setVistaPrevia(null);
      setErrorSubida(frenoTamano.error);
      return;
    }
    setSubiendo(true);
    setErrorSubida("");
    setMensajeExito("");
    setPosiblesDuplicados([]);
    setCantidadPosiblesDuplicados(0);
    setContinuidadSaldo([]);
    setLiquidacionesAmbiguas([]);
    setHojasDisponibles([]);
    setArchivoAmbiguo(null);
    setVistaPrevia(null);
    setAvisosSubida([]);

    const formData = new FormData();
    formData.append("archivo", archivo);
    formData.append("cuenta", cuenta);

    // Si la Server Action lanza (timeout, servidor reiniciado, red), sin este try/catch/finally
    // la pantalla quedaba en "Subiendo..." para siempre y el botón deshabilitado.
    let resultado: Awaited<ReturnType<typeof subirExtracto>>;
    try {
      resultado = await subirExtracto(periodo, numeroSemana, formData, {
        hoja,
        confirmarVistaPrevia: confirmarPrevia,
      });
    } catch {
      setErrorSubida(
        "No se pudo completar la subida: el servidor no respondió o se interrumpió. No se confirmó ninguna carga; revisá la semana antes de reintentar (si el archivo es muy grande, puede haber quedado sin cargar)."
      );
      return;
    } finally {
      setSubiendo(false);
    }

    if (!resultado.ok) {
      if ("requiereSeleccionHoja" in resultado) {
        setHojasDisponibles(resultado.hojas);
        setArchivoAmbiguo(archivo);
        return;
      }
      if ("requiereVistaPrevia" in resultado) {
        setVistaPrevia({ vista: resultado.vista, archivo, hoja });
        return;
      }
      if (resultado.cuentaSugerida) setCuenta(resultado.cuentaSugerida);
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
    // Un archivo con días de dos meses reparte sus filas: se dice dónde quedó cada una.
    if (resultado.repartoPorPeriodo.length > 1) {
      const reparto = resultado.repartoPorPeriodo
        .map((r) => `${nombreDePeriodo(r.periodo)} (semana ${r.numeroSemana}): ${r.filas}`)
        .join("; ");
      setMensajeExito((m) => `${m} Repartidos por mes: ${reparto}.`);
    }
    setAvisosSubida(resultado.avisos);
    setPosiblesDuplicados(resultado.posiblesDuplicados);
    setCantidadPosiblesDuplicados(resultado.cantidadPosiblesDuplicados);
    setContinuidadSaldo(resultado.continuidadSaldo);
    setLiquidacionesAmbiguas(resultado.liquidacionesAmbiguas);
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  async function handleSubir(e: React.FormEvent) {
    e.preventDefault();
    if (faltaElegirCuenta) {
      setErrorSubida("Elegí la cuenta del extracto antes de subir el archivo.");
      return;
    }
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

  // Confirma en lote TODAS las sugerencias de una clasificación en la semana
  // (no solo las de la página): no cambia el valor, solo limpia
  // sugeridaPorSistema. El panel viene del server, así que se espera la
  // respuesta y se refresca.
  async function confirmarGrupoSugerido(clasificacion: string) {
    await confirmarClasificacionesEnLote(periodo, numeroSemana, clasificacion);
    router.refresh();
  }

  // Una fila del panel de sugerencias: se guarda esperando la respuesta (no en
  // startTransition como la tabla) y se refresca, porque el panel viene del
  // server sobre toda la semana.
  async function confirmarFilaSugerida(id: string, valor: string) {
    actualizarCampoLocal(id, "clasificacion", valor);
    await actualizarMovimiento(periodo, numeroSemana, id, { clasificacion: valor });
    router.refresh();
  }

  // Confirma por cuenta sobre TODA la semana (no solo esta página): el panel
  // viene del server, así que acá no hay estado optimista que valga para él —
  // se espera la respuesta y se refresca. Lo optimista es solo la marca de
  // "sugerida" en las filas de la página visible.
  async function confirmarCuentaSugerida(grupo: GrupoUnidadSugerida) {
    setConfirmandoUnidad(claveGrupo(grupo));
    const resultado = await confirmarUnidadesEnLote(
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
      actualizarMovimiento(periodo, numeroSemana, id, { [campo]: valor });
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
    await eliminarMovimiento(periodo, numeroSemana, id);
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
    await actualizarMovimiento(periodo, numeroSemana, id, { ignorado: valorNuevo });
    router.refresh();
  }

  const [bloqueoCierre, setBloqueoCierre] = useState<{ mensaje: string; movimientos: FilaSinUnidad[]; total: number } | null>(null);
  const cantidadSinUnidad = sinUnidadAsignada.reduce((suma, s) => suma + s.movimientos, 0);

  async function handleCerrarSemana() {
    setBloqueoCierre(null);
    if (
      !confirm(
        `¿Confirmás el cierre semanal de la semana ${numeroSemana}? Después de cerrarla no se puede editar para atrás — cualquier corrección va a la semana siguiente.`
      )
    ) {
      return;
    }
    let resultado = await cerrarSemana(periodo, numeroSemana);
    // Avisos que no bloquean (SIN CLASIFICAR, sugerencias sin confirmar): el servidor pide
    // confirmar con la cantidad.
    if (!resultado.ok && resultado.requiereConfirmacion) {
      if (!confirm(resultado.error)) return;
      resultado = await cerrarSemana(periodo, numeroSemana, { confirmarAvisos: true });
    }
    if (!resultado.ok) {
      // Bloqueo por movimientos sin unidad de empresa: se muestra la lista abajo.
      if (resultado.bloqueos && resultado.bloqueos.length > 0) {
        setBloqueoCierre({
          mensaje: resultado.error,
          movimientos: resultado.movimientosSinUnidad ?? [],
          total: resultado.bloqueos.reduce((a, b) => a + b.movimientos, 0),
        });
        return;
      }
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
            Ejecución global · {periodo} · Semana {numeroSemana}
          </p>
          <h1 className="text-4xl font-serif font-semibold tracking-tight">
            Panel de imputación
          </h1>
          {semanaAnterior >= 1 && (
            <Link
              href={`/ejecucion/${periodo}/${semanaAnterior}`}
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
            Extracto de un banco tal cual se descarga (Macro, Galicia, BBVA Francés, Nación,
            Santander, Santiago del Estero: .xls, .xlsx o .csv, hasta 1 MB y 1.000 filas). Primero
            elegí la cuenta. El archivo madre se carga por script.
          </p>
          <div className="mb-3 flex items-center gap-3">
            <label htmlFor="cuenta-extracto" className="text-xs text-ink-secondary whitespace-nowrap">
              Cuenta del extracto
            </label>
            <select
              id="cuenta-extracto"
              value={cuenta}
              onChange={(e) => setCuenta(e.target.value)}
              className="h-9 px-2 rounded-md border border-line bg-paper text-sm text-ink focus:outline-none focus:border-marino"
            >
              <option value="" disabled>
                Elegí la cuenta…
              </option>
              {cuentasBancarias.map((c) => (
                <option key={c.nombre} value={c.nombre}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="text-sm text-ink-secondary file:mr-3 file:h-9 file:px-3 file:rounded-md file:border file:border-line file:bg-paper file:text-sm file:text-ink-secondary hover:file:border-line-strong"
            />
            <button
              type="submit"
              disabled={subiendo || faltaElegirCuenta}
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
          {vistaPrevia && (
            <div className="mt-3 text-sm bg-marino-tint text-marino rounded-md px-3 py-3">
              <p className="font-medium">
                Todavía no se cargó nada: revisá el resumen y compará con la pantalla del banco.
              </p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-xs tabular">
                <dt>Banco / cuenta</dt>
                <dd>
                  {vistaPrevia.vista.banco} · {vistaPrevia.vista.cuenta}
                </dd>
                <dt>Movimientos</dt>
                <dd>
                  {vistaPrevia.vista.filas} ({vistaPrevia.vista.nuevas} nuevos, {vistaPrevia.vista.yaCargadas} ya
                  cargados)
                </dd>
                <dt>Fechas</dt>
                <dd>
                  {vistaPrevia.vista.desde} a {vistaPrevia.vista.hasta}
                </dd>
                <dt>Reparto por mes</dt>
                <dd>
                  {vistaPrevia.vista.repartoPorPeriodo
                    .map((r) => `${nombreDePeriodo(r.periodo)}: ${r.filas === 1 ? "1 fila" : `${r.filas} filas`}`)
                    .join("; ")}
                  {" "}(movimientos nuevos; cada fila va a la semana abierta de su mes)
                </dd>
                <dt>Total créditos</dt>
                <dd>${formatearImporteConCentavos(vistaPrevia.vista.creditos)}</dd>
                <dt>Total débitos</dt>
                <dd>${formatearImporteConCentavos(vistaPrevia.vista.debitos)}</dd>
                <dt>Neto</dt>
                <dd>${formatearImporteConCentavos(vistaPrevia.vista.neto)}</dd>
              </dl>
              {vistaPrevia.vista.avisos.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-xs">
                  {vistaPrevia.vista.avisos.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              )}
              {vistaPrevia.vista.posiblesDuplicados > 0 && (
                <p className="mt-2 text-xs text-terracota">
                  {vistaPrevia.vista.posiblesDuplicados} movimientos nuevos se parecen a otros ya cargados (misma
                  cuenta, fecha e importe).
                </p>
              )}
              {vistaPrevia.vista.continuidadSaldo.length > 0 && (
                <p className="mt-2 text-xs text-terracota">
                  Hay saltos en el saldo del archivo ({vistaPrevia.vista.continuidadSaldo[0].cantidad}). Se
                  muestran al cargar.
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={subiendo}
                  onClick={() => enviarArchivo(vistaPrevia.archivo, vistaPrevia.hoja, true)}
                  className="h-8 px-3 rounded-md bg-marino text-white text-xs font-medium hover:bg-marino-dark active:scale-[0.99] transition disabled:opacity-50"
                >
                  Confirmar y cargar ({vistaPrevia.vista.nuevas} movimientos)
                </button>
                <button
                  type="button"
                  disabled={subiendo}
                  onClick={() => {
                    setVistaPrevia(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="h-8 px-3 rounded-md border border-marino text-marino text-xs font-medium hover:bg-paper transition disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
          {avisosSubida.length > 0 && (
            <ul className="mt-3 list-disc pl-8 text-xs text-ink-secondary">
              {avisosSubida.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
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
            grupos={sugerenciasClasificacion}
            clasificacionesDisponibles={clasificacionesDisponibles}
            onConfirmarFila={confirmarFilaSugerida}
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
              base={`/ejecucion/${periodo}/${numeroSemana}`}
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

      {bloqueoCierre && (
        <div className="mt-10 rounded-md border border-terracota bg-terracota-tint px-5 py-4 text-sm text-terracota">
          <p className="font-medium">{bloqueoCierre.mensaje}</p>
          {bloqueoCierre.movimientos.length > 0 && (
            <>
              <ul className="mt-3 divide-y divide-terracota/20 text-xs">
                {bloqueoCierre.movimientos.map((m) => (
                  <li key={`${m.id}|${m.unidad}`} className="py-1.5 flex gap-3">
                    <span className="tabular w-20 shrink-0">{m.fecha}</span>
                    <span className="flex-1 truncate">{m.concepto}</span>
                    <span className="tabular shrink-0">${formatearImporte(m.importe)}</span>
                    <span className="w-28 shrink-0 truncate text-right font-medium">{m.unidad}</span>
                  </li>
                ))}
              </ul>
              {bloqueoCierre.movimientos.length < bloqueoCierre.total && (
                <p className="mt-2 text-xs">
                  Se muestran {bloqueoCierre.movimientos.length} de {bloqueoCierre.total}.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {!cerrada && (
        <div className="mt-10 flex items-center justify-between border-t border-line-strong pt-6">
          <p className="text-xs text-ink-muted max-w-xs">
            Al cerrar la semana, cualquier corrección posterior se carga en la semana siguiente
            — no se puede editar para atrás.
            {!puedeCerrar && " El cierre lo hace Finanzas o un administrador."}
          </p>
          {puedeCerrar && (
            <button
              onClick={handleCerrarSemana}
              disabled={totalMovimientos === 0}
              className="h-14 px-6 rounded-md bg-ink text-paper text-base font-semibold tracking-wide disabled:opacity-30 disabled:cursor-not-allowed hover:bg-ink/90 active:scale-[0.99] transition shadow-sm hover:shadow-md"
            >
              Cierre semanal
            </button>
          )}
        </div>
      )}
    </div>
  );
}
