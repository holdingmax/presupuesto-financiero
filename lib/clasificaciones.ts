import { prisma } from "@/lib/prisma";
import { quitarDiacriticos } from "@/lib/slug";

// Variantes reales confirmadas (con Kike, 2026-08-27) que hay que unificar antes
// de guardar — la clave es el valor normalizado (sin tildes, mayúsculas, espacios
// colapsados) tal como puede venir de un archivo real; el valor es el nombre
// canónico que se persiste. Diccionario pensado para crecer: cada entrada nueva
// es un caso puntual confirmado contra un archivo real, no una adivinanza (mismo
// criterio que COLUMNAS en ejecucion/actions.ts).
//
// "COMISIONES Y GASTOS BANCARIOS" viene así, tal cual, en
// PF_-_BRADENTON_-_AGOSTO_2026.xlsx (hojas "EJECUCION RESUMEN-GTOS" y "CHASE")
// — mismo concepto que "Gastos bancarios", no una clasificación nueva. Ojo: es
// coincidencia EXACTA de la clave completa, no substring — un texto compuesto
// como "COMISIONES Y GASTOS BANCARIOS- IMP AL CHEQUE- IMP. VS" (visto en
// PF_-_FREDY_-_AGOSTO_2026.xlsx) NO matchea esta clave y pasa sin tocar, tal
// como debe ser: mezcla varios conceptos en una celda, no es esta clasificación.
const MAPEO_CLASIFICACION: Record<string, string> = {
  "COMISIONES Y GASTOS BANCARIOS": "Gastos bancarios",
};

export function normalizarClasificacion(valorCrudo: string): string {
  const clave = quitarDiacriticos(valorCrudo).trim().toUpperCase().replace(/\s+/g, " ");
  return MAPEO_CLASIFICACION[clave] ?? valorCrudo;
}

// Rubros habilitados para desglosar una línea de presupuesto en varios
// conceptos (pedido explícito: solo Impuestos/Proveedores, no el resto).
// Valores canónicos reales de CLASIFICACIONES_SUGERIDAS, no los nombres
// amigables "Impuestos"/"Proveedores" — esos no existen como valor en el
// sistema hoy (ver comentario arriba sobre por qué siguen separados).
//
// Clasificación es texto libre (datalist, no un <select> cerrado): si algún
// día aparece una variante real no detectada de estos dos valores (revisado
// 2026-08-31: 0 variantes en ~29.000 filas reales de MovimientoBancario +
// LineaPresupuesto en testing), agregarla a normalizarClasificacion() como
// caso confirmado — mismo criterio que se usó con "Gastos bancarios". No
// implementar detección difusa (similitud/distancia) de forma especulativa
// sin un caso real primero.
const CLASIFICACIONES_CON_DESGLOSE = ["IMP Y PREVISIONALES", "PROV Y SERV"];

export function esElegibleParaDesglose(clasificacion: string): boolean {
  const clave = quitarDiacriticos(clasificacion).trim().toUpperCase().replace(/\s+/g, " ");
  return CLASIFICACIONES_CON_DESGLOSE.includes(clave);
}

// Lista curada de clasificaciones habituales, compartida entre el <select>
// de ejecución (TablaMovimientos.tsx) y el <datalist> de presupuesto
// (PresupuestoForm.tsx) — unificada a pedido explícito. "Gastos bancarios" y
// "Prestamos y tarjetas" son rubros reales de presupuesto sin equivalente en
// la lista original de ejecución. "Impuestos"/"IMP Y PREVISIONALES" y
// "Proveedores"/"PROV Y SERV" quedan como entradas separadas a propósito —
// fusionarlas es una decisión de negocio pendiente, no técnica. "CAMPO",
// "CH DIFERIDOS IVA", "COMISIONES ESPECIALES", "DEP CH 3°" y "JPS" son
// categorías reales del proceso manual de Macchi — "CH DIFERIDOS IVA" es
// distinta de "CHEQUES DIFERIDOS", no fusionar.
export const CLASIFICACIONES_SUGERIDAS = [
  "COBRANZAS",
  "COM Y GTOS BRIOS",
  "PROV Y SERV",
  "SUELDOS",
  "SAC",
  "IMP Y PREVISIONALES",
  "IVA",
  "AVION",
  "CHEQUES DIFERIDOS",
  "INVERSIONES",
  "FCI",
  "EXPENSAS",
  "Gastos bancarios",
  "Prestamos y tarjetas",
  "CAMPO",
  "CH DIFERIDOS IVA",
  "COMISIONES ESPECIALES",
  "DEP CH 3°",
  "JPS",
];

// TEMPORAL / hallazgo fuera del alcance original de la paginación: el `distinct` de Prisma
// (`findMany({ distinct: [...] })`) tardaba ~8s acá (medido directo contra la base), contra
// ~2.4s con un DISTINCT nativo en SQL — es overhead del ORM en esta query puntual, no del
// volumen de filas (acotar por ejecucionId no lo mejoraba, porque casi toda la tabla ya
// pertenece a una sola semana). Cambio de bajo riesgo: mismo resultado, misma semántica,
// sin valores interpolados en el SQL (no hay superficie de inyección).
export async function calcularClasificacionesDisponibles() {
  const clasificacionesEnUso = await prisma.$queryRaw<
    { clasificacion: string }[]
  >`SELECT DISTINCT clasificacion FROM "MovimientoBancario"`;

  return Array.from(
    new Set([
      ...CLASIFICACIONES_SUGERIDAS,
      ...clasificacionesEnUso.map((c) => c.clasificacion),
    ])
  ).sort((a, b) => a.localeCompare(b, "es"));
}
