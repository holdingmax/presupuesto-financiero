import { pendientesDe, type Celda, type FilaLinea, type FilaReporte, type Reporte } from "@/lib/reporte/motor";
import { PENDIENTES } from "@/lib/reporte/pendientes";
import { formatearImporte } from "@/app/ejecucion/formato";
import Link from "next/link";
import BloqueNoAsignado from "./BloqueNoAsignado";
import { AccionesFlujo, AvisosFlujo, EstadoBadge } from "../FlujoPresupuesto";
import type { EstadoFlujo } from "@/lib/presupuestoAcceso";
import type { VistaCarga } from "@/lib/reporte/cargaGerente";
import {
  BarraGuardarPresupuesto,
  BloqueCapital,
  CeldaPresupuestoEditable,
  ProveedorCarga,
} from "./CargaPresupuesto";
import type { ReactNode } from "react";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function nombreMes(periodo: string) {
  const [anio, mes] = periodo.split("-");
  return `${MESES[Number(mes) - 1] ?? mes} ${anio}`;
}

// Textos neutros: los ve cualquier rol, sin nombrar a nadie.
const AYUDA_PARCIAL_FILA = "Dato parcial: falta información para completar este valor";
const AYUDA_PARCIAL_TOTAL = "Dato parcial: falta información para completar este total";

// Centavos → pesos sin decimales, con "−" si es negativo (un egreso con más
// devoluciones que gastos se muestra negativo a propósito).
function importe(centavos: number) {
  const pesos = formatearImporte(Math.abs(centavos) / 100);
  return centavos < 0 ? `−${pesos}` : pesos;
}

// Con centavos: el control de arrastre mira diferencias de menos de $1.
function importeCentavos(centavos: number) {
  const pesos = (Math.abs(centavos) / 100).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return centavos < 0 ? `−${pesos}` : pesos;
}

type Props = {
  empresaNombre: string;
  empresaSlug: string;
  periodo: string;
  reporte: Reporte;
  // ADMIN o FINANZAS y MOSTRAR_PENDIENTES_EN_REPORTE (lib/config.ts): ven las etiquetas K,
  // sus tooltips y la lista de pendientes.
  verPendientes: boolean;
  // ADMIN o FINANZAS: control de arrastre, marcas de la planilla y link a la carga.
  verControl: boolean;
  // Estado del Presupuesto del mes de la URL y botones del flujo; null = no se muestran
  // (ver mostrarFlujoEnReporte en lib/estadoPresupuesto.ts).
  flujo: EstadoFlujo | null;
  // Carga del Presupuestado en el Reporte (Etapa 2): celdas editables de la última columna y
  // bloque "Sin fila". null = el Reporte es de solo lectura, como siempre.
  carga: VistaCarga | null;
  // Cartel de mes en solo lectura para el gerente (null = sin cartel). Ver avisoPeriodoSoloLectura.
  avisoSoloLectura: string | null;
  sinUnidades: boolean;
  noAsignado: { unidad: string; importe: number; movimientos: number }[];
  semanasConNoAsignado: number[];
};

export default function ReportePlantilla({
  empresaNombre,
  empresaSlug,
  periodo,
  reporte,
  verPendientes,
  verControl,
  flujo,
  carga,
  avisoSoloLectura,
  sinUnidades,
  noAsignado,
  semanasConNoAsignado,
}: Props) {
  const { periodos, sinPresupuesto, sinEjecucion } = reporte;
  const idsEditables = new Set(carga?.celdas.map((c) => c.id));
  // Meses que no se editan desde acá: los anteriores al último, y el último si el mes está en solo
  // lectura (cartel). Se marcan con la etiqueta «Solo lectura» y el fondo atenuado.
  const soloLecturaPorMes = periodos.map((_, i) => i < periodos.length - 1 || avisoSoloLectura !== null);
  return (
    <div className="w-full px-3 py-2">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-lg font-serif font-semibold tracking-tight">Presupuesto financiero</h1>
        <p className="flex items-center gap-2 text-[11px] tracking-[0.12em] text-ink-secondary uppercase">
          <span className="h-1.5 w-1.5 bg-plata" />
          {empresaNombre} · {nombreMes(periodos[0])}
          {periodos.length > 1 && ` a ${nombreMes(periodos[periodos.length - 1])}`}
        </p>
        <p
          className="text-[11px] text-ink-secondary"
          title="El real suma los movimientos de las unidades de negocio de esta empresa, de cualquier extracto del período. Disponibilidades, Resultado FCI y demás valores tipeados se cargan a mano."
        >
          Presupuestado vs. real ejecutado (semanas cerradas), en pesos.
        </p>
        {verControl && (
          <Link
            href={`/${empresaSlug}/${periodo}/reporte/carga`}
            className="rounded-md border border-line-strong px-2 py-0.5 text-xs hover:bg-paper-raised"
          >
            Cargar valores del mes
          </Link>
        )}
      </div>

      <ConCarga carga={carga} empresaSlug={empresaSlug} periodo={periodo}>
      {avisoSoloLectura && (
        <p className="mb-2 rounded-md bg-terracota-tint px-3 py-1 text-xs text-terracota" role="status">
          {avisoSoloLectura}
        </p>
      )}

      {flujo && (
        <div className="mb-2">
          <div className="mb-1 flex items-center gap-2 text-xs text-ink-secondary">
            <span>Presupuesto de {nombreMes(periodo)}:</span>
            <EstadoBadge estado={flujo.estado} />
          </div>
          <AvisosFlujo
            estado={flujo.estado}
            esRevisor={flujo.esRevisor}
            revisionCompletada={flujo.revisionCompletada}
            fueModificadoPorRevisor={flujo.fueModificadoPorRevisor}
            validacion={flujo.validacion}
            pedidoCambios={flujo.pedidoCambios}
          />
        </div>
      )}

      {sinUnidades && (
        <p className="mb-2 text-xs text-terracota bg-terracota-tint rounded-md px-3 py-1">
          Esta empresa no tiene unidades de negocio asignadas, así que el real va a dar 0. Un
          administrador las asigna en Administración → Unidades de negocio.
        </p>
      )}

      {carga && <BarraGuardarPresupuesto />}

      {/* Un solo mes entra sin scroll horizontal: sin contenedor con overflow, el encabezado fijo se pega a la
          ventana. Con varios meses el contenedor scrollea (en horizontal si la pantalla es angosta) y el
          encabezado se pega a él. */}
      <div
        className={`border-t border-line-strong ${
          periodos.length === 1 ? "max-w-5xl" : "max-h-[calc(100vh-4rem)] max-w-[1800px] overflow-auto"
        }`}
      >
        <table className="w-full text-[11px] leading-4">
          <thead className="sticky top-0 z-20 bg-paper">
            <tr className="text-[11px] text-ink-secondary">
              <th className="sticky left-0 z-10 bg-paper" />
              {periodos.map((p, i) => (
                <th
                  key={p}
                  colSpan={4}
                  className={`px-2 pt-1 text-center font-medium border-l border-line-hairline ${
                    soloLecturaPorMes[i] ? "bg-paper-cool" : ""
                  }`}
                >
                  {nombreMes(p)}
                  {soloLecturaPorMes[i] && (
                    <span className="ml-2 rounded bg-black/10 px-1.5 text-[10px] font-medium text-ink-secondary">
                      Solo lectura
                    </span>
                  )}
                  {sinPresupuesto[i] && <span className="ml-2 font-normal text-ink-muted">· sin presupuesto</span>}
                  {sinEjecucion[i] && <span className="ml-2 font-normal text-ink-muted">· sin ejecución</span>}
                </th>
              ))}
            </tr>
            <tr className="text-[10px] text-ink-faint uppercase tracking-wide">
              <th className="sticky left-0 z-10 bg-paper text-left py-1 pr-3 font-medium">Concepto</th>
              {periodos.map((p, i) => (
                <ColumnasMes key={p} atenuado={soloLecturaPorMes[i]} />
              ))}
            </tr>
          </thead>
          <tbody>
            {reporte.filas.map((f) => (
              <FilaConControl
                key={f.fila.clave}
                filaReporte={f}
                reporte={reporte}
                verPendientes={verPendientes}
                verControl={verControl}
                carga={carga}
                idsEditables={idsEditables}
                soloLecturaPorMes={soloLecturaPorMes}
              />
            ))}
          </tbody>
        </table>
      </div>

      {carga?.capital && <BloqueCapital capital={carga.capital} />}

      {flujo && (
        <AccionesFlujo
          estado={flujo.estado}
          esRevisor={flujo.esRevisor}
          revisionCompletada={flujo.revisionCompletada}
          cantidadLineas={flujo.cantidadLineas}
          ocultarEnviarARevision={avisoSoloLectura !== null}
        />
      )}
      </ConCarga>

      {verPendientes && reporte.pendientes.length > 0 && (
        <div className="mt-4 rounded-md border border-line-strong bg-paper-raised px-5 py-4">
          <p className="text-sm font-medium">Pendiente de confirmar con Kike</p>
          <ul className="mt-2 space-y-1 text-sm">
            {reporte.pendientes.map((k) => (
              <li key={k} className="flex gap-2">
                <EtiquetaPendiente codigo={k} />
                <span className="text-ink-secondary">{PENDIENTES[k]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <BloqueNoAsignado
        empresaSlug={empresaSlug}
        periodo={periodo}
        noAsignado={noAsignado}
        semanasConNoAsignado={semanasConNoAsignado}
      />
    </div>
  );
}

// Con carga activa envuelve lo que necesita el estado de las celdas editables; sin carga no
// agrega nada.
function ConCarga({
  carga,
  empresaSlug,
  periodo,
  children,
}: {
  carga: VistaCarga | null;
  empresaSlug: string;
  periodo: string;
  children: ReactNode;
}) {
  if (!carga) return <>{children}</>;
  return (
    <ProveedorCarga empresaSlug={empresaSlug} periodo={periodo} celdas={carga.celdas} huella={carga.huella}>
      {children}
    </ProveedorCarga>
  );
}

// La fila y, debajo del Total Disponibilidades, el control de arrastre (solo
// ADMIN/FINANZAS; no es una fila de la planilla).
function FilaConControl({
  filaReporte,
  reporte,
  verPendientes,
  verControl,
  carga,
  idsEditables,
  soloLecturaPorMes,
}: {
  filaReporte: FilaReporte;
  reporte: Reporte;
  verPendientes: boolean;
  verControl: boolean;
  carga: VistaCarga | null;
  idsEditables: Set<string>;
  soloLecturaPorMes: boolean[];
}) {
  const meses = reporte.periodos.length;
  const { fila } = filaReporte;
  return (
    <>
      <FilaTabla
        filaReporte={filaReporte}
        meses={meses}
        verPendientes={verPendientes}
        verControl={verControl}
        carga={carga}
        idsEditables={idsEditables}
        soloLecturaPorMes={soloLecturaPorMes}
      />
      {verControl && fila.tipo === "total" && fila.rol === "totalDisponibilidades" && (
        <tr className="bg-paper-cool text-xs italic text-ink-secondary">
          <td className="sticky left-0 z-10 bg-paper-cool py-px pr-4 whitespace-nowrap">
            Arrastre: diferencia con el cierre anterior
          </td>
          {reporte.arrastre.map((a, i) => (
            <td key={i} colSpan={4} className="py-px px-2 text-right border-l border-line-hairline">
              {a === null || a.diferencia === null ? (
                "—"
              ) : (
                <span
                  className={a.cuadra ? "" : "text-terracota"}
                  title={`Cierre real anterior ${importe(a.cierreRealAnterior ?? 0)} + ajustes ${importe(a.ajustes)} vs. total ${importe(a.totalDisponibilidades ?? 0)}`}
                >
                  {a.cuadra ? "cuadra" : "no cuadra"} · dif. {importeCentavos(a.diferencia)}
                </span>
              )}
            </td>
          ))}
        </tr>
      )}
    </>
  );
}

function ColumnasMes({ atenuado }: { atenuado: boolean }) {
  const fondo = atenuado ? " bg-paper-cool" : "";
  return (
    <>
      <th className={`text-right py-1 px-2 font-medium border-l border-line-hairline${fondo}`}>Presupuestado</th>
      <th className={`text-right py-1 px-2 font-medium${fondo}`}>Real</th>
      <th className={`text-right py-1 px-2 font-medium${fondo}`}>% Avance</th>
      <th className={`text-right py-1 px-2 font-medium${fondo}`}>Falta ejecutar</th>
    </>
  );
}

function EtiquetaPendiente({ codigo }: { codigo: keyof typeof PENDIENTES }) {
  return (
    <span
      title={PENDIENTES[codigo]}
      className="inline-block rounded px-1.5 text-[11px] font-medium leading-5 text-terracota bg-terracota-tint"
    >
      {codigo}
    </span>
  );
}

function FilaTabla({
  filaReporte,
  meses,
  verPendientes,
  verControl,
  carga,
  idsEditables,
  soloLecturaPorMes,
}: {
  filaReporte: FilaReporte;
  meses: number;
  verPendientes: boolean;
  verControl: boolean;
  carga: VistaCarga | null;
  idsEditables: Set<string>;
  soloLecturaPorMes: boolean[];
}) {
  const { fila, celdas } = filaReporte;
  if (fila.tipo === "titulo") {
    return (
      <tr className="border-t border-line-strong bg-[#D6E2F0] font-bold">
        <td className="sticky left-0 z-10 bg-[#D6E2F0] py-0.5 pr-3 text-[11px] font-bold tracking-[0.12em] uppercase">
          {fila.texto}
        </td>
        <td colSpan={meses * 4} />
      </tr>
    );
  }
  const esTotal = fila.tipo === "total";
  // Disponibilidades, Capital y Disponible no tienen % avance ni falta; Capital y
  // Disponible solo tienen P (como la planilla).
  const sinPorcentajes = fila.bloque === "DISPONIBILIDADES" || fila.tipo === "capital" || fila.tipo === "disponible";
  const soloP = fila.tipo === "capital" || fila.tipo === "disponible";
  // Carga del Presupuestado (Etapa 2): solo la columna P del ÚLTIMO mes (el de la URL). Una fila
  // de categoría es un input, o muestra por qué no se puede editar desde acá.
  // El id es "fila|…" (categoría) o "manual|…" (Presupuestado manual, Etapa 3); el Capital de
  // trabajo (Cierre) no va en la tabla: tiene su propio bloque.
  const idCelda =
    fila.tipo !== "linea"
      ? null
      : idsEditables.has(`fila|${fila.clave}`)
        ? `fila|${fila.clave}`
        : idsEditables.has(`manual|${fila.clave}`)
          ? `manual|${fila.clave}`
          : null;
  const editor = idCelda !== null ? <CeldaPresupuestoEditable id={idCelda} nombre={fila.texto.trim()} compacta /> : undefined;
  const motivo =
    carga && fila.tipo === "linea" && Object.hasOwn(carga.motivosFilas, fila.clave)
      ? carga.motivosFilas[fila.clave]
      : undefined;
  return (
    <tr className={esTotal ? "border-t border-line-strong bg-[#D9D9D9] font-bold" : "border-t border-line-hairline"}>
      <td className={`sticky left-0 z-10 py-px pr-3 whitespace-nowrap ${esTotal ? "bg-[#D9D9D9]" : "bg-paper"}`}>
        <span title={verPendientes && fila.tipo === "linea" ? fila.nota : undefined}>{fila.texto}</span>
        {fila.tipo === "linea" && (
          <MarcasFila
            fila={fila}
            verPendientes={verPendientes}
            verControl={verControl}
            conValor={celdas.some((c) => c.real !== null)}
          />
        )}
        {verPendientes &&
          (fila.tipo === "capital" || fila.tipo === "disponible") &&
          pendientesDe(fila).map((k) => (
            <span key={k} className="ml-2">
              <EtiquetaPendiente codigo={k} />
            </span>
          ))}
      </td>
      {celdas.map((c, i) => (
        <CeldasMes
          key={i}
          celda={c}
          esTotal={esTotal}
          realParcial={fila.tipo === "linea" && !!fila.parcial}
          sinPorcentajes={sinPorcentajes}
          soloP={soloP}
          atenuado={soloLecturaPorMes[i]}
          editor={i === celdas.length - 1 ? editor : undefined}
          motivo={i === celdas.length - 1 ? motivo : undefined}
        />
      ))}
    </tr>
  );
}

function MarcasFila({
  fila,
  verPendientes,
  verControl,
  conValor,
}: {
  fila: FilaLinea;
  verPendientes: boolean;
  verControl: boolean;
  conValor: boolean;
}) {
  return (
    <>
      {verPendientes &&
        pendientesDe(fila).map((k) => (
          <span key={k} className="ml-2">
            <EtiquetaPendiente codigo={k} />
          </span>
        ))}
      {verControl && fila.excluidaDelTotal && conValor && (
        <span title={fila.nota} className="ml-2 text-[11px] text-terracota">
          no suma en el total (como la planilla)
        </span>
      )}
      {fila.parcial && (
        <span title={AYUDA_PARCIAL_FILA} className="ml-2 text-[11px] text-ink-muted">
          parcial
        </span>
      )}
    </>
  );
}

function Asterisco() {
  return (
    <span title={AYUDA_PARCIAL_TOTAL} className="ml-0.5 text-terracota">
      *
    </span>
  );
}

function CeldasMes({
  celda,
  esTotal,
  realParcial,
  sinPorcentajes,
  soloP,
  atenuado,
  editor,
  motivo,
}: {
  celda: Celda;
  esTotal: boolean;
  realParcial: boolean;
  sinPorcentajes: boolean;
  soloP: boolean;
  // Mes en solo lectura: fondo apenas más oscuro (se superpone al de la fila, también en los totales).
  atenuado: boolean;
  // Carga del Presupuestado: input en lugar del número, o el motivo de solo lectura debajo de él.
  editor?: ReactNode;
  motivo?: string;
}) {
  const claseNumero = `py-px px-2 text-right tabular whitespace-nowrap${atenuado ? " bg-black/[0.06]" : ""}`;
  return (
    <>
      <td className={`${claseNumero} border-l border-line-hairline`}>
        {editor ?? (celda.presupuestado === null ? "" : importe(celda.presupuestado))}
        {!editor && esTotal && celda.presupuestoIncompleto && celda.presupuestado !== null && <Asterisco />}
        {/* Por qué no se edita desde acá: tooltip, para no agrandar la fila. */}
        {!editor && motivo && (
          <span title={motivo} aria-label={motivo} className="ml-1 cursor-help text-[10px] font-normal text-ink-muted">
            ⓘ
          </span>
        )}
      </td>
      <td className={`${claseNumero} ${realParcial ? "text-ink-muted" : ""}`}>
        {soloP ? "" : celda.real === null ? "" : importe(celda.real)}
        {esTotal && celda.realIncompleto && celda.real !== null && <Asterisco />}
      </td>
      <td className={claseNumero}>
        {soloP || sinPorcentajes ? "" : celda.avance === null ? "" : `${formatearImporte(celda.avance)}%`}
      </td>
      <td className={claseNumero}>
        {soloP || sinPorcentajes ? "" : celda.faltaEjecutar === null ? "" : importe(celda.faltaEjecutar)}
      </td>
    </>
  );
}
