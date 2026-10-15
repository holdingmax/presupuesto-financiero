import { test } from "node:test";
import assert from "node:assert/strict";
import {
  controlarCuentaDelArchivo,
  cuentasActivas,
  sugerirCuenta,
  validarCuenta,
  type CuentaExistente,
} from "@/lib/cuentasBancarias";

const EXISTENTES: CuentaExistente[] = [
  { id: "1", nombre: "MACRO 599", activa: true },
  { id: "2", nombre: "SANT 099", activa: false },
];

test("alta válida: guarda el nombre normalizado", () => {
  const r = validarCuenta({ nombre: " frances  891 ", banco: "FRANCES", terminacion: "891" }, EXISTENTES);
  assert.deepEqual(r, { ok: true, cuenta: { nombre: "FRANCES 891", banco: "FRANCES", terminacion: "891" } });
});

test("los nombres canónicos del madre son válidos (SANT 099, BSE 560, BNA 241, GALICIA 731)", () => {
  for (const [nombre, banco, term] of [
    ["SANT 099", "SANT", "099"],
    ["BSE 560", "BSE", "560"],
    ["BNA 241", "BNA", "241"],
    ["GALICIA 731", "GALICIA", "731"],
    ["MACRO 8037", "MACRO", "8037"],
  ]) {
    assert.equal(validarCuenta({ nombre, banco, terminacion: term }, []).ok, true, nombre);
  }
  // "SANTANDER 099" NO es el nombre del madre: el banco válido es SANT.
  const r = validarCuenta({ nombre: "SANTANDER 099", banco: "SANT", terminacion: "099" }, []);
  assert.equal(r.ok, false);
});

test("nombre repetido en la misma empresa, aunque cambien mayúsculas, tildes y espacios", () => {
  for (const nombre of ["macro 599", "MACRO  599", " Macro 599 "]) {
    const r = validarCuenta({ nombre, banco: "MACRO", terminacion: "599" }, EXISTENTES);
    assert.equal(r.ok, false, nombre);
  }
  const f = validarCuenta({ nombre: "FRANCÉS 891", banco: "FRANCES", terminacion: "891" }, [
    { id: "9", nombre: "Frances 891", activa: true },
  ]);
  assert.equal(f.ok, false);
});

test("repetido contra una INACTIVA: se ofrece reactivarla", () => {
  const r = validarCuenta({ nombre: "SANT 099", banco: "SANT", terminacion: "099" }, EXISTENTES);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.reactivarId, "2");
    assert.match(r.error, /inactiva/);
  }
});

test("editar una cuenta no choca consigo misma", () => {
  const r = validarCuenta({ nombre: "MACRO 599", banco: "MACRO", terminacion: "599" }, EXISTENTES, "1");
  assert.equal(r.ok, true);
});

test("forma inválida del nombre", () => {
  for (const nombre of ["MACRO", "599", "MACRO-599", "MACRO 59X", "BANCO MACRO 599", ""]) {
    assert.equal(validarCuenta({ nombre, banco: "MACRO", terminacion: "599" }, []).ok, false, nombre);
  }
});

test("el banco elegido no coincide con el del nombre", () => {
  const r = validarCuenta({ nombre: "MACRO 599", banco: "GALICIA", terminacion: "599" }, []);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /empieza con MACRO/);
  assert.equal(validarCuenta({ nombre: "XXX 599", banco: "XXX", terminacion: "599" }, []).ok, false);
});

test("terminación: solo dígitos, 3 a 6, y que sea el final del número del nombre", () => {
  assert.equal(validarCuenta({ nombre: "MACRO 599", banco: "MACRO", terminacion: "59" }, []).ok, false);
  assert.equal(validarCuenta({ nombre: "MACRO 599", banco: "MACRO", terminacion: "5990000" }, []).ok, false);
  assert.equal(validarCuenta({ nombre: "MACRO 599", banco: "MACRO", terminacion: "59a" }, []).ok, false);
  assert.equal(validarCuenta({ nombre: "MACRO 599", banco: "MACRO", terminacion: "699" }, []).ok, false);
});

test("desactivar no borra: el selector muestra solo las activas y la lista queda intacta", () => {
  const cuentas = [
    { nombre: "MACRO 599", activa: true },
    { nombre: "SANT 099", activa: false },
  ];
  const copia = JSON.stringify(cuentas);
  assert.deepEqual(
    cuentasActivas(cuentas).map((c) => c.nombre),
    ["MACRO 599"]
  );
  assert.equal(JSON.stringify(cuentas), copia);
  assert.equal(cuentas.length, 2);
});

const MACRO = { nombre: "MACRO 599", banco: "MACRO", terminacion: "599" };

test("al subir: banco detectado distinto del de la cuenta elegida → bloquea", () => {
  const r = controlarCuentaDelArchivo(MACRO, "GALICIA", null);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /es de Galicia pero elegiste MACRO 599/);
});

test("al subir: número de cuenta del archivo distinto de la terminación → bloquea", () => {
  const r = controlarCuentaDelArchivo(MACRO, "MACRO", "315909409281888");
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /no coincide/);
  assert.deepEqual(controlarCuentaDelArchivo(MACRO, "MACRO", "315909409281599"), { ok: true, avisos: [] });
});

test("al subir: formato sin número de cuenta (Galicia, Nación) → avisa que no se pudo verificar", () => {
  const r = controlarCuentaDelArchivo({ nombre: "BNA 241", banco: "BNA", terminacion: "241" }, "BNA", null);
  assert.equal(r.ok, true);
  if (r.ok) assert.match(r.avisos[0], /no se pudo verificar/);
});

test("sugerir cuenta: coincide banco + terminación entre las activas, solo si es única", () => {
  const cuentas = [
    { ...MACRO, activa: true },
    { nombre: "MACRO 888", banco: "MACRO", terminacion: "888", activa: true },
    { nombre: "SANT 599", banco: "SANT", terminacion: "599", activa: true },
  ];
  assert.equal(sugerirCuenta(cuentas, "MACRO", "315909409281599")?.nombre, "MACRO 599");
  assert.equal(sugerirCuenta(cuentas, "MACRO", null), null);
  assert.equal(sugerirCuenta([{ ...MACRO, activa: false }], "MACRO", "315909409281599"), null);
});
