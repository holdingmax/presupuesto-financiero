import { test } from "node:test";
import assert from "node:assert/strict";
import { mapearMovimiento, filtroDeUnidades } from "@/lib/ejecucionVista";

// Lo que viaja al navegador en la pestaña de solo lectura de una empresa (plan §3.4 y §6).

const base = {
  id: "m1",
  fecha: new Date("2026-09-10T00:00:00.000Z"),
  concepto: "PAGO PROVEEDOR",
  importe: "-1000.00",
  bancoYCuenta: "MACRO 599",
  clasificacion: "PROV Y SERV",
  unidadNegocio: "SPP",
  detalle: null,
  ignorado: false,
  sugeridaPorSistema: false,
  chequeIvaAmbiguo: false,
  unidadSugeridaPorSistema: false,
  desglose: [] as { id: string; unidadNegocio: string; importe: unknown }[],
};

test("el movimiento que viaja al cliente no tiene saldo (ni como null)", () => {
  // Aunque la fila de la base traiga saldo, mapearMovimiento no lo copia.
  const fila = { ...base, saldo: "123456.78" };
  const m = mapearMovimiento(fila);
  assert.equal("saldo" in m, false);
  assert.equal(JSON.stringify(m).includes("123456"), false);
});

test("sin filtro de unidades, un prorrateado conserva todas sus porciones y el importe total", () => {
  const m = mapearMovimiento({
    ...base,
    desglose: [
      { id: "d1", unidadNegocio: "SPP", importe: "-600.00" },
      { id: "d2", unidadNegocio: "RADIO", importe: "-400.00" },
    ],
  });
  assert.equal(m.importe, -1000);
  assert.equal(m.desglose.length, 2);
});

test("vista de una empresa: de un prorrateado solo se ve su porción y el importe de ella", () => {
  const m = mapearMovimiento(
    {
      ...base,
      desglose: [
        { id: "d1", unidadNegocio: "SPP", importe: "-600.00" },
        { id: "d2", unidadNegocio: "RADIO", importe: "-400.00" },
      ],
    },
    ["RADIO"]
  );
  assert.equal(m.importe, -400);
  assert.deepEqual(m.desglose, [{ id: "d2", unidadNegocio: "RADIO", importe: -400 }]);
  // Ni el importe total ni la porción ajena aparecen en lo serializado.
  const json = JSON.stringify(m);
  assert.equal(json.includes("1000"), false);
  assert.equal(json.includes("600"), false);
  assert.equal(json.includes("SPP"), false);
});

test("vista de una empresa: un movimiento sin prorrateo mantiene su importe", () => {
  const m = mapearMovimiento(base, ["SPP"]);
  assert.equal(m.importe, -1000);
});

test("filtro de una empresa: no prorrateados por su unidad, prorrateados por una porción propia", () => {
  assert.deepEqual(filtroDeUnidades(["SPP", "RADIO"]), {
    OR: [
      { desglose: { none: {} }, unidadNegocio: { in: ["SPP", "RADIO"] } },
      { desglose: { some: { unidadNegocio: { in: ["SPP", "RADIO"] } } } },
    ],
  });
});
