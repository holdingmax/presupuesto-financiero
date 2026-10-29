import { test } from "node:test";
import assert from "node:assert/strict";
import { PERIODO_EN_CARGA_GERENTE, PERIODO_POR_DEFECTO } from "@/lib/config";
import { enlaceDeEmpresa, ocultaPestanaPresupuesto } from "@/lib/navegacionEmpresa";

const si = () => true;
const no = () => false;

test("ocultaPestanaPresupuesto: ADMIN y FINANZAS nunca la pierden, ni con la carga activa y plantilla", () => {
  assert.equal(ocultaPestanaPresupuesto(true, "havanna", si, si), false);
});

test("ocultaPestanaPresupuesto: el gerente la pierde solo con carga activa Y plantilla", () => {
  assert.equal(ocultaPestanaPresupuesto(false, "havanna", si, si), true);
  assert.equal(ocultaPestanaPresupuesto(false, "havanna", si, no), false);
  assert.equal(ocultaPestanaPresupuesto(false, "havanna", no, si), false);
  assert.equal(ocultaPestanaPresupuesto(false, "havanna", no, no), false);
});

test("ocultaPestanaPresupuesto (config real): se oculta en las empresas activas y NUNCA en las que no tienen carga o plantilla", () => {
  for (const slug of ["brillante", "havanna", "radio", "fredy-publicidad", "hwc", "mantenor", "conexion-logistica", "conexion-logistica-spp"]) {
    assert.equal(ocultaPestanaPresupuesto(false, slug), true, slug);
    assert.equal(ocultaPestanaPresupuesto(true, slug), false, slug);
  }
  // Sin plantilla (Expensas, Gold Seguridad) o en una tanda posterior: conservan Presupuesto.
  for (const slug of ["expensas", "gold-seguridad", "cielos", "tucson", "avianor", "plate-silver", "bradenton", "inventada"]) {
    assert.equal(ocultaPestanaPresupuesto(false, slug), false, slug);
  }
});

test("enlaceDeEmpresa: ADMIN y FINANZAS conservan el link de siempre", () => {
  assert.equal(enlaceDeEmpresa(true, "havanna"), `/havanna/${PERIODO_POR_DEFECTO}/presupuesto`);
  assert.equal(enlaceDeEmpresa(true, "expensas"), `/expensas/${PERIODO_POR_DEFECTO}/presupuesto`);
});

test("enlaceDeEmpresa: el gerente va al mes en curso, al Reporte si carga ahí y a Presupuesto si no", () => {
  assert.equal(enlaceDeEmpresa(false, "havanna"), `/havanna/${PERIODO_EN_CARGA_GERENTE}/reporte`);
  assert.equal(enlaceDeEmpresa(false, "expensas"), `/expensas/${PERIODO_EN_CARGA_GERENTE}/presupuesto`);
  assert.equal(enlaceDeEmpresa(false, "avianor"), `/avianor/${PERIODO_EN_CARGA_GERENTE}/presupuesto`);
});
