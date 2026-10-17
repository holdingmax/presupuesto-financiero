import { test } from "node:test";
import assert from "node:assert/strict";
import {
  unidadesSinEmpresa,
  contarParaCierre,
  evaluarCierre,
  type FilaParaCierre,
} from "@/lib/cierreEjecucion";

// Chequeos del cierre semanal (plan §3.5, D-6): sin unidad de empresa BLOQUEA; sin clasificar y
// sugerencias sin confirmar solo AVISAN.

const UNIDADES = ["SPP", "RADIO", "HWC", "EXPENSAS"];

function fila(parcial: Partial<FilaParaCierre>): FilaParaCierre {
  return {
    ignorado: false,
    unidadNegocio: "SPP",
    clasificacion: "PROV Y SERV",
    sugeridaPorSistema: false,
    unidadSugeridaPorSistema: false,
    desglose: [],
    ...parcial,
  };
}

test("todo asignado: se puede cerrar y no hay avisos", () => {
  const c = contarParaCierre([fila({}), fila({ unidadNegocio: "RADIO" })], UNIDADES);
  const e = evaluarCierre(c);
  assert.equal(e.puedeCerrar, true);
  assert.deepEqual(e.avisos, []);
});

test("SIN ASIGNAR y valores viejos fuera de lista bloquean, agrupados por unidad", () => {
  const filas = [
    fila({ unidadNegocio: "SIN ASIGNAR" }),
    fila({ unidadNegocio: "SIN ASIGNAR" }),
    fila({ unidadNegocio: "CREAR" }),
    fila({ unidadNegocio: "spp " }), // normaliza: es SPP
  ];
  const e = evaluarCierre(contarParaCierre(filas, UNIDADES));
  assert.equal(e.puedeCerrar, false);
  assert.deepEqual(e.bloqueos, [
    { unidad: "SIN ASIGNAR", movimientos: 2 },
    { unidad: "CREAR", movimientos: 1 },
  ]);
  if (!e.puedeCerrar) assert.match(e.mensajeBloqueo, /3 movimientos/);
});

test("un movimiento ignorado no bloquea ni avisa", () => {
  const e = evaluarCierre(
    contarParaCierre(
      [fila({ unidadNegocio: "SIN ASIGNAR", ignorado: true, clasificacion: "SIN CLASIFICAR", sugeridaPorSistema: true })],
      UNIDADES
    )
  );
  assert.equal(e.puedeCerrar, true);
  assert.deepEqual(e.avisos, []);
});

test("un prorrateado cuenta por sus porciones, no por su unidad propia", () => {
  // Unidad propia SIN ASIGNAR pero prorrateado entre dos unidades con empresa: no bloquea.
  const ok = fila({ unidadNegocio: "SIN ASIGNAR", desglose: [{ unidadNegocio: "SPP" }, { unidadNegocio: "RADIO" }] });
  assert.deepEqual(unidadesSinEmpresa([ok], UNIDADES), []);
  // Unidad propia SPP pero una porción en una unidad sin empresa: bloquea por esa porción.
  const mal = fila({ unidadNegocio: "SPP", desglose: [{ unidadNegocio: "SPP" }, { unidadNegocio: "HANDYWAY" }] });
  assert.deepEqual(unidadesSinEmpresa([mal], UNIDADES), [{ unidad: "HANDYWAY", movimientos: 1 }]);
  // Dos porciones de la misma unidad sin empresa cuentan UN movimiento.
  const doble = fila({ desglose: [{ unidadNegocio: "X" }, { unidadNegocio: "X" }] });
  assert.deepEqual(unidadesSinEmpresa([doble], UNIDADES), [{ unidad: "X", movimientos: 1 }]);
});

test("SIN CLASIFICAR y sugerencias sin confirmar solo avisan (no bloquean)", () => {
  const filas = [
    fila({ clasificacion: "SIN CLASIFICAR" }),
    fila({ clasificacion: "SIN CLASIFICAR" }),
    fila({ sugeridaPorSistema: true }),
    fila({ unidadSugeridaPorSistema: true }),
  ];
  const e = evaluarCierre(contarParaCierre(filas, UNIDADES));
  assert.equal(e.puedeCerrar, true);
  assert.equal(e.avisos.length, 3);
  assert.match(e.avisos[0], /2 movimientos están SIN CLASIFICAR/);
});

test("el bloqueo también informa los avisos pendientes", () => {
  const e = evaluarCierre(
    contarParaCierre([fila({ unidadNegocio: "SIN ASIGNAR", clasificacion: "SIN CLASIFICAR" })], UNIDADES)
  );
  assert.equal(e.puedeCerrar, false);
  assert.equal(e.avisos.length, 1);
});
