import { prisma } from "@/lib/prisma";
import { resolverEmpresaPorSlug } from "@/lib/slug";
import { requireAccesoEmpresa, AccesoDenegadoError } from "@/lib/auth";
import { obtenerOCrearPresupuesto } from "@/lib/presupuesto";
import {
  obtenerUnidadesConEmpresa,
  calcularRealPorRubro,
  calcularNoAsignadoDelExtracto,
  type NoAsignado,
} from "@/lib/reporte";
import ReportePresupuestoMesAMes from "./ReportePresupuestoMesAMes";

type Props = {
  params: Promise<{ empresa: string; periodo: string }>;
};

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
  let presupuestoId: string;
  try {
    const empresa = await resolverEmpresaPorSlug(empresaSlug);
    if (!empresa) {
      throw new Error(`No existe una empresa para "${empresaSlug}".`);
    }
    await requireAccesoEmpresa(empresa.id);
    const presupuesto = await obtenerOCrearPresupuesto(empresa.id, periodo);
    empresaNombre = empresa.nombre;
    empresaId = empresa.id;
    unidadesEmpresa = empresa.unidadesNegocio;
    presupuestoId = presupuesto.id;
  } catch (error) {
    // Ver el comentario equivalente en presupuesto/page.tsx: el layout ya
    // muestra su propio panel de "sin acceso", esto solo evita que se vea
    // como un error sin manejar cuando el chequeo defensivo vuelve a fallar
    // acá (Next resuelve esta página en paralelo con el layout).
    if (error instanceof AccesoDenegadoError) return null;
    throw error;
  }

  // PRESUPUESTADO: suma de LineaPresupuesto por clasificación técnica, sin
  // importar el signo con el que se haya cargado (ver diagnóstico: hoy el
  // 100% de las líneas reales se guardan en positivo, pero esto no depende
  // de eso).
  const sumasPresupuestadas = await prisma.lineaPresupuesto.groupBy({
    by: ["clasificacion"],
    where: { presupuestoId },
    _sum: { importe: true },
  });
  const presupuestadoPorClasificacion = new Map<string, number>();
  for (const s of sumasPresupuestadas) {
    presupuestadoPorClasificacion.set(s.clasificacion, Math.abs(Number(s._sum.importe ?? 0)));
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
