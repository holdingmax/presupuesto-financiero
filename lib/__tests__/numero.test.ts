import { test } from "node:test";
import assert from "node:assert/strict";
import { formatearImporteParaEditar, parsearImporteArgentino } from "@/lib/numero";

// Ida y vuelta: lo que se precarga en el input de edición tiene que volver a
// leerse igual con parsearImporteArgentino (bug: "1234.5" volvía como 12345).
for (const valor of [1234.5, 1234.56, 1000000, 0.5, -1234.5, 1500000.25]) {
  test(`formatearImporteParaEditar: ida y vuelta de ${valor}`, () => {
    assert.equal(parsearImporteArgentino(formatearImporteParaEditar(valor)), valor);
  });
}

test("formatearImporteParaEditar: coma decimal y sin separador de miles", () => {
  assert.equal(formatearImporteParaEditar(1234.5), "1234,5");
  assert.equal(formatearImporteParaEditar(1000000), "1000000");
  assert.equal(formatearImporteParaEditar(0.5), "0,5");
});
