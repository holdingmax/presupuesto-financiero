import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPRESAS_CON_CARGA_EN_REPORTE } from "@/lib/config";
import { cargaEnReporteActiva, mostrarFlujoEnReporte, puedeEditarPresupuestoAhora } from "@/lib/estadoPresupuesto";

test("puedeEditarPresupuestoAhora: ABIERTO edita cualquiera con acceso, sea o no revisor", () => {
  assert.equal(puedeEditarPresupuestoAhora("ABIERTO", false), true);
  assert.equal(puedeEditarPresupuestoAhora("ABIERTO", true), true);
});

test("puedeEditarPresupuestoAhora: EN_REVISION edita solo el revisor", () => {
  assert.equal(puedeEditarPresupuestoAhora("EN_REVISION", true), true);
  assert.equal(puedeEditarPresupuestoAhora("EN_REVISION", false), false);
});

test("puedeEditarPresupuestoAhora: VALIDADO no lo edita nadie, ni el revisor", () => {
  assert.equal(puedeEditarPresupuestoAhora("VALIDADO", true), false);
  assert.equal(puedeEditarPresupuestoAhora("VALIDADO", false), false);
});

test("EMPRESAS_CON_CARGA_EN_REPORTE: entrega el código con el interruptor apagado (lista vacía)", () => {
  // Si alguien prende una empresa a propósito, actualiza este test junto con la lista.
  assert.deepEqual([...EMPRESAS_CON_CARGA_EN_REPORTE], []);
});

test("cargaEnReporteActiva: apagado por defecto y para cualquier empresa que no esté en la lista", () => {
  assert.equal(cargaEnReporteActiva("brillante"), false);
  assert.equal(cargaEnReporteActiva("brillante", []), false);
  assert.equal(cargaEnReporteActiva("hwc", ["brillante"]), false);
});

test("cargaEnReporteActiva: prende solo la empresa de la lista, con el slug exacto", () => {
  const activas = ["brillante", "conexion-logistica"];
  assert.equal(cargaEnReporteActiva("brillante", activas), true);
  assert.equal(cargaEnReporteActiva("conexion-logistica", activas), true);
  assert.equal(cargaEnReporteActiva("conexion", activas), false);
  assert.equal(cargaEnReporteActiva("Brillante", activas), false);
});

const base = { esAdminOFinanzas: false, esRevisor: false, cargaActiva: false, periodoHabilitado: true };

test("mostrarFlujoEnReporte: ADMIN y FINANZAS lo ven siempre, también en un período no habilitado", () => {
  assert.equal(mostrarFlujoEnReporte({ ...base, esAdminOFinanzas: true }), true);
  assert.equal(mostrarFlujoEnReporte({ ...base, esAdminOFinanzas: true, periodoHabilitado: false }), true);
});

test("mostrarFlujoEnReporte: el gerente común no lo ve con el interruptor apagado", () => {
  assert.equal(mostrarFlujoEnReporte(base), false);
});

test("mostrarFlujoEnReporte: el gerente lo ve solo con el interruptor prendido y período habilitado", () => {
  assert.equal(mostrarFlujoEnReporte({ ...base, cargaActiva: true }), true);
  assert.equal(mostrarFlujoEnReporte({ ...base, cargaActiva: true, periodoHabilitado: false }), false);
});

test("mostrarFlujoEnReporte: el revisor lo ve aunque el interruptor esté apagado, pero no fuera de los períodos habilitados", () => {
  assert.equal(mostrarFlujoEnReporte({ ...base, esRevisor: true }), true);
  assert.equal(mostrarFlujoEnReporte({ ...base, esRevisor: true, periodoHabilitado: false }), false);
});
