import { prisma } from "@/lib/prisma";
import { resolverEmpresaPorSlug } from "@/lib/slug";
import { AccesoDenegadoError, requireAccesoEmpresa } from "@/lib/auth";
import { obtenerEjecucionPorSemana } from "@/lib/ejecucion";
import { filtroDeUnidades, mapearMovimiento } from "@/lib/ejecucionVista";
import { construirExcelMovimientos, respuestaExcel } from "@/lib/ejecucionExcel";

// Igual que la pantalla de la empresa (datos.ts): solo sus unidades (o porciones de prorrateo),
// sin saldo, mismo orden — pero toda la semana, sin paginar ni filtrar.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ empresa: string; periodo: string; numeroSemana: string }> }
) {
  const { empresa: empresaSlug, periodo, numeroSemana: numeroSemanaParam } = await params;
  const numeroSemana = Number(numeroSemanaParam);
  if (!/^\d{4}-\d{2}$/.test(periodo) || !Number.isInteger(numeroSemana) || numeroSemana < 1) {
    return new Response("Período o semana inválidos.", { status: 400 });
  }

  const empresa = await resolverEmpresaPorSlug(empresaSlug);
  if (!empresa) return new Response("No existe la empresa.", { status: 404 });
  try {
    await requireAccesoEmpresa(empresa.id);
  } catch (error) {
    if (error instanceof AccesoDenegadoError) return new Response("Sin acceso.", { status: 403 });
    throw error;
  }

  const ejecucion = await obtenerEjecucionPorSemana(periodo, numeroSemana);
  if (!ejecucion) return new Response("No existe esa semana.", { status: 404 });

  const unidades = empresa.unidadesNegocio;
  const filas = await prisma.movimientoBancario.findMany({
    where: { ejecucionId: ejecucion.id, ...filtroDeUnidades(unidades) },
    orderBy: [{ fecha: "asc" }, { id: "asc" }],
    include: { desglose: { orderBy: { createdAt: "asc" } } },
  });

  const buffer = await construirExcelMovimientos(
    filas.map((m) => mapearMovimiento(m, unidades)),
    false
  );
  return respuestaExcel(buffer, `movimientos-${empresaSlug.replace(/[^\w-]/g, "")}-${periodo}-semana-${numeroSemana}.xlsx`);
}
