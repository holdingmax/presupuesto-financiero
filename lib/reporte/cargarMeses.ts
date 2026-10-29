import { prisma } from "@/lib/prisma";
import { centavosDeDecimalTexto } from "@/lib/conteoMovimientos";
import { calcularRealPorClasificacion, contarSemanasCerradasPorPeriodo } from "@/lib/reporte";
import { clasificacionesDePlantilla, clavesCalculables, type AccesoReservados, type DatosMes, type Plantilla } from "@/lib/reporte/motor";
import { leerManuales, mesesCerrados } from "@/lib/reporte/valoresManuales";

// Arma los DatosMes de una empresa para los períodos pedidos: solo lee. El presupuesto de
// cada mes se busca sin crearlo (un mes sin PresupuestoMensual queda en null), y el Real de
// todos los meses sale de una sola consulta. Lo usan el Reporte y la pantalla de carga.
export async function cargarDatosMeses(
  empresaId: string,
  unidadesEmpresa: string[],
  plantilla: Plantilla,
  periodos: string[],
  // false = quien mira no ve Disponibilidades ni Cierre: no se leen sus valores manuales. Un objeto =
  // solo se leen los de los bloques que ve (el gerente con interruptores prendidos).
  verReservado: AccesoReservados = true
): Promise<DatosMes[]> {
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
  // Por período: clasificación guardada → centavos, tal como se cargó (sin Math.abs).
  const presupuestoPorPeriodo = new Map<string, Map<string, number>>();
  for (const p of presupuestos) presupuestoPorPeriodo.set(p.periodo, new Map());
  const periodoDePresupuesto = new Map(presupuestos.map((p) => [p.id, p.periodo]));
  for (const s of sumasPresupuesto) {
    if (s._sum.importe === null) continue;
    const delMes = presupuestoPorPeriodo.get(periodoDePresupuesto.get(s.presupuestoId)!)!;
    delMes.set(s.clasificacion, (delMes.get(s.clasificacion) ?? 0) + centavosDeDecimalTexto(s._sum.importe.toFixed(2)));
  }

  const [realPorPeriodo, semanasCerradas, manuales, cerrados] = await Promise.all([
    calcularRealPorClasificacion(periodos, unidadesEmpresa, clasificaciones),
    contarSemanasCerradasPorPeriodo(periodos),
    leerManuales(empresaId, periodos, verReservado === true ? undefined : clavesCalculables(plantilla, verReservado)),
    mesesCerrados(periodos),
  ]);
  return periodos.map((p) => ({
    periodo: p,
    real: realPorPeriodo.get(p)?.neto ?? new Map(),
    realCreditos: realPorPeriodo.get(p)?.creditos,
    realDebitos: realPorPeriodo.get(p)?.debitos,
    presupuesto: presupuestoPorPeriodo.get(p) ?? null,
    semanasCerradas: semanasCerradas.get(p) ?? 0,
    mesCerrado: cerrados.get(p) ?? false,
    manuales: manuales.get(p),
  }));
}
