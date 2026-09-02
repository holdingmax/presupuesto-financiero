// Parsea un importe tipeado a mano por un usuario en formato argentino
// ("1.500.000" = un millón y medio, no 1,5). Distinto del parseo de celdas
// de archivo (ver extraerImporte en presupuesto/actions.ts): ahí, sin coma,
// el texto se deja pasar tal cual porque suele venir de una fórmula/celda
// numérica real donde un punto solo sería decimal. Acá el usuario está
// tipeando en un <input> de texto, y en este proyecto los importes siempre
// se muestran/piensan en pesos enteros (ver formatearImporte,
// maximumFractionDigits: 0) — así que un punto sin coma es SIEMPRE
// separador de miles, nunca decimal. Con coma, la coma es el decimal y
// cualquier punto sigue siendo separador de miles (ej. "1.500.000,50").
//
// Bug real que motivó esto (2026-09-02, reportado por Kike en testing):
// un <input type="number"> nativo, al tipear "1.500.000", descarta en
// silencio el segundo punto (un number input solo permite uno) y deja
// "1.500000" — que Number() interpreta como 1.5. Error silencioso, sin
// ningún aviso, que carga un importe completamente distinto al tipeado.
export function parsearImporteArgentino(texto: string): number {
  const limpio = texto.trim();
  if (limpio.includes(",")) {
    return Number(limpio.replace(/\./g, "").replace(",", "."));
  }
  return Number(limpio.replace(/\./g, ""));
}
