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
}) {
  return {
    id: m.id,
    fecha: m.fecha.toISOString().slice(0, 10),
    concepto: m.concepto,
    importe: Number(m.importe),
    bancoYCuenta: m.bancoYCuenta,
    clasificacion: m.clasificacion,
    unidadNegocio: m.unidadNegocio,
    detalle: m.detalle ?? "",
    ignorado: m.ignorado,
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
export async function obtenerDatosSemana(
  empresaSlug: string,
  periodo: string,
  numeroSemana: number,
  pagina: number = 1
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
  const [agregadoTotal, agregadoSumaReal] = await Promise.all([
    prisma.movimientoBancario.aggregate({
      where: { ejecucionId: ejecucion.id },
      _count: true,
    }),
    prisma.movimientoBancario.aggregate({
      where: { ejecucionId: ejecucion.id, ignorado: false },
      _sum: { importe: true },
    }),
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
    where: { ejecucionId: ejecucion.id },
    orderBy: [{ fecha: "asc" }, { id: "asc" }],
    skip: (paginaEfectiva - 1) * FILAS_POR_PAGINA,
    take: FILAS_POR_PAGINA,
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
  };
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
// centavos que ya usa el resto del proyecto). Corre DESPUÉS de que la
// clasificación normal ya se resolvió (archivo / reglas automáticas / SIN
// CLASIFICAR) y la pisa solo cuando corresponde — nunca la deja peor de lo
// que ya estaba. Si hay más de un candidato posible para la misma clave y
// al menos uno es liquidación, no se aplica ningún override (no forzar una
// asignación ambigua) — se junta para la alerta en vez de arriesgar
// asignarlo a la persona equivocada.
async function aplicarCruceLiquidacionFinal(
  filas: { numeroFila: number; fecha: Date; importe: number; clasificacion: string }[]
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
    const clave = claveDuplicado(r.fecha, Number(r.importe));
    const grupo = porClave.get(clave);
    if (grupo) grupo.push(r);
    else porClave.set(clave, [r]);
  }

  const ambiguas: ResultadoLiquidacionAmbigua[] = [];

  for (const fila of filas) {
    const candidatos = porClave.get(claveDuplicado(fila.fecha, fila.importe));
    if (!candidatos) continue;

    if (candidatos.length === 1) {
      if (candidatos[0].esLiquidacionFinal) fila.clasificacion = "Liquidación final";
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

type ResultadoImportar =
  | {
      ok: true;
      filasImportadas: number;
      posiblesDuplicados: { fila: number; fecha: string; importe: number }[];
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
  | { ok: false; requiereSeleccionHoja: true; hojas: string[] };

function claveDuplicado(fecha: Date, importe: number) {
  return `${fecha.toISOString().slice(0, 10)}|${importe.toFixed(2)}`;
}

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

// Un solo round-trip para TODA la empresa (no por fila del Excel) — evita que un
// archivo de ~16.500 filas dispare 16.500 idas y vueltas a la base. Los 3 saltos del
// join (Empresa <- PresupuestoMensual <- EjecucionSemanal <- MovimientoBancario) ya
// tienen índice disponible hoy: @@unique([empresaId, periodo]), @@unique([presupuestoId,
// numeroSemana]) y @@index([ejecucionId]) respectivamente — no hace falta uno nuevo.
async function obtenerMovimientosExistentes(empresaId: string) {
  return prisma.$queryRaw<{ fecha: Date; importe: string }[]>`
    SELECT mb.fecha, mb.importe
    FROM "MovimientoBancario" mb
    JOIN "EjecucionSemanal" es ON mb."ejecucionId" = es.id
    JOIN "PresupuestoMensual" pm ON es."presupuestoId" = pm.id
    WHERE pm."empresaId" = ${empresaId}
  `;
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

export async function subirExtracto(
  empresaSlug: string,
  periodo: string,
  numeroSemana: number,
  formData: FormData,
  hojaElegida?: string
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
  // round-trip secuencial más.
  const existentesPromise = obtenerMovimientosExistentes(empresa.id);

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

  // Mismo criterio: algunos exports por empresa no traen "UNIDAD DE NEG" y en su lugar
  // tienen una columna "EMPRESA" con texto libre (ej. "QUINTEROS", "SIERRA") que en los
  // hechos cumple ese rol para ese archivo. Si el archivo sí trae "UNIDAD DE NEG" (el
  // caso normal, incluido el maestro), esto no cambia nada — "EMPRESA" queda ignorada
  // igual que hoy.
  if (!Object.values(encabezados).includes("unidadNegocio")) {
    const colEmpresa = Object.keys(encabezadosCrudos).find(
      (col) => encabezadosCrudos[Number(col)] === "EMPRESA" && !encabezados[Number(col)]
    );
    if (colEmpresa) {
      encabezados[Number(colEmpresa)] = "unidadNegocio";
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

    filas.push({
      numeroFila,
      fecha,
      nroReferencia: valores.nroReferencia ? String(valores.nroReferencia) : null,
      causal: valores.causal ? String(valores.causal) : null,
      concepto,
      importe: importeExtraido,
      saldo: saldoExtraido,
      bancoYCuenta: valores.bancoYCuenta ? String(valores.bancoYCuenta) : "(sin banco)",
      clasificacion: valores.clasificacion
        ? normalizarClasificacion(String(valores.clasificacion))
        : proponerClasificacionAutomatica(concepto) ?? "SIN CLASIFICAR",
      clasificacion2: valores.clasificacion2 ? String(valores.clasificacion2) : null,
      // .trim(): un mismo valor puede llegar con espacio final por archivo (ej. "SIERRA "
      // vs "SIERRA") y sin esto quedaban como dos unidades de negocio distintas en la base.
      unidadNegocio: valores.unidadNegocio ? String(valores.unidadNegocio).trim() : "SIN ASIGNAR",
      detalle: valores.detalle ? String(valores.detalle) : null,
      detalle2: valores.detalle2 ? String(valores.detalle2) : null,
    });
  });

  if (filas.length === 0) {
    return { ok: false, error: "No encontré ninguna fila con datos para importar." };
  }

  // No bloquea la carga — solo avisa. El usuario decide si la fila realmente es un
  // duplicado (extracto subido dos veces) o una coincidencia real (dos movimientos
  // distintos con la misma fecha e importe pasa, ej. dos sueldos iguales el mismo día).
  const existentes = new Set(
    (await existentesPromise).map((m) => claveDuplicado(m.fecha, Number(m.importe)))
  );
  const posiblesDuplicados = filas
    .filter((f) => existentes.has(claveDuplicado(f.fecha, f.importe)))
    .map((f) => ({
      fila: f.numeroFila,
      fecha: f.fecha.toISOString().slice(0, 10),
      importe: f.importe,
    }));

  // Sobre las mismas filas en memoria, antes de descartar numeroFila para el createMany.
  const continuidadSaldo = verificarContinuidadSaldo(filas);

  // Muta fila.clasificacion in-place cuando corresponde — tiene que correr
  // antes del createMany de abajo.
  const liquidacionesAmbiguas = await aplicarCruceLiquidacionFinal(filas);

  await prisma.movimientoBancario.createMany({
    data: filas.map(({ numeroFila, ...resto }) => ({ ...resto, ejecucionId: ejecucion.id })),
  });

  revalidatePath(`/${empresaSlug}/${periodo}/ejecucion/${numeroSemana}`);
  return {
    ok: true,
    filasImportadas: filas.length,
    posiblesDuplicados,
    continuidadSaldo,
    liquidacionesAmbiguas,
    hoja: hojaElegida ? hoja.name : undefined,
  };
}

export async function actualizarMovimiento(
  empresaSlug: string,
  periodo: string,
  numeroSemana: number,
  id: string,
  datos: { clasificacion?: string; unidadNegocio?: string; ignorado?: boolean }
) {
  await resolverPresupuestoParaOperar(empresaSlug, periodo);
  await prisma.movimientoBancario.update({
    where: { id },
    data: datos,
  });
  revalidatePath(`/${empresaSlug}/${periodo}/ejecucion/${numeroSemana}`);
}

export async function eliminarMovimiento(
  empresaSlug: string,
  periodo: string,
  numeroSemana: number,
  id: string
) {
  await resolverPresupuestoParaOperar(empresaSlug, periodo);
  await prisma.movimientoBancario.delete({ where: { id } });
  revalidatePath(`/${empresaSlug}/${periodo}/ejecucion/${numeroSemana}`);
}

export async function cerrarSemana(empresaSlug: string, periodo: string, numeroSemana: number) {
  const { presupuesto } = await resolverPresupuestoParaOperar(empresaSlug, periodo);
  const ejecucion = await obtenerEjecucionPorSemana(presupuesto.id, numeroSemana);
  if (!ejecucion) {
    throw new Error(`No encontré la semana ${numeroSemana}.`);
  }
  await prisma.ejecucionSemanal.update({
    where: { id: ejecucion.id },
    data: { estado: "CERRADA", fechaCierre: new Date() },
  });
  revalidatePath(`/${empresaSlug}/${periodo}/ejecucion/${numeroSemana}`);
}
