import ExcelJS from "exceljs";

// Fixtures SINTÉTICAS (datos inventados) del archivo madre, con las variantes que el
// parseo ya maneja. Nada de esto sale de un extracto real.

const dia = (d: number) => new Date(Date.UTC(2026, 6, d)); // julio 2026, medianoche UTC

// Madre "normal": encabezados Macchi (fila 1), varias cuentas, unidad explícita.
export function madreNormal(): ExcelJS.Worksheet {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Hoja1");
  ws.addRow([
    "Fecha",
    "Nro. de Referencia",
    "Causal",
    "Concepto",
    "Importe",
    "Saldo",
    "BANCO Y CTA",
    "Clasificación",
    "UNIDAD DE NEG",
    "Detalle",
    "Detalle 2",
  ]);
  // 2: unidad explícita con espacio final ("SPP "), clasificación explícita
  ws.addRow([dia(1), "1001", "534", "PAGO A PROVEEDORES", -1500.5, 98499.5, "MACRO 599", "Prov y serv", "SPP ", "det", "det2"]);
  // 3: importe con fórmula (result), saldo con fórmula → se resuelven con .result
  ws.addRow([
    dia(2),
    1002,
    null,
    "TRANSFERENCIA RECIBIDA",
    { formula: "A1+B1", result: 2000 },
    { formula: "F2+E3", result: 100499.5 },
    "MACRO 599",
    null,
    null,
    null,
    null,
  ]);
  // 4: saldo con error de fórmula → saldo null, la fila entra
  ws.addRow([dia(3), "1003", null, "DEBITO FISCAL IVA BASICO", -210, { error: "#REF!" }, "GALICIA 731", null, "SIN ASIGNAR", null, null]);
  // 5: importe texto → la fila se descarta
  ws.addRow([dia(3), "1004", null, "IMPORTE EN TEXTO", "1.234,56", 0, "MACRO 599", null, null, null, null]);
  // 6: importe vacío con concepto → importe 0 (entra)
  ws.addRow([dia(4), "1005", null, "SIN IMPORTE", null, 0, "MACRO 599", null, null, null, null]);
  // 7: fila vacía → se saltea
  ws.addRow([null, null, null, null, null, null, null, null, null, null, null]);
  // 8: unidad con razón social fuera de la lista (QUINTEROS → FREDY), sin cuenta conocida
  ws.addRow([dia(6), "1006", null, "COBRO", 500, 600, "BANCO RARO 1", null, "QUINTEROS", null, null]);
  // 9: sin banco, fecha de texto ISO, concepto con leyenda de impuesto
  ws.addRow(["2026-07-07", "1007", null, "Impuesto AFIP", -100, null, null, null, null, null, null]);
  // 10: fecha de texto dd/mm/aaaa → `new Date("01/10/2026")` la lee como MES/día (quirk que
  // el madre conserva; los lectores nuevos no lo tienen)
  ws.addRow(["01/10/2026", "1008", null, "FECHA TEXTO", 10, 10, "FRANCES 891", null, null, null, null]);
  return ws;
}

// Variante HWC: "Descripcion" + "Desc" + "Banco", sin Clasificación (bajo "CLASIF 2") y sin
// UNIDAD DE NEG (bajo "EMPRESA").
export function madreHwc(): ExcelJS.Worksheet {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Hoja1");
  ws.addRow(["Fecha", "Descripcion", "Desc", "Importe", "Saldo", "Banco", "CLASIF 2", "EMPRESA"]);
  ws.addRow([dia(10), "COBRANZA CLIENTE", "aclaración", 3000, 10000, "BNA 497", "COBRANZAS", "SPP"]);
  ws.addRow([dia(11), "PAGO PROVEEDOR", null, -800.25, 9199.75, "BANCO X", "Prov y serv", "WHEELER"]);
  ws.addRow([dia(12), "SIN EMPRESA", null, 1, 9200.75, "BANCO X", null, null]);
  return ws;
}

// Sin la columna Concepto/Descripcion: el parseo tiene que rechazarlo.
export function madreSinConcepto(): ExcelJS.Worksheet {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Hoja1");
  ws.addRow(["Fecha", "Importe", "Saldo"]);
  ws.addRow([dia(1), 1, 1]);
  return ws;
}
