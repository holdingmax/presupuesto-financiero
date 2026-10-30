import { EMPRESAS_CON_TIPEO_DIRECTO, EMPRESAS_QUE_VEN_DISPONIBILIDADES_EN_REPORTE } from "@/lib/config";
import { camposManuales, type Bloque, type CampoManual, type Plantilla } from "@/lib/reporte/motor";
import { formatearCentavos, motivoBloqueo, motivoRechazoCambio, type EstadoSemanas } from "@/lib/reporte/bloqueo";

// Tipeo directo en el Reporte del Real manual (ADMIN y FINANZAS). Puro: sin Prisma ni next/*, para poder
// probarlo. Define qué celdas se pueden tipear, cuáles de ellas viajan a la pantalla y qué rechaza el
// servidor. El guardado lo hace guardarValoresManuales (reporte/carga/actions.ts), que no se modifica: ahí
// viven la validación contra la plantilla, los importes (lib/importes.ts) y la regla de bloqueo.

export type InterruptoresTipeo = {
  tipeo: readonly string[];
  disponibilidades: readonly string[];
};

const DE_CONFIG: InterruptoresTipeo = {
  tipeo: EMPRESAS_CON_TIPEO_DIRECTO,
  disponibilidades: EMPRESAS_QUE_VEN_DISPONIBILIDADES_EN_REPORTE,
};

// Cierre es reservado y no se tipea desde acá (su Capital de trabajo tiene otro camino).
const BLOQUES_DE_FLUJO: readonly Bloque[] = ["INGRESOS", "EGRESOS", "ABAJO"];

export function tipeoDirectoActivo(empresaSlug: string, interruptores: InterruptoresTipeo = DE_CONFIG): boolean {
  return interruptores.tipeo.includes(empresaSlug);
}

// Campos de Real manual que se pueden tipear en el Reporte de esta empresa. Sin interruptor, ninguno. Los
// de Disponibilidades solo si la empresa también ve ese bloque.
export function camposTipeables(
  plantilla: Plantilla,
  empresaSlug: string,
  interruptores: InterruptoresTipeo = DE_CONFIG
): CampoManual[] {
  if (!tipeoDirectoActivo(empresaSlug, interruptores)) return [];
  const conDisponibilidades = interruptores.disponibilidades.includes(empresaSlug);
  return camposManuales(plantilla).filter(
    (c) =>
      c.columna === "REAL" &&
      (c.bloque === "DISPONIBILIDADES" ? conDisponibilidades : BLOQUES_DE_FLUJO.includes(c.bloque))
  );
}

// Una celda editable que viaja a la pantalla. Las que el bloqueo deja en solo lectura (valor ya cargado en
// un período cerrado) NO viajan: el Reporte las muestra como siempre.
export type CeldaTipeo = {
  clave: string;
  texto: string;
  // "1.234,56" (formato argentino, el mismo que acepta leerCuenta) o "" si no hay valor.
  importeInicial: string;
  // Período cerrado sin valor cargado: se puede cargar una sola vez.
  avisoUnaVez: boolean;
};

export type VistaTipeo = {
  celdas: CeldaTipeo[];
  // Cambia cuando cambian los valores guardados: la pantalla reemplaza lo tipeado por lo guardado.
  huella: string;
};

export type EntradaVistaTipeo = {
  empresaSlug: string;
  plantilla: Plantilla;
  esAdminOFinanzas: boolean;
  // Mes de la URL (la última columna) y mes de hoy.
  periodo: string;
  actual: string;
  semanas: EstadoSemanas;
  // Real manual guardado del mes: filaClave → centavos.
  valoresReales: ReadonlyMap<string, number>;
  interruptores?: InterruptoresTipeo;
};

// null = el Reporte no lleva ninguna celda editable de este tipo. Quien no es ADMIN ni FINANZAS recibe
// null SIEMPRE, con el interruptor que sea: ni celdas, ni claves, ni valores.
export function armarVistaTipeo(e: EntradaVistaTipeo): VistaTipeo | null {
  if (!e.esAdminOFinanzas) return null;
  const celdas: CeldaTipeo[] = [];
  for (const c of camposTipeables(e.plantilla, e.empresaSlug, e.interruptores)) {
    const existente = e.valoresReales.get(c.clave);
    const bloqueo = motivoBloqueo({
      periodo: e.periodo,
      actual: e.actual,
      columna: "REAL",
      bloque: c.bloque,
      presupuestoValidado: false,
      semanas: e.semanas,
    });
    // Carga única en cerrado: crear sí, modificar o borrar un valor ya cargado no. Sin override.
    if (motivoRechazoCambio(bloqueo, existente !== undefined) !== null) continue;
    celdas.push({
      clave: c.clave,
      texto: c.texto.trim(),
      importeInicial: existente === undefined ? "" : formatearCentavos(existente),
      avisoUnaVez: bloqueo !== null,
    });
  }
  if (celdas.length === 0) return null;
  return { celdas, huella: celdas.map((c) => `${c.clave}=${c.importeInicial}`).join("|") };
}

export type EntradaTipeo = { filaClave: string; columna: "PRESUPUESTADO" | "REAL"; texto: string };

// Lo que el servidor rechaza ANTES de delegar en guardarValoresManuales. null = se puede seguir.
export function motivoRechazoTipeo(args: {
  empresaSlug: string;
  plantilla: Plantilla;
  esAdminOFinanzas: boolean;
  entradas: readonly EntradaTipeo[];
  interruptores?: InterruptoresTipeo;
}): string | null {
  if (!args.esAdminOFinanzas) return "Solo ADMIN y FINANZAS pueden cargar valores desde el Reporte.";
  if (!tipeoDirectoActivo(args.empresaSlug, args.interruptores)) {
    return "El tipeo directo en el Reporte no está habilitado para esta empresa.";
  }
  const permitidos = new Set(camposTipeables(args.plantilla, args.empresaSlug, args.interruptores).map((c) => c.clave));
  for (const e of args.entradas) {
    if (e.columna !== "REAL" || !permitidos.has(e.filaClave)) {
      return `"${e.filaClave}" no se puede tipear desde el Reporte.`;
    }
  }
  return null;
}
