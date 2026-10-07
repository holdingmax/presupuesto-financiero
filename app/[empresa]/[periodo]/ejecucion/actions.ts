"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
import { resolverEmpresaPorSlug, quitarDiacriticos } from "@/lib/slug";
import { obtenerOCrearPresupuesto } from "@/lib/presupuesto";
import {
  obtenerOCrearEjecucionAbierta,
  obtenerEjecucionPorSemana,
  obtenerUltimaEjecucion,
} from "@/lib/ejecucion";
import { requireAccesoEmpresa, requireOperadorEjecucion, puedeOperarEjecucion } from "@/lib/auth";
import {
  calcularClasificacionesDisponibles,
  normalizarClasificacion,
  proponerClasificacionAutomatica,
} from "@/lib/clasificaciones";
import {
  normalizarCuenta,
  proponerUnidadPorCuenta,
  proponerUnidadPorRazonSocial,
  unidadDeLaLista,
  esUnidadDeLaLista,
} from "@/lib/unidadesNegocio";
import { aCentavos, centavosADecimal } from "@/lib/prorrateo";
import { obtenerUnidadesConEmpresa, contarSinUnidadEnSemana } from "@/lib/reporte";
import {
  centavosDeNumero,
  centavosDeDecimalTexto,
  decimalTextoDeCentavos,
  claveMovimiento,
  contarPorClave,
  separarNuevas,
  esCuentaNumerada,
} from "@/lib/conteoMovimientos";
import type { Prisma } from "@prisma/client";

const NOMBRE_HOJA_EXTRACTO = "Hoja1";
const FILAS_POR_PAGINA = 200;

// Coincidencia exacta de string (post-normalización), no fuzzy — cada clave nueva es un
// sinónimo puntual confirmado contra un archivo real, no una adivinanza. Varias claves
// pueden apuntar al mismo campo (ver NRO REFERENCIA/NRO. DE REFERENCIA/NRO DE REFERENCIA):
// si algún archivo futuro trajera dos de esas columnas a la vez para el mismo campo (ej.
// "Descripcion" Y "Concepto" juntas), gana la que se procese después en la fila de
// encabezados — no hay merge ni prioridad definida. No es el caso de ningún archivo visto
// hasta ahora, así que no se resolvió; queda documentado acá para quien lo retome.
const COLUMNAS: Record<string, string> = {
  "FECHA": "fecha",
  "NRO REFERENCIA": "nroReferencia",
  "NRO. DE REFERENCIA": "nroReferencia",
  "NRO DE REFERENCIA": "nroReferencia",
  "NRO, DE REFERENCIA": "nroReferencia", // ej. archivo de prueba de Macchi: coma en vez de espacio después de "Nro"
  "CAUSAL": "causal",
  "CONCEPTO": "concepto",
  "DESCRIPCION": "concepto", // ej. HWC: "Descripcion" es el texto completo del movimiento
  "IMPORTE": "importe",
  "SALDO": "saldo",
  "BANCO Y CTA": "bancoYCuenta",
  "BANCO": "bancoYCuenta", // ej. HWC: solo trae "Banco" a secas, sin el número de cuenta
  "DETALLE": "detalle",
  "DESC": "detalle", // ej. HWC: "Desc" (abreviado) es una aclaración corta, no la Descripcion completa
  "CLASIFICACION": "clasificacion",
  "CLASIF 2": "clasificacion2",
  "UNIDAD DE NEG": "unidadNegocio",
  "DETALLE 2": "detalle2",
};

// Tolerante a tildes/mayúsculas/espacios: "Clasificación", "CLASIFICACION" y
// "clasificación" tienen que matchear la misma clave en COLUMNAS (mismo fix
// aplicado en presupuesto/actions.ts). El colapso de espacios múltiples
// importa para claves de varias palabras como "BANCO Y CTA"/"UNIDAD DE NEG".
function normalizarEncabezado(texto: string) {
  return quitarDiacriticos(texto).trim().toUpperCase().replace(/\s+/g, " ");
}

// El layout de [empresa]/[periodo] ya garantiza, al renderizar una página, que el slug
// matchea una empresa real y que el usuario logueado tiene acceso a ella. Esta resolución
// (empresa + autorización) es defensiva para las Server Actions, que se invocan directo
// desde el cliente y no vuelven a pasar por el layout.
async function resolverPresupuesto(empresaSlug: string, periodo: string) {
  const empresa = await resolverEmpresaPorSlug(empresaSlug);
  if (!empresa) {
    throw new Error(`No existe una empresa para "${empresaSlug}".`);
  }
  const usuario = await requireAccesoEmpresa(empresa.id);
  const presupuesto = await obtenerOCrearPresupuesto(empresa.id, periodo);
  return { empresa, presupuesto, usuario };
}

// Como resolverPresupuesto, pero exige poder OPERAR Ejecución (no solo verla) —
// para las Server Actions que mutan datos. Ver vs. operar es un permiso más
// granular que el acceso a la empresa (ver comentario en lib/auth.ts).
async function resolverPresupuestoParaOperar(empresaSlug: string, periodo: string) {
  const empresa = await resolverEmpresaPorSlug(empresaSlug);
  if (!empresa) {
    throw new Error(`No existe una empresa para "${empresaSlug}".`);
  }
  await requireOperadorEjecucion(empresa.id);
  const presupuesto = await obtenerOCrearPresupuesto(empresa.id, periodo);
  return { empresa, presupuesto };
}

function mapearMovimiento(m: {
  id: string;
  fecha: Date;
  concepto: string;
  importe: unknown;
  bancoYCuenta: string;
  clasificacion: string;
  unidadNegocio: string;
  detalle: string | null;
  ignorado: boolean;
  sugeridaPorSistema: boolean;
  chequeIvaAmbiguo: boolean;
  unidadSugeridaPorSistema: boolean;
  desglose: { id: string; unidadNegocio: string; importe: unknown }[];
}) {
  return {
    id: m.id,
    fecha: m.fecha.toISOString().slice(0, 10),
    concepto: m.concepto,
    importe: Number(m.importe),
    bancoYCuenta: m.bancoYCuenta,
    clasificacion: m.clasificacion,
    // unidadNegocio: valor único del movimiento en sí, editable inline en la tabla
    // (onCambiarUnidadNegocio/onGuardarUnidadNegocio) — completamente separado de
    // m.desglose de abajo (el reparto en varias unidades, ver
    // guardarDesgloseMovimiento). Ninguno de los dos lee ni escribe al otro.
    unidadNegocio: m.unidadNegocio,
    detalle: m.detalle ?? "",
    ignorado: m.ignorado,
    sugeridaPorSistema: m.sugeridaPorSistema,
    chequeIvaAmbiguo: m.chequeIvaAmbiguo,
    unidadSugeridaPorSistema: m.unidadSugeridaPorSistema,
    desglose: m.desglose.map((d) => ({
      id: d.id,
      unidadNegocio: d.unidadNegocio,
      importe: Number(d.importe),
    })),
  };
}

// Único punto que crea una EjecucionSemanal: resuelve-o-crea la semana abierta y
// devuelve su número, para que la página índice (sin segmento numérico) redirija ahí.
// Solo para quien puede OPERAR — alguien con acceso de solo lectura no debe disparar
// la creación de una semana nueva con el simple hecho de navegar acá. Para ese caso
// se busca la última semana existente sin crear ninguna; null si todavía no hay
// ninguna (el índice le muestra un mensaje en vez de redirigir a algo inexistente).
export async function obtenerNumeroSemanaAbierta(empresaSlug: string, periodo: string) {
  const { empresa, presupuesto, usuario } = await resolverPresupuesto(empresaSlug, periodo);

  if (await puedeOperarEjecucion(usuario, empresa.id)) {
    const ejecucion = await obtenerOCrearEjecucionAbierta(presupuesto.id);
    return ejecucion.numeroSemana;
  }

  const ultima = await obtenerUltimaEjecucion(presupuesto.id);
  return ultima?.numeroSemana ?? null;
}

// Solo lectura: nunca crea nada. Devuelve null si esa semana no existe todavía.
// `pagina` es 1-indexada; se clampea entre 1 y el total de páginas reales, así un
// ?pagina=9999 nunca muestra un vacío falso en una semana que sí tiene movimientos.
// `soloSinClasificar` filtra en la query misma (no en memoria sobre la página ya
// traída) — recalcula totalMovimientos/totalPaginas/totalImporte sobre el universo
// filtrado, así el usuario nunca se pierde una fila "SIN CLASIFICAR" que cayó en
// otra página. Pedido de Kike: encontrarlas sin tener que buscarlas una por una.
export async function obtenerDatosSemana(
  empresaSlug: string,
  periodo: string,
  numeroSemana: number,
  pagina: number = 1,
  soloSinClasificar: boolean = false
) {
  // calcularClasificacionesDisponibles no depende de empresa/presupuesto/ejecucion (es una
  // query global) — se dispara ya para que corra en paralelo con toda la cadena de abajo
  // en vez de sumar un round-trip secuencial más contra la base.
  const clasificacionesPromise = calcularClasificacionesDisponibles();

  const { empresa, presupuesto, usuario } = await resolverPresupuesto(empresaSlug, periodo);
  const puedeOperar = await puedeOperarEjecucion(usuario, empresa.id);
  const ejecucion = await obtenerEjecucionPorSemana(presupuesto.id, numeroSemana);

  if (!ejecucion) {
    return null;
  }

  // Agregación separada del fetch paginado: el total en pesos y el conteo de filas
  // tienen que representar TODA la semana, no solo la página que se está mostrando.
  // Esta sí tiene que ir antes del findMany (no en paralelo con él): el skip correcto
  // depende de totalPaginas, que depende de este resultado.
  //
  // Dos aggregates, no uno: totalMovimientos (conteo, para paginación) tiene que incluir
  // las filas "ignorado" — siguen visibles en la tabla, así que la paginación tiene que
  // seguir contándolas o el skip/take del findMany de abajo (que tampoco las filtra)
  // quedaría desalineado. totalImporte (el $ que se reporta) sí las excluye — es
  // justamente el cálculo que "ignorado" existe para poder sacar de los reportes.
  // Mismo where base que ya comparten las 3 queries de abajo — se le suma esta
  // condición solo cuando el filtro está activo, sin cambiar nada más.
  const filtroClasificacion = soloSinClasificar ? { clasificacion: "SIN CLASIFICAR" } : {};

  const [agregadoTotal, agregadoSumaReal, gruposUnidadSugerida, sinUnidadAsignada, sugerenciasClasificacion] = await Promise.all([
    prisma.movimientoBancario.aggregate({
      where: { ejecucionId: ejecucion.id, ...filtroClasificacion },
      _count: true,
    }),
    prisma.movimientoBancario.aggregate({
      where: { ejecucionId: ejecucion.id, ignorado: false, ...filtroClasificacion },
      _sum: { importe: true },
    }),
    // Panel de unidades sugeridas: TODA la semana (sin paginar y sin
    // filtroClasificacion), a diferencia de las filas de la tabla — un archivo
    // de ~16.500 filas reparte las sugerencias en decenas de páginas.
    prisma.movimientoBancario.groupBy({
      by: ["bancoYCuenta", "unidadNegocio"],
      where: { ejecucionId: ejecucion.id, unidadSugeridaPorSistema: true },
      _count: true,
    }),
    // Aviso antes del cierre (decisión 2026-10-07): movimientos de TODA la semana
    // cuya unidad no pertenece a ninguna empresa — no van a entrar en el Reporte
    // de nadie, y una vez cerrada la semana ya no se pueden corregir.
    obtenerUnidadesConEmpresa().then((unidades) => contarSinUnidadEnSemana(ejecucion.id, unidades)),
    // Panel de clasificaciones sugeridas: TODA la semana, no la página
    // (decisión 2026-10-07 — antes se armaba con las filas de la página actual).
    agruparSugerenciasClasificacion(ejecucion.id),
  ]);

  const totalMovimientos = agregadoTotal._count;
  const totalPaginas = Math.max(1, Math.ceil(totalMovimientos / FILAS_POR_PAGINA));
  const paginaEfectiva = Math.min(Math.max(1, pagina), totalPaginas);

  // Desempate estable por `id`: con `fecha` sola, cientos de filas del mismo día no tienen
  // ningún orden garantizado entre sí, y ese orden puede además cambiar cuando una de ellas
  // se edita (un UPDATE reubica la fila físicamente en el heap de Postgres) — eso es lo que
  // causó que una edición de Unidad de Negocio terminara pisando una fila distinta al volver
  // a esta página. `id` es único y no cambia nunca, así que el orden queda fijo para siempre.
  const movimientos = await prisma.movimientoBancario.findMany({
    where: { ejecucionId: ejecucion.id, ...filtroClasificacion },
    orderBy: [{ fecha: "asc" }, { id: "asc" }],
    skip: (paginaEfectiva - 1) * FILAS_POR_PAGINA,
    take: FILAS_POR_PAGINA,
    include: { desglose: { orderBy: { createdAt: "asc" } } },
  });

  return {
    empresaNombre: empresa.nombre,
    numeroSemana: ejecucion.numeroSemana,
    estado: ejecucion.estado,
    puedeOperar,
    clasificacionesDisponibles: await clasificacionesPromise,
    movimientos: movimientos.map(mapearMovimiento),
    totalMovimientos,
    totalImporte: Number(agregadoSumaReal._sum.importe ?? 0),
    pagina: paginaEfectiva,
    totalPaginas,
    soloSinClasificar,
    unidadesSugeridas: agruparUnidadesSugeridas(gruposUnidadSugerida),
    sinUnidadAsignada,
    sugerenciasClasificacion,
  };
}

export type FilaSugerenciaClasificacion = {
  id: string;
  fecha: string;
  concepto: string;
  bancoYCuenta: string;
  importe: number;
  clasificacion: string;
  chequeIvaAmbiguo: boolean;
};

export type GrupoSugerenciaClasificacion = {
  clasificacion: string;
  // Totales de TODA la semana (no de la muestra).
  cantidad: number;
  ambiguas: number;
  // Muestra para revisar/corregir de a una: hasta MUESTRA_POR_GRUPO filas, las
  // ambiguas primero (esas solo se confirman de a una).
  filas: FilaSugerenciaClasificacion[];
};

const MUESTRA_POR_GRUPO = 50;

// Sugerencias de clasificación pendientes (sugeridaPorSistema) de TODA la
// semana, agrupadas por clasificación — mismo criterio que el panel de unidades
// sugeridas: un archivo de ~16.500 filas reparte las sugerencias en decenas de
// páginas, y "Confirmar las N" tiene que confirmar las N de la semana, no las de
// la página que se está viendo. Un groupBy (pocas filas) + una muestra por grupo.
async function agruparSugerenciasClasificacion(
  ejecucionId: string
): Promise<GrupoSugerenciaClasificacion[]> {
  const conteos = await prisma.movimientoBancario.groupBy({
    by: ["clasificacion", "chequeIvaAmbiguo"],
    where: { ejecucionId, sugeridaPorSistema: true },
    _count: true,
  });
  const porClasificacion = new Map<string, { cantidad: number; ambiguas: number }>();
  for (const c of conteos) {
    const g = porClasificacion.get(c.clasificacion) ?? { cantidad: 0, ambiguas: 0 };
    g.cantidad += c._count;
    if (c.chequeIvaAmbiguo) g.ambiguas += c._count;
    porClasificacion.set(c.clasificacion, g);
  }
  const grupos = await Promise.all(
    Array.from(porClasificacion.entries()).map(async ([clasificacion, totales]) => {
      const filas = await prisma.movimientoBancario.findMany({
        where: { ejecucionId, sugeridaPorSistema: true, clasificacion },
        orderBy: [{ chequeIvaAmbiguo: "desc" }, { fecha: "asc" }, { id: "asc" }],
        take: MUESTRA_POR_GRUPO,
        select: { id: true, fecha: true, concepto: true, bancoYCuenta: true, importe: true, clasificacion: true, chequeIvaAmbiguo: true },
      });
      return {
        clasificacion,
        ...totales,
        filas: filas.map((m) => ({ ...m, fecha: m.fecha.toISOString().slice(0, 10), importe: Number(m.importe) })),
      };
    })
  );
  return grupos.sort((a, b) => a.clasificacion.localeCompare(b.clasificacion, "es"));
}

export type GrupoUnidadSugerida = {
  // Cuenta normalizada (clave del grupo, lo que se muestra).
  cuenta: string;
  // Grafías crudas tal como están en la base que caen en esta cuenta — es lo
  // que confirmarUnidadesEnLote recibe para su `bancoYCuenta IN (...)`.
  cuentasCrudas: string[];
  unidadNegocio: string;
  cantidad: number;
};

// Junta por cuenta NORMALIZADA (mismo criterio que proponerUnidadPorCuenta), por si
// la misma cuenta llegó con dos grafías distintas ("Frances 891" / "FRANCES 891").
// La clave incluye la unidad: con el mapa de hoy una cuenta siempre sugiere la misma,
// pero si el mapa cambiara entre dos subidas no se mezclan dos sugerencias distintas
// bajo un mismo botón "Confirmar".
function agruparUnidadesSugeridas(
  grupos: { bancoYCuenta: string; unidadNegocio: string; _count: number }[]
): GrupoUnidadSugerida[] {
  const porClave = new Map<string, GrupoUnidadSugerida>();
  for (const g of grupos) {
    const cuenta = normalizarCuenta(g.bancoYCuenta);
    const clave = `${cuenta}|${g.unidadNegocio}`;
    const existente = porClave.get(clave);
    if (existente) {
      existente.cuentasCrudas.push(g.bancoYCuenta);
      existente.cantidad += g._count;
    } else {
      porClave.set(clave, {
        cuenta,
        cuentasCrudas: [g.bancoYCuenta],
        unidadNegocio: g.unidadNegocio,
        cantidad: g._count,
      });
    }
  }
  return Array.from(porClave.values()).sort((a, b) => a.cuenta.localeCompare(b.cuenta, "es"));
}

export type ResultadoChequeo = {
  nombre: string;
  clasificacion: string;
  neto: number;
  ok: boolean;
  // Siempre poblado (conteo real), a diferencia de `lineas` — así la UI puede
  // mostrar "N líneas" sin tener que mandar el detalle completo cuando el
  // usuario todavía no lo pidió (colapsado por defecto).
  cantidad: number;
  lineas: { id: string; fecha: string; concepto: string; importe: number }[];
};

// Controles de suma-cero que Macchi ya hace a mano hoy (confirmado 2026-08-27):
// para estas 3 clasificaciones puntuales, el neto del período tiene que dar $0
// — si un movimiento de ingreso no encuentra su contraparte de salida (o
// viceversa), el neto queda desbalanceado y es señal de algo mal cargado o
// pendiente. No bloquea el cierre, es solo una alerta visual (mismo criterio
// que la detección de posibles duplicados en subirExtracto). Nombres exactos
// confirmados con Macchi — "PREST BRIOS Y TC"/"PRESTAMOS MS" quedan afuera de
// Préstamos a propósito, y "CHEQUES DIFERIDOS"/"CH DIFERIDOS IVA" quedan
// afuera de cheques de terceros — son categorías reales pero distintas.
const CHEQUEOS_SUMA_CERO: { nombre: string; clasificacion: string }[] = [
  { nombre: "Préstamos", clasificacion: "PRESTAMOS" },
  { nombre: "Transferencias entre bancos", clasificacion: "TRANSF ENTRE BCOS" },
  { nombre: "Depósito de cheques de terceros", clasificacion: "DEP CH 3°" },
];

// Mismo filtro por ejecucionId que obtenerDatosSemana (no cruza otras semanas
// del período) — así el chequeo siempre mira exactamente el mismo conjunto de
// filas que el usuario ve en pantalla para esa semana, sea o no acumulativo el
// archivo que se subió. ignorado:false por el mismo motivo que en
// obtenerDatosSemana: una línea ignorada no debe pesar en ningún cálculo.
export async function calcularChequeosSumaCero(
  empresaSlug: string,
  periodo: string,
  numeroSemana: number
): Promise<ResultadoChequeo[]> {
  const { presupuesto } = await resolverPresupuesto(empresaSlug, periodo);
  const ejecucion = await obtenerEjecucionPorSemana(presupuesto.id, numeroSemana);
  if (!ejecucion) return [];

  const resultados: ResultadoChequeo[] = [];
  for (const { nombre, clasificacion } of CHEQUEOS_SUMA_CERO) {
    const movimientos = await prisma.movimientoBancario.findMany({
      where: { ejecucionId: ejecucion.id, clasificacion, ignorado: false },
      orderBy: [{ fecha: "asc" }, { id: "asc" }],
    });
    const neto = movimientos.reduce((acc, m) => acc + Number(m.importe), 0);
    const ok = Math.abs(neto) < 0.01;
    resultados.push({
      nombre,
      clasificacion,
      neto,
      ok,
      cantidad: movimientos.length,
      lineas: ok
        ? []
        : movimientos.map((m) => ({
            id: m.id,
            fecha: m.fecha.toISOString().slice(0, 10),
            concepto: m.concepto,
            importe: Number(m.importe),
          })),
    });
  }
  return resultados;
}

export type ResultadoLiquidacionAmbigua = {
  fila: number;
  fecha: string;
  importe: number;
  candidatos: string[];
};

// Cruza contra PagoReferencia (planilla de Macchi, ver lib/pagoReferencia.ts)
// para discriminar "Liquidación final" de "Sueldos" cuando la leyenda
// bancaria por sí sola no alcanza — mismo criterio que usa Macchi a mano:
// fecha exacta + importe (reusa claveDuplicado, misma tolerancia de
// centavos que ya usa el resto del proyecto, pero por VALOR ABSOLUTO —
// PagoReferencia siempre guarda montos positivos, porque es un libro de
// pagos de Macchi, mientras que MovimientoBancario trae el signo del banco,
// negativo para un débito/pago. Comparar el signo tal cual, sin abs(),
// nunca matcheaba nada — bug real encontrado 2026-09-02 reintentando esta
// prueba). Corre DESPUÉS de que la clasificación normal ya se resolvió
// (archivo / reglas automáticas / SIN CLASIFICAR) y la pisa solo cuando
// corresponde — nunca la deja peor de lo que ya estaba. Si hay más de un
// candidato posible para la misma clave y al menos uno es liquidación, no
// se aplica ningún override (no forzar una asignación ambigua) — se junta
// para la alerta en vez de arriesgar asignarlo a la persona equivocada.
async function aplicarCruceLiquidacionFinal(
  filas: {
    numeroFila: number;
    fecha: Date;
    importe: number;
    clasificacion: string;
    sugeridaPorSistema: boolean;
  }[]
): Promise<ResultadoLiquidacionAmbigua[]> {
  if (filas.length === 0) return [];

  // Acotado al rango de fechas del archivo recién subido — PagoReferencia
  // puede tener 13.000+ filas (todo el holding, varios meses) mientras que
  // una carga semanal normal cubre unos pocos días; sin este filtro, cada
  // subirExtracto traía la tabla entera (~15s medido contra Neon).
  const fechas = filas.map((f) => f.fecha.getTime());
  const referencias = await prisma.pagoReferencia.findMany({
    where: { fecha: { gte: new Date(Math.min(...fechas)), lte: new Date(Math.max(...fechas)) } },
  });
  if (referencias.length === 0) return [];

  const porClave = new Map<string, typeof referencias>();
  for (const r of referencias) {
    const clave = claveDuplicado(r.fecha, Math.abs(Number(r.importe)));
    const grupo = porClave.get(clave);
    if (grupo) grupo.push(r);
    else porClave.set(clave, [r]);
  }

  const ambiguas: ResultadoLiquidacionAmbigua[] = [];

  for (const fila of filas) {
    const candidatos = porClave.get(claveDuplicado(fila.fecha, Math.abs(fila.importe)));
    if (!candidatos) continue;

    if (candidatos.length === 1) {
      if (candidatos[0].esLiquidacionFinal) {
        fila.clasificacion = "Liquidación final";
        fila.sugeridaPorSistema = true;
      }
      continue;
    }

    if (candidatos.some((c) => c.esLiquidacionFinal)) {
      ambiguas.push({
        fila: fila.numeroFila,
        fecha: fila.fecha.toISOString().slice(0, 10),
        importe: fila.importe,
        candidatos: candidatos.map((c) => c.proveedor),
      });
    }
  }

  return ambiguas;
}

// Cruza contra ChequeIvaReferencia (planilla de Macchi, ver
// lib/chequeIvaReferencia.ts) para discriminar "IVA" de "CH DIFERIDOS IVA" en
// movimientos "CHEQUE P/CAMARA" — PRIMERA VERSIÓN, acotada al único canal
// validado (diagnóstico 2026-09-08): MovimientoBancario.nroReferencia +
// importe contra N° de cheque + importe de la planilla, solo para filas cuyo
// concepto contiene "CHEQUE P/CAMARA". El canal de texto embebido en el
// concepto (casos sin nroReferencia) queda para una vuelta futura. IMPORTE CH
// en la planilla siempre es positivo (libro de cheques de Macchi) mientras
// que MovimientoBancario.importe trae el signo del banco (negativo, un
// cheque negociado es una salida) — mismo Math.abs() y mismo motivo que en
// aplicarCruceLiquidacionFinal. La dedup de lib/chequeIvaReferencia.ts ya
// garantiza como máximo una fila por (numeroCheque, importeCh) en la tabla
// — a diferencia de Liquidación final, acá no hay ambigüedad posible en el
// cruce en sí, así que no hace falta ningún tipo de alerta de "candidatos
// múltiples". Corre después de que la clasificación normal ya se resolvió y
// la pisa solo cuando hay un match confiable — nunca la deja peor de lo que
// ya estaba. "IVA"/"CH DIFERIDOS IVA" son categorías DISTINTAS de "CHEQUES
// DIFERIDOS" (ya existente, otro significado) — no fusionar.
async function aplicarCruceChequeIva(
  filas: {
    fecha: Date;
    importe: number;
    concepto: string;
    nroReferencia: string | null;
    clasificacion: string;
    sugeridaPorSistema: boolean;
    chequeIvaAmbiguo: boolean;
  }[]
): Promise<void> {
  const elegibles = filas
    .map((fila) => ({ fila, numeroCheque: Number(fila.nroReferencia) }))
    .filter(
      ({ fila, numeroCheque }) =>
        fila.nroReferencia &&
        Number.isFinite(numeroCheque) &&
        quitarDiacriticos(fila.concepto).toUpperCase().includes("CHEQUE P/CAMARA")
    );
  if (elegibles.length === 0) return;

  // Acotado a los N° de cheque presentes en este archivo — más preciso que
  // acotar por rango de fechas (la fecha de negociación de la planilla puede
  // caer en un mes distinto al de la fila, que es justamente lo que este
  // cruce necesita comparar) y evita traer ChequeIvaReferencia entera.
  const numeros = [...new Set(elegibles.map((e) => e.numeroCheque))];
  const referencias = await prisma.chequeIvaReferencia.findMany({
    where: { numeroCheque: { in: numeros } },
  });
  if (referencias.length === 0) return;

  const porNumero = new Map<number, typeof referencias>();
  for (const r of referencias) {
    const grupo = porNumero.get(r.numeroCheque);
    if (grupo) grupo.push(r);
    else porNumero.set(r.numeroCheque, [r]);
  }

  for (const { fila, numeroCheque } of elegibles) {
    const candidatos = (porNumero.get(numeroCheque) ?? []).filter(
      (r) => Math.abs(Number(r.importeCh) - Math.abs(fila.importe)) < 0.01
    );
    if (candidatos.length !== 1) continue;

    const referencia = candidatos[0];
    // getUTCFullYear()/getUTCMonth(), no getFullYear()/getMonth(): las fechas
    // se guardan como medianoche UTC, y el proceso corre en hora de Argentina
    // (UTC-3) — con los getters locales, cualquier fecha que caiga el día 1
    // de un mes retrocede al mes anterior (medianoche UTC del 1° = 21hs del
    // día 30/31 anterior en hora local), dando un "mismo mes" falso negativo
    // exactamente en esos casos. Bug real encontrado 2026-09-11 armando una
    // demo (referencia del 1/10/2018 comparada contra un movimiento del
    // 15/10/2018 daba "distinto mes"). Mismo criterio que claveDuplicado más
    // abajo, que ya usa .toISOString() en vez de getters locales por este
    // motivo.
    const mismoMes =
      fila.fecha.getUTCFullYear() === referencia.fecha.getUTCFullYear() &&
      fila.fecha.getUTCMonth() === referencia.fecha.getUTCMonth();
    fila.clasificacion = mismoMes ? "IVA" : "CH DIFERIDOS IVA";
    fila.sugeridaPorSistema = true;
    fila.chequeIvaAmbiguo = referencia.duplicadoAmbiguo;
  }
}

export type ResultadoContinuidadSaldo = {
  bancoYCuenta: string;
  cantidad: number;
  rupturas: {
    fechaAnterior: string;
    saldoAnterior: number;
    fechaSiguiente: string;
    concepto: string;
    saldoEsperado: number;
    saldoReal: number;
    diferencia: number;
  }[];
};

// Casi-duplicado: fila NUEVA (no reconocida como ya cargada) cuya cuenta + fecha +
// importe coinciden con un movimiento ya cargado de la misma empresa, pero que
// difiere en concepto, nro de referencia o saldo — típico de un movimiento que el
// banco reexportó con otra leyenda. Se carga igual; solo se avisa.
export type PosibleDuplicado = {
  fila: number;
  fecha: string;
  importe: number;
  bancoYCuenta: string;
  concepto: string;
};

// Una cuenta numerada de las filas nuevas que ya tiene movimientos cargados en
// OTRA empresa — señal de que el archivo puede estar subiéndose en la empresa
// equivocada (ej. el archivo madre de todo el holding). `identicas`: cuántas de
// las filas nuevas de esta cuenta son idénticas (misma clave) a filas de esa otra
// empresa — la señal más fuerte.
export type CuentaCompartida = {
  cuenta: string;
  empresa: string;
  filasEnOtraEmpresa: number;
  filasNuevasDeLaCuenta: number;
  identicas: number;
};

// Tope de casi-duplicados que viaja al cliente (el total viaja aparte): con un
// archivo de ~16.500 filas la lista completa no se puede leer igual.
const MAX_POSIBLES_DUPLICADOS = 200;

type ResultadoImportar =
  | {
      ok: true;
      filasNuevas: number;
      filasYaCargadas: number;
      posiblesDuplicados: PosibleDuplicado[];
      cantidadPosiblesDuplicados: number;
      continuidadSaldo: ResultadoContinuidadSaldo[];
      liquidacionesAmbiguas: ResultadoLiquidacionAmbigua[];
      // Solo viene seteado cuando la hoja se resolvió por selección explícita del
      // usuario (ver requiereSeleccionHoja) — así el mensaje de éxito puede dejar
      // trazado con qué hoja se cargó. En el caso normal (una sola hoja, o "Hoja1")
      // queda undefined a propósito, para no agregar ruido al mensaje de siempre.
      hoja?: string;
    }
  | { ok: false; error: string }
  // Archivo con más de una hoja y ninguna llamada "Hoja1": antes se tomaba
  // worksheets[0] en silencio, lo que podía atribuirle a una empresa los
  // movimientos de otra hoja/empresa sin ningún aviso. Este resultado no importa
  // nada todavía — el panel le muestra las hojas al usuario para que elija.
  | { ok: false; requiereSeleccionHoja: true; hojas: string[] }
  // Alguna cuenta numerada de las filas nuevas ya tiene movimientos en otra
  // empresa: no se cargó NADA todavía — el panel muestra la lista y, si el usuario
  // confirma, reenvía el archivo con confirmarCuentasCompartidas = true. Avisa, no
  // bloquea (decisión 2026-10-07): hay cuentas compartidas legítimas (ej. el
  // extracto propio de Fredy trae FRANCES 825, MACRO 623 y MACRO 794).
  | {
      ok: false;
      requiereConfirmacionCuentas: true;
      cuentas: CuentaCompartida[];
      filasNuevas: number;
      filasYaCargadas: number;
    };

// Kike sube el extracto acumulativo completo cada semana (todo el período hasta la
// fecha, no solo lo nuevo) — así que no hace falta comparar contra ninguna semana ya
// persistida en la base: alcanza con validar que el saldo corrido sea consistente
// DENTRO del archivo recién subido, antes de guardar nada. Agrupa por bancoYCuenta
// normalizado (mismo criterio que normalizarClasificacion: tolera mayúsculas/tildes/
// espacios) — es el hecho físico de la cuenta bancaria, agnóstico a unidadNegocio/
// empresa, así que una cuenta troncal como CREAR (mezcla Fredy y Mantenor) se valida
// igual de bien sin necesitar ningún caso especial. Usa numeroFila (orden real del
// Excel, todavía disponible acá porque corre antes de que subirExtracto lo descarte
// para el createMany) para desempatar varios movimientos con la misma fecha — a
// diferencia de una consulta contra la base ya persistida, donde ese orden se pierde.
// No bloquea la carga — solo avisa, mismo criterio que posiblesDuplicados.
function verificarContinuidadSaldo(
  filas: {
    numeroFila: number;
    fecha: Date;
    concepto: string;
    importe: number;
    saldo: number | null;
    bancoYCuenta: string;
  }[]
): ResultadoContinuidadSaldo[] {
  const porCuenta = new Map<string, typeof filas>();
  for (const fila of filas) {
    const clave = quitarDiacriticos(fila.bancoYCuenta).trim().toUpperCase().replace(/\s+/g, " ");
    const grupo = porCuenta.get(clave);
    if (grupo) grupo.push(fila);
    else porCuenta.set(clave, [fila]);
  }

  const resultados: ResultadoContinuidadSaldo[] = [];
  for (const grupo of porCuenta.values()) {
    const ordenado = [...grupo].sort((a, b) => a.numeroFila - b.numeroFila);
    const rupturas: ResultadoContinuidadSaldo["rupturas"] = [];

    for (let i = 1; i < ordenado.length; i++) {
      const anterior = ordenado[i - 1];
      const actual = ordenado[i];
      // Saldo null en cualquiera de los dos extremos: no verificable, se salta sin
      // marcar ni como ok ni como ruptura (no es lo mismo "no sé" que "está mal").
      if (anterior.saldo === null || actual.saldo === null) continue;

      const saldoEsperado = anterior.saldo + actual.importe;
      const diferencia = actual.saldo - saldoEsperado;
      if (Math.abs(diferencia) >= 0.01) {
        rupturas.push({
          fechaAnterior: anterior.fecha.toISOString().slice(0, 10),
          saldoAnterior: anterior.saldo,
          fechaSiguiente: actual.fecha.toISOString().slice(0, 10),
          concepto: actual.concepto,
          saldoEsperado,
          saldoReal: actual.saldo,
          diferencia,
        });
      }
    }

    if (rupturas.length > 0) {
      resultados.push({ bancoYCuenta: grupo[0].bancoYCuenta, cantidad: rupturas.length, rupturas });
    }
  }

  return resultados.sort((a, b) => a.bancoYCuenta.localeCompare(b.bancoYCuenta, "es"));
}

// fecha + importe — la usa aplicarCruceLiquidacionFinal para emparejar contra
// PagoReferencia (el reconocimiento de lo ya cargado usa claveMovimiento, más
// completa).
function claveDuplicado(fecha: Date, importe: number) {
  return `${fecha.toISOString().slice(0, 10)}|${importe.toFixed(2)}`;
}

type FilaClaveDb = {
  fecha: Date;
  importe: string;
  bancoYCuenta: string;
  concepto: string;
  nroReferencia: string | null;
  saldo: string | null;
};

function claveDeFilaDb(m: FilaClaveDb) {
  return claveMovimiento({
    fecha: m.fecha,
    importeCentavos: centavosDeDecimalTexto(m.importe),
    bancoYCuenta: m.bancoYCuenta,
    concepto: m.concepto,
    nroReferencia: m.nroReferencia,
    saldoCentavos: m.saldo === null ? null : centavosDeDecimalTexto(m.saldo),
  });
}

// Claves de TODOS los movimientos ya cargados en el presupuesto (empresa +
// período), de cualquier semana, abierta o cerrada — un solo round-trip (no uno
// por fila del Excel). Corre dentro de la transacción de subirExtracto, después
// del lock. importe/saldo como texto: se pasan a centavos sin float.
async function obtenerClavesDelPresupuesto(tx: Prisma.TransactionClient, presupuestoId: string) {
  const filas = await tx.$queryRaw<FilaClaveDb[]>`
    SELECT mb.fecha, mb.importe::text AS importe, mb."bancoYCuenta", mb.concepto,
           mb."nroReferencia", mb.saldo::text AS saldo
    FROM "MovimientoBancario" mb
    JOIN "EjecucionSemanal" es ON mb."ejecucionId" = es.id
    WHERE es."presupuestoId" = ${presupuestoId}
  `;
  return contarPorClave(filas.map(claveDeFilaDb));
}

function claveFechaImporteCuenta(fecha: Date, importeCentavos: number, bancoYCuenta: string) {
  return JSON.stringify([
    fecha.toISOString().slice(0, 10),
    importeCentavos,
    normalizarCuenta(bancoYCuenta),
  ]);
}

// Para el aviso de casi-duplicados: cuenta + fecha + importe de todo lo cargado en
// la EMPRESA (cualquier período — un archivo puede traer días de un período ya
// cargado en otro). Los 3 saltos del join (Empresa <- PresupuestoMensual <-
// EjecucionSemanal <- MovimientoBancario) ya tienen índice: @@unique([empresaId,
// periodo]), @@unique([presupuestoId, numeroSemana]) y @@index([ejecucionId]).
async function obtenerFechaImporteCuentaDeLaEmpresa(empresaId: string) {
  const filas = await prisma.$queryRaw<{ fecha: Date; importe: string; bancoYCuenta: string }[]>`
    SELECT mb.fecha, mb.importe::text AS importe, mb."bancoYCuenta"
    FROM "MovimientoBancario" mb
    JOIN "EjecucionSemanal" es ON mb."ejecucionId" = es.id
    JOIN "PresupuestoMensual" pm ON es."presupuestoId" = pm.id
    WHERE pm."empresaId" = ${empresaId}
  `;
  return new Set(
    filas.map((m) =>
      claveFechaImporteCuenta(m.fecha, centavosDeDecimalTexto(m.importe), m.bancoYCuenta)
    )
  );
}

// Cuentas numeradas de las filas nuevas que ya tienen movimientos en OTRAS
// empresas. Primero un resumen agrupado (son pocas combinaciones cuenta×empresa);
// solo si hay coincidencias se traen las filas de esas cuentas, para contar
// cuántas son idénticas a las nuevas del archivo.
async function buscarCuentasCompartidas(
  tx: Prisma.TransactionClient,
  empresaId: string,
  nuevas: { bancoYCuenta: string; clave: string }[]
): Promise<CuentaCompartida[]> {
  const nuevasPorCuenta = new Map<string, string[]>();
  for (const f of nuevas) {
    if (!esCuentaNumerada(f.bancoYCuenta)) continue;
    const cuenta = normalizarCuenta(f.bancoYCuenta);
    const lista = nuevasPorCuenta.get(cuenta);
    if (lista) lista.push(f.clave);
    else nuevasPorCuenta.set(cuenta, [f.clave]);
  }
  if (nuevasPorCuenta.size === 0) return [];

  const resumen = await tx.$queryRaw<
    { bancoYCuenta: string; empresaId: string; empresa: string; filas: number }[]
  >`
    SELECT mb."bancoYCuenta", e.id AS "empresaId", e.nombre AS empresa, COUNT(*)::int AS filas
    FROM "MovimientoBancario" mb
    JOIN "EjecucionSemanal" es ON mb."ejecucionId" = es.id
    JOIN "PresupuestoMensual" pm ON es."presupuestoId" = pm.id
    JOIN "Empresa" e ON pm."empresaId" = e.id
    WHERE pm."empresaId" <> ${empresaId}
    GROUP BY 1, 2, 3
  `;
  const coincidencias = resumen.filter((r) => nuevasPorCuenta.has(normalizarCuenta(r.bancoYCuenta)));
  if (coincidencias.length === 0) return [];

  const crudas = Array.from(new Set(coincidencias.map((r) => r.bancoYCuenta)));
  const filasOtras = await tx.$queryRaw<(FilaClaveDb & { empresaId: string })[]>`
    SELECT mb.fecha, mb.importe::text AS importe, mb."bancoYCuenta", mb.concepto,
           mb."nroReferencia", mb.saldo::text AS saldo, pm."empresaId"
    FROM "MovimientoBancario" mb
    JOIN "EjecucionSemanal" es ON mb."ejecucionId" = es.id
    JOIN "PresupuestoMensual" pm ON es."presupuestoId" = pm.id
    WHERE pm."empresaId" <> ${empresaId} AND mb."bancoYCuenta" = ANY(${crudas})
  `;

  const porCuentaYEmpresa = new Map<string, CuentaCompartida & { empresaId: string }>();
  for (const r of coincidencias) {
    const cuenta = normalizarCuenta(r.bancoYCuenta);
    const k = `${cuenta}|${r.empresaId}`;
    const previo = porCuentaYEmpresa.get(k);
    if (previo) {
      previo.filasEnOtraEmpresa += r.filas;
    } else {
      porCuentaYEmpresa.set(k, {
        cuenta,
        empresa: r.empresa,
        empresaId: r.empresaId,
        filasEnOtraEmpresa: r.filas,
        filasNuevasDeLaCuenta: nuevasPorCuenta.get(cuenta)!.length,
        identicas: 0,
      });
    }
  }
  // identicas = Σ por clave de min(veces en las filas nuevas, veces en la otra empresa).
  for (const item of porCuentaYEmpresa.values()) {
    const enOtra = contarPorClave(
      filasOtras
        .filter((m) => m.empresaId === item.empresaId && normalizarCuenta(m.bancoYCuenta) === item.cuenta)
        .map(claveDeFilaDb)
    );
    for (const [clave, n] of contarPorClave(nuevasPorCuenta.get(item.cuenta)!)) {
      item.identicas += Math.min(n, enOtra.get(clave) ?? 0);
    }
  }
  return Array.from(porCuentaYEmpresa.values())
    .map((c) => ({
      cuenta: c.cuenta,
      empresa: c.empresa,
      filasEnOtraEmpresa: c.filasEnOtraEmpresa,
      filasNuevasDeLaCuenta: c.filasNuevasDeLaCuenta,
      identicas: c.identicas,
    }))
    .sort((a, b) => a.cuenta.localeCompare(b.cuenta, "es") || a.empresa.localeCompare(b.empresa, "es"));
}

// Una celda con fórmula viene de ExcelJS como { formula, result, ... } en vez de un número
// plano; una celda con un error de fórmula rota (ej. #REF!) viene como { error: "#REF!" }.
function esObjetoConResultadoNumerico(valor: unknown): valor is { result: number } {
  return (
    typeof valor === "object" &&
    valor !== null &&
    "result" in valor &&
    typeof (valor as { result: unknown }).result === "number" &&
    Number.isFinite((valor as { result: number }).result)
  );
}

function esObjetoConError(valor: unknown): valor is { error: string } {
  return typeof valor === "object" && valor !== null && "error" in valor;
}

// Importe es obligatorio: si la celda venía con fórmula, se resuelve con .result;
// si no se puede resolver a un número válido, se devuelve null y la fila se descarta.
function extraerImporte(valorCrudo: unknown): { valor: number | null; corregidoPorFormula: boolean } {
  if (valorCrudo == null) return { valor: 0, corregidoPorFormula: false };
  if (typeof valorCrudo === "number") {
    return { valor: Number.isFinite(valorCrudo) ? valorCrudo : null, corregidoPorFormula: false };
  }
  if (esObjetoConResultadoNumerico(valorCrudo)) {
    return { valor: valorCrudo.result, corregidoPorFormula: true };
  }
  return { valor: null, corregidoPorFormula: false };
}

// Saldo es opcional (nullable en el schema): un error de fórmula (#REF!) es un problema real
// del Excel original, no de nuestro parseo — se guarda como null sin descartar la fila.
function extraerSaldo(
  valorCrudo: unknown
): { valor: number | null; corregidoPorFormula: boolean; tuvoError: boolean } {
  if (valorCrudo == null) return { valor: null, corregidoPorFormula: false, tuvoError: false };
  if (typeof valorCrudo === "number") {
    return {
      valor: Number.isFinite(valorCrudo) ? valorCrudo : null,
      corregidoPorFormula: false,
      tuvoError: false,
    };
  }
  if (esObjetoConError(valorCrudo)) {
    return { valor: null, corregidoPorFormula: false, tuvoError: true };
  }
  if (esObjetoConResultadoNumerico(valorCrudo)) {
    return { valor: valorCrudo.result, corregidoPorFormula: true, tuvoError: false };
  }
  return { valor: null, corregidoPorFormula: false, tuvoError: false };
}

// Celda de unidad ("UNIDAD DE NEG" o "EMPRESA") → valor recortado, o null si viene
// vacía o dice "SIN ASIGNAR" (cuenta como vacío, decisión 2026-10-06 — así puede
// caer al siguiente escalón del orden en subirExtracto).
function leerUnidadDeCelda(valorCrudo: unknown): string | null {
  const texto = valorCrudo ? String(valorCrudo).trim() : "";
  if (!texto || normalizarCuenta(texto) === "SIN ASIGNAR") return null;
  return texto;
}

export async function subirExtracto(
  empresaSlug: string,
  periodo: string,
  numeroSemana: number,
  formData: FormData,
  hojaElegida?: string,
  // true solo en el reenvío después de que el usuario vio el aviso de cuentas
  // compartidas con otra empresa y eligió "Cargar igual".
  confirmarCuentasCompartidas = false
): Promise<ResultadoImportar> {
  const archivo = formData.get("archivo");

  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: "Elegí un archivo antes de subir." };
  }

  if (!archivo.name.toLowerCase().endsWith(".xlsx")) {
    return { ok: false, error: "El archivo tiene que ser un .xlsx." };
  }

  const { empresa, presupuesto } = await resolverPresupuestoParaOperar(empresaSlug, periodo);
  const ejecucion = await obtenerEjecucionPorSemana(presupuesto.id, numeroSemana);
  if (!ejecucion) {
    return { ok: false, error: `No encontré la semana ${numeroSemana}.` };
  }
  if (ejecucion.estado === "CERRADA") {
    return { ok: false, error: "La semana ya está cerrada, no se pueden subir más movimientos." };
  }

  // Dispara en paralelo con el parseo del Excel (que sigue abajo) — así no suma un
  // round-trip secuencial más. Solo alimenta un aviso (casi-duplicados), así que
  // puede leerse fuera de la transacción de más abajo.
  const fechaImporteCuentaPromise = obtenerFechaImporteCuentaDeLaEmpresa(empresa.id);

  const buffer = await archivo.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  // Si el usuario ya eligió una hoja explícitamente (reintento tras el selector de abajo),
  // se usa esa directo sin volver a evaluar nada.
  let hoja = hojaElegida ? workbook.getWorksheet(hojaElegida) : undefined;
  if (hojaElegida && !hoja) {
    return { ok: false, error: `No encontré la hoja "${hojaElegida}" en el archivo.` };
  }

  if (!hoja) {
    if (workbook.worksheets.length === 1) {
      hoja = workbook.worksheets[0];
    } else {
      const hojaPorNombre = workbook.getWorksheet(NOMBRE_HOJA_EXTRACTO);
      if (hojaPorNombre) {
        hoja = hojaPorNombre;
      } else {
        // Más de una hoja y ninguna se llama "Hoja1": antes se tomaba worksheets[0]
        // en silencio, lo que podía traer los movimientos de la empresa equivocada
        // sin ningún aviso. Ahora se corta acá y se le pide al usuario que elija.
        return {
          ok: false,
          requiereSeleccionHoja: true,
          hojas: workbook.worksheets.map((h) => h.name),
        };
      }
    }
  }

  if (!hoja) {
    return { ok: false, error: "El archivo no tiene ninguna hoja." };
  }

  const FILA_HEADERS = 1;
  const encabezados: Record<number, string> = {};
  // Texto crudo de cada columna, matcheada o no en COLUMNAS — los fallbacks de abajo
  // (ej. "EMPRESA") necesitan poder encontrar una columna que el diccionario ignoró.
  const encabezadosCrudos: Record<number, string> = {};
  const filaEncabezado = hoja.getRow(FILA_HEADERS);
  filaEncabezado.eachCell((celda, colNumero) => {
    const texto = normalizarEncabezado(String(celda.value ?? ""));
    encabezadosCrudos[colNumero] = texto;
    const campo = COLUMNAS[texto];
    if (campo) encabezados[colNumero] = campo;
  });

  // Algunos exports por empresa (recortados del maestro) vienen sin la columna
  // "CLASIFICACION" y dejan la clasificación real bajo "CLASIF 2" — sin este fallback,
  // esas filas se importaban todas como "SIN CLASIFICAR" en vez de leer el dato real.
  // Si el archivo sí trae "CLASIFICACION" (el caso normal), esto no cambia nada.
  if (!Object.values(encabezados).includes("clasificacion")) {
    const colClasificacion2 = Object.keys(encabezados).find(
      (col) => encabezados[Number(col)] === "clasificacion2"
    );
    if (colClasificacion2) {
      encabezados[Number(colClasificacion2)] = "clasificacion";
    }
  }

  // Algunos exports por empresa no traen "UNIDAD DE NEG" y en su lugar tienen una
  // columna "EMPRESA" con texto libre (ej. "QUINTEROS", "SIERRA"). Confirmado con Kike
  // (2026-10-06): EMPRESA es la razón social (SPP, LI, QUINTEROS, TUCSON), no la unidad
  // — un error de etiqueta. Por eso se lee en un campo aparte ("empresaColumna", nunca
  // persistido): queda DEBAJO de la sugerencia por cuenta y se traduce a unidad con el
  // mapa por razón social (UNIDAD_POR_RAZON_SOCIAL, ver el orden más abajo) — nunca se
  // guarda la razón social como si fuera una unidad.
  // Si el archivo sí trae "UNIDAD DE NEG" (el caso normal, incluido el maestro),
  // "EMPRESA" queda ignorada igual que siempre.
  if (!Object.values(encabezados).includes("unidadNegocio")) {
    const colEmpresa = Object.keys(encabezadosCrudos).find(
      (col) => encabezadosCrudos[Number(col)] === "EMPRESA" && !encabezados[Number(col)]
    );
    if (colEmpresa) {
      encabezados[Number(colEmpresa)] = "empresaColumna";
    }
  }

  if (!Object.values(encabezados).includes("concepto")) {
    return {
      ok: false,
      error:
        "No encontré la columna Concepto. Revisá que el archivo tenga los encabezados esperados (Fecha, Concepto, Importe, Clasificacion, Unidad de Neg, etc).",
    };
  }

  const filas: {
    numeroFila: number;
    fecha: Date;
    nroReferencia: string | null;
    causal: string | null;
    concepto: string;
    importe: number;
    saldo: number | null;
    bancoYCuenta: string;
    clasificacion: string;
    clasificacion2: string | null;
    unidadNegocio: string;
    detalle: string | null;
    detalle2: string | null;
    sugeridaPorSistema: boolean;
    chequeIvaAmbiguo: boolean;
    unidadSugeridaPorSistema: boolean;
  }[] = [];

  hoja.eachRow((fila, numeroFila) => {
    if (numeroFila === FILA_HEADERS) return;

    const valores: Record<string, unknown> = {};
    fila.eachCell((celda, colNumero) => {
      const campo = encabezados[colNumero];
      if (campo) valores[campo] = celda.value;
    });

    if (!valores.concepto && !valores.importe) return;

    const { valor: importeExtraido } = extraerImporte(valores.importe);
    if (importeExtraido === null) return;

    const { valor: saldoExtraido } = extraerSaldo(valores.saldo);

    const fechaValor = valores.fecha;
    const fecha =
      fechaValor instanceof Date
        ? fechaValor
        : new Date(String(fechaValor ?? new Date().toISOString()));

    const concepto = String(valores.concepto ?? "(sin concepto)");

    // Separado en variables (en vez de un solo ternario anidado) para poder
    // distinguir de dónde salió la clasificación: sugeridaPorSistema solo
    // queda en true cuando la propuso el motor de leyenda acá mismo — un
    // valor explícito del archivo o el fallback "SIN CLASIFICAR" no son una
    // sugerencia que alguien tenga que confirmar, son el dato real de Kike o
    // un vacío. Los cruces de más abajo (aplicarCruceLiquidacionFinal /
    // aplicarCruceChequeIva) vuelven a poner esto en true si terminan
    // pisando el valor de acá con el suyo propio.
    const clasificacionExplicita = valores.clasificacion
      ? normalizarClasificacion(String(valores.clasificacion))
      : null;
    const clasificacionAutomatica = clasificacionExplicita
      ? null
      : proponerClasificacionAutomatica(concepto);

    // Orden (decisión 2026-10-07):
    //   1. "UNIDAD DE NEG" con una unidad VÁLIDA de la lista → se respeta siempre
    //      (guardada con el nombre canónico: "SPP " → "SPP").
    //   2. mapa por cuenta bancaria (UNIDAD_POR_CUENTA) → sugerida.
    //   3. mapa por razón social (UNIDAD_POR_RAZON_SOCIAL) → sugerida. La razón
    //      social sale de la columna "EMPRESA" o, si "UNIDAD DE NEG" trae algo que
    //      no es una unidad de la lista (ej. "QUINTEROS" — error de etiqueta
    //      confirmado por Kike), de esa misma celda.
    //   4. "SIN ASIGNAR" (incluidas las razones sociales MIXTAS: LI, TUCSON,
    //      CREAR, CIELOS, LI RATIO — revisión manual).
    // "SIN ASIGNAR" literal en cualquiera de las dos columnas cuenta como vacío.
    const bancoYCuenta = valores.bancoYCuenta ? String(valores.bancoYCuenta) : "(sin banco)";
    const celdaUnidad = leerUnidadDeCelda(valores.unidadNegocio);
    const unidadExplicita = celdaUnidad ? unidadDeLaLista(celdaUnidad) : null;
    const unidadPorCuenta = unidadExplicita ? null : proponerUnidadPorCuenta(bancoYCuenta);
    const razonSocial =
      celdaUnidad && !unidadExplicita ? celdaUnidad : leerUnidadDeCelda(valores.empresaColumna);
    const unidadPorRazonSocial =
      unidadExplicita || unidadPorCuenta || !razonSocial ? null : proponerUnidadPorRazonSocial(razonSocial);

    filas.push({
      numeroFila,
      fecha,
      nroReferencia: valores.nroReferencia ? String(valores.nroReferencia) : null,
      causal: valores.causal ? String(valores.causal) : null,
      concepto,
      importe: importeExtraido,
      saldo: saldoExtraido,
      bancoYCuenta,
      clasificacion: clasificacionExplicita ?? clasificacionAutomatica ?? "SIN CLASIFICAR",
      clasificacion2: valores.clasificacion2 ? String(valores.clasificacion2) : null,
      unidadNegocio: unidadExplicita ?? unidadPorCuenta ?? unidadPorRazonSocial ?? "SIN ASIGNAR",
      detalle: valores.detalle ? String(valores.detalle) : null,
      detalle2: valores.detalle2 ? String(valores.detalle2) : null,
      sugeridaPorSistema: clasificacionAutomatica !== null,
      chequeIvaAmbiguo: false,
      unidadSugeridaPorSistema: unidadPorCuenta !== null || unidadPorRazonSocial !== null,
    });
  });

  if (filas.length === 0) {
    return { ok: false, error: "No encontré ninguna fila con datos para importar." };
  }

  // Sobre TODAS las filas del archivo (también las que ya estaban cargadas): la
  // continuidad es una propiedad del extracto en sí, y numeroFila (el orden real
  // del Excel) solo existe acá — no se guarda en la base.
  const continuidadSaldo = verificarContinuidadSaldo(filas);

  // Importe y saldo en centavos, redondeados igual que Postgres: es lo que entra
  // en la clave y, como texto decimal exacto, lo que se guarda (así lo guardado y
  // la clave nunca difieren por un centavo de float).
  const filasConClave = filas.map((f) => {
    const importeCentavos = centavosDeNumero(f.importe);
    const saldoCentavos = f.saldo === null ? null : centavosDeNumero(f.saldo);
    return {
      fila: f,
      importeCentavos,
      saldoCentavos,
      clave: claveMovimiento({
        fecha: f.fecha,
        importeCentavos,
        bancoYCuenta: f.bancoYCuenta,
        concepto: f.concepto,
        nroReferencia: f.nroReferencia,
        saldoCentavos,
      }),
    };
  });

  const fechaImporteCuentaEmpresa = await fechaImporteCuentaPromise;

  // Todo lo que decide qué se carga y la carga misma, dentro de UNA transacción con
  // un lock por presupuesto: dos subidas simultáneas al mismo período (dos
  // pestañas, dos personas) contarían el mismo M antes de que la otra inserte y
  // duplicarían. pg_advisory_xact_lock se libera solo al terminar la transacción
  // (compatible con el pooler de Neon en modo transacción). "SELECT 1 FROM ...":
  // pg_advisory_xact_lock devuelve void, que Prisma no sabe deserializar.
  // timeout 120s: el archivo real de 16.521 filas tardó ~24s por llamada en local
  // (2026-10-07); el margen cubre una base más lenta que la local.
  const resultado = await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${presupuesto.id}))`;

      // Reconocer lo ya cargado CONTANDO (ver lib/conteoMovimientos.ts): de cada
      // clave se cargan N − M. Lo ya cargado no se toca nunca — conserva
      // clasificación, unidad, prorrateo, ignorado y adjuntos, esté en una semana
      // cerrada o en la abierta.
      const yaCargadas = await obtenerClavesDelPresupuesto(tx, presupuesto.id);
      const { nuevas, cantidadYaCargadas } = separarNuevas(filasConClave, (f) => f.clave, yaCargadas);

      if (!confirmarCuentasCompartidas && nuevas.length > 0) {
        const cuentas = await buscarCuentasCompartidas(
          tx,
          empresa.id,
          nuevas.map((n) => ({ bancoYCuenta: n.fila.bancoYCuenta, clave: n.clave }))
        );
        if (cuentas.length > 0) {
          return {
            ok: false as const,
            requiereConfirmacionCuentas: true as const,
            cuentas,
            filasNuevas: nuevas.length,
            filasYaCargadas: cantidadYaCargadas,
          };
        }
      }

      // Casi-duplicados: solo entre las NUEVAS (las coincidencias exactas ya
      // quedaron reconocidas arriba y no se cargan). Se cargan igual.
      const casiDuplicados: PosibleDuplicado[] = nuevas
        .filter((n) =>
          fechaImporteCuentaEmpresa.has(
            claveFechaImporteCuenta(n.fila.fecha, n.importeCentavos, n.fila.bancoYCuenta)
          )
        )
        .map((n) => ({
          fila: n.fila.numeroFila,
          fecha: n.fila.fecha.toISOString().slice(0, 10),
          importe: n.fila.importe,
          bancoYCuenta: n.fila.bancoYCuenta,
          concepto: n.fila.concepto,
        }));

      const filasNuevas = nuevas.map((n) => n.fila);
      // Ambas mutan fila.clasificacion in-place cuando corresponde — tienen que
      // correr antes del createMany de abajo, y SOLO sobre las filas nuevas (las
      // ya cargadas no se tocan). Independientes entre sí (una mira Sueldos/
      // Liquidación final, la otra CHEQUE P/CAMARA) — no compiten por la misma fila.
      const liquidacionesAmbiguas =
        filasNuevas.length > 0 ? await aplicarCruceLiquidacionFinal(filasNuevas) : [];
      if (filasNuevas.length > 0) await aplicarCruceChequeIva(filasNuevas);

      if (nuevas.length > 0) {
        await tx.movimientoBancario.createMany({
          data: nuevas.map(({ fila, importeCentavos, saldoCentavos }) => ({
            ejecucionId: ejecucion.id,
            fecha: fila.fecha,
            nroReferencia: fila.nroReferencia,
            causal: fila.causal,
            concepto: fila.concepto,
            importe: decimalTextoDeCentavos(importeCentavos),
            saldo: saldoCentavos === null ? null : decimalTextoDeCentavos(saldoCentavos),
            bancoYCuenta: fila.bancoYCuenta,
            clasificacion: fila.clasificacion,
            clasificacion2: fila.clasificacion2,
            unidadNegocio: fila.unidadNegocio,
            detalle: fila.detalle,
            detalle2: fila.detalle2,
            sugeridaPorSistema: fila.sugeridaPorSistema,
            chequeIvaAmbiguo: fila.chequeIvaAmbiguo,
            unidadSugeridaPorSistema: fila.unidadSugeridaPorSistema,
          })),
        });
      }

      return {
        ok: true as const,
        filasNuevas: nuevas.length,
        filasYaCargadas: cantidadYaCargadas,
        posiblesDuplicados: casiDuplicados.slice(0, MAX_POSIBLES_DUPLICADOS),
        cantidadPosiblesDuplicados: casiDuplicados.length,
        continuidadSaldo,
        liquidacionesAmbiguas,
        hoja: hojaElegida ? hoja.name : undefined,
      };
    },
    { maxWait: 10_000, timeout: 120_000 }
  );

  if (resultado.ok && resultado.filasNuevas > 0) {
    revalidatePath(`/${empresaSlug}/${periodo}/ejecucion/${numeroSemana}`);
  }
  return resultado;
}

// Escribe únicamente MovimientoBancario.unidadNegocio (el valor único de la
// fila, editable inline en la tabla) — nunca toca MovimientoBancarioDesglose.
// Los dos son campos/tablas separados, sin punto de contacto: cambiar acá el
// valor de la fila no altera ni borra el reparto que pueda existir en
// guardarDesgloseMovimiento, y viceversa.
export async function actualizarMovimiento(
  empresaSlug: string,
  periodo: string,
  numeroSemana: number,
  id: string,
  datos: { clasificacion?: string; unidadNegocio?: string; ignorado?: boolean }
) {
  const { presupuesto } = await resolverPresupuestoParaOperar(empresaSlug, periodo);
  // Hallazgo 2026-09-08: hasta ahora esta acción no chequeaba el estado de la
  // semana — lo único que impedía editar una semana CERRADA era que la
  // página no te deja llegar a este componente (page.tsx renderiza un árbol
  // de solo lectura distinto cuando estado==="CERRADA"). Un llamado directo
  // a esta Server Action bypaseando la UI igual mutaba una semana cerrada.
  // Mismo criterio que guardarDesgloseMovimiento, que sí lo chequeaba.
  const ejecucion = await obtenerEjecucionPorSemana(presupuesto.id, numeroSemana);
  if (!ejecucion) {
    throw new Error(`No encontré la semana ${numeroSemana}.`);
  }
  if (ejecucion.estado === "CERRADA") {
    throw new Error("Esta semana ya está cerrada, no se puede editar.");
  }

  // Decisión 2026-10-06: solo cuenta como confirmación de una unidad sugerida si
  // el valor CAMBIÓ — reelegir el mismo valor no confirma nada. El <select> de
  // TablaMovimientos ya solo dispara con un cambio real; esta comparación es la
  // segunda barrera server-side, contra el valor realmente guardado.
  // Lista cerrada (decisión 2026-10-06): solo se acepta una unidad de
  // UNIDADES_NEGOCIO, o el valor que la fila ya tiene (un valor viejo fuera de
  // lista, ej. "CREAR", no se rompe — el <select> lo muestra como opción extra).
  let unidadCambio = false;
  if (datos.unidadNegocio !== undefined) {
    const actual = await prisma.movimientoBancario.findUnique({
      where: { id },
      select: { unidadNegocio: true },
    });
    unidadCambio = actual !== null && actual.unidadNegocio !== datos.unidadNegocio;
    if (unidadCambio && !esUnidadDeLaLista(datos.unidadNegocio)) {
      throw new Error(`"${datos.unidadNegocio}" no es una unidad de negocio de la lista.`);
    }
  }

  await prisma.movimientoBancario.update({
    where: { id },
    data: {
      ...datos,
      ...(unidadCambio ? { unidadSugeridaPorSistema: false } : {}),
      // Cualquier edición manual de clasificacion —incluso reelegir el mismo
      // valor que ya tenía sugerido— cuenta como confirmación. No puede
      // depender de comparar contra el valor anterior: un <select> nativo no
      // dispara onChange si el usuario reelige la opción ya seleccionada, así
      // que esto se limpia siempre que `clasificacion` viene en el payload,
      // sin excepción (ver PanelSugerenciasPendientes.tsx, botón "Confirmar").
      ...(datos.clasificacion !== undefined ? { sugeridaPorSistema: false } : {}),
    },
  });
  revalidatePath(`/${empresaSlug}/${periodo}/ejecucion/${numeroSemana}`);
}

export type ResultadoConfirmarClasificacionesEnLote =
  | { ok: true; cantidad: number }
  | { ok: false; error: string };

// Acepta tal cual TODAS las sugerencias de una clasificación en la semana
// (motor de leyenda / cruce de Liquidación final / cruce de cheques IVA) — no
// solo las de la página (decisión 2026-10-07): el panel se arma sobre toda la
// semana. Solo limpia sugeridaPorSistema, nunca toca `clasificacion` (el
// usuario confirma lo que ya ve; corregir pasa por actualizarMovimiento, fila
// por fila). chequeIvaAmbiguo:false en el where: un cheque con match ambiguo
// nunca se confirma en lote, solo de a uno.
export async function confirmarClasificacionesEnLote(
  empresaSlug: string,
  periodo: string,
  numeroSemana: number,
  clasificacion: string
): Promise<ResultadoConfirmarClasificacionesEnLote> {
  const { presupuesto } = await resolverPresupuestoParaOperar(empresaSlug, periodo);
  const ejecucion = await obtenerEjecucionPorSemana(presupuesto.id, numeroSemana);
  if (!ejecucion) {
    return { ok: false, error: `No encontré la semana ${numeroSemana}.` };
  }
  if (ejecucion.estado === "CERRADA") {
    return { ok: false, error: "Esta semana ya está cerrada, no se puede editar." };
  }
  const resultado = await prisma.movimientoBancario.updateMany({
    where: { ejecucionId: ejecucion.id, sugeridaPorSistema: true, clasificacion, chequeIvaAmbiguo: false },
    data: { sugeridaPorSistema: false },
  });
  if (resultado.count === 0) {
    return { ok: false, error: "No hay ninguna sugerencia para confirmar." };
  }

  revalidatePath(`/${empresaSlug}/${periodo}/ejecucion/${numeroSemana}`);
  return { ok: true, cantidad: resultado.count };
}

// Análogo a confirmarClasificacionesEnLote, pero para la unidad de negocio
// sugerida por cuenta bancaria (proponerUnidadPorCuenta): acepta tal cual todas
// las filas todavía sugeridas de esas cuentas en ESTA semana — solo limpia
// unidadSugeridaPorSistema, nunca toca `unidadNegocio`. Recibe las grafías
// crudas de bancoYCuenta (GrupoUnidadSugerida.cuentasCrudas), no ids: el panel
// agrupa sobre toda la semana, no sobre la página que se está viendo. Confirmar
// una cuenta que tiene sugerencias en varias páginas las confirma TODAS — el
// botón del panel muestra la cantidad total para que eso quede a la vista.
// unidadSugeridaPorSistema:true en el where hace que una fila corregida a mano
// entre medio (flag ya en false) no cuente en el resultado.
export async function confirmarUnidadesEnLote(
  empresaSlug: string,
  periodo: string,
  numeroSemana: number,
  cuentasCrudas: string[],
  unidadNegocio: string
): Promise<ResultadoConfirmarClasificacionesEnLote> {
  const { presupuesto } = await resolverPresupuestoParaOperar(empresaSlug, periodo);
  const ejecucion = await obtenerEjecucionPorSemana(presupuesto.id, numeroSemana);
  if (!ejecucion) {
    return { ok: false, error: `No encontré la semana ${numeroSemana}.` };
  }
  if (ejecucion.estado === "CERRADA") {
    return { ok: false, error: "Esta semana ya está cerrada, no se puede editar." };
  }
  if (cuentasCrudas.length === 0) {
    return { ok: false, error: "No hay ninguna sugerencia para confirmar." };
  }

  const resultado = await prisma.movimientoBancario.updateMany({
    where: {
      ejecucionId: ejecucion.id,
      unidadSugeridaPorSistema: true,
      bancoYCuenta: { in: cuentasCrudas },
      // Misma clave que el grupo del panel (cuenta + unidad): no confirma de
      // rebote una sugerencia distinta de la que el usuario está viendo.
      unidadNegocio,
    },
    data: { unidadSugeridaPorSistema: false },
  });

  revalidatePath(`/${empresaSlug}/${periodo}/ejecucion/${numeroSemana}`);
  return { ok: true, cantidad: resultado.count };
}

export async function eliminarMovimiento(
  empresaSlug: string,
  periodo: string,
  numeroSemana: number,
  id: string
) {
  const { presupuesto } = await resolverPresupuestoParaOperar(empresaSlug, periodo);
  // Mismo hueco que actualizarMovimiento (auditoría 2026-09-08): sin esto, lo
  // único que impedía borrar un movimiento de una semana CERRADA era que la
  // página no te deja llegar a este botón — un llamado directo a la Server
  // Action igual borraba la fila.
  const ejecucion = await obtenerEjecucionPorSemana(presupuesto.id, numeroSemana);
  if (!ejecucion) {
    throw new Error(`No encontré la semana ${numeroSemana}.`);
  }
  if (ejecucion.estado === "CERRADA") {
    throw new Error("Esta semana ya está cerrada, no se puede editar.");
  }

  await prisma.movimientoBancario.delete({ where: { id } });
  revalidatePath(`/${empresaSlug}/${periodo}/ejecucion/${numeroSemana}`);
}

type ResultadoDesgloseMovimiento =
  | { ok: true }
  | { ok: false; errores: Record<string, string> };

// Prorrateo de un movimiento entre varias unidades de negocio. Reemplaza el
// desglose completo — mismo patrón que guardarDesglose en presupuesto/actions.ts.
// Escribe MovimientoBancarioDesglose y, del movimiento, SOLO
// unidadSugeridaPorSistema (ver abajo) — nunca MovimientoBancario.unidadNegocio
// (el valor propio de la fila, que queda guardado detrás del resumen y se edita
// aparte vía actualizarMovimiento).
//
// Habilitado para TODAS las clasificaciones (pedido de Kike, 2026-10-06 — antes
// solo SUELDOS/EXPENSAS): ingresos y egresos por igual. Hoy ningún cálculo ni
// reporte lee esta tabla; el Reporte la va a usar en un paso aparte.
//
// El cliente (PanelDesgloseMovimiento) ya resolvió porcentajes → montos con
// lib/prorrateo.ts y manda cada línea en CENTAVOS ENTEROS, en magnitud positiva
// — no texto: parsearImporteArgentino lee "1234.56" como 123456 (el punto es
// separador de miles), así que un texto con punto decimal se guardaría mal en
// silencio. Acá la suma se compara en centavos con igualdad EXACTA.
export async function guardarDesgloseMovimiento(
  empresaSlug: string,
  periodo: string,
  numeroSemana: number,
  movimientoId: string,
  sublineas: { unidadNegocio: string; importeCentavos: number }[]
): Promise<ResultadoDesgloseMovimiento> {
  const { presupuesto } = await resolverPresupuestoParaOperar(empresaSlug, periodo);
  const ejecucion = await obtenerEjecucionPorSemana(presupuesto.id, numeroSemana);
  if (!ejecucion) {
    return { ok: false, errores: { general: `No encontré la semana ${numeroSemana}.` } };
  }

  const movimiento = await prisma.movimientoBancario.findUnique({
    where: { id: movimientoId },
    include: { desglose: { select: { unidadNegocio: true } } },
  });
  if (!movimiento || movimiento.ejecucionId !== ejecucion.id) {
    return { ok: false, errores: { general: "No encontré ese movimiento." } };
  }
  if (ejecucion.estado === "CERRADA") {
    return { ok: false, errores: { general: "Esta semana ya está cerrada, no se puede editar." } };
  }

  // MovimientoBancario.importe trae el signo del banco (negativo en un débito,
  // positivo en una cobranza); cada línea viaja como magnitud positiva y acá se
  // le aplica el signo del movimiento padre, para que un futuro reporte "por
  // unidad de negocio" que sume esta tabla obtenga el signo correcto.
  const totalCentavos = aCentavos(Number(movimiento.importe));
  if (totalCentavos === 0) {
    return { ok: false, errores: { general: "Un movimiento de $0 no se puede prorratear." } };
  }
  const signoMovimiento = Number(movimiento.importe) < 0 ? -1 : 1;

  // Lista cerrada, más los valores viejos fuera de lista que este desglose ya
  // tenía (no se rompe un desglose cargado antes de la lista — mismo criterio
  // que el <select> del panel).
  const unidadesPrevias = new Set(movimiento.desglose.map((d) => d.unidadNegocio));
  const limpias = sublineas.map((s) => ({
    unidadNegocio: s.unidadNegocio.trim(),
    importeCentavos: s.importeCentavos,
  }));

  const errores: Record<string, string> = {};
  if (limpias.length < 2) {
    errores.general = "Un prorrateo necesita al menos 2 unidades de negocio.";
  }
  const vistas = new Set<string>();
  limpias.forEach((s, i) => {
    if (!s.unidadNegocio) {
      errores[`unidadNegocio_${i}`] = "Elegí la unidad de negocio.";
    } else if (!esUnidadDeLaLista(s.unidadNegocio) && !unidadesPrevias.has(s.unidadNegocio)) {
      errores[`unidadNegocio_${i}`] = "No es una unidad de negocio de la lista.";
    } else if (vistas.has(s.unidadNegocio)) {
      errores[`unidadNegocio_${i}`] = "Esta unidad ya está en otra línea.";
    }
    vistas.add(s.unidadNegocio);
    if (!Number.isSafeInteger(s.importeCentavos) || s.importeCentavos <= 0) {
      errores[`importe_${i}`] = "El importe no puede estar vacío ni ser 0.";
    }
  });

  if (Object.keys(errores).length === 0) {
    const suma = limpias.reduce((acc, s) => acc + s.importeCentavos, 0);
    if (suma !== totalCentavos) {
      errores.general = `La suma del prorrateo ($${(suma / 100).toLocaleString("es-AR")}) tiene que coincidir con el importe del movimiento ($${(totalCentavos / 100).toLocaleString("es-AR")}).`;
    }
  }

  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  await prisma.$transaction([
    prisma.movimientoBancarioDesglose.deleteMany({ where: { movimientoId } }),
    prisma.movimientoBancarioDesglose.createMany({
      data: limpias.map((s) => ({
        movimientoId,
        unidadNegocio: s.unidadNegocio,
        importe: centavosADecimal(s.importeCentavos, signoMovimiento),
      })),
    }),
    // Prorratear ya es asignar unidades a mano: la unidad sugerida por la
    // cuenta (si la había) deja de estar pendiente y sale del panel de
    // unidades sugeridas. No toca el valor de unidadNegocio.
    prisma.movimientoBancario.update({
      where: { id: movimientoId },
      data: { unidadSugeridaPorSistema: false },
    }),
  ]);

  revalidatePath(`/${empresaSlug}/${periodo}/ejecucion/${numeroSemana}`);
  return { ok: true };
}

export async function eliminarDesgloseMovimiento(
  empresaSlug: string,
  periodo: string,
  numeroSemana: number,
  movimientoId: string
) {
  const { presupuesto } = await resolverPresupuestoParaOperar(empresaSlug, periodo);
  // Mismo hueco que actualizarMovimiento/eliminarMovimiento (auditoría
  // 2026-09-08) — guardarDesgloseMovimiento (la contraparte que reemplaza el
  // desglose) ya lo chequeaba; a esta le faltaba.
  const ejecucion = await obtenerEjecucionPorSemana(presupuesto.id, numeroSemana);
  if (!ejecucion) {
    throw new Error(`No encontré la semana ${numeroSemana}.`);
  }
  if (ejecucion.estado === "CERRADA") {
    throw new Error("Esta semana ya está cerrada, no se puede editar.");
  }

  // Hallazgo 2026-10-06: antes borraba por movimientoId sin verificar que el
  // movimiento fuera de esta semana — alguien con permiso de operar la empresa
  // A podía borrar el desglose de un movimiento de la empresa B pasando su id.
  // El where por ejecucionId lo acota a esta semana (de esta empresa).
  await prisma.movimientoBancarioDesglose.deleteMany({
    where: { movimientoId, movimiento: { ejecucionId: ejecucion.id } },
  });
  revalidatePath(`/${empresaSlug}/${periodo}/ejecucion/${numeroSemana}`);
}

type ResultadoCerrarSemana = { ok: true } | { ok: false; error: string };

// No se puede cerrar una semana que ya estaba CERRADA — sin este chequeo,
// una segunda invocación pisaría fechaCierre con una marca de tiempo más
// nueva sin que nada más lo justifique. Hallazgo del backlog (mismo criterio
// de defensa en profundidad que actualizarMovimiento/eliminarMovimiento/
// eliminarDesgloseMovimiento, commit 9e890a1) — hoy no hay ningún camino real
// en la UI para disparar esto (el botón "Cierre semanal" no se renderiza si
// la semana ya está cerrada), pero cubre el caso de invocar la Server Action
// directo.
export async function cerrarSemana(
  empresaSlug: string,
  periodo: string,
  numeroSemana: number
): Promise<ResultadoCerrarSemana> {
  const { presupuesto } = await resolverPresupuestoParaOperar(empresaSlug, periodo);
  const ejecucion = await obtenerEjecucionPorSemana(presupuesto.id, numeroSemana);
  if (!ejecucion) {
    throw new Error(`No encontré la semana ${numeroSemana}.`);
  }
  if (ejecucion.estado === "CERRADA") {
    return { ok: false, error: "Esta semana ya estaba cerrada." };
  }

  await prisma.ejecucionSemanal.update({
    where: { id: ejecucion.id },
    data: { estado: "CERRADA", fechaCierre: new Date() },
  });
  revalidatePath(`/${empresaSlug}/${periodo}/ejecucion/${numeroSemana}`);
  return { ok: true };
}
