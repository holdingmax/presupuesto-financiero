import { leerImporte } from "@/lib/importes";

// Parsea un importe tipeado a mano por un usuario en formato argentino
// ("1.500.000" = un millón y medio, no 1,5). Distinto del parseo de celdas
// de archivo (ver extraerImporteCelda en lib/importeCelda.ts): ahí un texto
// ambiguo ("150.000", "1,500") se rechaza con error en vez de adivinar. Desde que lo tipeado se
// interpreta en lib/importes.ts, acá pasa lo mismo: el punto es separador de miles SOLO si lo que
// sigue son grupos de exactamente 3 dígitos ("1.500.000"); "100.5" o "12.34.56" se rechazan. Con coma,
// la coma es el decimal (hasta 2) y los puntos de la parte entera siguen siendo miles ("1.500.000,50").
//
// Bug real que motivó esto (2026-09-02, reportado por Kike en testing):
// un <input type="number"> nativo, al tipear "1.500.000", descarta en
// silencio el segundo punto (un number input solo permite uno) y deja
// "1.500000" — que Number() interpreta como 1.5. Error silencioso, sin
// ningún aviso, que carga un importe completamente distinto al tipeado.
//
// Segundo bug real (mismo día, mismo reporte): al pasar el input a texto
// libre para poder tipear puntos, un "$" que quede en el campo (pegado, o
// remanente de un valor previo por autocompletado del navegador — no algo
// que este código escriba, pero el input ya no lo bloquea como sí hacía
// type="number") rompía el parseo en silencio otra vez. Por eso también se
// descarta "$" y espacios acá — además de sacar el "$" de la vista como
// texto editable en el input (ver CampoImporte más abajo).
export function parsearImporteArgentino(texto: string): number {
  // Vacío = 0 (cada pantalla trata el vacío por su cuenta); lo que no se entiende = NaN. Las reglas
  // (punto = miles solo en grupos de 3, coma = hasta 2 decimales, sin adivinar) viven en lib/importes.ts;
  // para el mensaje de por qué no se entendió, mensajeDeImporte.
  if (texto.replace(/[$\s]/g, "") === "") return 0;
  const lectura = leerImporte(texto);
  return lectura.ok ? lectura.centavos / 100 : NaN;
}

// Inverso de parsearImporteArgentino para precargar un <input> de edición con un
// importe ya guardado: coma decimal, sin separador de miles. Un String(n) pelado
// ("1234.5") no sirve — parsearImporteArgentino lee ese punto como separador de
// miles y lo convierte en 12345 al guardar, sin ningún aviso.
export function formatearImporteParaEditar(valor: number): string {
  // La columna es Decimal(18,2): más de 2 decimales no existen en la base.
  return String(Number(valor.toFixed(2))).replace(".", ",");
}
