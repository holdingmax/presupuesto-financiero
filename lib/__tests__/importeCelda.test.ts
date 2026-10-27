import { test } from "node:test";
import assert from "node:assert/strict";
import { extraerImporteCelda } from "@/lib/importeCelda";

test("celdas numéricas de Excel no se tocan", () => {
  assert.deepEqual(extraerImporteCelda(150000), { valor: 150000 });
  assert.deepEqual(extraerImporteCelda(-150), { valor: -150 });
  assert.deepEqual(extraerImporteCelda(1250.75), { valor: 1250.75 });
  assert.deepEqual(extraerImporteCelda(0), { valor: 0 });
  assert.deepEqual(extraerImporteCelda({ formula: "A1*2", result: 300 }), { valor: 300 });
  assert.deepEqual(extraerImporteCelda(Number.NaN), { valor: null });
});

test("texto aceptado: solo dígitos, con - opcional", () => {
  assert.deepEqual(extraerImporteCelda("150000"), { valor: 150000 });
  assert.deepEqual(extraerImporteCelda("-150"), { valor: -150 });
  assert.deepEqual(extraerImporteCelda("  150  "), { valor: 150 });
});

test("texto aceptado: formato argentino con coma decimal", () => {
  assert.deepEqual(extraerImporteCelda("150.000,50"), { valor: 150000.5 });
  assert.deepEqual(extraerImporteCelda("1.500,00"), { valor: 1500 });
  assert.deepEqual(extraerImporteCelda("150000,5"), { valor: 150000.5 });
  assert.deepEqual(extraerImporteCelda("1.500.000,25"), { valor: 1500000.25 });
  assert.deepEqual(extraerImporteCelda("-1.500,00"), { valor: -1500 });
  assert.deepEqual(extraerImporteCelda("1,25"), { valor: 1.25 });
  assert.deepEqual(extraerImporteCelda("1,5000"), { valor: 1.5 });
  assert.deepEqual(extraerImporteCelda("1.500,000"), { valor: 1500 });
});

test("texto ambiguo: coma + exactamente 3 dígitos sin otros separadores da error", () => {
  const r = extraerImporteCelda("1,500");
  assert.equal(r.valor, null);
  assert.equal(
    r.error,
    "«1,500» es ambiguo: cargalo como número de Excel o escribí los miles con punto y los decimales con coma (150.000,00)"
  );
  assert.match(extraerImporteCelda("-1,500").error ?? "", /«-1,500» es ambiguo/);
  assert.match(extraerImporteCelda("150000,500").error ?? "", /ambiguo/);
});

test("texto aceptado: un punto con 1 o 2 decimales es decimal", () => {
  assert.deepEqual(extraerImporteCelda("150000.5"), { valor: 150000.5 });
  assert.deepEqual(extraerImporteCelda("1250.75"), { valor: 1250.75 });
});

test("texto ambiguo: punto + exactamente 3 dígitos sin coma da error", () => {
  const r150 = extraerImporteCelda("150.000");
  assert.equal(r150.valor, null);
  assert.equal(
    r150.error,
    "«150.000» es ambiguo: cargalo como número de Excel o con coma decimal (150.000,00)"
  );
  assert.match(extraerImporteCelda("1.500").error ?? "", /«1\.500» es ambiguo/);
  assert.match(extraerImporteCelda("-150.000").error ?? "", /ambiguo/);
  assert.match(extraerImporteCelda("1.500.000").error ?? "", /ambiguo/);
});

test("formato inglés, mezclas raras y otro texto dan error", () => {
  for (const texto of ["1,500.50", "1.50.0", "1.5000", "12.3456", ".5", "abc", "$150000", "(150.000)", "1.500,0,0", "150.00,5", "+150"]) {
    const r = extraerImporteCelda(texto);
    assert.equal(r.valor, null, texto);
    assert.ok(r.error, `debería tener error: ${texto}`);
  }
  assert.match(extraerImporteCelda("abc").error ?? "", /«abc» no es un importe válido/);
});

test("vacío o tipo no soportado: valor null sin mensaje propio", () => {
  assert.deepEqual(extraerImporteCelda(""), { valor: null });
  assert.deepEqual(extraerImporteCelda("   "), { valor: null });
  assert.deepEqual(extraerImporteCelda(null), { valor: null });
  assert.deepEqual(extraerImporteCelda(undefined), { valor: null });
});
