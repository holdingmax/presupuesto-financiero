// Helpers de texto puros (sin prisma ni nada de servidor) — importables desde
// componentes "use client". quitarDiacriticos vivía en lib/slug.ts, que importa
// prisma: se movió acá para que lib/unidadesNegocio.ts (que usan la tabla y el
// panel de prorrateo, del lado del cliente) no arrastre el cliente de Prisma al
// bundle del navegador. lib/slug.ts lo re-exporta, así que los imports existentes
// siguen funcionando igual.

// Rango Unicode de "combining diacritical marks" (0x0300–0x036f), construido
// con códigos numéricos en vez de escribir el rango \uXXXX literal — al
// tipear ese escape directamente termina insertándose el carácter combinante
// real en el archivo en lugar del texto del escape.
const MARCAS_DIACRITICAS = new RegExp(
  "[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]",
  "g"
);

export function quitarDiacriticos(texto: string): string {
  return texto.normalize("NFD").replace(MARCAS_DIACRITICAS, "");
}

// Normalización para COMPARAR textos que vienen de archivos distintos (no para
// mostrar ni guardar): sin tildes, sin espacios al borde, mayúsculas y espacios
// internos colapsados — "Frances  891 " y "FRANCÉS 891" quedan iguales. Es el
// mismo criterio que ya usaban normalizarCuenta / normalizarClasificacion /
// verificarContinuidadSaldo.
export function normalizarTexto(texto: string): string {
  return quitarDiacriticos(texto).trim().toUpperCase().replace(/\s+/g, " ");
}
