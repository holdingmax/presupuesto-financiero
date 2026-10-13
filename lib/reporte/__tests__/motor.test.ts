import { test } from "node:test";
import assert from "node:assert/strict";
import { armarReporte, periodosHasta, type Plantilla, type DatosMes } from "@/lib/reporte/motor";
import { cat, clasif, egreso, ingreso, SIN_PRESUPUESTO, SIN_REAL, total } from "@/lib/reporte/plantillas/filas";

// Plantilla mínima: un ingreso, dos egresos con fuente, uno pendiente sin fuente.
const PLANTILLA: Plantilla = {
  empresa: "Prueba",
  filas: [
    ingreso("cobranza", "Cobranza", clasif("COBRANZAS"), cat("COBRANZAS")),
    total("totalIngresos", "INGRESOS", "TOTAL INGRESOS", ["cobranza"]),
    egreso("sueldos", "Sueldos", clasif("SUELDOS"), cat("SUELDOS")),
    egreso("gastosBancarios", "Gastos bancarios", clasif("COM Y GTOS BRIOS"), cat("Gastos bancarios")),
    egreso("expensas", "Expensas", SIN_REAL, cat("EXPENSAS"), { pendiente: "K2" }),
    total("teo", "EGRESOS", "TOTAL EGRESOS OPERATIVOS", ["sueldos", "gastosBancarios", "expensas"]),
    egreso("vacia", "Peru", SIN_REAL, SIN_PRESUPUESTO),
    total("soloVacia", "EGRESOS", "TOTAL VACÍO", ["vacia"]),
  ],
};

function mes(periodo: string, real: [string, number][], presupuesto: [string, number][] | null): DatosMes {
  return { periodo, real: new Map(real), presupuesto: presupuesto ? new Map(presupuesto) : null };
}

function celda(plantilla: Plantilla, meses: DatosMes[], clave: string, i = 0) {
  const fila = armarReporte(plantilla, meses).filas.find((f) => f.fila.clave === clave);
  assert.ok(fila, `no existe la fila ${clave}`);
  return fila.celdas[i];
}

test("% avance da null si el presupuestado es 0", () => {
  const meses = [mes("2026-07", [["SUELDOS", -50000]], [["SUELDOS", 0]])];
  const c = celda(PLANTILLA, meses, "sueldos");
  assert.equal(c.presupuestado, 0);
  assert.equal(c.real, 50000);
  assert.equal(c.avance, null);
});

test("falta ejecutar = P − R y % avance = R / P", () => {
  const meses = [mes("2026-07", [["SUELDOS", -30000]], [["SUELDOS", 120000]])];
  const c = celda(PLANTILLA, meses, "sueldos");
  assert.equal(c.faltaEjecutar, 90000);
  assert.equal(c.avance, 25);
});

test("el signo es por fila: un egreso normal queda positivo y uno neto al revés, negativo", () => {
  const normal = celda(PLANTILLA, [mes("2026-07", [["SUELDOS", -10000]], null)], "sueldos");
  assert.equal(normal.real, 10000);
  // Más devoluciones que gastos: el neto de banco es positivo → el egreso se ve negativo.
  const alReves = celda(PLANTILLA, [mes("2026-07", [["SUELDOS", 2500]], null)], "sueldos");
  assert.equal(alReves.real, -2500);
  // Un ingreso conserva el signo de banco.
  const cobranza = celda(PLANTILLA, [mes("2026-07", [["COBRANZAS", 7000]], null)], "cobranza");
  assert.equal(cobranza.real, 7000);
});

test("una fila sin fuente da null (no 0) y marca el total como incompleto", () => {
  const meses = [mes("2026-07", [["SUELDOS", -10000], ["COM Y GTOS BRIOS", -500]], [["EXPENSAS", 4000]])];
  const expensas = celda(PLANTILLA, meses, "expensas");
  assert.equal(expensas.real, null);
  assert.equal(expensas.faltaEjecutar, null);
  assert.equal(expensas.realIncompleto, true);
  const teo = celda(PLANTILLA, meses, "teo");
  assert.equal(teo.real, 10500);
  assert.equal(teo.realIncompleto, true);
  // El presupuesto de Expensas sí tiene fuente: el total de P está completo.
  assert.equal(teo.presupuestado, 4000);
  assert.equal(teo.presupuestoIncompleto, false);
});

test("una clasificación sin movimientos da 0 (tiene fuente); un total sin ninguna fila con valor da null", () => {
  const meses = [mes("2026-07", [], [])];
  assert.equal(celda(PLANTILLA, meses, "sueldos").real, 0);
  assert.equal(celda(PLANTILLA, meses, "vacia").real, null);
  assert.equal(celda(PLANTILLA, meses, "soloVacia").real, null);
  assert.equal(celda(PLANTILLA, meses, "soloVacia").realIncompleto, false);
});

test("un mes sin presupuesto se marca 'sin presupuesto' y su P queda en null", () => {
  const meses = [
    mes("2026-07", [["SUELDOS", -100]], null),
    mes("2026-08", [["SUELDOS", -100]], [["SUELDOS", 300]]),
  ];
  const reporte = armarReporte(PLANTILLA, meses);
  assert.deepEqual(reporte.sinPresupuesto, [true, false]);
  const sueldos = reporte.filas.find((f) => f.fila.clave === "sueldos")!;
  assert.equal(sueldos.celdas[0].presupuestado, null);
  assert.equal(sueldos.celdas[0].avance, null);
  assert.equal(sueldos.celdas[1].presupuestado, 300);
});

test("empareja con los alias y sin mayúsculas/tildes/espacios", () => {
  const meses = [
    mes(
      "2026-07",
      [["com y gtos brios ", -700]],
      // Presupuesto guardado con el alias técnico en vez de la categoría.
      [["COM Y GTOS BRIOS", 900]]
    ),
  ];
  const c = celda(PLANTILLA, meses, "gastosBancarios");
  assert.equal(c.real, 700);
  assert.equal(c.presupuestado, 900);
});

test("lista los códigos pendientes de la plantilla sin repetir", () => {
  assert.deepEqual(armarReporte(PLANTILLA, [mes("2026-07", [], null)]).pendientes, ["K2"]);
});

test("periodosHasta cruza el cambio de año", () => {
  assert.deepEqual(periodosHasta("2026-01", 3), ["2025-11", "2025-12", "2026-01"]);
  assert.deepEqual(periodosHasta("2026-09", 3), ["2026-07", "2026-08", "2026-09"]);
});

test("falta ejecutar es null si no hay presupuestado (0, vacío o sin presupuesto), no un negativo", () => {
  const conCeroEnLinea = celda(PLANTILLA, [mes("2026-07", [["SUELDOS", -50000]], [["SUELDOS", 0]])], "sueldos");
  assert.equal(conCeroEnLinea.faltaEjecutar, null);
  // Presupuesto del mes sin línea de esa categoría → 0.
  const sinLinea = celda(PLANTILLA, [mes("2026-07", [["SUELDOS", -50000]], [["COBRANZAS", 1]])], "sueldos");
  assert.equal(sinLinea.presupuestado, 0);
  assert.equal(sinLinea.faltaEjecutar, null);
  const sinPresupuestoMes = celda(PLANTILLA, [mes("2026-07", [["SUELDOS", -50000]], null)], "sueldos");
  assert.equal(sinPresupuestoMes.faltaEjecutar, null);
  // Un total con presupuestado 0 tampoco muestra "falta".
  const total0 = celda(PLANTILLA, [mes("2026-07", [["SUELDOS", -50000]], [["SUELDOS", 0]])], "teo");
  assert.equal(total0.faltaEjecutar, null);
  // Con presupuestado sí se calcula, aunque dé negativo (se pasó).
  const pasado = celda(PLANTILLA, [mes("2026-07", [["SUELDOS", -150000]], [["SUELDOS", 100000]])], "sueldos");
  assert.equal(pasado.faltaEjecutar, -50000);
});

test("un mes sin semanas cerradas tiene el Real en null (no 0) y se marca sin ejecución", () => {
  const sinSemanas: DatosMes = { ...mes("2026-08", [], [["SUELDOS", 100000]]), semanasCerradas: 0 };
  const conSemanas: DatosMes = { ...mes("2026-07", [["SUELDOS", -30000]], [["SUELDOS", 100000]]), semanasCerradas: 2 };
  const reporte = armarReporte(PLANTILLA, [conSemanas, sinSemanas]);
  assert.deepEqual(reporte.sinEjecucion, [false, true]);
  const sueldos = reporte.filas.find((f) => f.fila.clave === "sueldos")!;
  assert.equal(sueldos.celdas[0].real, 30000);
  assert.equal(sueldos.celdas[1].real, null);
  assert.equal(sueldos.celdas[1].avance, null);
  assert.equal(sueldos.celdas[1].faltaEjecutar, null);
  assert.equal(sueldos.celdas[1].presupuestado, 100000);
  const teo = reporte.filas.find((f) => f.fila.clave === "teo")!;
  assert.equal(teo.celdas[1].real, null);
  // Sin el dato (undefined) se asume que hay ejecución: Real en 0, como antes.
  const sinDato = armarReporte(PLANTILLA, [mes("2026-08", [], null)]);
  assert.deepEqual(sinDato.sinEjecucion, [false]);
  assert.equal(sinDato.filas.find((f) => f.fila.clave === "sueldos")!.celdas[0].real, 0);
});
