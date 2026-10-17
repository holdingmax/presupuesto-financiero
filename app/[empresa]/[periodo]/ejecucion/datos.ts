import { prisma } from "@/lib/prisma";
import { resolverEmpresaPorSlug } from "@/lib/slug";
import { requireAccesoEmpresa, puedeOperarEjecucionGlobal, veTodoEjecucion } from "@/lib/auth";
import { obtenerEjecucionPorSemana, obtenerUltimaEjecucion } from "@/lib/ejecucion";
import {
  FILAS_POR_PAGINA,
  filtroDeUnidades,
  mapearMovimiento,
  sumarImporteDeUnidades,
} from "@/lib/ejecucionVista";

// Pestaña "Ejecución financiera" de cada empresa (docs/ejecucion_global_plan.md §3.4 y §6): SOLO
// LECTURA y filtrada. Ejecución se opera en el módulo global (/ejecucion); acá se ve, de cada
// semana del período, únicamente lo que es de esta empresa: los movimientos cuya unidad (o porción
// de prorrateo) pertenece a ella, vengan de la cuenta que vengan. Sin saldo (el campo no existe en
// lo que se devuelve), sin movimientos de otras unidades. Todo se filtra en la consulta, no en
// pantalla — también para ADMIN y FINANZAS, que ven todo en el módulo global.
//
// No es un archivo "use server": solo lo importan las páginas (servidor), no se expone como
// endpoint. Nunca crea nada.

const FORMATO_PERIODO = /^\d{4}-\d{2}$/;

async function resolverEmpresaParaLeer(empresaSlug: string, periodo: string) {
  const empresa = await resolverEmpresaPorSlug(empresaSlug);
  if (!empresa) {
    throw new Error(`No existe una empresa para "${empresaSlug}".`);
  }
  if (!FORMATO_PERIODO.test(periodo)) {
    throw new Error(`"${periodo}" no es un período válido (AAAA-MM).`);
  }
  const usuario = await requireAccesoEmpresa(empresa.id);
  return { empresa, usuario };
}

// Última semana del período (la abierta, si hay), sin crear ninguna. null si el período todavía no
// tiene semanas.
export async function obtenerNumeroSemanaParaVer(empresaSlug: string, periodo: string) {
  await resolverEmpresaParaLeer(empresaSlug, periodo);
  const ultima = await obtenerUltimaEjecucion(periodo);
  return ultima?.numeroSemana ?? null;
}

export async function obtenerDatosSemanaDeEmpresa(
  empresaSlug: string,
  periodo: string,
  numeroSemana: number,
  pagina: number = 1,
  soloSinClasificar: boolean = false
) {
  const { empresa, usuario } = await resolverEmpresaParaLeer(empresaSlug, periodo);
  const ejecucion = await obtenerEjecucionPorSemana(periodo, numeroSemana);
  if (!ejecucion) return null;

  const unidades = empresa.unidadesNegocio;
  const filtroClasificacion = soloSinClasificar ? { clasificacion: "SIN CLASIFICAR" } : {};
  const where = { ejecucionId: ejecucion.id, ...filtroDeUnidades(unidades), ...filtroClasificacion };

  const [totalMovimientos, totalImporte, semanas] = await Promise.all([
    prisma.movimientoBancario.count({ where }),
    sumarImporteDeUnidades(ejecucion.id, unidades, soloSinClasificar),
    prisma.ejecucionSemanal.findMany({
      where: { periodo },
      orderBy: { numeroSemana: "asc" },
      select: { numeroSemana: true, estado: true },
    }),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(totalMovimientos / FILAS_POR_PAGINA));
  const paginaEfectiva = Math.min(Math.max(1, pagina), totalPaginas);

  // Mismo desempate estable por id que el módulo global.
  const movimientos = await prisma.movimientoBancario.findMany({
    where,
    orderBy: [{ fecha: "asc" }, { id: "asc" }],
    skip: (paginaEfectiva - 1) * FILAS_POR_PAGINA,
    take: FILAS_POR_PAGINA,
    include: { desglose: { orderBy: { createdAt: "asc" } } },
  });

  return {
    empresaNombre: empresa.nombre,
    numeroSemana: ejecucion.numeroSemana,
    estado: ejecucion.estado,
    cierre: ejecucion.fechaCierre
      ? {
          fecha: ejecucion.fechaCierre.toISOString(),
          por: ejecucion.cerradoPorId
            ? ((await prisma.usuario.findUnique({ where: { id: ejecucion.cerradoPorId }, select: { nombre: true } }))?.nombre ?? null)
            : null,
        }
      : null,
    // Para el enlace "Operar en Ejecución global" (quien opera, ADMIN o FINANZAS).
    puedeIrAlModuloGlobal: puedeOperarEjecucionGlobal(usuario) || veTodoEjecucion(usuario),
    semanas,
    sinUnidades: unidades.length === 0,
    movimientos: movimientos.map((m) => mapearMovimiento(m, unidades)),
    totalMovimientos,
    totalImporte,
    pagina: paginaEfectiva,
    totalPaginas,
    soloSinClasificar,
  };
}

// Solo para el enlace de la pestaña, cuando el período todavía no tiene ninguna semana.
export async function puedeIrAlModuloGlobal(empresaSlug: string, periodo: string) {
  const { usuario } = await resolverEmpresaParaLeer(empresaSlug, periodo);
  return veTodoEjecucion(usuario);
}
