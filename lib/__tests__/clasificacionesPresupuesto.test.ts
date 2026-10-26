import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CLASIFICACIONES_PRESUPUESTO_TODAS,
  CLASIFICACIONES_PRESUPUESTO_UNICAS,
} from "@/app/[empresa]/[periodo]/presupuesto/clasificacionesPresupuesto";

const valores = CLASIFICACIONES_PRESUPUESTO_UNICAS.map((o) => o.valorPersistido);

test("UNICAS: los valorPersistido no se repiten", () => {
  assert.equal(new Set(valores).size, valores.length);
});

test("UNICAS: mismos valores que TODAS, sin repetir (20), en orden de primera aparición", () => {
  const esperados = Array.from(new Set(CLASIFICACIONES_PRESUPUESTO_TODAS.map((o) => o.valorPersistido)));
  assert.equal(CLASIFICACIONES_PRESUPUESTO_TODAS.length, 22);
  assert.equal(valores.length, 20);
  assert.deepEqual(valores, esperados);
});

test("UNICAS: Préstamo Cocos y Préstamo MS aparecen una sola vez", () => {
  assert.equal(valores.filter((v) => v === "Préstamo Cocos").length, 1);
  assert.equal(valores.filter((v) => v === "Préstamo MS").length, 1);
});
