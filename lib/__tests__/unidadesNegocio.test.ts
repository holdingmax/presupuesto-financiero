import { test } from "node:test";
import assert from "node:assert/strict";
import {
  UNIDADES_NEGOCIO,
  esUnidadDeLaLista,
  proponerUnidadPorCuenta,
  proponerUnidadPorRazonSocial,
} from "@/lib/unidadesNegocio";

// Tabla oficial de Kike (2026-10-13).
test("razón social → unidad: TUCSON, CREAR, LI y HANDYWAY ya no son mixtas", () => {
  assert.equal(proponerUnidadPorRazonSocial("TUCSON"), "RADIO");
  assert.equal(proponerUnidadPorRazonSocial("CREAR"), "MANTENOR");
  assert.equal(proponerUnidadPorRazonSocial("LI"), "BRILLANTE");
  assert.equal(proponerUnidadPorRazonSocial("HANDYWAY"), "HANDYWAY");
  // Tolera mayúsculas, tildes y espacios.
  assert.equal(proponerUnidadPorRazonSocial(" Tucson "), "RADIO");
});

test("razón social: LI RATIO, SPP RATIO y CIELOS siguen como estaban", () => {
  assert.equal(proponerUnidadPorRazonSocial("LI RATIO"), null);
  assert.equal(proponerUnidadPorRazonSocial("CIELOS"), null);
  assert.equal(proponerUnidadPorRazonSocial("SPP RATIO"), "SPP");
});

test("razón social: las que ya coincidían no cambian", () => {
  for (const r of ["FREDY", "QUINTEROS", "SIERRA", "WHEELER", "GONZALEZ", "ESTEVEZ"]) {
    assert.equal(proponerUnidadPorRazonSocial(r), "FREDY");
  }
  assert.equal(proponerUnidadPorRazonSocial("INFO"), "RADIO");
  assert.equal(proponerUnidadPorRazonSocial("RADIO"), "RADIO");
  assert.equal(proponerUnidadPorRazonSocial("PANINI"), "HAVANNA");
  assert.equal(proponerUnidadPorRazonSocial("GOLD SEGURIDAD"), "BRILLANTE");
  assert.equal(proponerUnidadPorRazonSocial("SPP"), "SPP");
  assert.equal(proponerUnidadPorRazonSocial("WEB MASTER"), "LOGISTICA");
});

test("HANDYWAY está en la lista cerrada de unidades", () => {
  assert.ok(esUnidadDeLaLista("HANDYWAY"));
});

test("cuenta Galicia 455 → SPP, en cualquier grafía", () => {
  assert.equal(proponerUnidadPorCuenta("GALICIA 455"), "SPP");
  assert.equal(proponerUnidadPorCuenta("Galicia  455 "), "SPP");
});

test("toda unidad de las razones sociales y las cuentas está en la lista cerrada", () => {
  const razones = ["TUCSON", "CREAR", "LI", "HANDYWAY", "FREDY", "INFO", "PANINI", "GOLD SEGURIDAD", "SPP", "WEB MASTER", "HWC", "FID ADM 2", "SPP RATIO"];
  for (const r of razones) assert.ok(esUnidadDeLaLista(proponerUnidadPorRazonSocial(r)!), r);
  for (const c of ["GALICIA 455", "GALICIA 336", "MACRO 037", "FRANCES 891"]) {
    assert.ok(esUnidadDeLaLista(proponerUnidadPorCuenta(c)!), c);
  }
  assert.equal(new Set(UNIDADES_NEGOCIO).size, UNIDADES_NEGOCIO.length);
});
