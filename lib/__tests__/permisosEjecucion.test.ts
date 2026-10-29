import { test } from "node:test";
import assert from "node:assert/strict";
import {
  puedeOperarEjecucionGlobal,
  puedeCerrarEjecucion,
  veTodoEjecucion,
  veBloquesReservadosDelReporte,
  puedeCargarMadreEjecucion,
  veSubidaDeEjecucion,
} from "@/lib/permisosEjecucion";

// Permisos de Ejecución global (plan §3.3, D-3 y D-4).

const admin = { rol: "ADMIN" as const, operaEjecucion: false };
const finanzasSinPermiso = { rol: "FINANZAS" as const, operaEjecucion: false };
const finanzasQueOpera = { rol: "FINANZAS" as const, operaEjecucion: true };
const gerenteQueOpera = { rol: "GERENTE" as const, operaEjecucion: true }; // Flavia
const gerente = { rol: "GERENTE" as const, operaEjecucion: false };

test("operar: ADMIN siempre; el resto solo con operaEjecucion", () => {
  assert.equal(puedeOperarEjecucionGlobal(admin), true);
  assert.equal(puedeOperarEjecucionGlobal(finanzasQueOpera), true);
  assert.equal(puedeOperarEjecucionGlobal(gerenteQueOpera), true);
  // Ser FINANZAS por sí solo no da permiso de operar: lo da un ADMIN desde /admin/usuarios.
  assert.equal(puedeOperarEjecucionGlobal(finanzasSinPermiso), false);
  assert.equal(puedeOperarEjecucionGlobal(gerente), false);
});

test("cerrar: solo FINANZAS y ADMIN; quien opera sin serlo (Flavia) no cierra", () => {
  assert.equal(puedeCerrarEjecucion(admin), true);
  assert.equal(puedeCerrarEjecucion(finanzasSinPermiso), true);
  assert.equal(puedeCerrarEjecucion(finanzasQueOpera), true);
  assert.equal(puedeCerrarEjecucion(gerenteQueOpera), false);
  assert.equal(puedeCerrarEjecucion(gerente), false);
});

test("ve todo Ejecución: ADMIN, FINANZAS y quien opera; el gerente no", () => {
  assert.equal(veTodoEjecucion(admin), true);
  assert.equal(veTodoEjecucion(finanzasSinPermiso), true);
  assert.equal(veTodoEjecucion(gerenteQueOpera), true);
  assert.equal(veTodoEjecucion(gerente), false);
});

test("columna Saldo (verSaldo = veTodoEjecucion): ADMIN, FINANZAS y quien opera, incluida Flavia; ningún otro gerente", () => {
  for (const u of [admin, finanzasSinPermiso, finanzasQueOpera, gerenteQueOpera]) {
    assert.equal(veTodoEjecucion(u), true);
  }
  assert.equal(veTodoEjecucion(gerente), false);
});

test("bloques reservados del Reporte (Disponibilidades y Cierre): solo ADMIN y FINANZAS, operar no alcanza", () => {
  assert.equal(veBloquesReservadosDelReporte(admin), true);
  assert.equal(veBloquesReservadosDelReporte(finanzasSinPermiso), true);
  assert.equal(veBloquesReservadosDelReporte(gerenteQueOpera), false);
  assert.equal(veBloquesReservadosDelReporte(gerente), false);
});

test("cargar archivo madre por la web: solo ADMIN y FINANZAS; operar (Flavia) no alcanza, y FINANZAS no necesita operar", () => {
  assert.equal(puedeCargarMadreEjecucion(admin), true);
  assert.equal(puedeCargarMadreEjecucion(finanzasSinPermiso), true);
  assert.equal(puedeCargarMadreEjecucion(finanzasQueOpera), true);
  assert.equal(puedeCargarMadreEjecucion(gerenteQueOpera), false);
  assert.equal(puedeCargarMadreEjecucion(gerente), false);
});

test("panel de subida: lo ve quien opera o quien puede cargar la madre (FINANZAS sin operaEjecucion incluido), sin darle por eso permiso de operar", () => {
  assert.equal(veSubidaDeEjecucion(admin), true);
  assert.equal(veSubidaDeEjecucion(finanzasSinPermiso), true);
  assert.equal(veSubidaDeEjecucion(finanzasQueOpera), true);
  assert.equal(veSubidaDeEjecucion(gerenteQueOpera), true); // Flavia: opera
  assert.equal(veSubidaDeEjecucion(gerente), false);
  // Ver el panel no es operar: FINANZAS sin el flag sigue sin poder subir extractos de banco.
  assert.equal(puedeOperarEjecucionGlobal(finanzasSinPermiso), false);
  assert.equal(puedeCargarMadreEjecucion(finanzasSinPermiso), true);
});

