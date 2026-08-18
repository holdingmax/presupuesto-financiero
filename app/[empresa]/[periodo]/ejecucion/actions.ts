"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
import { resolverEmpresaPorSlug, quitarDiacriticos } from "@/lib/slug";
import { obtenerOCrearPresupuesto } from "@/lib/presupuesto";
import { obtenerOCrearEjecucionAbierta, obtenerEjecucionPorSemana } from "@/lib/ejecucion";
import { requireAccesoEmpresa } from "@/lib/auth";
import { calcularClasificacionesDisponibles } from "@/lib/clasificaciones";

const NOMBRE_HOJA_EXTRACTO = "Hoja1";
const FILAS_POR_PAGINA = 200;

const COLUMNAS: Record<string, string> = {
  "FECHA": "fecha",
  "NRO REFERENCIA": "nroReferencia",
  "NRO. DE REFERENCIA": "nroReferencia",
  "NRO DE REFERENCIA": "nroReferencia",
  "CAUSAL": "causal",
  "CONCEPTO": "concepto",
  "IMPORTE": "importe",
  "SALDO": "saldo",
  "BANCO Y CTA": "bancoYCuenta",
  "DETALLE": "detalle",
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
  await requireAccesoEmpresa(empresa.id);
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
  };
}

// Único punto que crea una EjecucionSemanal: resuelve-o-crea la semana abierta y
// devuelve su número, para que la página índice (sin segmento numérico) redirija ahí.
export async function obtenerNumeroSemanaAbierta(empresaSlug: string, periodo: string) {
  const { presupuesto } = await resolverPresupuesto(empresaSlug, periodo);
  const ejecucion = await obtenerOCrearEjecucionAbierta(presupuesto.id);
  return ejecucion.numeroSemana;
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

  const { empresa, presupuesto } = await resolverPresupuesto(empresaSlug, periodo);
  const ejecucion = await obtenerEjecucionPorSemana(presupuesto.id, numeroSemana);

  if (!ejecucion) {
    return null;
  }

  // Agregación separada del fetch paginado: el total en pesos y el conteo de filas
  // tienen que representar TODA la semana, no solo la página que se está mostrando.
  // Esta sí tiene que ir antes del findMany (no en paralelo con él): el skip correcto
  // depende de totalPaginas, que depende de este resultado.
  const agregado = await prisma.movimientoBancario.aggregate({
    where: { ejecucionId: ejecucion.id },
    _sum: { importe: true },
    _count: true,
  });

  const totalMovimientos = agregado._count;
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
    clasificacionesDisponibles: await clasificacionesPromise,
    movimientos: movimientos.map(mapearMovimiento),
    totalMovimientos,
    totalImporte: Number(agregado._sum.importe ?? 0),
    pagina: paginaEfectiva,
    totalPaginas,
  };
}

type ResultadoImportar =
  | {
      ok: true;
      filasImportadas: number;
      posiblesDuplicados: { fila: number; fecha: string; importe: number }[];
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

  const { empresa, presupuesto } = await resolverPresupuesto(empresaSlug, periodo);
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

    filas.push({
      numeroFila,
      fecha,
      nroReferencia: valores.nroReferencia ? String(valores.nroReferencia) : null,
      causal: valores.causal ? String(valores.causal) : null,
      concepto: String(valores.concepto ?? "(sin concepto)"),
      importe: importeExtraido,
      saldo: saldoExtraido,
      bancoYCuenta: valores.bancoYCuenta ? String(valores.bancoYCuenta) : "(sin banco)",
      clasificacion: valores.clasificacion ? String(valores.clasificacion) : "SIN CLASIFICAR",
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

  await prisma.movimientoBancario.createMany({
    data: filas.map(({ numeroFila, ...resto }) => ({ ...resto, ejecucionId: ejecucion.id })),
  });

  revalidatePath(`/${empresaSlug}/${periodo}/ejecucion/${numeroSemana}`);
  return {
    ok: true,
    filasImportadas: filas.length,
    posiblesDuplicados,
    hoja: hojaElegida ? hoja.name : undefined,
  };
}

export async function actualizarMovimiento(
  empresaSlug: string,
  periodo: string,
  numeroSemana: number,
  id: string,
  datos: { clasificacion?: string; unidadNegocio?: string }
) {
  await resolverPresupuesto(empresaSlug, periodo);
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
  await resolverPresupuesto(empresaSlug, periodo);
  await prisma.movimientoBancario.delete({ where: { id } });
  revalidatePath(`/${empresaSlug}/${periodo}/ejecucion/${numeroSemana}`);
}

export async function cerrarSemana(empresaSlug: string, periodo: string, numeroSemana: number) {
  const { presupuesto } = await resolverPresupuesto(empresaSlug, periodo);
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
