import { prisma } from "@/lib/prisma";
import { obtenerUnidadesConEmpresa, contarSinUnidadEnSemana } from "@/lib/reporte";
import type { ConteosParaCierre } from "@/lib/cierreEjecucion";

// Conteos de la semana para los chequeos del cierre (reglas puras en lib/cierreEjecucion.ts).
// Todo se cuenta en la base: una semana puede traer ~16.500 filas. "Sin unidad en empresa" usa
// la misma consulta que el aviso de la pantalla (contarSinUnidadEnSemana), con las unidades de
// las empresas ACTIVAS.
export async function contarParaCierreDeSemana(ejecucionId: string): Promise<ConteosParaCierre> {
  const unidadesConEmpresa = await obtenerUnidadesConEmpresa();
  const [sinUnidad, sinClasificar, clasificacionesSugeridas, unidadesSugeridas] = await Promise.all([
    contarSinUnidadEnSemana(ejecucionId, unidadesConEmpresa),
    prisma.movimientoBancario.count({ where: { ejecucionId, ignorado: false, clasificacion: "SIN CLASIFICAR" } }),
    prisma.movimientoBancario.count({ where: { ejecucionId, ignorado: false, sugeridaPorSistema: true } }),
    prisma.movimientoBancario.count({ where: { ejecucionId, ignorado: false, unidadSugeridaPorSistema: true } }),
  ]);
  return { sinUnidad, sinClasificar, clasificacionesSugeridas, unidadesSugeridas };
}
