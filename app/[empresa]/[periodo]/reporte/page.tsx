import type { Usuario } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolverEmpresaPorSlug } from "@/lib/slug";
import { requireAccesoEmpresa, AccesoDenegadoError, esAdminOFinanzas } from "@/lib/auth";
import { obtenerOCrearPresupuesto } from "@/lib/presupuesto";
import {
  obtenerUnidadesConEmpresa,
  calcularRealPorRubro,
  calcularRealPorClasificacion,
  calcularNoAsignadoDelExtracto,
  type NoAsignado,
} from "@/lib/reporte";
import { armarIndiceRubros, rubroDe } from "@/lib/rubros";
import { centavosDeDecimalTexto } from "@/lib/conteoMovimientos";
import { armarReporte, clasificacionesDePlantilla, periodosHasta, type Plantilla } from "@/lib/reporte/motor";
import { plantillaDeEmpresa } from "@/lib/reporte/plantillas";
import ReportePresupuestoMesAMes from "./ReportePresupuestoMesAMes";
import ReportePlantilla from "./ReportePlantilla";

type Props = {
  params: Promise<{ empresa: string; periodo: string }>;
};

const FORMATO_PERIODO = /^\d{4}-\d{2}$/;

// Cuántos meses lado a lado muestra el Reporte por plantilla: los que terminan
// en el período de la URL. Pregunta 3 del diagnóstico, todavía abierta.
const MESES_VISIBLES = 3;

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

export default async function ReportePage({ params }: Props) {
  const { empresa: empresaSlug, periodo } = await params;

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
        unidadesEmpresa={unidadesEmpresa}
        verPendientes={esAdminOFinanzas(usuario)}
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
    // Solo de los extractos de ESTA empresa (lo que el gerente ya ve en
    // Ejecución): importes cuya unidad no pertenece a ninguna empresa (SIN
    // ASIGNAR, valores viejos fuera de lista, EXPENSAS). Van en un bloque aparte,
    // sin sumarse a ningún rubro (decisión 2026-10-07).
    calcularNoAsignadoDelExtracto(empresaId, periodo, RUBROS_EGRESOS, unidadesConEmpresa),
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
  unidadesEmpresa,
  verPendientes,
}: {
  plantilla: Plantilla;
  empresaId: string;
  empresaNombre: string;
  empresaSlug: string;
  periodo: string;
  unidadesEmpresa: string[];
  verPendientes: boolean;
}) {
  const periodos = periodosHasta(periodo, MESES_VISIBLES);
  const clasificaciones = clasificacionesDePlantilla(plantilla);

  const presupuestos = await prisma.presupuestoMensual.findMany({
    where: { empresaId, periodo: { in: periodos } },
    select: { id: true, periodo: true },
  });
  const sumasPresupuesto =
    presupuestos.length === 0
      ? []
      : await prisma.lineaPresupuesto.groupBy({
          by: ["presupuestoId", "clasificacion"],
          where: { presupuestoId: { in: presupuestos.map((p) => p.id) } },
          _sum: { importe: true },
        });
  // Por período: clasificación guardada → centavos, tal como se cargó (sin
  // Math.abs). Solo los meses que tienen PresupuestoMensual.
  const presupuestoPorPeriodo = new Map<string, Map<string, number>>();
  for (const p of presupuestos) presupuestoPorPeriodo.set(p.periodo, new Map());
  const periodoDePresupuesto = new Map(presupuestos.map((p) => [p.id, p.periodo]));
  for (const s of sumasPresupuesto) {
    if (s._sum.importe === null) continue;
    const delMes = presupuestoPorPeriodo.get(periodoDePresupuesto.get(s.presupuestoId)!)!;
    delMes.set(
      s.clasificacion,
      (delMes.get(s.clasificacion) ?? 0) + centavosDeDecimalTexto(s._sum.importe.toFixed(2))
    );
  }

  const unidadesConEmpresa = await obtenerUnidadesConEmpresa();
  const [realPorPeriodo, noAsignado] = await Promise.all([
    calcularRealPorClasificacion(periodos, unidadesEmpresa, clasificaciones),
    // Mismo bloque de control que la Fase 1, para el mes de la URL.
    calcularNoAsignadoDelExtracto(empresaId, periodo, clasificaciones, unidadesConEmpresa),
  ]);

  const reporte = armarReporte(
    plantilla,
    periodos.map((p) => ({
      periodo: p,
      real: realPorPeriodo.get(p) ?? new Map(),
      presupuesto: presupuestoPorPeriodo.get(p) ?? null,
    }))
  );

  return (
    <ReportePlantilla
      empresaNombre={empresaNombre}
      empresaSlug={empresaSlug}
      periodo={periodo}
      reporte={reporte}
      verPendientes={verPendientes}
      sinUnidades={unidadesEmpresa.length === 0}
      noAsignado={noAsignado.porUnidad.map((n) => ({
        unidad: n.unidad,
        importe: Math.abs(n.centavos) / 100,
        movimientos: n.movimientos,
      }))}
      semanasConNoAsignado={noAsignado.semanas}
    />
  );
}
