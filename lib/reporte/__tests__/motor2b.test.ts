import { test } from "node:test";
import assert from "node:assert/strict";
import {
  armarReporte,
  camposManuales,
  validarPlantilla,
  type DatosMes,
  type Plantilla,
} from "@/lib/reporte/motor";
import { PLANTILLAS_POR_SLUG } from "@/lib/reporte/plantillas";
import {
  abajo,
  capital,
  cat,
  clasif,
  clasifSentido,
  disp,
  disponible,
  egreso,
  ingreso,
  PRESUPUESTO_DISPONIBLE,
  PRESUPUESTO_MANUAL,
  REAL_IGUAL_PRESUPUESTO,
  REAL_MANUAL,
  SIN_REAL,
  titulo,
  total,
} from "@/lib/reporte/plantillas/filas";
import { esMesCerrado, formatearCentavos, motivoBloqueo, parsearCuenta } from "@/lib/reporte/bloqueo";
import { CLAVES_MANUALES } from "./fixtures/clavesManuales";

// Plantilla mínima con todas las fuentes de la 2b.
const PLANTILLA: Plantilla = {
  empresa: "Prueba",
  filas: [
    titulo("tD", "DISPONIBILIDADES", "DISPONIBILIDADES"),
    disp("banco", "BANCO", "cuadre"),
    disp("cheques", "CHEQUES DESPUES DEL 10", "ajuste"),
    total("totalDisp", "DISPONIBILIDADES", "TOTAL DISPONIBILIDADES", ["banco", "cheques"], { rol: "totalDisponibilidades" }),
    ingreso("cobranza", "Cobranza", clasif("COBRANZAS"), cat("COBRANZAS")),
    ingreso("prestamoEntrada", "Préstamo MS", clasifSentido("creditos", "PRESTAMOS MS"), PRESUPUESTO_MANUAL),
    ingreso("reserva", "Reserva", REAL_IGUAL_PRESUPUESTO, PRESUPUESTO_MANUAL),
    ingreso("fci", "Resultado FCI", REAL_MANUAL, cat("Intereses FCI")),
    total("totalIng", "INGRESOS", "TOTAL INGRESOS", ["cobranza", "prestamoEntrada", "reserva", "fci"]),
    total("dispAntes", "CIERRE", "DISPONIBLE ANTES", ["totalDisp", "totalIng"], { requiere: ["totalDisp"], soloConPresupuesto: true }),
    egreso("sueldos", "Sueldos", clasif("SUELDOS"), cat("SUELDOS")),
    total("teo", "EGRESOS", "TEO", ["sueldos"]),
    abajo("devolucion", "Devolución préstamo", clasifSentido("debitos", "PRESTAMOS MS"), PRESUPUESTO_DISPONIBLE),
    total("totalEgr", "ABAJO", "TOTAL EGRESOS", ["teo", "devolucion"]),
    total("saldo", "CIERRE", "SALDO", ["dispAntes"], { resta: ["totalEgr"], requiere: ["dispAntes"], soloConPresupuesto: true, rol: "saldo" }),
    capital("capital", "CAPITAL", { terminos: [{ fila: "teo", factor: 0.5 }, { fila: "reserva", factor: -0.5 }], fijo: 100 }),
    disponible("disp", "DISPONIBLE", "totalDisp", "capital"),
  ],
};

const manuales = (p: [string, number][] = [], r: [string, number][] = []) => ({ presupuesto: new Map(p), real: new Map(r) });

function mes(extra: Partial<DatosMes> & { periodo?: string } = {}): DatosMes {
  return { periodo: "2026-08", real: new Map(), presupuesto: new Map(), semanasCerradas: 0, ...extra };
}

function celda(reporte: ReturnType<typeof armarReporte>, clave: string, i = 0) {
  return reporte.filas.find((f) => f.fila.clave === clave)!.celdas[i];
}

test("la plantilla de prueba es válida", () => {
  assert.deepEqual(validarPlantilla(PLANTILLA), []);
});

test("créditos y débitos de una misma clasificación van a dos filas; el neto no se usa", () => {
  const r = armarReporte(PLANTILLA, [
    mes({
      real: new Map([["PRESTAMOS MS", 29594000 - 610350]]),
      realCreditos: new Map([["PRESTAMOS MS", 29594000]]),
      realDebitos: new Map([["PRESTAMOS MS", -610350]]),
      semanasCerradas: 2,
    }),
  ]);
  assert.equal(celda(r, "prestamoEntrada").real, 29594000);
  assert.equal(celda(r, "devolucion").real, 610350); // débito → egreso positivo
});

test("validarPlantilla: una clasificación en dos filas solo con sentidos distintos", () => {
  const dos = (a: ReturnType<typeof clasifSentido>, b: ReturnType<typeof clasifSentido>): Plantilla => ({
    empresa: "x",
    filas: [ingreso("a", "A", a, PRESUPUESTO_MANUAL), egreso("b", "B", b, PRESUPUESTO_MANUAL)],
  });
  assert.deepEqual(validarPlantilla(dos(clasifSentido("creditos", "PRESTAMOS MS"), clasifSentido("debitos", "PRESTAMOS MS"))), []);
  assert.equal(validarPlantilla(dos(clasifSentido("creditos", "PRESTAMOS MS"), clasifSentido("creditos", "PRESTAMOS MS"))).length, 1);
  assert.equal(validarPlantilla(dos(clasif("PRESTAMOS MS"), clasifSentido("debitos", "PRESTAMOS MS"))).length, 1);
});

test("validarPlantilla: apunta a claves que existen, componentes con arrastre y sin ciclos", () => {
  const rota: Plantilla = {
    empresa: "x",
    filas: [
      { ...disp("c", "C", "cuadre"), arrastre: undefined },
      capital("cap", "CAP", { terminos: [{ fila: "noExiste", factor: 1 }] }),
    ],
  };
  const errores = validarPlantilla(rota);
  assert.ok(errores.some((e) => e.includes("arrastre")));
  assert.ok(errores.some((e) => e.includes("noExiste")));
  // Ciclo: Disponible → Capital → una fila que toma el Disponible.
  const ciclo: Plantilla = {
    empresa: "x",
    filas: [
      disp("d1", "D1", "cuadre"),
      total("td", "DISPONIBILIDADES", "TD", ["d1"], { rol: "totalDisponibilidades" }),
      abajo("pres", "Prestamos", SIN_REAL, PRESUPUESTO_DISPONIBLE),
      capital("cap", "CAP", { terminos: [{ fila: "pres", factor: 1 }] }),
      disponible("disp", "DISP", "td", "cap"),
    ],
  };
  assert.ok(validarPlantilla(ciclo).some((e) => e.includes("Ciclo")));
});

test("Disponibilidades: P = R del componente, total = suma, sin % ni falta", () => {
  const r = armarReporte(PLANTILLA, [mes({ manuales: manuales([], [["banco", 100000], ["cheques", -20000]]) })]);
  assert.equal(celda(r, "banco").presupuestado, 100000);
  assert.equal(celda(r, "banco").real, 100000);
  assert.equal(celda(r, "totalDisp").presupuestado, 80000);
  assert.equal(celda(r, "totalDisp").real, 80000);
  assert.equal(celda(r, "totalDisp").avance, null);
  assert.equal(celda(r, "totalDisp").faltaEjecutar, null);
});

test("sin Disponibilidades cargadas, el cierre queda en null (D8): sin rellenar con el cierre anterior", () => {
  const r = armarReporte(PLANTILLA, [mes()]);
  for (const clave of ["totalDisp", "dispAntes", "saldo", "disp"]) {
    assert.equal(celda(r, clave).presupuestado, null, `${clave} P`);
    assert.equal(celda(r, clave).real, null, `${clave} R`);
  }
});

test("Capital: regla con redondeo al centavo; el valor manual la reemplaza; sin presupuesto queda null", () => {
  const datos = { presupuesto: new Map([["SUELDOS", 30001]]), manuales: manuales([["reserva", 20001]]) };
  const r = armarReporte(PLANTILLA, [mes(datos)]);
  // (30001 − 20001)/2 + 100 → teo/2 − reserva/2 + fijo = 15000,5 − 10000,5 + 100 = 5100
  assert.equal(celda(r, "capital").presupuestado, 5100);
  const manual = armarReporte(PLANTILLA, [mes({ ...datos, manuales: manuales([["reserva", 20001], ["capital", 777]]) })]);
  assert.equal(celda(manual, "capital").presupuestado, 777);
  const sinPres = armarReporte(PLANTILLA, [mes({ presupuesto: null })]);
  assert.equal(celda(sinPres, "capital").presupuestado, null);
  assert.equal(celda(sinPres, "capital").real, null);
});

test("Disponible = Total Disponibilidades − Capital; la devolución toma el Disponible (orden por dependencias)", () => {
  const r = armarReporte(PLANTILLA, [
    mes({ presupuesto: new Map([["SUELDOS", 20000]]), manuales: manuales([], [["banco", 100000]]) }),
  ]);
  // capital = 20000/2 + 100 (reserva null → 0) = 10100; disponible = 100000 − 10100 = 89900
  assert.equal(celda(r, "capital").presupuestado, 10100);
  assert.equal(celda(r, "disp").presupuestado, 89900);
  assert.equal(celda(r, "devolucion").presupuestado, 89900);
  assert.equal(celda(r, "totalEgr").presupuestado, 20000 + 89900);
  // Saldo = (disp + ingresos) − egresos
  assert.equal(celda(r, "saldo").presupuestado, 100000 - (20000 + 89900));
});

test("R = P (reservas, espejos): vacío con el mes en curso, R = P con el mes cerrado", () => {
  const datos = { manuales: manuales([["reserva", 5000]], [["banco", 1]]) };
  assert.equal(celda(armarReporte(PLANTILLA, [mes({ ...datos, mesCerrado: false })]), "reserva").real, null);
  assert.equal(celda(armarReporte(PLANTILLA, [mes({ ...datos, mesCerrado: true })]), "reserva").real, 5000);
});

test("Saldo P y Disponible antes de gastos P dependen del presupuesto; el R no", () => {
  const r = armarReporte(PLANTILLA, [mes({ presupuesto: null, manuales: manuales([], [["banco", 100000]]) })]);
  assert.equal(celda(r, "dispAntes").presupuestado, null);
  assert.equal(celda(r, "saldo").presupuestado, null);
  assert.equal(celda(r, "dispAntes").real, 100000);
  assert.equal(celda(r, "saldo").real, 100000);
});

test("arrastre: se calcula con el mes de contexto, que no se muestra", () => {
  const julio = mes({ periodo: "2026-07", manuales: manuales([], [["banco", 50000]]) });
  const agosto = mes({ manuales: manuales([], [["banco", 50000], ["cheques", -20000]]) });
  const r = armarReporte(PLANTILLA, [julio, agosto], 1);
  assert.deepEqual(r.periodos, ["2026-08"]);
  assert.equal(r.arrastre.length, 1);
  assert.equal(r.arrastre[0]!.cierreRealAnterior, 50000);
  assert.equal(r.arrastre[0]!.ajustes, -20000);
  assert.equal(r.arrastre[0]!.diferencia, 0);
  assert.equal(r.arrastre[0]!.cuadra, true);
});

test("camposManuales: componentes (REAL), P manual, Capital", () => {
  const claves = camposManuales(PLANTILLA).map((c) => `${c.clave}|${c.columna}`);
  assert.deepEqual(claves, [
    "banco|REAL",
    "cheques|REAL",
    "prestamoEntrada|PRESUPUESTADO",
    "reserva|PRESUPUESTADO",
    "fci|REAL",
    "capital|PRESUPUESTADO",
  ]);
});

test("las claves manuales de las 7 plantillas no cambian sin que se note en el diff", () => {
  for (const slug of Object.keys(CLAVES_MANUALES)) {
    assert.deepEqual(
      camposManuales(PLANTILLAS_POR_SLUG[slug]).map((c) => `${c.clave}|${c.columna}`),
      CLAVES_MANUALES[slug],
      slug
    );
  }
});

test("Brillante: Recupero aporte blanqueo no suma en el total (E1) y se marca excluida", () => {
  const p = PLANTILLAS_POR_SLUG["brillante"];
  const r = armarReporte(p, [mes({ manuales: manuales([], [["br.dBancoFci", 1000], ["br.dRecuperoBlanqueo", 500]]) })]);
  assert.equal(celda(r, "br.totalDisponibilidades").real, 1000);
  assert.equal(celda(r, "br.dRecuperoBlanqueo").real, 500);
});

// ---------- regla de bloqueo ----------

const base = { periodo: "2026-07", actual: "2026-08", presupuestoValidado: false, semanas: { abiertas: 0, cerradas: 0 } };

test("bloqueo: P y Capital cuando el presupuesto está VALIDADO; sin presupuesto, editable", () => {
  assert.ok(motivoBloqueo({ ...base, columna: "PRESUPUESTADO", bloque: "INGRESOS", presupuestoValidado: true }));
  assert.equal(motivoBloqueo({ ...base, columna: "PRESUPUESTADO", bloque: "CIERRE" }), null);
});

test("bloqueo: Disponibilidades, mes pasado con al menos una semana CERRADA", () => {
  const d = { ...base, columna: "REAL" as const, bloque: "DISPONIBILIDADES" as const };
  assert.equal(motivoBloqueo(d), null);
  assert.ok(motivoBloqueo({ ...d, semanas: { abiertas: 1, cerradas: 1 } }));
  assert.equal(motivoBloqueo({ ...d, periodo: "2026-08", semanas: { abiertas: 0, cerradas: 3 } }), null); // mes actual
  assert.equal(motivoBloqueo({ ...d, presupuestoValidado: true }), null); // no se bloquea por VALIDADO
});

test("bloqueo: R manual de flujo, mes pasado sin semanas ABIERTAS", () => {
  const f = { ...base, columna: "REAL" as const, bloque: "INGRESOS" as const };
  assert.ok(motivoBloqueo(f));
  assert.equal(motivoBloqueo({ ...f, semanas: { abiertas: 1, cerradas: 0 } }), null);
  assert.equal(motivoBloqueo({ ...f, periodo: "2026-08" }), null);
});

test("mes cerrado = pasó y sin semanas abiertas", () => {
  assert.equal(esMesCerrado("2026-07", "2026-08", { abiertas: 0, cerradas: 2 }), true);
  assert.equal(esMesCerrado("2026-07", "2026-08", { abiertas: 1, cerradas: 2 }), false);
  assert.equal(esMesCerrado("2026-08", "2026-08", { abiertas: 0, cerradas: 2 }), false);
});

// ---------- cuentas ----------

test("parsearCuenta: importes y cuentas como las SM de Macchi", () => {
  assert.deepEqual(parsearCuenta("1.234,56"), { centavos: 123456, nota: null });
  assert.deepEqual(parsearCuenta("321.235,44+17.755,22"), { centavos: 33899066, nota: "321.235,44+17.755,22" });
  assert.equal(parsearCuenta("-136.170.039+78.411.842,93-6.316.335,37+64.074.531")?.centavos, -13617003900 + 7841184293 - 631633537 + 6407453100);
  assert.equal(parsearCuenta("100−30")?.centavos, 7000); // signo menos tipográfico
  assert.equal(parsearCuenta("-5.000")?.centavos, -500000);
  assert.equal(parsearCuenta("1.500.000")?.centavos, 150000000);
  assert.equal(parsearCuenta("abc"), null);
  assert.equal(parsearCuenta("12+"), null);
  assert.equal(parsearCuenta(""), null);
});

test("formatearCentavos usa coma decimal", () => {
  assert.equal(formatearCentavos(123456), "1.234,56");
  assert.equal(formatearCentavos(-5), "-0,05");
});
