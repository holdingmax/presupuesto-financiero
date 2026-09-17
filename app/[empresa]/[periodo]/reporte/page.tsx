import { prisma } from "@/lib/prisma";
import { resolverEmpresaPorSlug } from "@/lib/slug";
import { requireAccesoEmpresa, AccesoDenegadoError } from "@/lib/auth";
import { obtenerOCrearPresupuesto } from "@/lib/presupuesto";
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
  let presupuestoId: string;
  try {
    const empresa = await resolverEmpresaPorSlug(empresaSlug);
    if (!empresa) {
      throw new Error(`No existe una empresa para "${empresaSlug}".`);
    }
    await requireAccesoEmpresa(empresa.id);
    const presupuesto = await obtenerOCrearPresupuesto(empresa.id, periodo);
    empresaNombre = empresa.nombre;
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

  // REAL: solo semanas CERRADAS (una semana abierta es provisoria, mismo
  // criterio que ya usa calcularChequeosSumaCero/obtenerDatosSemana en
  // Ejecución) e ignorado:false (una fila ignorada no debe pesar en ningún
  // cálculo, mismo criterio en todo el sistema).
  const semanasCerradas = await prisma.ejecucionSemanal.findMany({
    where: { presupuestoId, estado: "CERRADA" },
    select: { id: true },
  });
  const idsSemanasCerradas = semanasCerradas.map((s) => s.id);

  const sumasReales =
    idsSemanasCerradas.length > 0
      ? await prisma.movimientoBancario.groupBy({
          by: ["clasificacion"],
          where: { ejecucionId: { in: idsSemanasCerradas }, ignorado: false },
          _sum: { importe: true },
        })
      : [];
  const realPorClasificacion = new Map<string, number>();
  for (const s of sumasReales) {
    realPorClasificacion.set(s.clasificacion, Math.abs(Number(s._sum.importe ?? 0)));
  }

  // Unión, no intersección: un rubro con REAL pero sin ninguna línea de
  // presupuesto ese mes igual tiene que aparecer (con presupuestado en $0),
  // no quedar oculto por no tener línea cargada.
  const filas = RUBROS_EGRESOS.map((clasificacion) => ({
    clasificacion,
    presupuestado: presupuestadoPorClasificacion.get(clasificacion) ?? 0,
    real: realPorClasificacion.get(clasificacion) ?? 0,
  }));

  return <ReportePresupuestoMesAMes empresaNombre={empresaNombre} periodo={periodo} filas={filas} />;
}
