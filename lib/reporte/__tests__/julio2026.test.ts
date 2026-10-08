import { test } from "node:test";
import assert from "node:assert/strict";
import { armarReporte, type Plantilla, type Reporte } from "@/lib/reporte/motor";
import { PLANTILLA_CONEXION } from "@/lib/reporte/plantillas/conexion";
import { PLANTILLA_FREDY } from "@/lib/reporte/plantillas/fredy";
import {
  EXCEL_CONEXION_JULIO,
  EXCEL_FREDY_JULIO,
  PRESUPUESTO_CONEXION_JULIO,
  REAL_CONEXION_JULIO,
  REAL_FREDY_JULIO,
} from "./fixtures/julio2026";

// Julio 2026 contra los Excel de Macchi (docs/reporte_etapa2a_plan.md §5.3–5.5).
// Todo en centavos. Si un número no cierra NO se ajusta la fixture ni la
// expectativa: la diferencia queda a la vista.

type Excel = Record<string, { presupuestado: number | null; real: number | null }>;

function celdaDe(reporte: Reporte, clave: string) {
  const fila = reporte.filas.find((f) => f.fila.clave === clave);
  assert.ok(fila, `no existe la fila ${clave}`);
  return fila.celdas[0];
}

// Conciliación del total de egresos operativos: el total del motor, más lo que
// el Excel tiene en las filas pendientes (sin real en el motor) y lo que le falta
// a las filas parciales. Devuelve (conciliado − total del Excel).
function diferenciaConciliacion(plantilla: Plantilla, reporte: Reporte, excel: Excel, claveTotal: string, textoTotal: string) {
  let ajuste = 0;
  for (const { fila, celdas } of reporte.filas) {
    if (fila.tipo !== "linea" || fila.bloque !== "EGRESOS") continue;
    const enExcel = excel[fila.texto]?.real ?? 0;
    if (celdas[0].real === null) ajuste += enExcel;
    else if (fila.parcial) ajuste += enExcel - celdas[0].real;
  }
  const motor = celdaDe(reporte, claveTotal).real;
  assert.ok(motor !== null);
  return motor + ajuste - excel[textoTotal].real!;
}

// ---------- Conexión ----------

const conexion = armarReporte(PLANTILLA_CONEXION, [
  { periodo: "2026-07", real: REAL_CONEXION_JULIO, presupuesto: PRESUPUESTO_CONEXION_JULIO },
]);

test("Conexión jul-26: filas automáticas iguales al Excel, al centavo", () => {
  const esperadas: [string, string, number][] = [
    ["cx.chequesDiferidos", "Cheques diferidos", 8136232552],
    ["cx.comisionesEspeciales", "Adicionales y comisiones especiales", 6256979161],
    ["cx.impuestoAlCheque", "Impuesto al cheque (Gto Brio)", 3570061310],
    ["cx.liquidacionesFinales", "Liquidaciones Finales", 4711331000],
    ["cx.juicios", "Juicios y requerimientos AFIP", 10000000],
  ];
  for (const [clave, texto, centavos] of esperadas) {
    assert.equal(celdaDe(conexion, clave).real, centavos, clave);
    assert.equal(EXCEL_CONEXION_JULIO[texto].real, centavos, `${texto} en el Excel`);
  }
});

test("Conexión jul-26: Proveedores — diferencia conocida con el Excel, sin ajustar", () => {
  // PROV Y SERV de SPP+LOGISTICA en la Ejecución.
  assert.equal(celdaDe(conexion, "cx.proveedores").real, 125243051824);
  // 'DETALLE GASTOS REALES'!E686, hoja armada a mano por Macchi.
  assert.equal(EXCEL_CONEXION_JULIO["Proveedores"].real, 124845693138);
  // dif. vs Excel = 3.973.586,86 (pregunta 22 del diagnóstico).
  assert.equal(celdaDe(conexion, "cx.proveedores").real! - EXCEL_CONEXION_JULIO["Proveedores"].real!, 397358686);
});

test("Conexión jul-26: filas parciales — se verifica la parte calculada", () => {
  assert.equal(celdaDe(conexion, "cx.sueldos").real, 12439441200);
  assert.equal(celdaDe(conexion, "cx.sac").real, 5628119300);
});

test("Conexión jul-26: el presupuestado de cada fila con categoría es el del Excel", () => {
  for (const { fila, celdas } of conexion.filas) {
    if (fila.tipo !== "linea" || fila.presupuesto.tipo !== "categorias") continue;
    assert.equal(celdas[0].presupuestado, EXCEL_CONEXION_JULIO[fila.texto]?.presupuestado ?? 0, fila.texto);
  }
});

test("Conexión jul-26: conciliación de TOTAL EGRESOS OPERATIVOS — solo queda la diferencia de Proveedores", () => {
  const diferencia = diferenciaConciliacion(
    PLANTILLA_CONEXION,
    conexion,
    EXCEL_CONEXION_JULIO,
    "cx.totalEgresosOperativos",
    "TOTAL EGRESOS OPERATIVOS"
  );
  // Excel: 2.168.720.680,81. La única diferencia es la de Proveedores (3.973.586,86).
  assert.equal(diferencia, 397358686);
});

// ---------- Fredy ----------

const fredy = armarReporte(PLANTILLA_FREDY, [{ periodo: "2026-07", real: REAL_FREDY_JULIO, presupuesto: null }]);

test("Fredy jul-26: filas automáticas iguales al Excel, al centavo", () => {
  const esperadas: [string, string, number][] = [
    ["fr.chequesDiferidos", "Cheques diferidos", 827378350],
    ["fr.comisionEspecial", "Comision Especial", 993030800],
    ["fr.pagosEspeciales", "Pagos especiales", 190000000],
    ["fr.impuestos", "Impuestos", 994112092],
    ["fr.proveedores", "Proveedores", 5340957907],
    ["fr.otro", "Otro", 422993997],
    ["fr.dividendos", "Dividendos", 4000000000],
    ["fr.liqFinal", "Liq final", 280387500],
    ["fr.impuestoAlCheque", "Impuesto al cheque", 460978191],
    ["fr.pagosMs", "Pagos solicitados por MS", 31868814],
  ];
  for (const [clave, texto, centavos] of esperadas) {
    assert.equal(celdaDe(fredy, clave).real, centavos, clave);
    assert.equal(EXCEL_FREDY_JULIO[texto].real, centavos, `${texto} en el Excel`);
  }
});

test("Fredy jul-26: conciliación de TOTAL EGRESOS OPERATIVOS contra 146.029.676,75", () => {
  assert.equal(EXCEL_FREDY_JULIO["TOTAL EGRESOS OPERATIVOS"].real, 14602967675);
  const diferencia = diferenciaConciliacion(
    PLANTILLA_FREDY,
    fredy,
    EXCEL_FREDY_JULIO,
    "fr.totalEgresosOperativos",
    "TOTAL EGRESOS OPERATIVOS"
  );
  assert.equal(diferencia, 0);
});
