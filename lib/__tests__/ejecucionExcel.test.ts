import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { construirExcelMovimientos } from "@/lib/ejecucionExcel";
import { mapearMovimiento } from "@/lib/ejecucionVista";

function mov(extra: Partial<Parameters<typeof mapearMovimiento>[0]> = {}) {
  return {
    id: "m1",
    fecha: new Date("2026-10-05T00:00:00Z"),
    concepto: "Pago proveedor",
    importe: -1234.5,
    saldo: 100.25,
    bancoYCuenta: "SANT CC",
    clasificacion: "Proveedores",
    unidadNegocio: "Avianor",
    detalle: "fact 1",
    ignorado: false,
    sugeridaPorSistema: false,
    chequeIvaAmbiguo: false,
    unidadSugeridaPorSistema: false,
    desglose: [],
    ...extra,
  };
}

async function leer(buffer: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  return wb.worksheets[0];
}

test("importe y saldo son números, fecha es fecha, prorrateo Sí/No", async () => {
  const movs = [
    mapearMovimiento(mov(), undefined, { verSaldo: true }),
    mapearMovimiento(
      mov({ desglose: [{ id: "d1", unidadNegocio: "A", importe: -1000 }, { id: "d2", unidadNegocio: "B", importe: -234.5 }] }),
      undefined,
      { verSaldo: true }
    ),
  ];
  const hoja = await leer(await construirExcelMovimientos(movs, true));
  assert.deepEqual((hoja.getRow(1).values as unknown[]).slice(1), [
    "Fecha", "Banco y cuenta", "Concepto", "Importe", "Saldo", "Clasificación", "Unidad de negocio", "Prorrateo", "Detalle",
  ]);
  const f2 = hoja.getRow(2);
  assert.ok(f2.getCell(1).value instanceof Date);
  assert.equal((f2.getCell(1).value as Date).toISOString().slice(0, 10), "2026-10-05");
  assert.equal(f2.getCell(4).value, -1234.5);
  assert.equal(f2.getCell(5).value, 100.25);
  assert.equal(f2.getCell(8).value, "No");
  assert.equal(hoja.getRow(3).getCell(7).value, "A / B");
  assert.equal(hoja.getRow(3).getCell(8).value, "Sí");
});

test("sin saldo: la columna Saldo no existe", async () => {
  const hoja = await leer(await construirExcelMovimientos([mapearMovimiento(mov())], false));
  const encabezados = (hoja.getRow(1).values as unknown[]).slice(1);
  assert.ok(!encabezados.includes("Saldo"));
  assert.equal(encabezados.length, 8);
});

test("3.000 movimientos se generan rápido", async () => {
  const movs = Array.from({ length: 3000 }, (_, i) => mapearMovimiento(mov({ id: `m${i}`, importe: i }), undefined, { verSaldo: true }));
  const t = Date.now();
  await construirExcelMovimientos(movs, true);
  assert.ok(Date.now() - t < 5000);
});
