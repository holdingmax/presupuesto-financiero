import { test } from "node:test";
import assert from "node:assert/strict";
import { validarPlantilla } from "@/lib/reporte/motor";
import { PLANTILLAS_POR_SLUG } from "@/lib/reporte/plantillas";
import { TEXTOS_MACCHI } from "./fixtures/textosMacchi";

// Estructura de las 7 plantillas (docs/reporte_etapa2a_plan.md §5.2):
// claves únicas, categorías existentes en Presupuesto, ninguna clasificación ni
// categoría en dos filas, totales que apuntan a claves existentes y pendientes
// del catálogo (validarPlantilla), y textos iguales a los de la planilla.

test("hay plantilla para las 7 empresas de formato completo", () => {
  assert.deepEqual(Object.keys(PLANTILLAS_POR_SLUG).sort(), [
    "brillante",
    "conexion-logistica",
    "fredy-publicidad",
    "havanna",
    "hwc",
    "mantenor",
    "radio",
  ]);
});

for (const [slug, plantilla] of Object.entries(PLANTILLAS_POR_SLUG)) {
  test(`${slug}: estructura válida`, () => {
    assert.deepEqual(validarPlantilla(plantilla), []);
  });

  test(`${slug}: los textos coinciden con la planilla de Macchi, en el mismo orden`, () => {
    assert.deepEqual(
      plantilla.filas.map((f) => f.texto),
      TEXTOS_MACCHI[slug]
    );
  });
}
