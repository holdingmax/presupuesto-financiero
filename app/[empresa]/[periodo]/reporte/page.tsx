import type { Usuario } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MOSTRAR_PENDIENTES_EN_REPORTE } from "@/lib/config";
import { resolverEmpresaPorSlug } from "@/lib/slug";
import {
  requireAccesoEmpresa,
  AccesoDenegadoError,
  esAdminOFinanzas,
  puedeRevisarPresupuesto,
  veBloquesReservadosDelReporte,
} from "@/lib/auth";
import { obtenerOCrearPresupuesto } from "@/lib/presupuesto";
import { avisoPeriodoSoloLectura, esPeriodoHabilitado } from "@/lib/periodosHabilitados";
import { cargaEnReporteActiva, mostrarFlujoEnReporte, puedeEditarPresupuestoAhora } from "@/lib/estadoPresupuesto";
import { capitalSugerido, planDeCarga, vistaDeCarga, type VistaCarga } from "@/lib/reporte/cargaGerente";
import { leerLineasParaCarga, leerValoresManualesParaCarga } from "@/lib/reporte/aplicarCarga";
import { obtenerEstadoFlujo, type EstadoFlujo } from "@/lib/presupuestoAcceso";
import {
  obtenerUnidadesConEmpresa,
  calcularRealPorRubro,
  calcularNoAsignadoDelPeriodo,
  type NoAsignado,
} from "@/lib/reporte";
import { armarIndiceRubros, rubroDe } from "@/lib/rubros";
import { centavosDeDecimalTexto } from "@/lib/conteoMovimientos";
import { armarReporte, clasificacionesDePlantilla, periodosHasta, type Plantilla } from "@/lib/reporte/motor";
import { plantillaDeEmpresa } from "@/lib/reporte/plantillas";
import ReportePresupuestoMesAMes from "./ReportePresupuestoMesAMes";
import { cargarDatosMeses } from "@/lib/reporte/cargarMeses";
import ReportePlantilla from "./ReportePlantilla";
import PeriodoSelector from "../presupuesto/PeriodoSelector";
import { ocultaPestanaPresupuesto } from "@/lib/navegacionEmpresa";
import { cantidadDeMeses, resolverVista, type VistaReporte } from "@/lib/reporte/vistaReporte";
import VistaSelector from "./VistaSelector";

type Props = {
  params: Promise<{ empresa: string; periodo: string }>;
  searchParams: Promise<{ vista?: string | string[] }>;
};

const FORMATO_PERIODO = /^\d{4}-\d{2}$/;

// Fase 1 del reporte "PRESUPUESTO MES A MES": solo la sección de Egresos —
// los rubros que matchean limpio contra LineaPresupuesto/MovimientoBancario
// (ver diagnóstico previo, archivo real PF - BRILLANTE - AGOSTO 2026.xlsx).
// Disponibilidades e Ingresos quedan para una Fase 2 — no hay modelo de
// datos hoy que las sostenga, así que no van ni como input visual sin
// persistir (evita la falsa expectativa de "esto se guarda").
//
// Lista fija, confirmada — cada exclusión tiene un motivo ya diagnosticado,
// no es un olvido: IVA (signo real inconsistente por rubro, pendiente de
// confirmar con Macchi), CH DIFERIDOS IVA/DEP CH 3° (más tesorería que
// egreso operativo), COBRANZAS (es ingreso), COM Y GTOS BRIOS/AVION/CAMPO/
// JPS/FCI/INVERSIONES (signo real no verificado o son unidades de negocio,
// no rubros de egreso genérico).
const RUBROS_EGRESOS = [
  "SUELDOS",
  "SAC",
  "IMP Y PREVISIONALES",
  "PROV Y SERV",
  "EXPENSAS",
  "Gastos bancarios",
  "Prestamos y tarjetas",
  "CHEQUES DIFERIDOS",
  "COMISIONES ESPECIALES",
  "OTROS",
  "PAGOS ESPECIALES",
  "Liquidación final",
] as const;

export default async function ReportePage({ params, searchParams }: Props) {
  const { empresa: empresaSlug, periodo } = await params;
  const { vista: vistaPedida } = await searchParams;

  let empresaNombre: string;
  let empresaId: string;
  let unidadesEmpresa: string[];
  let usuario: Usuario;
  try {
    const empresa = await resolverEmpresaPorSlug(empresaSlug);
    if (!empresa) {
      throw new Error(`No existe una empresa para "${empresaSlug}".`);
    }
    usuario = await requireAccesoEmpresa(empresa.id);
    empresaNombre = empresa.nombre;
    empresaId = empresa.id;
    unidadesEmpresa = empresa.unidadesNegocio;
  } catch (error) {
    // Ver el comentario equivalente en presupuesto/page.tsx: el layout ya
    // muestra su propio panel de "sin acceso", esto solo evita que se vea
    // como un error sin manejar cuando el chequeo defensivo vuelve a fallar
    // acá (Next resuelve esta página en paralelo con el layout).
    if (error instanceof AccesoDenegadoError) return null;
    throw error;
  }

  // Etapa 2a: las 7 empresas con plantilla (réplica del PF de Macchi) toman el
  // camino nuevo; el resto sigue con la Fase 1 tal cual.
  const plantilla = plantillaDeEmpresa(empresaSlug);
  if (plantilla) {
    // El layout ya muestra el aviso de período inválido; acá solo se evita
    // calcular meses a partir de un texto que no es AAAA-MM.
    if (!FORMATO_PERIODO.test(periodo)) return null;
    return (
      <ReportePorPlantilla
        plantilla={plantilla}
        empresaId={empresaId}
        empresaNombre={empresaNombre}
        empresaSlug={empresaSlug}
        periodo={periodo}
        vista={resolverVista(vistaPedida, esAdminOFinanzas(usuario))}
        unidadesEmpresa={unidadesEmpresa}
        verPendientes={esAdminOFinanzas(usuario) && MOSTRAR_PENDIENTES_EN_REPORTE}
        verControl={esAdminOFinanzas(usuario)}
        verBloquesReservados={veBloquesReservadosDelReporte(usuario)}
        usuario={usuario}
      />
    );
  }

  const presupuestoId = (await obtenerOCrearPresupuesto(empresaId, periodo)).id;

  // PRESUPUESTADO: suma de LineaPresupuesto por RUBRO, sin importar el signo con
  // el que se haya cargado (ver diagnóstico: hoy el 100% de las líneas reales se
  // guardan en positivo, pero esto no depende de eso). Cada clasificación
  // guardada se asigna a su rubro con la tabla de equivalencias (lib/rubros.ts)
  // — la misma que usa el REAL, así presupuestado y real se emparejan aunque
  // Presupuesto y Ejecución guarden strings distintos para el mismo concepto.
  // Sumado en centavos (texto exacto de la base, sin float).
  const indiceRubros = armarIndiceRubros(RUBROS_EGRESOS);
  const sumasPresupuestadas = await prisma.lineaPresupuesto.groupBy({
    by: ["clasificacion"],
    where: { presupuestoId },
    _sum: { importe: true },
  });
  const presupuestadoCentavos = new Map<string, number>();
  for (const s of sumasPresupuestadas) {
    const rubro = rubroDe(indiceRubros, s.clasificacion);
    if (!rubro || s._sum.importe === null) continue;
    presupuestadoCentavos.set(
      rubro,
      (presupuestadoCentavos.get(rubro) ?? 0) + centavosDeDecimalTexto(s._sum.importe.toFixed(2))
    );
  }
  const presupuestadoPorClasificacion = new Map<string, number>();
  for (const [rubro, centavos] of presupuestadoCentavos) {
    presupuestadoPorClasificacion.set(rubro, Math.abs(centavos) / 100);
  }

  // REAL por UNIDAD DE NEGOCIO, no por empresa del extracto (ver lib/reporte.ts):
  // movimientos de CUALQUIER empresa del período cuya unidad pertenece a esta
  // empresa, más las porciones de prorrateo de esta empresa. Solo semanas
  // CERRADAS (una semana abierta es provisoria) e ignorado:false — mismo criterio
  // que antes. Sumado en la base (numeric exacto) y devuelto en centavos.
  const unidadesConEmpresa = await obtenerUnidadesConEmpresa();
  const [realPorRubro, noAsignado] = await Promise.all([
    calcularRealPorRubro(periodo, unidadesEmpresa, RUBROS_EGRESOS),
    // Importes del período cuya unidad no pertenece a ninguna empresa (SIN ASIGNAR,
    // valores viejos fuera de lista). Van en un bloque aparte, sin sumarse a ningún
    // rubro (decisión 2026-10-07). Es de todo el holding: solo ADMIN y FINANZAS lo
    // reciben; para el resto ni siquiera se consulta.
    esAdminOFinanzas(usuario)
      ? calcularNoAsignadoDelPeriodo(periodo, RUBROS_EGRESOS, unidadesConEmpresa)
      : Promise.resolve({ porUnidad: [] as NoAsignado[], semanas: [] as number[] }),
  ]);
  // Mismo criterio que antes para mostrar: magnitud del neto del rubro, en pesos.
  const realPorClasificacion = new Map<string, number>();
  for (const [clasificacion, centavos] of realPorRubro) {
    realPorClasificacion.set(clasificacion, Math.abs(centavos) / 100);
  }
  const noAsignadoPesos: (NoAsignado & { pesos: number })[] = noAsignado.porUnidad.map((n) => ({
    ...n,
    pesos: Math.abs(n.centavos) / 100,
  }));

  // Unión, no intersección: un rubro con REAL pero sin ninguna línea de
  // presupuesto ese mes igual tiene que aparecer (con presupuestado en $0),
  // no quedar oculto por no tener línea cargada.
  const filas = RUBROS_EGRESOS.map((clasificacion) => ({
    clasificacion,
    presupuestado: presupuestadoPorClasificacion.get(clasificacion) ?? 0,
    real: realPorClasificacion.get(clasificacion) ?? 0,
  }));

  return (
    <ReportePresupuestoMesAMes
      empresaNombre={empresaNombre}
      empresaSlug={empresaSlug}
      periodo={periodo}
      filas={filas}
      sinUnidades={unidadesEmpresa.length === 0}
      noAsignado={noAsignadoPesos.map((n) => ({ unidad: n.unidad, importe: n.pesos, movimientos: n.movimientos }))}
      semanasConNoAsignado={noAsignado.semanas}
    />
  );
}

// Reporte por plantilla (Etapa 2a, docs/reporte_etapa2a_plan.md): varios meses
// lado a lado. Solo lee: el presupuesto de cada mes se busca sin crearlo (un mes
// sin PresupuestoMensual se muestra "sin presupuesto"), y el Real de todos los
// meses sale de una sola consulta.
async function ReportePorPlantilla({
  plantilla,
  empresaId,
  empresaNombre,
  empresaSlug,
  periodo,
  vista,
  unidadesEmpresa,
  verPendientes,
  verControl,
  verBloquesReservados,
  usuario,
}: {
  plantilla: Plantilla;
  empresaId: string;
  empresaNombre: string;
  empresaSlug: string;
  periodo: string;
  // Cuántos meses se muestran (lib/reporte/vistaReporte.ts); el selector de mes elige el último.
  vista: VistaReporte;
  unidadesEmpresa: string[];
  verPendientes: boolean;
  verControl: boolean;
  // false = no recibe Disponibilidades ni Cierre (se filtra acá, en el servidor).
  verBloquesReservados: boolean;
  usuario: Usuario;
}) {
  // Estado y botones del flujo de Presupuesto (Enviar a revisión, Terminé de revisar, Pedir
  // cambios, Confirmar versión final) para el mes de la URL. ADMIN, FINANZAS y revisores lo
  // ven siempre; el gerente solo si su empresa está en EMPRESAS_CON_CARGA_EN_REPORTE. Solo
  // lee: no crea el PresupuestoMensual del mes.
  const esRevisor = await puedeRevisarPresupuesto(usuario, empresaId);
  const flujo: EstadoFlujo | null = mostrarFlujoEnReporte({
    esAdminOFinanzas: esAdminOFinanzas(usuario),
    esRevisor,
    cargaActiva: cargaEnReporteActiva(empresaSlug),
    periodoHabilitado: esPeriodoHabilitado(periodo),
  })
    ? await obtenerEstadoFlujo(empresaId, periodo, esRevisor)
    : null;

  // Cartel de solo lectura: solo con la carga activa para la empresa (sin ella el Reporte ya es de
  // solo lectura para el gerente y el cartel confundiría). null = editable o sin cartel.
  const avisoSoloLectura = cargaEnReporteActiva(empresaSlug)
    ? avisoPeriodoSoloLectura(periodo, esAdminOFinanzas(usuario))
    : null;

  // Un mes más de contexto (no se muestra): el control de arrastre y los espejos del mes
  // anterior lo necesitan para el primer mes visible.
  const periodos = periodosHasta(periodo, cantidadDeMeses(vista, periodo, esAdminOFinanzas(usuario)) + 1);
  const clasificaciones = clasificacionesDePlantilla(plantilla);

  const unidadesConEmpresa = await obtenerUnidadesConEmpresa();
  const [meses, noAsignado] = await Promise.all([
    cargarDatosMeses(empresaId, unidadesEmpresa, plantilla, periodos, verBloquesReservados),
    // Mismo bloque de control que la Fase 1, para el mes de la URL (de todo el holding:
    // solo ADMIN y FINANZAS).
    verBloquesReservados
      ? calcularNoAsignadoDelPeriodo(periodo, clasificaciones, unidadesConEmpresa)
      : Promise.resolve({ porUnidad: [] as NoAsignado[], semanas: [] as number[] }),
  ]);
  const reporte = armarReporte(plantilla, meses, 1, { verBloquesReservados });

  // Carga del Presupuestado en el Reporte (Etapas 2 y 3): solo con el interruptor de la empresa
  // prendido, el flujo visible (eso ya cubre el período habilitado) y un estado en el que este
  // usuario puede editar (ABIERTO; EN_REVISION solo el revisor; VALIDADO nadie). Solo lee: el
  // PresupuestoMensual del mes se crea recién en el primer guardado.
  let carga: VistaCarga | null = null;
  if (
    flujo &&
    avisoSoloLectura === null &&
    cargaEnReporteActiva(empresaSlug) &&
    puedeEditarPresupuestoAhora(flujo.estado, flujo.esRevisor)
  ) {
    const [lineas, valoresManuales] = await Promise.all([
      leerLineasParaCarga(empresaId, periodo),
      leerValoresManualesParaCarga(empresaId, periodo),
    ]);
    const plan = planDeCarga(plantilla, lineas, valoresManuales);
    // Sugerencia del Capital de trabajo (cuando tiene fórmula): la misma cuenta del motor sobre los
    // Presupuestados de las filas visibles del último mes. Esas filas no son de bloques reservados.
    const ultimo = reporte.periodos.length - 1;
    const sugerido =
      plan.capital?.regla && !reporte.sinPresupuesto[ultimo]
        ? capitalSugerido(
            plan.capital.regla,
            (clave) => reporte.filas.find((f) => f.fila.clave === clave)?.celdas[ultimo]?.presupuestado ?? null
          )
        : null;
    carga = vistaDeCarga(plan, sugerido);
  }

  return (
    <>
      {/* Sin la pestaña Presupuesto el gerente no tiene otro selector de mes (ver lib/navegacionEmpresa.ts). */}
      {ocultaPestanaPresupuesto(esAdminOFinanzas(usuario), empresaSlug) && (
        <PeriodoSelector empresaSlug={empresaSlug} periodo={periodo} segmento="reporte" vista={vista} compacto />
      )}
      <VistaSelector empresaSlug={empresaSlug} periodo={periodo} vista={vista} />
    <ReportePlantilla
      empresaNombre={empresaNombre}
      empresaSlug={empresaSlug}
      periodo={periodo}
      reporte={reporte}
      verPendientes={verPendientes}
      verControl={verControl}
      flujo={flujo}
      carga={carga}
      avisoSoloLectura={avisoSoloLectura}
      sinUnidades={unidadesEmpresa.length === 0}
      noAsignado={noAsignado.porUnidad.map((n) => ({
        unidad: n.unidad,
        importe: Math.abs(n.centavos) / 100,
        movimientos: n.movimientos,
      }))}
      semanasConNoAsignado={noAsignado.semanas}
    />
    </>
  );
}
