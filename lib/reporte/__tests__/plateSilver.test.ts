import { test } from "node:test";
import assert from "node:assert/strict";
import { armarReporte, clasificacionesDePlantilla, type DatosMes, type FilaLinea, type Reporte } from "@/lib/reporte/motor";
import { PLANTILLAS_POR_SLUG } from "@/lib/reporte/plantillas";
import { CLASIFICACIONES_PRESUPUESTO_TODAS } from "@/app/[empresa]/[periodo]/presupuesto/clasificacionesPresupuesto";
import { ENERO_2026_PLATE_SILVER } from "./fixtures/plateSilverEnero";
import { ARRASTRE_12_MESES } from "./fixtures/arrastre12meses";

// Plantilla de Plate Silver (USD; importes en centavos de dólar). El agosto contra el Excel lo cubre
// agosto2026.test.ts; acá: enero completo (P y R cargados en todas las filas), las fórmulas de Cierre,
// el arrastre de febrero a agosto y la lista exacta de categorías de Presupuesto sin fila.
// Si algo no cierra NO se ajusta nada: se frena y se muestra la diferencia.

const plantilla = PLANTILLAS_POR_SLUG["plate-silver"];

// Arma el mes de enero con los datos de ENTRADA de la fixture (las filas que no son fórmula).
function enero(): Reporte {
  assert.equal(ENERO_2026_PLATE_SILVER.length, plantilla.filas.length);
  const presupuesto = new Map<string, number>();
  const manP = new Map<string, number>();
  const manR = new Map<string, number>();
  plantilla.filas.forEach((fila, i) => {
    const e = ENERO_2026_PLATE_SILVER[i];
    assert.equal(e.texto, fila.texto, `la fila ${e.fila} no coincide con la plantilla`);
    if (fila.tipo !== "linea") return;
    if (fila.bloque === "DISPONIBILIDADES") {
      assert.equal(e.p, e.r, `${fila.texto}: P distinto de R`);
      if (e.r !== null) manR.set(fila.clave, e.r);
      return;
    }
    if (fila.presupuesto.tipo === "categorias" && e.p !== null) presupuesto.set(fila.presupuesto.categorias[0], e.p);
    if (fila.presupuesto.tipo === "manual" && e.p !== null) manP.set(fila.clave, e.p);
    if (fila.real.tipo === "manual" && e.r !== null) manR.set(fila.clave, e.r);
  });
  const mes: DatosMes = {
    periodo: "2026-01",
    real: new Map(),
    presupuesto,
    mesCerrado: true,
    manuales: { presupuesto: manP, real: manR },
  };
  return armarReporte(plantilla, [mes]);
}

const celda = (r: Reporte, clave: string) => {
  const f = r.filas.find((x) => x.fila.clave === clave);
  assert.ok(f, `no existe la fila ${clave}`);
  return f.celdas[0];
};

test("plate-silver enero: P y R de todas las filas iguales al Excel (tolerancia de redondeo)", () => {
  const reporte = enero();
  const fallas: string[] = [];
  reporte.filas.forEach(({ fila, celdas }, i) => {
    if (fila.tipo === "titulo") return;
    const e = ENERO_2026_PLATE_SILVER[i];
    const revisar = (col: "P" | "R", excel: number | null, motor: number | null, tol: number) => {
      if (excel === null) return;
      const m = motor ?? (e.calc ? 0 : null);
      if (m === null || Math.abs(m - excel) > tol) {
        fallas.push(`${col} f${e.fila} "${fila.texto.trim()}": excel=${excel} motor=${motor} tol=${tol}`);
      }
    };
    revisar("P", e.p, celdas[0].presupuestado, e.tolP);
    revisar("R", e.r, celdas[0].real, e.tolR);
  });
  assert.deepEqual(fallas, [], "diferencias contra el Excel: NO se ajusta la fixture ni la expectativa");
});

test("plate-silver enero: Capital de trabajo = Total gastos operativos, en P y en R", () => {
  const r = enero();
  for (const col of ["presupuestado", "real"] as const) {
    assert.equal(celda(r, "ps.capital")[col], celda(r, "ps.totalGastosOperativos")[col], col);
  }
  // Valores del Excel (B40 / C40), en centavos de dólar.
  assert.ok(Math.abs(celda(r, "ps.capital").presupuestado! - 7221540) <= 5);
  assert.ok(Math.abs(celda(r, "ps.capital").real! - 6872683) <= 4);
});

test("plate-silver: Excedente = TOTAL DISPONIBILIDADES − Capital de trabajo, y NO es Posición − Capital", () => {
  const r = enero();
  for (const col of ["presupuestado", "real"] as const) {
    const excedente = celda(r, "ps.excedente")[col]!;
    const totalDisp = celda(r, "ps.totalDisponibilidades")[col]!;
    const capital = celda(r, "ps.capital")[col]!;
    const posicion = celda(r, "ps.saldo")[col]!;
    assert.equal(excedente, totalDisp - capital, `${col}: Excedente = Total disponibilidades − Capital`);
    assert.notEqual(excedente, posicion - capital, `${col}: Excedente ≠ Posición − Capital`);
  }
  // Excel de enero, REAL: Excedente 14.756,36 contra Posición − Capital = 30.369,50.
  assert.ok(Math.abs(celda(r, "ps.excedente").real! - 1475636) <= 5);
  assert.ok(Math.abs(celda(r, "ps.saldo").real! - celda(r, "ps.capital").real! - 3036950) <= 10);
});

test("plate-silver: Posición = Disponible antes de gastos − Total gastos, y los totales suman lo que dice la planilla", () => {
  const r = enero();
  for (const col of ["presupuestado", "real"] as const) {
    assert.equal(celda(r, "ps.disponibleAntes")[col], celda(r, "ps.totalDisponibilidades")[col]! + celda(r, "ps.totalIngresos")[col]!);
    assert.equal(celda(r, "ps.saldo")[col], celda(r, "ps.disponibleAntes")[col]! - celda(r, "ps.totalGastos")[col]!);
    // Total gastos = los 12 operativos + Reembolsos + Dividendos + Otro.
    assert.equal(
      celda(r, "ps.totalGastos")[col],
      celda(r, "ps.totalGastosOperativos")[col]! +
        (celda(r, "ps.reembolsosPrestamos")[col] ?? 0) +
        (celda(r, "ps.dividendos")[col] ?? 0) +
        (celda(r, "ps.otroAbajo")[col] ?? 0)
    );
  }
  const operativos = plantilla.filas.filter((f) => f.tipo === "linea" && f.bloque === "EGRESOS");
  assert.equal(operativos.length, 12, "el total de gastos operativos suma 12 filas");
});

// Arrastre: la planilla toma Banco(P) = Posición REAL del mes anterior. La plantilla no lo calcula: el Banco se
// tipea y el control de arrastre compara el Total Disponibilidades con la Posición real anterior (como HWC).
function conBanco(periodo: string, banco: number): DatosMes {
  return {
    periodo,
    real: new Map(),
    presupuesto: new Map(),
    mesCerrado: true,
    manuales: { presupuesto: new Map(), real: new Map([["ps.dBanco", banco]]) },
  };
}

test("plate-silver: arrastre de febrero a agosto — Total Disponibilidades = Posición real del mes anterior", () => {
  const meses = ARRASTRE_12_MESES["plate-silver"];
  assert.equal(meses.length, 8);
  for (let i = 1; i < meses.length; i++) {
    const anterior = meses[i - 1];
    const actual = meses[i];
    // Mes anterior con el Banco = su Posición real del Excel (sin ingresos ni gastos: la Posición es el Banco).
    const reporte = armarReporte(plantilla, [conBanco(anterior.periodo, anterior.cierreReal!), conBanco(actual.periodo, actual.componentes["BANCO"])]);
    const control = reporte.arrastre[1];
    assert.ok(control, `${actual.periodo}: sin control de arrastre`);
    assert.equal(control.cierreRealAnterior, anterior.cierreReal, actual.periodo);
    assert.equal(control.ajustes, 0, "Plate Silver no tiene componentes de ajuste");
    assert.equal(control.cuadra, true, `${actual.periodo}: diferencia ${control.diferencia}`);
  }
});

test("plate-silver: si el Banco no coincide con la Posición real anterior, el control no cuadra", () => {
  const reporte = armarReporte(plantilla, [conBanco("2026-07", 12030617), conBanco("2026-08", 12030617 + 50_000)]);
  const control = reporte.arrastre[1]!;
  assert.equal(control.cuadra, false);
  assert.equal(control.diferencia, 50_000);
});

test("plate-silver: la plantilla tiene las dos filas que usa el control de arrastre", () => {
  assert.ok(plantilla.filas.some((f) => f.tipo === "total" && f.rol === "totalDisponibilidades"));
  assert.ok(plantilla.filas.some((f) => f.tipo === "total" && f.rol === "saldo"));
  const disponibilidades = plantilla.filas.filter((f): f is FilaLinea => f.tipo === "linea" && f.bloque === "DISPONIBILIDADES");
  assert.deepEqual(disponibilidades.map((f) => f.arrastre), ["cuadre", "cuadre", "cuadre"]);
});

test("plate-silver: ninguna fila lee su Real de la Ejecución (todo manual)", () => {
  assert.deepEqual(clasificacionesDePlantilla(plantilla), []);
  const lineas = plantilla.filas.filter((f): f is FilaLinea => f.tipo === "linea");
  assert.ok(lineas.every((f) => f.real.tipo === "manual"));
});

// Categorías de Presupuesto que ninguna fila de la plantilla suma: el motor las ignora sin avisar
// (motor.ts, indicePresupuesto). Esta lista tiene que cambiar a propósito, no por accidente.
test("plate-silver: categorías de Presupuesto sin fila — lista exacta", () => {
  const conFila = new Set(
    plantilla.filas.flatMap((f) => (f.tipo === "linea" && f.presupuesto.tipo === "categorias" ? f.presupuesto.categorias : []))
  );
  const sinFila = Array.from(new Set(CLASIFICACIONES_PRESUPUESTO_TODAS.map((o) => o.valorPersistido)))
    .filter((c) => !conFila.has(c))
    .sort();
  assert.deepEqual(
    sinFila,
    [
      "COMISIONES ESPECIALES",
      "INVERSIONES",
      "IVA",
      "Intereses FCI",
      "Juicios",
      "OTROS",
      "PAGOS ESPECIALES",
      "Préstamo Cocos",
      "Préstamo MS",
      "SAC",
    ].sort()
  );
});
