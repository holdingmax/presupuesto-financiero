import { pendientesDe, type Celda, type FilaLinea, type FilaReporte, type Reporte } from "@/lib/reporte/motor";
import { PENDIENTES } from "@/lib/reporte/pendientes";
import { formatearImporte } from "@/app/ejecucion/formato";
import Link from "next/link";
import BloqueNoAsignado from "./BloqueNoAsignado";

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
  // ADMIN o FINANZAS: ven las etiquetas K, la lista de pendientes y la etiqueta
  // "carga manual – próximamente". El resto ve "—" donde falta el dato.
  verPendientes: boolean;
  // ADMIN o FINANZAS: control de arrastre, marcas de la planilla y link a la carga.
  verControl: boolean;
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
  sinUnidades,
  noAsignado,
  semanasConNoAsignado,
}: Props) {
  const { periodos, sinPresupuesto, sinEjecucion } = reporte;
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-10">
      <div className="mb-8">
        <p className="flex items-center gap-2 text-xs tracking-[0.15em] text-ink-secondary uppercase">
          <span className="h-2 w-2 bg-plata" />
          {empresaNombre} · {nombreMes(periodos[0])} a {nombreMes(periodos[periodos.length - 1])}
        </p>
        <h1 className="mt-1 text-4xl font-serif font-semibold tracking-tight">Presupuesto financiero</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Presupuestado vs. real ejecutado (semanas cerradas de Ejecución), en pesos. El real suma
          los movimientos de las unidades de negocio de esta empresa, de cualquier extracto del
          período. Disponibilidades, Resultado FCI y demás valores tipeados se cargan a mano.
        </p>
        {verControl && (
          <Link
            href={`/${empresaSlug}/${periodo}/reporte/carga`}
            className="mt-3 inline-block rounded-md border border-line-strong px-3 py-1.5 text-sm hover:bg-paper-raised"
          >
            Cargar valores del mes
          </Link>
        )}
      </div>

      {sinUnidades && (
        <p className="mb-6 text-sm text-terracota bg-terracota-tint rounded-md px-3 py-2">
          Esta empresa no tiene unidades de negocio asignadas, así que el real va a dar 0. Un
          administrador las asigna en Administración → Unidades de negocio.
        </p>
      )}

      <div className="overflow-x-auto border-t border-line-strong">
        <table className="w-max min-w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-secondary">
              <th className="sticky left-0 z-10 bg-paper" />
              {periodos.map((p, i) => (
                <th key={p} colSpan={4} className="pt-2 px-3 text-center font-medium border-l border-line-hairline">
                  {nombreMes(p)}
                  {sinPresupuesto[i] && <span className="ml-2 font-normal text-ink-muted">· sin presupuesto</span>}
                  {sinEjecucion[i] && <span className="ml-2 font-normal text-ink-muted">· sin ejecución</span>}
                </th>
              ))}
            </tr>
            <tr className="text-xs text-ink-faint uppercase tracking-wide">
              <th className="sticky left-0 z-10 bg-paper text-left py-2 pr-3 font-medium">Concepto</th>
              {periodos.map((p) => (
                <ColumnasMes key={p} />
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
              />
            ))}
          </tbody>
        </table>
      </div>

      {verPendientes && reporte.pendientes.length > 0 && (
        <div className="mt-8 rounded-md border border-line-strong bg-paper-raised px-5 py-4">
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

// La fila y, debajo del Total Disponibilidades, el control de arrastre (solo
// ADMIN/FINANZAS; no es una fila de la planilla).
function FilaConControl({
  filaReporte,
  reporte,
  verPendientes,
  verControl,
}: {
  filaReporte: FilaReporte;
  reporte: Reporte;
  verPendientes: boolean;
  verControl: boolean;
}) {
  const meses = reporte.periodos.length;
  const { fila } = filaReporte;
  return (
    <>
      <FilaTabla filaReporte={filaReporte} meses={meses} verPendientes={verPendientes} verControl={verControl} />
      {verControl && fila.tipo === "total" && fila.rol === "totalDisponibilidades" && (
        <tr className="bg-paper-cool text-xs italic text-ink-secondary">
          <td className="sticky left-0 z-10 bg-paper-cool py-1 pr-4 whitespace-nowrap">
            Arrastre: diferencia con el cierre anterior
          </td>
          {reporte.arrastre.map((a, i) => (
            <td key={i} colSpan={4} className="py-1 px-3 text-right border-l border-line-hairline">
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

function ColumnasMes() {
  return (
    <>
      <th className="text-right py-2 px-3 font-medium border-l border-line-hairline">Presupuestado</th>
      <th className="text-right py-2 px-3 font-medium">Real</th>
      <th className="text-right py-2 px-3 font-medium">% Avance</th>
      <th className="text-right py-2 px-3 font-medium">Falta ejecutar</th>
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
}: {
  filaReporte: FilaReporte;
  meses: number;
  verPendientes: boolean;
  verControl: boolean;
}) {
  const { fila, celdas } = filaReporte;
  if (fila.tipo === "titulo") {
    return (
      <tr className="border-t border-line-strong">
        <td className="sticky left-0 z-10 bg-paper pt-5 pb-1 pr-3 text-xs font-semibold tracking-[0.15em] uppercase">
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
  return (
    <tr className={esTotal ? "border-t border-line-strong font-semibold" : "border-t border-line-hairline"}>
      <td className="sticky left-0 z-10 bg-paper py-1.5 pr-4 whitespace-nowrap">
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
}: {
  celda: Celda;
  esTotal: boolean;
  realParcial: boolean;
  sinPorcentajes: boolean;
  soloP: boolean;
}) {
  const claseNumero = "py-1.5 px-3 text-right tabular whitespace-nowrap";
  return (
    <>
      <td className={`${claseNumero} border-l border-line-hairline`}>
        {celda.presupuestado === null ? "—" : importe(celda.presupuestado)}
        {esTotal && celda.presupuestoIncompleto && celda.presupuestado !== null && <Asterisco />}
      </td>
      <td className={`${claseNumero} ${realParcial ? "text-ink-muted" : ""}`}>
        {soloP ? "" : celda.real === null ? "—" : importe(celda.real)}
        {esTotal && celda.realIncompleto && celda.real !== null && <Asterisco />}
      </td>
      <td className={claseNumero}>
        {soloP || sinPorcentajes ? "" : celda.avance === null ? "—" : `${formatearImporte(celda.avance)}%`}
      </td>
      <td className={claseNumero}>
        {soloP || sinPorcentajes ? "" : celda.faltaEjecutar === null ? "—" : importe(celda.faltaEjecutar)}
      </td>
    </>
  );
}
