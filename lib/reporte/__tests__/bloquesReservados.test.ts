import { test } from "node:test";
import assert from "node:assert/strict";
import {
  armarReporte,
  camposManuales,
  clavesVisibles,
  esBloqueReservado,
  type DatosMes,
  type Plantilla,
} from "@/lib/reporte/motor";
import { PLANTILLAS_POR_SLUG } from "@/lib/reporte/plantillas";

// Reporte por rol (Ejecución global §3.4 y §6): quien no es ADMIN ni FINANZAS no recibe los bloques
// Disponibilidades ni Cierre. No se calculan ni se serializan: el filtro es del servidor (el motor),
// no de la pantalla.

const PLANTILLA_MINI: Plantilla = {
  empresa: "Mini",
  filas: [
    { clave: "t.d", bloque: "DISPONIBILIDADES", tipo: "linea", texto: "Banco", signo: 1, real: { tipo: "manual" }, presupuesto: { tipo: "igualReal" }, arrastre: "ajuste" },
    { clave: "t.i1", bloque: "INGRESOS", tipo: "linea", texto: "Ingreso 1", signo: 1, real: { tipo: "manual" }, presupuesto: { tipo: "manual" } },
    // Ingreso que es espejo de una fila de Disponibilidades (como "Cheques despues del 10").
    { clave: "t.i2", bloque: "INGRESOS", tipo: "linea", texto: "Ingreso 2", signo: 1, real: { tipo: "igualPresupuesto" }, presupuesto: { tipo: "espejo", fila: "t.d", columna: "real", mes: "actual", factor: -1 } },
    { clave: "t.ti", bloque: "INGRESOS", tipo: "total", texto: "Total con espejo", suma: ["t.i1", "t.i2"] },
    { clave: "t.ti1", bloque: "INGRESOS", tipo: "total", texto: "Total sin espejo", suma: ["t.i1"] },
  ],
};

function mesMini(): DatosMes {
  return {
    periodo: "2026-09",
    real: new Map(),
    presupuesto: new Map(),
    mesCerrado: true,
    manuales: {
      presupuesto: new Map([["t.i1", 5000]]),
      real: new Map([
        ["t.d", 987654321],
        ["t.i1", 4000],
      ]),
    },
  };
}

test("mini: con permiso, todo se calcula igual que siempre", () => {
  const r = armarReporte(PLANTILLA_MINI, [mesMini()]);
  const celda = (clave: string) => r.filas.find((f) => f.fila.clave === clave)!.celdas[0];
  assert.equal(r.sinBloquesReservados, false);
  assert.equal(celda("t.d").real, 987654321);
  assert.equal(celda("t.i2").presupuestado, -987654321);
  assert.equal(celda("t.ti").presupuestado, 5000 - 987654321);
});

test("mini: sin permiso no hay filas de Disponibilidades, y lo que depende de ellas queda vacío", () => {
  const r = armarReporte(PLANTILLA_MINI, [mesMini()], 0, { verBloquesReservados: false });
  const celda = (clave: string) => r.filas.find((f) => f.fila.clave === clave)!.celdas[0];
  assert.equal(r.sinBloquesReservados, true);
  assert.equal(r.filas.some((f) => f.fila.clave === "t.d"), false);
  // El espejo de Disponibilidades no se calcula: ni su valor ni el de un total que lo suma.
  assert.equal(celda("t.i2").presupuestado, null);
  assert.equal(celda("t.i2").real, null);
  assert.equal(celda("t.ti").presupuestado, null);
  assert.equal(celda("t.ti").real, null);
  // Lo que no depende de Disponibilidades sigue igual.
  assert.equal(celda("t.i1").real, 4000);
  assert.equal(celda("t.ti1").presupuestado, 5000);
  assert.equal(celda("t.ti1").real, 4000);
  // Ni el dato crudo viaja en lo serializado.
  assert.equal(JSON.stringify(r).includes("987654321"), false);
});

test("clavesVisibles: solo las filas de bloques que no son reservados", () => {
  assert.deepEqual(Array.from(clavesVisibles(PLANTILLA_MINI)).sort(), ["t.i1", "t.i2", "t.ti", "t.ti1"]);
  assert.equal(esBloqueReservado("DISPONIBILIDADES"), true);
  assert.equal(esBloqueReservado("CIERRE"), true);
  assert.equal(esBloqueReservado("INGRESOS"), false);
  assert.equal(esBloqueReservado("EGRESOS"), false);
});

// Las plantillas reales de las empresas: para cada una, con un valor manual "centinela" en CADA fila
// de Disponibilidades y Cierre, el reporte restringido no contiene ni las filas, ni los centinelas,
// ni el control de arrastre; y el resto de las celdas coincide con el reporte completo salvo las que
// dependen de esos bloques (que quedan vacías, nunca con otro número).
const CENTINELA = 7_000_000_000_000;

for (const [slug, plantilla] of Object.entries(PLANTILLAS_POR_SLUG)) {
  test(`${slug}: sin permiso no hay Disponibilidades ni Cierre, ni sus valores, ni lo que depende de ellos`, () => {
    const manualesReal = new Map<string, number>();
    const manualesPresupuesto = new Map<string, number>();
    let n = 0;
    for (const c of camposManuales(plantilla)) {
      const reservado = esBloqueReservado(c.bloque);
      const valor = reservado ? CENTINELA + n++ : 1000 + n++;
      (c.columna === "REAL" ? manualesReal : manualesPresupuesto).set(c.clave, valor);
    }
    const mes: DatosMes = {
      periodo: "2026-09",
      real: new Map(),
      presupuesto: new Map(),
      mesCerrado: true,
      manuales: { presupuesto: manualesPresupuesto, real: manualesReal },
    };
    // Mes anterior (contexto del arrastre y de los espejos del mes anterior).
    const anterior: DatosMes = { ...mes, periodo: "2026-08" };

    const completo = armarReporte(plantilla, [anterior, mes], 1);
    const restringido = armarReporte(plantilla, [anterior, mes], 1, { verBloquesReservados: false });

    assert.equal(restringido.sinBloquesReservados, true);
    assert.equal(
      restringido.filas.some((f) => esBloqueReservado(f.fila.bloque)),
      false,
      "no quedan filas de Disponibilidades ni Cierre"
    );
    assert.ok(restringido.filas.length > 0);
    assert.ok(restringido.arrastre.every((a) => a === null), "sin control de arrastre");

    // Ningún centinela (ni nada del orden de los miles de millones) en lo que se serializa.
    const json = JSON.stringify(restringido);
    assert.equal(/7000000000\d{3}/.test(json), false, "no viaja ningún valor de Disponibilidades/Cierre");

    // Las celdas visibles: iguales al reporte completo, o vacías si dependen de los bloques reservados.
    const completoPorClave = new Map(completo.filas.map((f) => [f.fila.clave, f]));
    for (const f of restringido.filas) {
      const original = completoPorClave.get(f.fila.clave)!;
      f.celdas.forEach((c, i) => {
        const o = original.celdas[i];
        assert.ok(c.presupuestado === o.presupuestado || c.presupuestado === null, `${f.fila.clave} P`);
        assert.ok(c.real === o.real || c.real === null, `${f.fila.clave} R`);
      });
    }
    // Lo que NO depende de los bloques reservados no cambia: al menos las filas de Egresos con Real
    // por clasificación o manual propio.
    const intactas = restringido.filas.filter((f) =>
      f.celdas.every((c, i) => {
        const o = completoPorClave.get(f.fila.clave)!.celdas[i];
        return c.presupuestado === o.presupuestado && c.real === o.real;
      })
    );
    assert.ok(intactas.length > 0, "queda contenido real en el reporte restringido");
  });
}
