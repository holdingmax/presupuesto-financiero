import * as XLSX from "xlsx";

// Fixtures SINTÉTICAS de extractos crudos (datos inventados, nada sale de un extracto real),
// replicando la ESTRUCTURA de cada banco: preámbulo y pie de Macro con celdas combinadas,
// Débitos/Créditos de Galicia, Crédito/Débito + Fecha Valor de BBVA, importes en texto de
// Nación, latin-1 con paréntesis de Santander, ";" y coma decimal de Santiago.
// Se generan en memoria (los .xls binarios con la misma librería BIFF), sin archivos.

// Movimientos cronológicos comunes: importe en centavos. Saldo inicial 10.000,00.
export const IMPORTES_CENTAVOS = [500000, -25025, -5, 100050, -75000];
export const SALDO_INICIAL_CENTAVOS = 1000000;
export const DIAS = [1, 1, 1, 2, 2]; // día de octubre 2026 de cada movimiento (cronológico)

export function saldosPosteriores(): number[] {
  const out: number[] = [];
  let s = SALDO_INICIAL_CENTAVOS;
  for (const i of IMPORTES_CENTAVOS) {
    s += i;
    out.push(s);
  }
  return out;
}

const pesos = (c: number) => c / 100;
const SERIAL_1_OCT_2026 = 46296;

// 1234567.89 (centavos 123456789) → "1.234.567,89"
export function textoAr(centavos: number, conMiles = true): string {
  const neg = centavos < 0;
  const abs = Math.abs(centavos);
  const ent = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, conMiles ? "." : "");
  return `${neg ? "-" : ""}${ent},${String(abs % 100).padStart(2, "0")}`;
}

function aBuffer(wb: XLSX.WorkBook, bookType: "biff8" | "xlsx", cellDates = false): Uint8Array {
  return new Uint8Array(XLSX.write(wb, { type: "buffer", bookType, cellDates }));
}

function libro(filas: (string | number | Date | null)[][], merges?: XLSX.Range[]) {
  const ws = XLSX.utils.aoa_to_sheet(filas, { cellDates: true });
  if (merges) ws["!merges"] = merges;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hoja 1");
  return wb;
}

// --- Macro (.xls): del MÁS NUEVO al más viejo, saldo posterior, fecha = serial ------------
export function fixtureMacro(): Uint8Array {
  const saldos = saldosPosteriores();
  const idx = IMPORTES_CENTAVOS.map((_, i) => i).reverse(); // más nuevo primero
  const datos = idx.map((i) => [
    SERIAL_1_OCT_2026 + DIAS[i] - 1,
    null,
    null,
    `00${1000 + i}`,
    String(500 + i),
    `CONCEPTO MACRO ${i}`,
    pesos(IMPORTES_CENTAVOS[i]),
    null,
    null,
    null,
    pesos(saldos[i]),
    null,
  ]);
  const filas = [
    ["Últimos Movimientos", ...Array(11).fill(null)],
    Array(12).fill(null),
    ["CUENTA CORRIENTE BANCARIA", ...Array(11).fill(null)],
    Array(12).fill(null),
    ["Tipo", null, "Cuenta Corriente", ...Array(9).fill(null)],
    ["Número", null, "123456789000599", ...Array(9).fill(null)],
    ["Moneda", null, "PESOS", ...Array(9).fill(null)],
    ["Fecha", null, null, "Nro. de Referencia", "Causal", "Concepto", "Importe", null, null, null, "Saldo", null],
    ...datos,
    ["Fecha de descarga: 15/10/2026 11:23:34", ...Array(11).fill(null)],
    ["Empresa: 30111111112 - EMPRESA DE PRUEBA SA", ...Array(11).fill(null)],
    ["Operador: OPERADOR DE PRUEBA", ...Array(11).fill(null)],
  ] as (string | number | null)[][];
  const merges = [
    { s: { r: 7, c: 0 }, e: { r: 7, c: 2 } },
    { s: { r: 7, c: 6 }, e: { r: 7, c: 9 } },
    { s: { r: 7, c: 10 }, e: { r: 7, c: 11 } },
  ];
  return aBuffer(libro(filas, merges), "biff8");
}

// --- Galicia (.xlsx): más viejo a más nuevo, Débitos y Créditos ambos positivos ------------
// Las fechas se escriben como t="d" (ISO 8601), igual que el archivo real: es el caso que
// ExcelJS leía como "1905".
export function fixtureGalicia(): Uint8Array {
  const saldos = saldosPosteriores();
  const datos = IMPORTES_CENTAVOS.map((imp, i) => [
    // Fecha LOCAL a medianoche: SheetJS escribe el día con componentes locales.
    new Date(2026, 9, DIAS[i]),
    `Descripción ${i}`,
    "",
    imp < 0 ? pesos(-imp) : 0,
    imp > 0 ? pesos(imp) : 0,
    "000808 - Comisiones",
    "",
    "",
    "",
    `Comp ${i}`,
    "",
    "",
    "",
    "",
    "Imputado",
    pesos(saldos[i]),
  ]);
  const filas = [
    [
      "Fecha",
      "Descripción",
      "Origen",
      "Débitos",
      "Créditos",
      "Grupo de Conceptos",
      "Concepto",
      "Número de Terminal",
      "Observaciones Cliente",
      "Número de Comprobante",
      "Leyendas Adicionales 1",
      "Leyendas Adicionales 2",
      "Leyendas Adicionales 3",
      "Leyendas Adicionales 4",
      "Tipo de Movimiento",
      "Saldo",
    ],
    ...datos,
  ];
  return aBuffer(libro(filas), "xlsx", true);
}

// --- BBVA (.xls): fecha texto dd-mm-aaaa, débito negativo, "" en la celda vacía, SIN saldo ---
export function fixtureBbva(): Uint8Array {
  const datos = IMPORTES_CENTAVOS.map((imp, i) => [
    `0${DIAS[i]}-10-2026`,
    i === 2 ? "30-09-2026" : `0${DIAS[i]}-10-2026`, // Fecha Valor puede diferir
    `CONCEPTO BBVA ${i}`,
    "005",
    i === 1 ? "" : `9001${i}`,
    "70 - OFICINA",
    imp > 0 ? pesos(imp) : "",
    imp < 0 ? pesos(imp) : "",
    i === 3 ? "CTE 000000000983" : "",
    i === 0 ? "Saldo Disponible: 67.514.288,30" : "",
  ]);
  const filas = [
    ["Empresa: ", "EMPRESA DE PRUEBA S.A.S.(30111111112)", ...Array(8).fill(null)],
    ["Cuenta: ", "223-001234/5(CC $)", ...Array(8).fill(null)],
    ["Sucursal: ", "223 - OFICINA", ...Array(8).fill(null)],
    ["Saldo: ", "60.391.986,04", ...Array(8).fill(null)],
    ["Movimientos de: ", "2026-10-01 a 2026-10-02", ...Array(8).fill(null)],
    Array(10).fill(null),
    ["Fecha", "Fecha Valor", "Concepto", "Codigo", "Número Documento", "Oficina", "Crédito", "Débito", "Detalle", "                 "],
    ...datos,
  ] as (string | number | null)[][];
  return aBuffer(libro(filas), "biff8");
}

// --- Nación (.xls): más nuevo a más viejo, Monto/Saldo en TEXTO, saldo ANTES del movimiento --
export function fixtureNacion(): Uint8Array {
  const saldos = saldosPosteriores();
  const previos = IMPORTES_CENTAVOS.map((_, i) => (i === 0 ? SALDO_INICIAL_CENTAVOS : saldos[i - 1]));
  const idx = IMPORTES_CENTAVOS.map((_, i) => i).reverse();
  const datos = idx.map((i) => [
    `0${DIAS[i]}/10/2026`,
    `27300${i}`,
    `CONCEPTO BNA ${i}`,
    `$ ${textoAr(IMPORTES_CENTAVOS[i])}`,
    `$ ${textoAr(previos[i])}`,
    null,
    null,
  ]);
  const filas = [
    ["Banco Nación", "[BNA + Empresas]", ...Array(5).fill(null)],
    Array(7).fill(null),
    ["Últimos movimientos", ...Array(6).fill(null)],
    Array(7).fill(null),
    Array(7).fill(null),
    ["Fecha", "Comprobante", "Concepto", "Monto", "Saldo", null, null],
    ...datos,
  ] as (string | null)[][];
  return aBuffer(libro(filas), "biff8");
}

// --- Texto latin-1 / UTF-8 ----------------------------------------------------------------
export function textoSantander(): string {
  const saldos = saldosPosteriores();
  const idx = IMPORTES_CENTAVOS.map((_, i) => i).reverse(); // más nuevo primero
  const fmt = (c: number) => (c < 0 ? `(${textoAr(-c)})` : textoAr(c));
  const datos = idx.map(
    (i) =>
      `0${DIAS[i]}/10/2026\t0069\tTucumán\t0${567 + i}\t0000127${10 + i}\tConcepto Santander ${i} - Comisión ú\t${fmt(IMPORTES_CENTAVOS[i])}\t${textoAr(saldos[i])}`
  );
  return [
    "",
    "",
    "Últimos Movimientos",
    "",
    "Cuenta corriente en Pesos Nro. 069-001234/5",
    "",
    "Fecha\tSuc. Origen\tDesc. Sucursal\tCod. Operativo\tReferencia\tConcepto\tImporte\tSaldo",
    ...datos,
    "",
    "15/10/2026 11:36:00",
  ].join("\r\n");
}

export function fixtureSantander(codificacion: "latin1" | "utf8" = "latin1"): Uint8Array {
  return new Uint8Array(Buffer.from(textoSantander(), codificacion));
}

export function fixtureSantiago(): Uint8Array {
  const saldos = saldosPosteriores();
  const pad = (t: string, n: number) => t.padEnd(n, " ");
  const filas = IMPORTES_CENTAVOS.map(
    (imp, i) =>
      `${pad("E.P.J. $ 2700000000001234", 25)};30111111112;0${DIAS[i]}/10/2026;${pad(textoAr(imp, false), 11)};${pad(String(770 + i), 17)};${pad(`DESCRIPCIÓN ${i} º`, 48)};${textoAr(saldos[i], false)}`
  );
  const cabecera = "Cuenta                   ;CUIT Cuenta;Fecha     ;Monto      ;N° de Comprobante;Descripción                                      ;Saldo      ";
  return new Uint8Array(Buffer.from([cabecera, ...filas, ""].join("\r\n"), "latin1"));
}

export function fixtureHtml(): Uint8Array {
  return new Uint8Array(Buffer.from("<html><body><table><tr><td>Fecha</td></tr></table></body></html>"));
}
