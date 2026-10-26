import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_MENSAJE_PEDIDO_CAMBIOS,
  puedePedirCambios,
  validarMensajePedido,
} from "@/lib/pedidoCambiosPresupuesto";

test("validarMensajePedido: acepta un mensaje normal y lo devuelve sin espacios de más", () => {
  assert.deepEqual(validarMensajePedido("  Falta el SAC de diciembre  "), {
    ok: true,
    mensaje: "Falta el SAC de diciembre",
  });
});

test("validarMensajePedido: rechaza vacío y solo espacios (incluye saltos de línea y tabs)", () => {
  for (const texto of ["", " ", "     ", "\n", "\t \n  "]) {
    const r = validarMensajePedido(texto);
    assert.equal(r.ok, false, JSON.stringify(texto));
  }
});

test("validarMensajePedido: el máximo es 1000 caracteres, ya recortado", () => {
  assert.equal(MAX_MENSAJE_PEDIDO_CAMBIOS, 1000);
  const justo = "a".repeat(1000);
  assert.deepEqual(validarMensajePedido(justo), { ok: true, mensaje: justo });
  assert.equal(validarMensajePedido("a".repeat(1001)).ok, false);
  // Los espacios de los bordes no cuentan: 1000 + espacios sigue siendo válido.
  assert.deepEqual(validarMensajePedido(`  ${justo}  `), { ok: true, mensaje: justo });
  // Pero 1001 reales con espacios alrededor no.
  assert.equal(validarMensajePedido(` ${"a".repeat(1001)} `).ok, false);
});

test("validarMensajePedido: un valor que no es texto cuenta como vacío (viene del cliente)", () => {
  assert.equal(validarMensajePedido(undefined as unknown as string).ok, false);
  assert.equal(validarMensajePedido(null as unknown as string).ok, false);
});

test("puedePedirCambios: solo EN_REVISION y solo el revisor", () => {
  assert.equal(puedePedirCambios({ estado: "EN_REVISION" }, true), true);
  // Quien no revisa (el gerente) no puede, aunque esté en revisión.
  assert.equal(puedePedirCambios({ estado: "EN_REVISION" }, false), false);
  // ABIERTO: no hay nada que pedir. VALIDADO: definitivo, ni el revisor.
  assert.equal(puedePedirCambios({ estado: "ABIERTO" }, true), false);
  assert.equal(puedePedirCambios({ estado: "VALIDADO" }, true), false);
  assert.equal(puedePedirCambios({ estado: "ABIERTO" }, false), false);
  assert.equal(puedePedirCambios({ estado: "VALIDADO" }, false), false);
});

test("puedePedirCambios: revisionCompletada no cambia el resultado", () => {
  for (const revisionCompletada of [true, false]) {
    const enRevision = { estado: "EN_REVISION" as const, revisionCompletada };
    assert.equal(puedePedirCambios(enRevision, true), true);
    assert.equal(puedePedirCambios(enRevision, false), false);
    const validado = { estado: "VALIDADO" as const, revisionCompletada };
    assert.equal(puedePedirCambios(validado, true), false);
  }
});
