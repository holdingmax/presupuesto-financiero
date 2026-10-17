import { test } from "node:test";
import assert from "node:assert/strict";
import {
  periodoDeFecha,
  siguienteNumeroSemana,
  resolverDestinos,
  repartoPorPeriodo,
  mensajeMesesCerrados,
  nombreDePeriodo,
  type EstadoSemanaDelPeriodo,
} from "@/lib/ejecucionSemanas";

// Semanas globales por período y reparto de un extracto por mes (plan §3.1 y §3.4).

const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

test("periodoDeFecha usa UTC: el día 1 no retrocede al mes anterior", () => {
  assert.equal(periodoDeFecha(dia("2026-10-01")), "2026-10");
  assert.equal(periodoDeFecha(dia("2026-09-30")), "2026-09");
  assert.equal(periodoDeFecha(dia("2027-01-01")), "2027-01");
});

test("siguiente número de semana: máximo + 1, o 1 si el período no tiene ninguna", () => {
  assert.equal(siguienteNumeroSemana([]), 1);
  assert.equal(siguienteNumeroSemana([1]), 2);
  assert.equal(siguienteNumeroSemana([1, 2, 5]), 6);
  assert.equal(siguienteNumeroSemana([3, 1]), 4);
});

test("reparto por período: cuenta las filas de cada mes, ordenado", () => {
  const fechas = [dia("2026-10-02"), dia("2026-09-29"), dia("2026-09-30"), dia("2026-10-01"), dia("2026-10-05")];
  assert.deepEqual(repartoPorPeriodo(fechas), [
    { periodo: "2026-09", filas: 2 },
    { periodo: "2026-10", filas: 3 },
  ]);
  assert.deepEqual(repartoPorPeriodo([]), []);
});

test("destinos: el mes de la semana de la URL va a esa semana", () => {
  const d = resolverDestinos("2026-10", ["2026-10"], new Map());
  assert.deepEqual(d, [{ periodo: "2026-10", tipo: "actual" }]);
});

test("destinos: otro mes con semana abierta → esa; sin semanas → se crea; todas cerradas → bloqueado", () => {
  const semanas = new Map<string, EstadoSemanaDelPeriodo[]>([
    ["2026-09", ["CERRADA", "ABIERTA"]],
    ["2026-08", ["CERRADA", "CERRADA"]],
  ]);
  const d = resolverDestinos("2026-10", ["2026-10", "2026-09", "2026-08", "2026-11"], semanas);
  assert.deepEqual(d, [
    { periodo: "2026-08", tipo: "bloqueado" },
    { periodo: "2026-09", tipo: "abierta" },
    { periodo: "2026-10", tipo: "actual" },
    { periodo: "2026-11", tipo: "crear" },
  ]);
});

test("destinos: el mes de la semana de la URL nunca se bloquea aunque tenga semanas cerradas", () => {
  const semanas = new Map<string, EstadoSemanaDelPeriodo[]>([["2026-10", ["CERRADA"]]]);
  assert.deepEqual(resolverDestinos("2026-10", ["2026-10"], semanas), [{ periodo: "2026-10", tipo: "actual" }]);
});

test("mensaje de mes cerrado: nombra el mes y las filas", () => {
  assert.equal(nombreDePeriodo("2026-09"), "septiembre 2026");
  const m = mensajeMesesCerrados([{ periodo: "2026-09", filas: 12 }]);
  assert.match(m, /septiembre 2026 \(12 filas\)/);
  assert.match(m, /no se cargó nada/);
});
