"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
import { resolverEmpresaPorSlug, quitarDiacriticos } from "@/lib/slug";
import { obtenerOCrearPresupuesto } from "@/lib/presupuesto";
import { requireAccesoEmpresa } from "@/lib/auth";
import {
  calcularClasificacionesDisponibles,
  normalizarClasificacion,
  esElegibleParaDesglose,
} from "@/lib/clasificaciones";

// Mismo mapeo por nombre de columna que ya usa subirExtracto en
// ejecucion/actions.ts, adaptado a las 4 columnas de LineaPresupuesto.
const COLUMNAS_PRESUPUESTO: Record<string, string> = {
  "CONCEPTO": "concepto",
  "DETALLE": "detalle",
  "IMPORTE": "importe",
  "CLASIFICACION": "clasificacion",
};
const CAMPOS_REQUERIDOS = ["concepto", "detalle", "importe", "clasificacion"] as const;
const FILA_HEADERS = 1;

// Tolerante a tildes/mayúsculas/espacios: "Clasificación", "CLASIFICACION" y
// "clasificación" tienen que matchear la misma clave en COLUMNAS_PRESUPUESTO.
// El colapso de espacios múltiples cubre headers de una sola palabra igual
// (no hace nada distinto), pero importa para claves de varias palabras.
function normalizarEncabezado(texto: string) {
  return quitarDiacriticos(texto).trim().toUpperCase().replace(/\s+/g, " ");
}

// El layout de [empresa]/[periodo] ya garantiza, al renderizar la página, que
// el slug matchea una empresa real y que el usuario logueado tiene acceso a
// ella. Esta resolución (empresa + autorización) es defensiva para las
// Server Actions (agregarLinea/eliminarLinea/validarPresupuesto), que se
// invocan directo desde el cliente y no vuelven a pasar por el layout.
async function resolverEmpresaYPresupuesto(empresaSlug: string, periodo: string) {
  const empresa = await resolverEmpresaPorSlug(empresaSlug);
  if (!empresa) {
    throw new Error(`No existe una empresa para "${empresaSlug}".`);
  }
  await requireAccesoEmpresa(empresa.id);
  const presupuesto = await obtenerOCrearPresupuesto(empresa.id, periodo);
  return { empresa, presupuesto };
}

export async function obtenerDatos(empresaSlug: string, periodo: string) {
  // No depende de empresa/presupuesto (es una query global) — se dispara ya para que
  // corra en paralelo con la resolución de abajo, mismo patrón que obtenerDatosSemana
  // en ejecucion/actions.ts.
  const clasificacionesPromise = calcularClasificacionesDisponibles();

  const { empresa, presupuesto } = await resolverEmpresaYPresupuesto(empresaSlug, periodo);
  const lineas = await prisma.lineaPresupuesto.findMany({
    where: { presupuestoId: presupuesto.id },
    orderBy: { createdAt: "asc" },
    include: { desglose: { orderBy: { createdAt: "asc" } } },
  });

  return {
    empresaNombre: empresa.nombre,
    periodo: presupuesto.periodo,
    estado: presupuesto.estado,
    clasificacionesDisponibles: await clasificacionesPromise,
    lineas: lineas.map((l) => ({
      id: l.id,
      concepto: l.concepto,
      detalle: l.detalle,
      importe: Number(l.importe),
      clasificacion: l.clasificacion,
      desglose: l.desglose.map((d) => ({
        id: d.id,
        detalle: d.detalle,
        importe: Number(d.importe),
      })),
    })),
  };
}

type ResultadoAgregar =
  | { ok: true }
  | { ok: false; errores: Record<string, string> };

export async function agregarLinea(
  empresaSlug: string,
  periodo: string,
  datos: { concepto: string; detalle: string; importe: string; clasificacion: string }
): Promise<ResultadoAgregar> {
  const concepto = datos.concepto.trim();
  const detalle = datos.detalle.trim();
  const clasificacion = normalizarClasificacion(datos.clasificacion.trim());
  const importe = Number(datos.importe);

  const errores: Record<string, string> = {};
  if (!concepto) errores.concepto = "Completá el concepto.";
  if (!detalle) errores.detalle = "Completá el detalle.";
  if (!datos.importe.trim() || importe === 0 || Number.isNaN(importe)) {
    errores.importe = "El importe no puede estar vacío ni ser 0.";
  }
  if (!clasificacion) errores.clasificacion = "Elegí una clasificación.";

  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  const { presupuesto } = await resolverEmpresaYPresupuesto(empresaSlug, periodo);

  if (presupuesto.estado === "VALIDADO") {
    return {
      ok: false,
      errores: { general: "Este presupuesto ya está validado, no se puede editar." },
    };
  }

  await prisma.lineaPresupuesto.create({
    data: { presupuestoId: presupuesto.id, concepto, detalle, importe, clasificacion },
  });

  revalidatePath(`/${empresaSlug}/${periodo}/presupuesto`);
  return { ok: true };
}

export async function eliminarLinea(empresaSlug: string, periodo: string, id: string) {
  await resolverEmpresaYPresupuesto(empresaSlug, periodo);
  await prisma.lineaPresupuesto.delete({ where: { id } });
  revalidatePath(`/${empresaSlug}/${periodo}/presupuesto`);
}

type ResultadoDesglose =
  | { ok: true }
  | { ok: false; errores: Record<string, string> };

// Reemplaza el desglose completo de una línea (simplifica editar: el cliente
// siempre manda el estado final, no hace falta diffear sub-líneas existentes
// contra nuevas). La suma tiene que dar exactamente el importe de la línea
// padre — misma tolerancia (0.01) que ya usan los chequeos de suma-cero de
// Ejecución. Re-valida la elegibilidad server-side: no confiar en que el
// cliente no mande esto para una clasificación no habilitada.
export async function guardarDesglose(
  empresaSlug: string,
  periodo: string,
  lineaId: string,
  sublineas: { detalle: string; importe: string }[]
): Promise<ResultadoDesglose> {
  const { presupuesto } = await resolverEmpresaYPresupuesto(empresaSlug, periodo);

  const linea = await prisma.lineaPresupuesto.findUnique({ where: { id: lineaId } });
  if (!linea || linea.presupuestoId !== presupuesto.id) {
    return { ok: false, errores: { general: "No encontré esa línea." } };
  }
  if (presupuesto.estado === "VALIDADO") {
    return {
      ok: false,
      errores: { general: "Este presupuesto ya está validado, no se puede editar." },
    };
  }
  if (!esElegibleParaDesglose(linea.clasificacion)) {
    return {
      ok: false,
      errores: { general: "Esta clasificación no admite desglose." },
    };
  }

  const limpias = sublineas.map((s) => ({
    detalle: s.detalle.trim(),
    importe: Number(s.importe),
    importeCrudo: s.importe,
  }));

  const errores: Record<string, string> = {};
  if (limpias.length === 0) {
    errores.general = "Agregá al menos una sub-línea.";
  }
  limpias.forEach((s, i) => {
    if (!s.detalle) errores[`detalle_${i}`] = "Completá el detalle.";
    if (!s.importeCrudo.trim() || s.importe === 0 || Number.isNaN(s.importe)) {
      errores[`importe_${i}`] = "El importe no puede estar vacío ni ser 0.";
    }
  });

  if (Object.keys(errores).length === 0) {
    const suma = limpias.reduce((acc, s) => acc + s.importe, 0);
    const importeLinea = Number(linea.importe);
    if (Math.abs(suma - importeLinea) >= 0.01) {
      errores.general = `La suma del desglose ($${suma.toLocaleString("es-AR")}) tiene que coincidir con el importe de la línea ($${importeLinea.toLocaleString("es-AR")}).`;
    }
  }

  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  await prisma.$transaction([
    prisma.lineaPresupuestoDesglose.deleteMany({ where: { lineaPresupuestoId: lineaId } }),
    prisma.lineaPresupuestoDesglose.createMany({
      data: limpias.map((s) => ({
        lineaPresupuestoId: lineaId,
        detalle: s.detalle,
        importe: s.importe,
      })),
    }),
  ]);

  revalidatePath(`/${empresaSlug}/${periodo}/presupuesto`);
  return { ok: true };
}

export async function eliminarDesglose(empresaSlug: string, periodo: string, lineaId: string) {
  await resolverEmpresaYPresupuesto(empresaSlug, periodo);
  await prisma.lineaPresupuestoDesglose.deleteMany({ where: { lineaPresupuestoId: lineaId } });
  revalidatePath(`/${empresaSlug}/${periodo}/presupuesto`);
}

export async function validarPresupuesto(empresaSlug: string, periodo: string) {
  const { presupuesto } = await resolverEmpresaYPresupuesto(empresaSlug, periodo);
  await prisma.presupuestoMensual.update({
    where: { id: presupuesto.id },
    data: { estado: "VALIDADO", fechaValidacion: new Date() },
  });
  revalidatePath(`/${empresaSlug}/${periodo}/presupuesto`);
}

// Una celda con fórmula viene de ExcelJS como { formula, result, ... } en vez de un número plano.
function esObjetoConResultadoNumerico(valor: unknown): valor is { result: number } {
  return (
    typeof valor === "object" &&
    valor !== null &&
    "result" in valor &&
    typeof (valor as { result: unknown }).result === "number" &&
    Number.isFinite((valor as { result: number }).result)
  );
}

// A diferencia de extraerImporte en ejecucion/actions.ts, acá también se acepta una celda de
// texto (incluyendo formato argentino con coma decimal, ej. "150.000,50"), en vez de descartar
// la fila en silencio — ver el comentario sobre rechazo total más abajo.
function extraerImporte(valorCrudo: unknown): number | null {
  if (typeof valorCrudo === "number") {
    return Number.isFinite(valorCrudo) ? valorCrudo : null;
  }
  if (esObjetoConResultadoNumerico(valorCrudo)) {
    return valorCrudo.result;
  }
  if (typeof valorCrudo === "string") {
    const texto = valorCrudo.trim();
    if (!texto) return null;
    const normalizado = texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto;
    const numero = Number(normalizado);
    return Number.isFinite(numero) ? numero : null;
  }
  return null;
}

type ResultadoImportarLineas =
  | { ok: true; filasImportadas: number }
  | { ok: false; error: string; erroresPorFila?: { fila: number; error: string }[] };

// A diferencia de subirExtracto (que descarta en silencio las filas inválidas), acá se rechaza
// el archivo completo si alguna fila tiene datos incompletos — nada se importa hasta que el
// archivo esté 100% limpio. Es a propósito: el objetivo de esta pantalla es que el total
// coincida con un presupuesto ya aprobado, y una fila descartada en silencio produciría un
// total que parece válido pero está mal, mucho peor que un rechazo claro.
export async function subirLineasMasivo(
  empresaSlug: string,
  periodo: string,
  formData: FormData
): Promise<ResultadoImportarLineas> {
  const archivo = formData.get("archivo");

  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: "Elegí un archivo antes de subir." };
  }
  if (!archivo.name.toLowerCase().endsWith(".xlsx")) {
    return { ok: false, error: "El archivo tiene que ser un .xlsx." };
  }

  const { presupuesto } = await resolverEmpresaYPresupuesto(empresaSlug, periodo);
  if (presupuesto.estado === "VALIDADO") {
    return { ok: false, error: "Este presupuesto ya está validado, no se puede editar." };
  }

  const buffer = await archivo.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  // Plantilla propia, no un formato bancario con nombre de hoja fijo — siempre la primera hoja.
  const hoja = workbook.worksheets[0];
  if (!hoja) {
    return { ok: false, error: "El archivo no tiene ninguna hoja." };
  }

  const encabezados: Record<number, string> = {};
  const filaEncabezado = hoja.getRow(FILA_HEADERS);
  filaEncabezado.eachCell((celda, colNumero) => {
    const texto = normalizarEncabezado(String(celda.value ?? ""));
    const campo = COLUMNAS_PRESUPUESTO[texto];
    if (campo) encabezados[colNumero] = campo;
  });

  const columnasEncontradas = new Set(Object.values(encabezados));
  const faltantes = CAMPOS_REQUERIDOS.filter((campo) => !columnasEncontradas.has(campo));
  if (faltantes.length > 0) {
    return {
      ok: false,
      error: `Faltan columnas en el archivo: ${faltantes.join(", ")}. Los encabezados esperados son Concepto, Detalle, Importe y Clasificacion.`,
    };
  }

  const filas: { concepto: string; detalle: string; importe: number; clasificacion: string }[] = [];
  const erroresPorFila: { fila: number; error: string }[] = [];

  hoja.eachRow((fila, numeroFila) => {
    if (numeroFila === FILA_HEADERS) return;

    const valores: Record<string, unknown> = {};
    fila.eachCell((celda, colNumero) => {
      const campo = encabezados[colNumero];
      if (campo) valores[campo] = celda.value;
    });

    const concepto = String(valores.concepto ?? "").trim();
    const detalle = String(valores.detalle ?? "").trim();
    const clasificacion = normalizarClasificacion(String(valores.clasificacion ?? "").trim());
    const importeCrudo = valores.importe;

    // Fila completamente vacía (típico al final de una planilla): se saltea sin error.
    if (!concepto && !detalle && !clasificacion && importeCrudo == null) return;

    const importe = extraerImporte(importeCrudo);
    const problemas: string[] = [];
    if (!concepto) problemas.push("falta el concepto");
    if (!detalle) problemas.push("falta el detalle");
    if (importe === null || importe === 0) problemas.push("el importe no es un número válido o es 0");
    if (!clasificacion) problemas.push("falta la clasificación");

    if (problemas.length > 0) {
      erroresPorFila.push({ fila: numeroFila, error: problemas.join("; ") });
      return;
    }

    filas.push({ concepto, detalle, importe: importe as number, clasificacion });
  });

  if (erroresPorFila.length > 0) {
    return {
      ok: false,
      error: "El archivo tiene filas con datos incompletos — no se importó nada.",
      erroresPorFila,
    };
  }

  if (filas.length === 0) {
    return { ok: false, error: "No encontré ninguna fila con datos para importar." };
  }

  await prisma.lineaPresupuesto.createMany({
    data: filas.map((f) => ({ ...f, presupuestoId: presupuesto.id })),
  });

  revalidatePath(`/${empresaSlug}/${periodo}/presupuesto`);
  return { ok: true, filasImportadas: filas.length };
}
