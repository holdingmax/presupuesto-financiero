"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  subirExtracto,
  actualizarMovimiento,
  eliminarMovimiento,
  cerrarSemana,
} from "./actions";
import TablaMovimientos from "./TablaMovimientos";
import Paginacion from "./Paginacion";
import { formatearImporte } from "./formato";

type Movimiento = {
  id: string;
  fecha: string;
  concepto: string;
  importe: number;
  bancoYCuenta: string;
  clasificacion: string;
  unidadNegocio: string;
  detalle: string;
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
}: Props) {
  const router = useRouter();
  const { empresa: empresaSlug, periodo } = useParams<{
    empresa: string;
    periodo: string;
  }>();
  const [movimientos, setMovimientos] = useState(movimientosIniciales);

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
  const [posiblesDuplicados, setPosiblesDuplicados] = useState<
    { fila: number; fecha: string; importe: number }[]
  >([]);
  // Archivo con más de una hoja y ninguna llamada "Hoja1": se guarda acá el File ya elegido
  // del disco para poder reenviarlo con la hoja que el usuario elija, sin que tenga que
  // volver a seleccionarlo desde el input.
  const [hojasDisponibles, setHojasDisponibles] = useState<string[]>([]);
  const [archivoAmbiguo, setArchivoAmbiguo] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  const cerrada = estado === "CERRADA";
  const semanaAnterior = numeroSemana - 1;

  async function handleSubir(e: React.FormEvent) {
    e.preventDefault();
    const archivo = fileInputRef.current?.files?.[0];
    if (!archivo) {
      setErrorSubida("Elegí un archivo antes de subir.");
      return;
    }

    setSubiendo(true);
    setErrorSubida("");
    setMensajeExito("");
    setPosiblesDuplicados([]);
    setHojasDisponibles([]);
    setArchivoAmbiguo(null);

    const formData = new FormData();
    formData.append("archivo", archivo);

    const resultado = await subirExtracto(empresaSlug, periodo, numeroSemana, formData);

    setSubiendo(false);

    if (!resultado.ok) {
      if ("requiereSeleccionHoja" in resultado) {
        setHojasDisponibles(resultado.hojas);
        setArchivoAmbiguo(archivo);
        return;
      }
      setErrorSubida(resultado.error);
      return;
    }

    setMensajeExito(
      resultado.hoja
        ? `Se importaron ${resultado.filasImportadas} movimientos de la hoja "${resultado.hoja}".`
        : `Se importaron ${resultado.filasImportadas} movimientos.`
    );
    setPosiblesDuplicados(resultado.posiblesDuplicados);
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  // Reintento tras el selector de hoja: reenvía el mismo archivo ya elegido del disco,
  // ahora con el nombre de hoja explícito para que subirExtracto no vuelva a ambigüar.
  async function elegirHoja(nombreHoja: string) {
    if (!archivoAmbiguo) return;
    const archivo = archivoAmbiguo;

    setSubiendo(true);
    setErrorSubida("");
    setMensajeExito("");
    setPosiblesDuplicados([]);
    setHojasDisponibles([]);
    setArchivoAmbiguo(null);

    const formData = new FormData();
    formData.append("archivo", archivo);

    const resultado = await subirExtracto(
      empresaSlug,
      periodo,
      numeroSemana,
      formData,
      nombreHoja
    );

    setSubiendo(false);

    if (!resultado.ok) {
      // requiereSeleccionHoja no debería poder repetirse acá (ya se mandó un nombre de
      // hoja explícito), pero el chequeo queda por las dudas de que el archivo cambie.
      if ("requiereSeleccionHoja" in resultado) {
        setHojasDisponibles(resultado.hojas);
        setArchivoAmbiguo(archivo);
        return;
      }
      setErrorSubida(resultado.error);
      return;
    }

    setMensajeExito(
      resultado.hoja
        ? `Se importaron ${resultado.filasImportadas} movimientos de la hoja "${resultado.hoja}".`
        : `Se importaron ${resultado.filasImportadas} movimientos.`
    );
    setPosiblesDuplicados(resultado.posiblesDuplicados);
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  function actualizarCampoLocal(id: string, campo: "clasificacion" | "unidadNegocio", valor: string) {
    setMovimientos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [campo]: valor } : m))
    );
  }

  function guardarCampo(id: string, campo: "clasificacion" | "unidadNegocio", valor: string) {
    startTransition(() => {
      actualizarMovimiento(empresaSlug, periodo, numeroSemana, id, { [campo]: valor });
    });
  }

  async function quitar(id: string) {
    setMovimientos((prev) => prev.filter((m) => m.id !== id));
    await eliminarMovimiento(empresaSlug, periodo, numeroSemana, id);
    router.refresh();
  }

  async function handleCerrarSemana() {
    if (
      !confirm(
        `¿Confirmás el cierre semanal de la semana ${numeroSemana}? Después de cerrarla no se puede editar para atrás — cualquier corrección va a la semana siguiente.`
      )
    ) {
      return;
    }
    await cerrarSemana(empresaSlug, periodo, numeroSemana);
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

      {!cerrada && (
        <form
          onSubmit={handleSubir}
          className="mb-10 rounded-lg border border-line-strong border-l-4 border-l-marino bg-paper-raised shadow-md shadow-ink/10 px-6 py-6"
        >
          <p className="text-sm font-medium mb-1">Subir extracto bancario</p>
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
          {posiblesDuplicados.length > 0 && (
            <div className="mt-3 text-sm text-terracota bg-terracota-tint rounded-md px-3 py-2">
              <p>
                {posiblesDuplicados.length === 1
                  ? "1 movimiento parece duplicado"
                  : `${posiblesDuplicados.length} movimientos parecen duplicados`}{" "}
                (misma fecha e importe que uno ya cargado antes) — se importaron igual,
                revisalos:
              </p>
              <ul className="mt-2 list-disc pl-5 text-xs">
                {posiblesDuplicados.map((d) => (
                  <li key={d.fila}>
                    Fila {d.fila}: {d.fecha}, ${formatearImporte(d.importe)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      )}

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-sm font-medium text-ink-secondary">
            Movimientos ({totalMovimientos})
          </h2>
          <span className="tabular text-sm text-ink-secondary">
            Total ${formatearImporte(totalImporte)}
          </span>
        </div>

        {totalMovimientos === 0 ? (
          <p className="text-sm text-ink-muted py-6 border-t border-line-strong">
            Todavía no hay movimientos cargados en esta semana. Subí un extracto para empezar.
          </p>
        ) : (
          <>
            <div className="border-t border-line-strong overflow-x-auto">
              <TablaMovimientos
                movimientos={movimientos}
                deshabilitado={cerrada}
                clasificacionesDisponibles={clasificacionesDisponibles}
                onCambiarClasificacion={(id, valor) => {
                  actualizarCampoLocal(id, "clasificacion", valor);
                  guardarCampo(id, "clasificacion", valor);
                }}
                onCambiarUnidadNegocio={(id, valor) => actualizarCampoLocal(id, "unidadNegocio", valor)}
                onGuardarUnidadNegocio={(id, valor) => guardarCampo(id, "unidadNegocio", valor)}
                onQuitar={quitar}
              />
            </div>
            <Paginacion
              empresaSlug={empresaSlug}
              periodo={periodo}
              numeroSemana={numeroSemana}
              pagina={pagina}
              totalPaginas={totalPaginas}
            />
          </>
        )}
      </div>

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
