import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularTotalesPresupuesto } from "@/lib/presupuestoTotales";
import {
  CLASIFICACIONES_PRESUPUESTO_EGRESO,
  CLASIFICACIONES_PRESUPUESTO_INGRESO,
} from "@/app/[empresa]/[periodo]/presupuesto/clasificacionesPresupuesto";

test("sin líneas: todo en cero", () => {
  const t = calcularTotalesPresupuesto([]);
  assert.deepEqual(t, {
    ingresos: 0,
    egresos: 0,
    diferencia: 0,
    prestamos: { centavos: 0, lineas: 0 },
    sinClasificar: { centavos: 0, lineas: 0 },
  });
});

test("suma simple por tipo, en centavos, y diferencia = ingresos − egresos", () => {
  const t = calcularTotalesPresupuesto([
    { clasificacion: "COBRANZAS", importe: 1000.1 },
    { clasificacion: "Intereses FCI", importe: 0.2 },
    { clasificacion: "SUELDOS", importe: 400.55 },
    { clasificacion: "PROV Y SERV", importe: 100 },
  ]);
  assert.equal(t.ingresos, 100030);
  assert.equal(t.egresos, 50055);
  assert.equal(t.diferencia, 49975);
});

test("importes negativos se suman con su signo", () => {
  const t = calcularTotalesPresupuesto([
    { clasificacion: "SUELDOS", importe: 500 },
    { clasificacion: "SUELDOS", importe: -120 },
    { clasificacion: "COBRANZAS", importe: -50 },
  ]);
  assert.equal(t.egresos, 38000);
  assert.equal(t.ingresos, -5000);
  assert.equal(t.diferencia, -43000);
});

test("Préstamo MS y Cocos (y el alias PRESTAMOS MS) van aparte y no entran en los totales", () => {
  const t = calcularTotalesPresupuesto([
    { clasificacion: "Préstamo MS", importe: 1000 },
    { clasificacion: "Préstamo Cocos", importe: -200 },
    { clasificacion: "PRESTAMOS MS", importe: 50 },
    { clasificacion: "COBRANZAS", importe: 10 },
  ]);
  assert.deepEqual(t.prestamos, { centavos: 85000, lineas: 3 });
  assert.equal(t.ingresos, 1000);
  assert.equal(t.egresos, 0);
});

test("sin clasificar o fuera de lista: se cuentan aparte, sin asignarles tipo", () => {
  const t = calcularTotalesPresupuesto([
    { clasificacion: "", importe: 10 },
    { clasificacion: "   ", importe: 5 },
    { clasificacion: "CAMPO", importe: -2.5 },
    { clasificacion: "SUELDOS", importe: 1 },
  ]);
  assert.deepEqual(t.sinClasificar, { centavos: 1250, lineas: 3 });
  assert.equal(t.ingresos, 0);
  assert.equal(t.egresos, 100);
});

test("ignora mayúsculas, tildes y espacios de más", () => {
  const t = calcularTotalesPresupuesto([
    { clasificacion: " cobranzas ", importe: 1 },
    { clasificacion: "liquidación FINAL", importe: 2 },
    { clasificacion: "liquidacion final", importe: 3 },
  ]);
  assert.equal(t.ingresos, 100);
  assert.equal(t.egresos, 500);
});

test("cada clasificación de la lista cae en un solo lugar (ingreso, egreso o préstamo)", () => {
  const todas = [...CLASIFICACIONES_PRESUPUESTO_INGRESO, ...CLASIFICACIONES_PRESUPUESTO_EGRESO];
  for (const o of todas) {
    const t = calcularTotalesPresupuesto([{ clasificacion: o.valorPersistido, importe: 1 }]);
    const lugares = [t.ingresos !== 0, t.egresos !== 0, t.prestamos.lineas === 1, t.sinClasificar.lineas === 1];
    assert.equal(lugares.filter(Boolean).length, 1, o.valorPersistido);
    assert.equal(t.sinClasificar.lineas, 0, `${o.valorPersistido} no puede quedar sin clasificar`);
  }
});
