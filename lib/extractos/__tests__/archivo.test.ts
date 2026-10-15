import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { leerArchivoSubido } from "@/lib/extractos/archivo";
import {
  fixtureBbva,
  fixtureGalicia,
  fixtureHtml,
  fixtureMacro,
  fixtureSantander,
} from "./fixtures/bancos";
import { madreNormal } from "./fixtures/madre";

const HOY = { hoy: new Date(Date.UTC(2026, 9, 15)) };

async function xlsxDe(hojas: Record<string, ExcelJS.Worksheet>): Promise<Uint8Array> {
  const libro = new ExcelJS.Workbook();
  for (const [nombre, origen] of Object.entries(hojas)) {
    const ws = libro.addWorksheet(nombre);
    origen.eachRow((fila) => ws.addRow((fila.values as unknown[]).slice(1) as ExcelJS.CellValue[]));
  }
  return new Uint8Array((await libro.xlsx.writeBuffer()) as ArrayBuffer);
}

test("un .xlsx madre sigue por el camino madre", async () => {
  const r = await leerArchivoSubido(await xlsxDe({ Hoja1: madreNormal() }), undefined, HOY);
  assert.equal(r.tipo, "madre");
  if (r.tipo === "madre") assert.equal(r.filas.length, 7);
});

test("un .xlsx de Galicia va por el lector del banco, con la fecha bien (no 1905)", async () => {
  const r = await leerArchivoSubido(fixtureGalicia(), undefined, HOY);
  assert.equal(r.tipo, "crudo");
  if (r.tipo === "crudo") {
    assert.equal(r.lectura.banco, "GALICIA");
    assert.equal(r.lectura.filas[0].fecha.toISOString(), "2026-10-01T00:00:00.000Z");
  }
});

test("un .xls binario y un texto latin-1 se detectan por contenido", async () => {
  const macro = await leerArchivoSubido(fixtureMacro(), undefined, HOY);
  const bbva = await leerArchivoSubido(fixtureBbva(), undefined, HOY);
  const sant = await leerArchivoSubido(fixtureSantander(), undefined, HOY);
  assert.deepEqual(
    [macro, bbva, sant].map((r) => (r.tipo === "crudo" ? r.lectura.banco : r.tipo)),
    ["MACRO", "FRANCES", "SANT"]
  );
});

test("un .xlsx con varias hojas y ninguna Hoja1 pide elegir; con la elegida, sigue", async () => {
  const bytes = await xlsxDe({ Uno: madreNormal(), Dos: madreNormal() });
  const r = await leerArchivoSubido(bytes, undefined, HOY);
  assert.deepEqual(r, { tipo: "seleccionHoja", hojas: ["Uno", "Dos"] });
  const r2 = await leerArchivoSubido(bytes, "Dos", HOY);
  assert.equal(r2.tipo, "madre");
  const r3 = await leerArchivoSubido(bytes, "Nada", HOY);
  assert.equal(r3.tipo, "error");
});

test("HTML disfrazado de .xls y formatos desconocidos dan un error claro", async () => {
  const html = await leerArchivoSubido(fixtureHtml(), undefined, HOY);
  assert.equal(html.tipo, "error");
  const basura = await leerArchivoSubido(new Uint8Array(Buffer.from("hola\nmundo\n")), undefined, HOY);
  assert.equal(basura.tipo, "error");
  if (basura.tipo === "error") assert.match(basura.error, /No reconozco este formato/);
});
