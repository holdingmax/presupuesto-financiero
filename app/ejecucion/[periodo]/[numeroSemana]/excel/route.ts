import { prisma } from "@/lib/prisma";
import { AccesoDenegadoError, requireVerEjecucionGlobal, veTodoEjecucion } from "@/lib/auth";
import { obtenerEjecucionPorSemana } from "@/lib/ejecucion";
import { vistaDeLaSemana, mapearMovimiento } from "@/lib/ejecucionVista";
import { hayFiltros, parsearFiltros } from "@/lib/filtrosEjecucion";
import { construirExcelMovimientos, respuestaExcel } from "@/lib/ejecucionExcel";

// Route Handler (no Server Action) por el mismo motivo que plantillas/presupuesto-excel: hay que
// devolver un archivo con Content-Disposition. Mismo permiso y mismo orden que la pantalla
// (obtenerDatosSemana), sin paginar: la lista completa que dejan los filtros de la URL (los mismos
// parámetros que la pantalla, parseados con parsearFiltros y aplicados con el mismo predicado). Sin
// filtros, es la semana entera.
export async function GET(req: Request, { params }: { params: Promise<{ periodo: string; numeroSemana: string }> }) {
  const { periodo, numeroSemana: numeroSemanaParam } = await params;
  const numeroSemana = Number(numeroSemanaParam);
  if (!/^\d{4}-\d{2}$/.test(periodo) || !Number.isInteger(numeroSemana) || numeroSemana < 1) {
    return new Response("Período o semana inválidos.", { status: 400 });
  }

  let usuario;
  try {
    usuario = await requireVerEjecucionGlobal();
  } catch (error) {
    if (error instanceof AccesoDenegadoError) return new Response("Sin acceso.", { status: 403 });
    throw error;
  }
  const verSaldo = veTodoEjecucion(usuario);

  const ejecucion = await obtenerEjecucionPorSemana(periodo, numeroSemana);
  if (!ejecucion) return new Response("No existe esa semana.", { status: 404 });

  const filtros = parsearFiltros(Object.fromEntries(new URL(req.url).searchParams));
  const [{ ids }, filas] = await Promise.all([
    vistaDeLaSemana(ejecucion.id, filtros),
    prisma.movimientoBancario.findMany({
      where: { ejecucionId: ejecucion.id },
      include: { desglose: { orderBy: { createdAt: "asc" } } },
    }),
  ]);
  const filaPorId = new Map(filas.map((m) => [m.id, m]));
  const movimientos = ids.flatMap((id) => filaPorId.get(id) ?? []).map((m) => mapearMovimiento(m, undefined, { verSaldo }));

  const buffer = await construirExcelMovimientos(movimientos, verSaldo);
  return respuestaExcel(buffer, `movimientos-${periodo}-semana-${numeroSemana}${hayFiltros(filtros) ? "-filtrado" : ""}.xlsx`);
}
