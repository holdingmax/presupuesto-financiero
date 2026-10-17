import { prisma } from "@/lib/prisma";
import { centavosDeDecimalTexto } from "@/lib/conteoMovimientos";
import type { DatosMes } from "@/lib/reporte/motor";
import { esMesCerrado, periodoActual, type EstadoSemanas } from "@/lib/reporte/bloqueo";

// Lectura de los ValorManualReporte (docs/reporte_etapa2b_plan.md §7.1): filaClave →
// centavos por columna, para los períodos pedidos de UNA empresa. `clavesPermitidas`: si viene,
// solo se leen esas filas (el Reporte de quien no ve Disponibilidades ni Cierre no lee ni
// siquiera los valores de esos bloques).
export async function leerManuales(
  empresaId: string,
  periodos: string[],
  clavesPermitidas?: ReadonlySet<string>
): Promise<Map<string, NonNullable<DatosMes["manuales"]>>> {
  const resultado = new Map<string, NonNullable<DatosMes["manuales"]>>(
    periodos.map((p) => [p, { presupuesto: new Map(), real: new Map() }])
  );
  const filas = await prisma.valorManualReporte.findMany({
    where: {
      empresaId,
      periodo: { in: periodos },
      ...(clavesPermitidas ? { filaClave: { in: Array.from(clavesPermitidas) } } : {}),
    },
    select: { periodo: true, filaClave: true, columna: true, importe: true },
  });
  for (const f of filas) {
    const delMes = resultado.get(f.periodo);
    if (!delMes) continue;
    const centavos = centavosDeDecimalTexto(f.importe.toFixed(2));
    (f.columna === "PRESUPUESTADO" ? delMes.presupuesto : delMes.real).set(f.filaClave, centavos);
  }
  return resultado;
}

// Semanas ABIERTAS y CERRADAS de Ejecución por período, de TODO el holding (D-5, Ejecución
// global: las semanas son del período, no de la empresa).
export async function semanasDelPeriodo(periodos: string[]): Promise<Map<string, EstadoSemanas>> {
  const resultado = new Map<string, EstadoSemanas>(periodos.map((p) => [p, { abiertas: 0, cerradas: 0 }]));
  const filas = await prisma.ejecucionSemanal.groupBy({
    by: ["periodo", "estado"],
    where: { periodo: { in: periodos } },
    _count: true,
  });
  for (const f of filas) {
    const s = resultado.get(f.periodo);
    if (!s) continue;
    if (f.estado === "ABIERTA") s.abiertas += f._count;
    else s.cerradas += f._count;
  }
  return resultado;
}

export async function mesesCerrados(periodos: string[]): Promise<Map<string, boolean>> {
  const semanas = await semanasDelPeriodo(periodos);
  const actual = periodoActual();
  return new Map(periodos.map((p) => [p, esMesCerrado(p, actual, semanas.get(p)!)]));
}
