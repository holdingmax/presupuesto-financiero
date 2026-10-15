import { quitarDiacriticos } from "@/lib/texto";

// Tolerante a tildes/mayúsculas/espacios: "Clasificación", "CLASIFICACION" y
// "clasificación" tienen que matchear la misma clave (mismo criterio que
// presupuesto/actions.ts). El colapso de espacios múltiples importa para claves de
// varias palabras como "BANCO Y CTA"/"UNIDAD DE NEG".
export function normalizarEncabezado(texto: string) {
  return quitarDiacriticos(texto).trim().toUpperCase().replace(/\s+/g, " ");
}
