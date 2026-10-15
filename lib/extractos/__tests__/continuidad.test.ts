import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analizarContinuidad,
  verificarContinuidadSaldo,
  avisosDeContinuidad,
  type FilaContinuidad,
} from "@/lib/extractos/continuidad";

// Cuenta inventada: saldo inicial 1000,00 y cuatro movimientos, SALDO POSTERIOR al movimiento.
const CRONOLOGICO = [
  { importe: -100.5, saldo: 899.5 },
  { importe: 250, saldo: 1149.5 },
  { importe: -49.75, saldo: 1099.75 },
  { importe: -0.05, saldo: 1099.7 },
];

function filasDe(
  movs: { importe: number; saldo: number | null }[],
  opciones: { cuenta?: string; invertido?: boolean } = {}
): FilaContinuidad[] {
  const lista = opciones.invertido ? [...movs].reverse() : movs;
  return lista.map((m, i) => ({
    numeroFila: i + 2,
    fecha: new Date(Date.UTC(2026, 6, 1)), // todas el mismo día: solo el orden de fila decide
    concepto: `mov ${i}`,
    importe: m.importe,
    saldo: m.saldo,
    bancoYCuenta: opciones.cuenta ?? "MACRO 599",
  }));
}

test("orden cronológico con saldo posterior: cero rupturas, orientación 'archivo'", () => {
  const [a] = analizarContinuidad(filasDe(CRONOLOGICO));
  assert.equal(a.rupturas.length, 0);
  assert.equal(a.orientacion, "archivo");
  assert.equal(a.saldoPrevio, false);
  assert.equal(a.enlaces, 3);
  assert.deepEqual(verificarContinuidadSaldo(filasDe(CRONOLOGICO)), []);
});

test("ORDEN DEL MADRE (más nuevo a más viejo, saldo posterior): cero rupturas y orientación 'invertido'", () => {
  const [a] = analizarContinuidad(filasDe(CRONOLOGICO, { invertido: true }));
  assert.equal(a.rupturas.length, 0);
  assert.equal(a.orientacion, "invertido");
  assert.equal(a.saldoPrevio, false);
  assert.equal(a.enlaces, 3);
});

test("un saldo roto a propósito da exactamente 1 ruptura, en cualquiera de los dos órdenes", () => {
  // Se rompe el saldo de la ÚLTIMA fila cronológica (romper uno del medio rompe dos enlaces).
  const roto = CRONOLOGICO.map((m, i) => (i === CRONOLOGICO.length - 1 ? { ...m, saldo: 1099.69 } : m));
  for (const invertido of [false, true]) {
    const r = verificarContinuidadSaldo(filasDe(roto, { invertido }));
    assert.equal(r.length, 1, `invertido=${invertido}`);
    assert.equal(r[0].cantidad, 1);
    assert.equal(r[0].enlaces, 3);
    assert.equal(r[0].orientacion, invertido ? "invertido" : "archivo");
    assert.equal(r[0].rupturas[0].saldoEsperado, 1099.7);
    assert.equal(r[0].rupturas[0].saldoReal, 1099.69);
    assert.equal(r[0].rupturas[0].diferencia, -0.01);
  }
});

test("saldo PREVIO al movimiento (caso BNA 497 / Nación): no es ruptura, se informa", () => {
  // Misma cuenta pero cada saldo es el de ANTES del movimiento: 1000 → -100,50 → 899,50 → ...
  const previo = [
    { importe: -100.5, saldo: 1000 },
    { importe: 250, saldo: 899.5 },
    { importe: -49.75, saldo: 1149.5 },
    { importe: -0.05, saldo: 1099.75 },
  ];
  for (const invertido of [false, true]) {
    const filas = filasDe(previo, { invertido });
    const [a] = analizarContinuidad(filas);
    assert.equal(a.rupturas.length, 0, `invertido=${invertido}`);
    assert.equal(a.saldoPrevio, true);
    assert.equal(a.orientacion, invertido ? "invertido" : "archivo");
    assert.deepEqual(verificarContinuidadSaldo(filas), []);
    assert.match(avisosDeContinuidad(analizarContinuidad(filas))[0], /saldo antes del movimiento/);
  }
});

test("sin saldo por fila (BBVA): 0 enlaces, no verificable, y se avisa", () => {
  const filas = filasDe(CRONOLOGICO.map((m) => ({ ...m, saldo: null })), { cuenta: "FRANCES 891" });
  const analisis = analizarContinuidad(filas);
  assert.equal(analisis[0].enlaces, 0);
  assert.equal(analisis[0].rupturas.length, 0);
  assert.deepEqual(verificarContinuidadSaldo(filas), []);
  assert.match(avisosDeContinuidad(analisis)[0], /FRANCES 891: no trae saldo por fila/);
});

test("cada cuenta decide su propio orden (madre con varias cuentas)", () => {
  const a = filasDe(CRONOLOGICO, { cuenta: "MACRO 599" });
  const b = filasDe(CRONOLOGICO, { cuenta: "GALICIA 731", invertido: true }).map((f) => ({
    ...f,
    numeroFila: f.numeroFila + 100,
  }));
  const analisis = analizarContinuidad([...a, ...b]);
  assert.deepEqual(
    analisis.map((x) => [x.bancoYCuenta, x.orientacion, x.rupturas.length]),
    [
      ["GALICIA 731", "invertido", 0],
      ["MACRO 599", "archivo", 0],
    ]
  );
});

test("agrupa la misma cuenta aunque cambie mayúsculas, tildes o espacios", () => {
  const filas = [
    ...filasDe(CRONOLOGICO.slice(0, 2), { cuenta: "Frances 891" }),
    ...filasDe(CRONOLOGICO.slice(2), { cuenta: "FRANCÉS  891" }).map((f) => ({ ...f, numeroFila: f.numeroFila + 10 })),
  ];
  const analisis = analizarContinuidad(filas);
  assert.equal(analisis.length, 1);
  assert.equal(analisis[0].enlaces, 3);
});
