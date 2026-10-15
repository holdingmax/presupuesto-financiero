import { test } from "node:test";
import assert from "node:assert/strict";
import { leerFilasMadre } from "@/lib/extractos/madre";
import { madreNormal, madreHwc, madreSinConcepto } from "./fixtures/madre";

// Test de CARACTERIZACIÓN: fija lo que hacía el parseo madre cuando vivía dentro de
// subirExtracto. Los valores esperados se verificaron contra el código original (se
// corrieron los dos lado a lado sobre estas mismas fixtures el 2026-10-15 y dieron
// idéntico). Si alguno cambia, cambió el comportamiento del madre.

function leer(ws: ReturnType<typeof madreNormal>) {
  const r = leerFilasMadre(ws);
  assert.ok(r.ok, "el parseo no debería fallar");
  return r.filas;
}

test("madre: filas que entran y filas que se descartan", () => {
  const filas = leer(madreNormal());
  // Fila 5 (importe en texto) y fila 7 (vacía) se descartan; el resto entra.
  assert.deepEqual(
    filas.map((f) => f.numeroFila),
    [2, 3, 4, 6, 8, 9, 10]
  );
});

test("madre: importes, saldos y fórmulas", () => {
  const filas = leer(madreNormal());
  assert.deepEqual(
    filas.map((f) => [f.importe, f.saldo]),
    [
      [-1500.5, 98499.5],
      [2000, 100499.5], // fórmula resuelta con .result
      [-210, null], // saldo con #REF! → null, la fila entra
      [0, 0], // importe vacío → 0
      [500, 600],
      [-100, null],
      [10, 10],
    ]
  );
});

test("madre: unidad (explícita, por cuenta, por razón social, sin asignar)", () => {
  const filas = leer(madreNormal());
  const unidades = filas.map((f) => [f.unidadNegocio, f.unidadSugeridaPorSistema]);
  assert.deepEqual(unidades, [
    ["SPP", false], // "SPP " explícita, guardada sin el espacio
    ["SPP", true], // MACRO 599 → SPP (sugerida)
    ["MANTENOR", true], // GALICIA 731, con "SIN ASIGNAR" literal tratado como vacío
    ["SPP", true],
    ["FREDY", true], // "QUINTEROS" en UNIDAD DE NEG → razón social → FREDY
    ["SIN ASIGNAR", false], // sin banco
    ["LOGISTICA", true], // FRANCES 891
  ]);
});

test("madre: clasificación explícita, automática por leyenda y SIN CLASIFICAR", () => {
  const filas = leer(madreNormal());
  assert.deepEqual(
    filas.map((f) => [f.clasificacion, f.sugeridaPorSistema]),
    [
      ["Prov y serv", false], // explícita en el archivo
      ["SIN CLASIFICAR", false],
      ["Gastos bancarios", true], // leyenda "DEBITO FISCAL IVA BASICO"
      ["SIN CLASIFICAR", false],
      ["SIN CLASIFICAR", false],
      ["IMP Y PREVISIONALES", true], // leyenda "Impuesto AFIP"
      ["SIN CLASIFICAR", false],
    ]
  );
});

test("madre: cuenta, referencia, causal y detalles", () => {
  const filas = leer(madreNormal());
  assert.equal(filas[0].bancoYCuenta, "MACRO 599");
  assert.equal(filas[5].bancoYCuenta, "(sin banco)");
  assert.equal(filas[0].nroReferencia, "1001");
  assert.equal(filas[1].nroReferencia, "1002"); // número → texto
  assert.equal(filas[0].causal, "534");
  assert.equal(filas[1].causal, null);
  assert.equal(filas[0].detalle, "det");
  assert.equal(filas[0].detalle2, "det2");
  assert.equal(filas[1].detalle, null);
});

test("madre: fechas — Date de celda, texto ISO y el quirk mes/día del texto dd/mm/aaaa", () => {
  const filas = leer(madreNormal());
  assert.equal(filas[0].fecha.toISOString(), "2026-07-01T00:00:00.000Z");
  assert.equal(filas[4].fecha.toISOString(), "2026-07-06T00:00:00.000Z");
  // Texto ISO "2026-07-07": new Date() lo toma como UTC.
  assert.equal(filas[5].fecha.toISOString(), "2026-07-07T00:00:00.000Z");
  // Quirk CONOCIDO del madre (no se toca en esta etapa): "01/10/2026" se lee como el 10
  // de ENERO. Los lectores de cada banco no usan new Date(texto).
  assert.equal(filas[6].fecha.getMonth(), 0);
  assert.equal(filas[6].fecha.getDate(), 10);
});

test("madre variante HWC: Descripcion, Desc, Banco, CLASIF 2 y EMPRESA", () => {
  const filas = leer(madreHwc());
  assert.equal(filas.length, 3);
  assert.equal(filas[0].concepto, "COBRANZA CLIENTE"); // Descripcion → concepto
  assert.equal(filas[0].detalle, "aclaración"); // Desc → detalle
  assert.equal(filas[0].bancoYCuenta, "BNA 497"); // Banco
  assert.equal(filas[0].clasificacion, "COBRANZAS"); // CLASIF 2 hace de clasificación
  assert.equal(filas[0].unidadNegocio, "BRILLANTE"); // BNA 497 → BRILLANTE (por cuenta, gana a EMPRESA)
  assert.equal(filas[1].unidadNegocio, "FREDY"); // EMPRESA=WHEELER → razón social → FREDY
  assert.equal(filas[2].unidadNegocio, "SIN ASIGNAR");
});

test("madre: sin columna Concepto/Descripcion se rechaza con el mensaje de siempre", () => {
  const r = leerFilasMadre(madreSinConcepto());
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /No encontré la columna Concepto/);
});
