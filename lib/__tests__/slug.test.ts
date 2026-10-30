import { test } from "node:test";
import assert from "node:assert/strict";
import { slugDeEmpresa, slugify } from "@/lib/slug";

// Handyway Cargo (antes "HWC") conserva el slug `hwc`: las plantillas del Reporte y las listas de config.ts van por slug.
test("Handyway Cargo da el slug hwc", () => {
  assert.equal(slugDeEmpresa("Handyway Cargo"), "hwc");
});

test("los demás nombres dan lo mismo que slugify", () => {
  assert.equal(slugDeEmpresa("HWC"), "hwc");
  assert.equal(slugDeEmpresa("Conexión Logística"), "conexion-logistica");
  assert.equal(slugDeEmpresa("Conexión Logística/SPP"), "conexion-logistica-spp");
  assert.equal(slugDeEmpresa("Havanna Perú"), "havanna-peru");
  for (const nombre of ["Havanna", "Fredy Publicidad", "Brillante", "Mantenor", "Radio", "Avianor", "Plate Silver", "Bradenton"]) {
    assert.equal(slugDeEmpresa(nombre), slugify(nombre), nombre);
  }
});
