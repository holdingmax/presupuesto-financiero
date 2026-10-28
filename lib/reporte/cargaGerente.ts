import {
  CLASIFICACIONES_PRESUPUESTO_UNICAS,
  type OpcionClasificacionPresupuesto,
} from "@/app/[empresa]/[periodo]/presupuesto/clasificacionesPresupuesto";
import { formatearCentavos, parsearCuenta } from "@/lib/reporte/bloqueo";
import { claveEquivalencia, type Bloque, type FilaLinea, type Plantilla } from "@/lib/reporte/motor";

// Reglas puras (sin Prisma ni next/*) de la carga del Presupuestado directo en el Reporte
// (Etapa 2): qué celdas se pueden editar, por qué otras no, y cómo se interpreta lo tipeado.
// Las usan A/reporte/page.tsx (para armar la pantalla) y aplicarCarga.ts (que guarda). El
// servidor recalcula el plan con lo que hay en la base: el cliente nunca decide qué es editable.

// Solo las filas de estos bloques se cargan: Disponibilidades y Cierre son reservados.
export const BLOQUES_CARGABLES: readonly Bloque[] = ["INGRESOS", "EGRESOS", "ABAJO"];

// Detalle de las líneas que crea la carga desde el Reporte (concepto = texto de la fila).
export const DETALLE_CARGA_DESDE_REPORTE = "Carga desde el Reporte";

// ---------------------------------------------------------------------------------------------
// Importes. Los negativos se rechazan en UN solo lugar (permiteNegativos): si Kike cambia la
// regla, se cambia acá y nada más.
// ---------------------------------------------------------------------------------------------

export const MENSAJE_IMPORTE_NEGATIVO = "Los importes se cargan en positivo.";

// El gerente carga todo en positivo (un egreso se tipea positivo, como en Presupuesto);
// ADMIN y FINANZAS pueden cargar un negativo (una devolución, un ajuste).
export function permiteNegativos(esAdminOFinanzas: boolean): boolean {
  return esAdminOFinanzas;
}

// Tope de la columna Decimal(18,2), con margen.
const MAX_CENTAVOS = 1e15;

export type ImporteCarga =
  // centavos null = borrar la línea (vacío o 0).
  { ok: true; centavos: number | null } | { ok: false; error: string };

export function validarImporteCarga(texto: string, esAdminOFinanzas: boolean): ImporteCarga {
  if (typeof texto !== "string" || texto.trim() === "") return { ok: true, centavos: null };
  const cuenta = parsearCuenta(texto);
  if (!cuenta) return { ok: false, error: `No entiendo el importe: ${texto.trim()}` };
  if (cuenta.centavos === 0) return { ok: true, centavos: null };
  if (cuenta.centavos < 0 && !permiteNegativos(esAdminOFinanzas)) {
    return { ok: false, error: MENSAJE_IMPORTE_NEGATIVO };
  }
  if (Math.abs(cuenta.centavos) >= MAX_CENTAVOS) return { ok: false, error: "El importe es demasiado grande." };
  return { ok: true, centavos: cuenta.centavos };
}

export const MAX_ACLARACION = 200;

export type AclaracionCarga = { ok: true; detalle: string } | { ok: false; error: string };

// "Otros" sin explicación no le sirve a nadie (decisión 2026-10-07): al cargar un solo número,
// la aclaración obligatoria hace de detalle de la línea.
export function validarAclaracion(texto: string | undefined): AclaracionCarga {
  const detalle = typeof texto === "string" ? texto.trim() : "";
  if (!detalle) return { ok: false, error: "Para «Otros» explicá qué es este gasto." };
  if (detalle.length > MAX_ACLARACION) {
    return { ok: false, error: `La aclaración es demasiado larga (máximo ${MAX_ACLARACION} caracteres).` };
  }
  return { ok: true, detalle };
}

export function requiereAclaracion(categoria: string): boolean {
  return claveEquivalencia(categoria) === claveEquivalencia("OTROS");
}

// ---------------------------------------------------------------------------------------------
// Plan de edición: qué celdas son editables y por qué las otras no.
// ---------------------------------------------------------------------------------------------

// Una LineaPresupuesto del mes, con lo mínimo que necesita el plan.
export type LineaParaCarga = {
  id: string;
  clasificacion: string;
  detalle: string;
  importeCentavos: number;
  tieneDesglose: boolean;
};

export type CeldaCarga =
  | {
      modo: "editable";
      // Clasificación en la que se guarda: la de la línea existente o, si no hay, la primera
      // categoría de la fila.
      categoria: string;
      // Concepto de la línea nueva.
      texto: string;
      lineaId: string | null;
      valorCentavos: number | null;
      requiereAclaracion: boolean;
      aclaracionInicial: string;
    }
  | {
      modo: "soloLectura";
      valorCentavos: number;
      // Texto corto para mostrar en la celda (no una celda muda).
      motivo: string;
    };

export const SE_CARGA_EN_PRESUPUESTO = "se carga en Presupuesto";

// Planifica UNA celda: `categorias` son las clasificaciones de la fila (la primera es donde se
// guarda una carga nueva) y `lineas` todas las del mes. Una línea cuenta para la fila si su
// clasificación es equivalente (mismos alias que usa el motor) a alguna de las categorías.
export function planCelda(categorias: readonly string[], texto: string, lineas: readonly LineaParaCarga[]): CeldaCarga {
  const claves = categorias.map(claveEquivalencia);
  const delasFila = lineas.filter((l) => claves.includes(claveEquivalencia(l.clasificacion)));
  const total = delasFila.reduce((acc, l) => acc + l.importeCentavos, 0);
  const primera = categorias[0];

  if (delasFila.length === 0) {
    return {
      modo: "editable",
      categoria: primera,
      texto,
      lineaId: null,
      valorCentavos: null,
      requiereAclaracion: requiereAclaracion(primera),
      aclaracionInicial: "",
    };
  }
  if (delasFila.length > 1) {
    return { modo: "soloLectura", valorCentavos: total, motivo: `varias líneas · ${SE_CARGA_EN_PRESUPUESTO}` };
  }
  const linea = delasFila[0];
  if (linea.tieneDesglose) {
    return { modo: "soloLectura", valorCentavos: total, motivo: `con desglose · ${SE_CARGA_EN_PRESUPUESTO}` };
  }
  // Fila de 2 categorías (Liquidación final + Juicios): se guarda en la primera; si la línea
  // está en la otra, no se mueve en silencio.
  if (claveEquivalencia(linea.clasificacion) !== claves[0]) {
    return {
      modo: "soloLectura",
      valorCentavos: total,
      motivo: `cargado como ${linea.clasificacion} · ${SE_CARGA_EN_PRESUPUESTO}`,
    };
  }
  const pideAclaracion = requiereAclaracion(linea.clasificacion);
  return {
    modo: "editable",
    categoria: linea.clasificacion,
    texto,
    lineaId: linea.id,
    valorCentavos: linea.importeCentavos,
    requiereAclaracion: pideAclaracion,
    // El detalle de la línea existente, para no tener que volver a escribirlo.
    aclaracionInicial: pideAclaracion && linea.detalle !== DETALLE_CARGA_DESDE_REPORTE ? linea.detalle : "",
  };
}

export function esFilaDeCategoria(fila: Plantilla["filas"][number]): fila is FilaLinea & {
  presupuesto: { tipo: "categorias"; categorias: string[] };
} {
  return fila.tipo === "linea" && fila.presupuesto.tipo === "categorias" && BLOQUES_CARGABLES.includes(fila.bloque);
}

// Categorías de la lista de Presupuesto que ninguna fila de la plantilla recoge. Hoy ese
// dinero está en la barra de Presupuesto pero no en el Reporte.
export function categoriasSinFila(plantilla: Plantilla): OpcionClasificacionPresupuesto[] {
  const cubiertas = new Set<string>();
  for (const f of plantilla.filas) {
    if (f.tipo === "linea" && f.presupuesto.tipo === "categorias") {
      f.presupuesto.categorias.forEach((c) => cubiertas.add(claveEquivalencia(c)));
    }
  }
  return CLASIFICACIONES_PRESUPUESTO_UNICAS.filter((o) => !cubiertas.has(claveEquivalencia(o.valorPersistido)));
}

export type PlanCarga = {
  // filaClave → celda, solo de las filas de categoría.
  filas: Record<string, CeldaCarga>;
  sinFila: { categoria: string; texto: string; celda: CeldaCarga }[];
  // Líneas con una clasificación que no es de la lista ni de ninguna fila (datos viejos):
  // se muestran en solo lectura para que nada quede invisible.
  fueraDeLista: { centavos: number; lineas: number } | null;
};

export function planDeCarga(plantilla: Plantilla, lineas: readonly LineaParaCarga[]): PlanCarga {
  const filas: Record<string, CeldaCarga> = {};
  const conocidas = new Set<string>();
  for (const f of plantilla.filas) {
    if (f.tipo === "linea" && f.presupuesto.tipo === "categorias") {
      f.presupuesto.categorias.forEach((c) => conocidas.add(claveEquivalencia(c)));
    }
    if (esFilaDeCategoria(f)) filas[f.clave] = planCelda(f.presupuesto.categorias, f.texto.trim(), lineas);
  }
  const sinFila = categoriasSinFila(plantilla).map((o) => {
    conocidas.add(claveEquivalencia(o.valorPersistido));
    return { categoria: o.valorPersistido, texto: o.textoVisible, celda: planCelda([o.valorPersistido], o.textoVisible, lineas) };
  });
  const sueltas = lineas.filter((l) => !conocidas.has(claveEquivalencia(l.clasificacion)));
  return {
    filas,
    sinFila,
    fueraDeLista:
      sueltas.length === 0
        ? null
        : { centavos: sueltas.reduce((acc, l) => acc + l.importeCentavos, 0), lineas: sueltas.length },
  };
}

// Lo que el cliente manda por cada celda que cambió. `clave` = filaClave (destino "fila") o la
// categoría (destino "sinFila"). Nunca se manda un id de línea: el servidor la busca.
export type EntradaCarga = {
  destino: "fila" | "sinFila";
  clave: string;
  // Lo tipeado en la celda, tal cual ("1.234,56", "100+50", "" para vaciar).
  importe: string;
  aclaracion?: string;
};

// Nombre para mostrar en los mensajes de error: el texto de la fila de la plantilla o el de
// la categoría. Si no se encuentra, la clave.
export function nombreDeEntrada(plantilla: Plantilla, entrada: Pick<EntradaCarga, "destino" | "clave">): string {
  if (entrada.destino === "fila") {
    const fila = plantilla.filas.find((f) => f.clave === entrada.clave);
    return fila && fila.tipo !== "titulo" ? fila.texto.trim() : entrada.clave;
  }
  return categoriasSinFila(plantilla).find((o) => o.valorPersistido === entrada.clave)?.textoVisible ?? entrada.clave;
}

// La celda del plan a la que apunta una entrada (null = no existe o no es cargable).
export function celdaDeEntrada(plan: PlanCarga, entrada: Pick<EntradaCarga, "destino" | "clave">): CeldaCarga | null {
  if (entrada.destino === "fila") return Object.hasOwn(plan.filas, entrada.clave) ? plan.filas[entrada.clave] : null;
  return plan.sinFila.find((s) => s.categoria === entrada.clave)?.celda ?? null;
}

// ---------------------------------------------------------------------------------------------
// Vista para el cliente: valores ya formateados y lo mínimo que necesita la pantalla.
// ---------------------------------------------------------------------------------------------

// Una celda editable (la pantalla guarda y compara contra los valores iniciales).
export type CeldaVistaCarga = {
  id: string; // "fila|<filaClave>" o "sinFila|<categoría>"
  destino: "fila" | "sinFila";
  clave: string;
  requiereAclaracion: boolean;
  importeInicial: string;
  aclaracionInicial: string;
};

export type FilaSinFilaVista = {
  id: string;
  texto: string;
  // null = editable; si no, el motivo de solo lectura y el valor a mostrar.
  soloLectura: { motivo: string; valor: string } | null;
};

export type VistaCarga = {
  celdas: CeldaVistaCarga[];
  // filaClave → motivo de solo lectura (las filas editables no aparecen).
  motivosFilas: Record<string, string>;
  sinFila: FilaSinFilaVista[];
  fueraDeLista: { valor: string; lineas: number } | null;
  // Cambia cuando cambia algún valor guardado: la pantalla repone lo tipeado con lo guardado.
  huella: string;
};

export function idCelda(destino: "fila" | "sinFila", clave: string): string {
  return `${destino}|${clave}`;
}

export function vistaDeCarga(plan: PlanCarga): VistaCarga {
  const celdas: CeldaVistaCarga[] = [];
  const motivosFilas: Record<string, string> = {};
  const agregar = (destino: "fila" | "sinFila", clave: string, celda: CeldaCarga) => {
    if (celda.modo !== "editable") return;
    celdas.push({
      id: idCelda(destino, clave),
      destino,
      clave,
      requiereAclaracion: celda.requiereAclaracion,
      importeInicial: celda.valorCentavos === null ? "" : formatearCentavos(celda.valorCentavos),
      aclaracionInicial: celda.aclaracionInicial,
    });
  };
  for (const [clave, celda] of Object.entries(plan.filas)) {
    if (celda.modo === "soloLectura") motivosFilas[clave] = celda.motivo;
    else agregar("fila", clave, celda);
  }
  const sinFila = plan.sinFila.map((s): FilaSinFilaVista => {
    agregar("sinFila", s.categoria, s.celda);
    return {
      id: idCelda("sinFila", s.categoria),
      texto: s.texto,
      soloLectura:
        s.celda.modo === "soloLectura"
          ? { motivo: s.celda.motivo, valor: formatearCentavos(s.celda.valorCentavos) }
          : null,
    };
  });
  const fueraDeLista = plan.fueraDeLista
    ? { valor: formatearCentavos(plan.fueraDeLista.centavos), lineas: plan.fueraDeLista.lineas }
    : null;
  const huella = JSON.stringify([
    celdas.map((c) => [c.id, c.importeInicial, c.aclaracionInicial]),
    motivosFilas,
    sinFila.map((s) => s.soloLectura),
    fueraDeLista,
  ]);
  return { celdas, motivosFilas, sinFila, fueraDeLista, huella };
}
