import { prisma } from "@/lib/prisma";

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
