import { test } from "node:test";
import assert from "node:assert/strict";
import { mesYAnio, nombreMesBanda, nombreMesLargo, rangoDeMeses } from "@/lib/mesesReporte";

test("nombreMesLargo: los 12 meses", () => {
  const esperados = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  esperados.forEach((nombre, i) => {
    assert.equal(nombreMesLargo(`2026-${String(i + 1).padStart(2, "0")}`), nombre);
  });
});

test("nombreMesBanda: mayúsculas (SEPTIEMBRE, OCTUBRE, NOVIEMBRE)", () => {
  assert.equal(nombreMesBanda("2026-09"), "SEPTIEMBRE");
  assert.equal(nombreMesBanda("2026-10"), "OCTUBRE");
  assert.equal(nombreMesBanda("2026-11"), "NOVIEMBRE");
});

test("mesYAnio: mes largo con el año", () => {
  assert.equal(mesYAnio("2026-09"), "Septiembre 2026");
});

test("rangoDeMeses: uno, varios del mismo año, cruzando de año y vacío", () => {
  assert.equal(rangoDeMeses(["2026-09"]), "Septiembre 2026");
  assert.equal(rangoDeMeses(["2026-07", "2026-08", "2026-09"]), "Julio a Septiembre 2026");
  assert.equal(rangoDeMeses(["2025-11", "2025-12", "2026-01"]), "Noviembre 2025 a Enero 2026");
  assert.equal(rangoDeMeses([]), "");
});

test("períodos con forma rara no rompen", () => {
  assert.equal(nombreMesLargo("2026-13"), "13");
  assert.equal(nombreMesLargo("basura"), "");
  assert.equal(mesYAnio("2026-00"), "00 2026");
  assert.equal(mesYAnio(""), "");
});
