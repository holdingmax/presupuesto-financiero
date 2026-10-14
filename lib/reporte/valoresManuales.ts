import { prisma } from "@/lib/prisma";
import { centavosDeDecimalTexto } from "@/lib/conteoMovimientos";
import type { DatosMes } from "@/lib/reporte/motor";
import { esMesCerrado, periodoActual, type EstadoSemanas } from "@/lib/reporte/bloqueo";

// Lectura de los ValorManualReporte (docs/reporte_etapa2b_plan.md §7.1): filaClave →
// centavos por columna, para los períodos pedidos de UNA empresa.
export async function leerManuales(
  empresaId: string,
  periodos: string[]
): Promise<Map<string, NonNullable<DatosMes["manuales"]>>> {
  const resultado = new Map<string, NonNullable<DatosMes["manuales"]>>(
    periodos.map((p) => [p, { presupuesto: new Map(), real: new Map() }])
  );
  const filas = await prisma.valorManualReporte.findMany({
    where: { empresaId, periodo: { in: periodos } },
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

// Semanas ABIERTAS y CERRADAS de Ejecución de ESTA empresa por período.
export async function semanasDeEmpresa(empresaId: string, periodos: string[]): Promise<Map<string, EstadoSemanas>> {
  const resultado = new Map<string, EstadoSemanas>(periodos.map((p) => [p, { abiertas: 0, cerradas: 0 }]));
  const filas = await prisma.ejecucionSemanal.findMany({
    where: { presupuesto: { empresaId, periodo: { in: periodos } } },
    select: { estado: true, presupuesto: { select: { periodo: true } } },
  });
  for (const f of filas) {
    const s = resultado.get(f.presupuesto.periodo);
    if (!s) continue;
    if (f.estado === "ABIERTA") s.abiertas++;
    else s.cerradas++;
  }
  return resultado;
}

export async function mesesCerrados(empresaId: string, periodos: string[]): Promise<Map<string, boolean>> {
  const semanas = await semanasDeEmpresa(empresaId, periodos);
  const actual = periodoActual();
  return new Map(periodos.map((p) => [p, esMesCerrado(p, actual, semanas.get(p)!)]));
}
