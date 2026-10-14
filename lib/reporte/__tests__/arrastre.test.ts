import { test } from "node:test";
import assert from "node:assert/strict";
import { armarReporte, UMBRAL_ARRASTRE_CENTAVOS, type DatosMes, type FilaLinea } from "@/lib/reporte/motor";
import { PLANTILLAS_POR_SLUG } from "@/lib/reporte/plantillas";
import { ARRASTRE_12_MESES } from "./fixtures/arrastre12meses";
import { AGOSTO_2026 } from "./fixtures/agosto2026";
import { EXCEL_CONEXION_JULIO, EXCEL_FREDY_JULIO, REAL_CONEXION_JULIO, REAL_FREDY_JULIO } from "./fixtures/julio2026";

// Control de arrastre (docs/reporte_etapa2b_plan.md §1 y §8.4):
//   Total Disponibilidades (mes N) = Cierre REAL (mes N−1) + componentes "de ajuste" del mes N.
// Si algo no cierra NO se ajusta nada: se muestra la diferencia.

const SLUGS = Object.keys(ARRASTRE_12_MESES);

for (const slug of SLUGS) {
  test(`${slug}: arrastre con los números del Excel, últimos meses (|dif| < $1)`, () => {
    const plantilla = PLANTILLAS_POR_SLUG[slug];
    const componentes = plantilla.filas.filter((f): f is FilaLinea => f.tipo === "linea" && f.bloque === "DISPONIBILIDADES");
    const filaTotal = plantilla.filas.find((f) => f.tipo === "total" && f.rol === "totalDisponibilidades");
    assert.ok(filaTotal && filaTotal.tipo === "total");
    const meses = ARRASTRE_12_MESES[slug];
    const lineas: string[] = [];
    for (let i = 0; i < meses.length; i++) {
      const mes = meses[i];
      let total = 0;
      let ajustes = 0;
      for (const [texto, centavos] of Object.entries(mes.componentes)) {
        const fila = componentes.find((c) => c.texto === texto);
        assert.ok(fila, `${slug} ${mes.periodo}: el Excel tiene "${texto}" con valor y la plantilla no`);
        if (!filaTotal.suma.includes(fila.clave)) continue; // E1: no suma en el total
        total += centavos;
        if (fila.arrastre === "ajuste") ajustes += centavos;
      }
      // La suma de los componentes de la plantilla reproduce el total del Excel (1 centavo por sumando).
      assert.ok(mes.totalExcel !== null, `${slug} ${mes.periodo}: sin total en el Excel`);
      assert.ok(
        Math.abs(total - mes.totalExcel) <= Object.keys(mes.componentes).length,
        `${slug} ${mes.periodo}: componentes ${total} vs total del Excel ${mes.totalExcel}`
      );
      if (i === 0) continue; // sin mes anterior en la fixture
      const cierreAnterior = meses[i - 1].cierreReal;
      assert.ok(cierreAnterior !== null, `${slug} ${meses[i - 1].periodo}: sin cierre real en el Excel`);
      const dif = mes.totalExcel - (cierreAnterior + ajustes);
      lineas.push(`${slug.padEnd(18)} ${mes.periodo} cierre ant.=${(cierreAnterior / 100).toFixed(2).padStart(17)} ajustes=${(ajustes / 100).toFixed(2).padStart(15)} total=${(mes.totalExcel / 100).toFixed(2).padStart(17)} dif=${(dif / 100).toFixed(2)}`);
      assert.ok(Math.abs(dif) < UMBRAL_ARRASTRE_CENTAVOS, `${slug} ${mes.periodo}: diferencia ${(dif / 100).toFixed(2)}`);
    }
    console.log(lineas.join("\n"));
  });
}

// Con el motor: Conexión y Fredy, julio (fixtures de la 2a + manuales de julio) y agosto.
type Excel = Record<string, { presupuestado: number | null; real: number | null }>;

function julioConMotor(slug: string, real: Map<string, number>, excel: Excel) {
  const plantilla = PLANTILLAS_POR_SLUG[slug];
  const meses = ARRASTRE_12_MESES[slug];
  const jul = meses.find((m) => m.periodo === "2026-07")!;
  const manR = new Map<string, number>();
  for (const f of plantilla.filas) {
    if (f.tipo === "linea" && f.bloque === "DISPONIBILIDADES" && jul.componentes[f.texto] !== undefined) {
      manR.set(f.clave, jul.componentes[f.texto]);
    }
  }
  const datos: DatosMes = {
    periodo: "2026-07",
    real,
    presupuesto: null,
    semanasCerradas: 2,
    mesCerrado: true,
    manuales: { presupuesto: new Map(), real: manR },
  };
  const reporte = armarReporte(plantilla, [datos]);
  const celda = (clave: string) => reporte.filas.find((f) => f.fila.clave === clave)!.celdas[0];
  const saldo = plantilla.filas.find((f) => f.tipo === "total" && f.rol === "saldo")!.clave;
  const totalDisp = plantilla.filas.find((f) => f.tipo === "total" && f.rol === "totalDisponibilidades")!.clave;
  // Conciliación de la 2a: Saldo del motor + Σ ingresos (Excel − motor) − Σ egresos (Excel − motor) = Saldo del Excel.
  let ajuste = 0;
  for (const { fila, celdas } of reporte.filas) {
    if (fila.tipo !== "linea" || fila.bloque === "DISPONIBILIDADES") continue;
    // El Excel de julio está indexado por texto: "Otro" existe en Ingresos y en Egresos y su valor
    // es el del egreso, así que un texto repetido solo cuenta en la última fila que lo tiene.
    const repetida = plantilla.filas.filter((f) => f.tipo === "linea" && f.texto === fila.texto).at(-1) !== fila;
    const enExcel = repetida ? 0 : (excel[fila.texto]?.real ?? 0);
    const enMotor = celdas[0].real ?? 0;
    ajuste += (fila.bloque === "INGRESOS" ? 1 : -1) * (enExcel - enMotor);
  }
  return { jul, motorSaldo: celda(saldo).real, totalDisp: celda(totalDisp).real, ajuste, plantilla };
}

for (const [slug, real, excel] of [
  ["conexion-logistica", REAL_CONEXION_JULIO, EXCEL_CONEXION_JULIO],
  ["fredy-publicidad", REAL_FREDY_JULIO, EXCEL_FREDY_JULIO],
] as const) {
  test(`${slug}: Saldo R de julio con el motor, conciliado, contra el Excel; y Total Disp. de agosto = saldo + ajustes`, () => {
    const { jul, motorSaldo, totalDisp, ajuste, plantilla } = julioConMotor(slug, real, excel);
    assert.ok(motorSaldo !== null && jul.cierreReal !== null && jul.totalExcel !== null);
    // El Total Disponibilidades de julio del motor es el del Excel (1 centavo por componente).
    assert.ok(totalDisp !== null && Math.abs(totalDisp - jul.totalExcel) <= Object.keys(jul.componentes).length);
    const conciliado = motorSaldo + ajuste;
    console.log(`${slug} jul-26: saldo motor=${(motorSaldo / 100).toFixed(2)} conciliación=${(ajuste / 100).toFixed(2)} → ${(conciliado / 100).toFixed(2)} | Excel=${(jul.cierreReal / 100).toFixed(2)} | dif=${((conciliado - jul.cierreReal) / 100).toFixed(2)}`);
    // La diferencia queda a la vista; la tolerancia es la del redondeo del Excel (sumandos de la planilla).
    assert.ok(Math.abs(conciliado - jul.cierreReal) <= 10, `diferencia ${(conciliado - jul.cierreReal) / 100}`);
    // Agosto: Total Disponibilidades = saldo de julio (Excel) + ajustes de agosto.
    const ago = AGOSTO_2026[slug];
    let ajustesAgo = 0;
    plantilla.filas.forEach((f, i) => {
      if (f.tipo === "linea" && f.arrastre === "ajuste" && !f.excluidaDelTotal) ajustesAgo += ago.filas[i].r ?? 0;
    });
    const totalAgo = ago.filas[plantilla.filas.findIndex((f) => f.tipo === "total" && f.rol === "totalDisponibilidades")].r!;
    const dif = totalAgo - (jul.cierreReal + ajustesAgo);
    console.log(`${slug} ago-26: total=${(totalAgo / 100).toFixed(2)} saldo jul + ajustes=${((jul.cierreReal + ajustesAgo) / 100).toFixed(2)} dif=${(dif / 100).toFixed(2)}`);
    assert.ok(Math.abs(dif) < UMBRAL_ARRASTRE_CENTAVOS);
  });
}

test("el control de arrastre del motor: cuadra, no cuadra y sin mes anterior", () => {
  const plantilla = PLANTILLAS_POR_SLUG["radio"];
  const mes = (periodo: string, banco: number, cheques15: number): DatosMes => ({
    periodo,
    real: new Map(),
    presupuesto: new Map(),
    semanasCerradas: 0,
    manuales: {
      presupuesto: new Map(),
      real: new Map([
        ["ra.dBancoFci", banco],
        ["ra.dChequesDespuesDel15", cheques15],
      ]),
    },
  });
  // Julio cierra en 100.000 (sin ingresos ni egresos, Saldo R = Disponibilidades). Agosto: banco
  // 100.000 y cheques "después del 15" (ajuste) −20.000: total 80.000 = 100.000 − 20.000.
  const r = armarReporte(plantilla, [mes("2026-07", 10000000, 0), mes("2026-08", 10000000, -2000000)]);
  assert.equal(r.arrastre[0]!.diferencia, null); // sin mes anterior
  assert.equal(r.arrastre[1]!.cierreRealAnterior, 10000000);
  assert.equal(r.arrastre[1]!.ajustes, -2000000);
  assert.equal(r.arrastre[1]!.diferencia, 0);
  assert.equal(r.arrastre[1]!.cuadra, true);
  // Banco 90.000: el total da 70.000 y debería dar 80.000.
  const mal = armarReporte(plantilla, [mes("2026-07", 10000000, 0), mes("2026-08", 9000000, -2000000)]);
  assert.equal(mal.arrastre[1]!.diferencia, -1000000);
  assert.equal(mal.arrastre[1]!.cuadra, false);
});
