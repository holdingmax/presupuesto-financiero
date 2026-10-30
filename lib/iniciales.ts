import { quitarDiacriticos } from "@/lib/texto";

// Monograma de una empresa para las tarjetas de "Mis empresas". Puro (sin prisma ni next/*).
// Reglas: se ignoran palabras vacías ("S.A.", "SRL", "de", "la", "y"...); una sigla en mayúsculas de
// hasta 4 letras se usa entera; con 2 o más palabras, la primera letra de las dos primeras; con una
// sola, sus 2 primeras letras. Sin tildes. Nombre vacío -> "".
const PALABRAS_VACIAS = new Set(["sa", "sas", "srl", "sau", "de", "del", "la", "las", "el", "los", "y", "e"]);

export function iniciales(nombre: string): string {
  const palabras = quitarDiacriticos(nombre ?? "")
    .split(/\s+/)
    .map((palabra) => palabra.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((palabra) => palabra !== "" && !PALABRAS_VACIAS.has(palabra.toLowerCase()));

  if (palabras.length === 0) return "";

  if (palabras.length === 1) {
    const unica = palabras[0];
    if (unica.length <= 4 && unica === unica.toUpperCase() && /\p{L}/u.test(unica)) return unica;
    return unica.slice(0, 2).toUpperCase();
  }

  return (palabras[0][0] + palabras[1][0]).toUpperCase();
}
