import { test } from "node:test";
import assert from "node:assert/strict";
import { iniciales } from "@/lib/iniciales";

test("iniciales: las empresas reales", () => {
  const esperado: Record<string, string> = {
    Avianor: "AV",
    Bradenton: "BR",
    Brillante: "BR",
    "Conexión Logística/SPP": "CL",
    Expensas: "EX",
    "Fredy Publicidad": "FP",
    HWC: "HWC",
    Havanna: "HA",
    Mantenor: "MA",
    "Plate Silver": "PS",
    Radio: "RA",
  };
  for (const [nombre, siglas] of Object.entries(esperado)) {
    assert.equal(iniciales(nombre), siglas, nombre);
  }
});

test("iniciales: ignora palabras vacías y formas societarias", () => {
  assert.equal(iniciales("Mantenor S.A."), "MA");
  assert.equal(iniciales("Fredy SRL Publicidad"), "FP");
  assert.equal(iniciales("Casa de la Plata"), "CP");
  assert.equal(iniciales("Pan y Vino"), "PV");
});

test("iniciales: sigla en mayúsculas de hasta 4 letras se usa entera, más larga no", () => {
  assert.equal(iniciales("SPP"), "SPP");
  assert.equal(iniciales("ABCD"), "ABCD");
  assert.equal(iniciales("ABCDE"), "AB");
  assert.equal(iniciales("HWC S.A."), "HWC");
});

test("iniciales: tildes, espacios dobles y minúsculas", () => {
  assert.equal(iniciales("  Álvarez   Ñandú "), "AN");
  assert.equal(iniciales("ómnibus"), "OM");
  assert.equal(iniciales("plate   silver"), "PS");
});

test("iniciales: nombre vacío o de una letra no rompe", () => {
  assert.equal(iniciales(""), "");
  assert.equal(iniciales("   "), "");
  assert.equal(iniciales("S.A."), "");
  assert.equal(iniciales("X"), "X");
  assert.equal(iniciales("a"), "A");
});
