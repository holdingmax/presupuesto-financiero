import { test } from "node:test";
import assert from "node:assert/strict";
import { armarReporte, esBloqueReservado, type DatosMes, type Plantilla } from "@/lib/reporte/motor";
import { PLANTILLAS_POR_SLUG } from "@/lib/reporte/plantillas";
import { PLANTILLA_BRILLANTE } from "@/lib/reporte/plantillas/brillante";
import {
  BLOQUES_CARGABLES,
  cambioMientrasEditaba,
  capitalSugerido,
  esFilaCapital,
  esFilaManualEditable,
  idCelda,
  manualDeEntrada,
  nombreDeEntrada,
  planDeCarga,
  vistaDeCarga,
  type ValorManualParaCarga,
} from "@/lib/reporte/cargaGerente";

// Etapa 3: filas de Presupuestado manual y Capital de trabajo (ValorManualReporte, PRESUPUESTADO).

const manual = (filaClave: string, centavos: number, extra: Partial<ValorManualParaCarga> = {}): ValorManualParaCarga => ({
  filaClave,
  centavos,
  nota: null,
  cargadoPor: "Prueba FINANZAS",
  actualizadoEn: new Date("2026-10-28T15:00:00Z"),
  ...extra,
});

// Las plantillas distintas (Conexión está dos veces, por slug).
const PLANTILLAS = Array.from(new Set(Object.values(PLANTILLAS_POR_SLUG)));
const SLUG_DE = new Map(Object.entries(PLANTILLAS_POR_SLUG).map(([slug, p]) => [p, slug]));

test("ninguna fila de datos de Ingresos/Egresos/Abajo queda sin fuente de Presupuestado (las 61 que eran «sin presupuesto» ahora son manuales)", () => {
  for (const [slug, plantilla] of Object.entries(PLANTILLAS_POR_SLUG)) {
    for (const f of plantilla.filas) {
      if (f.tipo === "linea" && BLOQUES_CARGABLES.includes(f.bloque)) {
        assert.notEqual(f.presupuesto.tipo, "ninguna", `${slug}/${f.clave}`);
      }
    }
  }
});

test("filas manuales editables: solo Ingresos/Egresos/Abajo con P manual; nunca totales, Disponibilidades, Cierre ni derivadas", () => {
  for (const [slug, plantilla] of Object.entries(PLANTILLAS_POR_SLUG)) {
    const plan = planDeCarga(plantilla, []);
    const porClave = new Map(plantilla.filas.map((f) => [f.clave, f]));
    for (const clave of Object.keys(plan.manuales)) {
      const f = porClave.get(clave)!;
      assert.equal(f.tipo, "linea", `${slug}/${clave}`);
      if (f.tipo !== "linea") continue;
      assert.ok(BLOQUES_CARGABLES.includes(f.bloque), `${slug}/${clave}: bloque ${f.bloque}`);
      assert.equal(esBloqueReservado(f.bloque), false, `${slug}/${clave}`);
      assert.equal(f.presupuesto.tipo, "manual", `${slug}/${clave}`);
    }
    // Y al revés: toda fila de datos con P manual en un bloque cargable está en el plan.
    for (const f of plantilla.filas) {
      if (f.tipo === "linea" && BLOQUES_CARGABLES.includes(f.bloque) && f.presupuesto.tipo === "manual") {
        assert.equal(Object.hasOwn(plan.manuales, f.clave), true, `${slug}/${f.clave} debería ser editable`);
      }
      // Lo que no es manual nunca entra a manuales.
      if (f.tipo !== "linea" || f.presupuesto.tipo !== "manual" || !BLOQUES_CARGABLES.includes(f.bloque)) {
        assert.equal(Object.hasOwn(plan.manuales, f.clave), false, `${slug}/${f.clave} no debería ser editable`);
      }
    }
    // Ninguna clave se repite entre categorías y manuales.
    for (const clave of Object.keys(plan.manuales)) assert.equal(Object.hasOwn(plan.filas, clave), false);
  }
});

test("las cinco filas de Presupuestado derivado quedan excluidas", () => {
  const derivadas: [string, string][] = [
    ["conexion-logistica", "cx.chequesDespuesDel10"],
    ["radio", "ra.chequesDespuesDel15"],
    ["havanna", "hv.acreditacionTarjetas"],
    ["havanna", "hv.devolucionPrestamoMs"],
    ["mantenor", "mn.prestamos"],
  ];
  for (const [slug, clave] of derivadas) {
    const plan = planDeCarga(PLANTILLAS_POR_SLUG[slug], []);
    assert.equal(Object.hasOwn(plan.manuales, clave), false, clave);
    assert.equal(Object.hasOwn(plan.filas, clave), false, clave);
  }
});

test("Brillante: las filas que nombra Kike son editables (Dividendos y Inversiones por categoría; el resto, manuales)", () => {
  const plan = planDeCarga(PLANTILLA_BRILLANTE, []);
  for (const clave of [
    "br.prestamoMs",
    "br.cobranzaChequeDiferido",
    "br.goldSalta",
    "br.otrasOperacionesJujuy",
    "br.otroMsnt",
    "br.reservaSac",
    "br.devolucionMsCamioneta",
    "br.traspasoPrestamoMs",
    "br.traspasoSaldoInicial",
    "br.ajusteCaja",
    "br.aporteBlanqueo",
    "br.recuperoGastos",
  ]) {
    assert.equal(Object.hasOwn(plan.manuales, clave), true, clave);
  }
  for (const clave of ["br.dividendos", "br.inversiones"]) assert.equal(Object.hasOwn(plan.filas, clave), true, clave);
  // Disponibilidades y totales, no.
  for (const clave of ["br.dBancoFci", "br.dReservaAguinaldo", "br.totalIngresos", "br.totalDisponibilidades", "br.saldo", "br.disponible"]) {
    assert.equal(Object.hasOwn(plan.manuales, clave), false, clave);
  }
});

test("Capital de trabajo: qué plantilla lo abre y cómo (fórmula, tipeado o nada)", () => {
  const esperado: Record<string, { clave: string; conFormula: boolean } | null> = {
    avianor: null, // no tiene fila de Capital
    "conexion-logistica": { clave: "cx.capital", conFormula: true },
    brillante: { clave: "br.capital", conFormula: true },
    havanna: { clave: "hv.capital", conFormula: true },
    radio: { clave: "ra.capital", conFormula: true },
    "fredy-publicidad": { clave: "fr.capital", conFormula: true },
    hwc: { clave: "hw.capital", conFormula: true },
    mantenor: { clave: "mn.capital", conFormula: false }, // tipeado, sin fórmula
    "plate-silver": null, // su Capital es un total (fórmula pura): no editable
    bradenton: { clave: "bd.capital", conFormula: false }, // tipeado en P y en R; solo P se abre
    "havanna-peru": { clave: "hp.capital", conFormula: false }, // tipeado en P y en R, como Bradenton
  };
  for (const [slug, plantilla] of Object.entries(PLANTILLAS_POR_SLUG)) {
    const capital = planDeCarga(plantilla, []).capital;
    const e = slug === "conexion-logistica-spp" ? esperado["conexion-logistica"] : esperado[slug];
    assert.notEqual(e, undefined, `falta el caso de ${slug}`);
    if (e === null) assert.equal(capital, null, slug);
    else {
      assert.equal(capital?.clave, e!.clave, slug);
      assert.equal(capital?.conFormula, e!.conFormula, slug);
    }
  }
});

test("Capital de trabajo: es la ÚNICA fila de Cierre que se abre, y nunca aparece entre las filas manuales", () => {
  for (const [slug, plantilla] of Object.entries(PLANTILLAS_POR_SLUG)) {
    const abiertas = plantilla.filas.filter((f) => esFilaCapital(f));
    assert.ok(abiertas.length <= 1, `${slug}: ${abiertas.length} filas de Capital`);
    for (const f of plantilla.filas) {
      if (f.bloque === "CIERRE" && !esFilaCapital(f)) {
        assert.equal(esFilaManualEditable(f), false, `${slug}/${f.clave}`);
      }
      if (f.bloque === "DISPONIBILIDADES") {
        assert.equal(esFilaManualEditable(f), false, `${slug}/${f.clave}`);
        assert.equal(esFilaCapital(f), false, `${slug}/${f.clave}`);
      }
    }
    const plan = planDeCarga(plantilla, []);
    if (plan.capital) assert.equal(Object.hasOwn(plan.manuales, plan.capital.clave), false, slug);
  }
});

test("Capital con fórmula: la sugerencia calculada coincide con el motor en todas las plantillas con fórmula", () => {
  for (const plantilla of PLANTILLAS) {
    const plan = planDeCarga(plantilla, []);
    if (!plan.capital?.regla) continue;
    const slug = SLUG_DE.get(plantilla);
    // Un mes con un Presupuestado distinto en cada categoría y en cada fila manual.
    const presupuesto = new Map<string, number>();
    const manualesP = new Map<string, number>();
    let n = 1;
    for (const f of plantilla.filas) {
      if (f.tipo !== "linea" || esBloqueReservado(f.bloque)) continue;
      if (f.presupuesto.tipo === "categorias") presupuesto.set(f.presupuesto.categorias[0], 100_000 * n++);
      if (f.presupuesto.tipo === "manual") manualesP.set(f.clave, 100_000 * n++);
    }
    const mes: DatosMes = {
      periodo: "2026-11",
      real: new Map(),
      presupuesto,
      manuales: { presupuesto: manualesP, real: new Map() },
    };
    const reporte = armarReporte(plantilla, [mes], 0);
    const delMotor = reporte.filas.find((f) => f.fila.clave === plan.capital!.clave)!.celdas[0].presupuestado;
    const mia = capitalSugerido(
      plan.capital.regla,
      (clave) => reporte.filas.find((f) => f.fila.clave === clave)?.celdas[0].presupuestado ?? null
    );
    assert.equal(mia, delMotor, `${slug}: ${plan.capital.clave}`);
    assert.notEqual(mia, null, `${slug}`);
  }
});

test("Capital con fórmula: sin ningún término con valor no hay sugerencia", () => {
  const regla = { terminos: [{ fila: "a", factor: 1 }, { fila: "b", factor: 0.5 }], fijo: 500 };
  assert.equal(capitalSugerido(regla, () => null), null);
  assert.equal(capitalSugerido(regla, (c) => (c === "a" ? 1000 : null)), 1500);
});

test("cambioMientrasEditaba: vacío contra vacío NO es un cambio (sin falso positivo)", () => {
  assert.equal(cambioMientrasEditaba("", null), false);
  assert.equal(cambioMientrasEditaba("   ", null), false);
  // Un 0 guardado equivale a vacío.
  assert.equal(cambioMientrasEditaba("", 0), false);
  assert.equal(cambioMientrasEditaba("0,00", null), false);
});

test("cambioMientrasEditaba: el mismo valor que la pantalla mostró NO es un cambio, en cualquier formato", () => {
  assert.equal(cambioMientrasEditaba("1.234,56", 123456), false);
  assert.equal(cambioMientrasEditaba("1.000,00", 100000), false);
  assert.equal(cambioMientrasEditaba("1000", 100000), false);
  assert.equal(cambioMientrasEditaba("0,00", 0), false);
});

test("cambioMientrasEditaba: sí detecta que otra persona cargó, cambió o borró el valor", () => {
  assert.equal(cambioMientrasEditaba("", 500), true); // estaba vacío y ahora hay valor
  assert.equal(cambioMientrasEditaba("5,00", null), true); // tenía valor y lo borraron
  assert.equal(cambioMientrasEditaba("5,00", 600), true); // lo cambiaron
  assert.equal(cambioMientrasEditaba(undefined, null), true); // sin base no se puede saber
  assert.equal(cambioMientrasEditaba("abc", 500), true); // base ilegible: mejor rechazar
});

test("planDeCarga: los valores manuales cargados aparecen con quién y cuándo, y el resto queda vacío", () => {
  const plan = planDeCarga(PLANTILLA_BRILLANTE, [], [
    manual("br.ajusteCaja", 250000, { nota: "100+150" }),
    manual("br.capital", 3100000000),
    manual("br.dBancoFci", 999), // Disponibilidades: no es editable, no entra al plan
  ]);
  assert.equal(plan.manuales["br.ajusteCaja"].valorCentavos, 250000);
  assert.equal(plan.manuales["br.ajusteCaja"].nota, "100+150");
  assert.match(plan.manuales["br.ajusteCaja"].leyenda!, /^Cargó Prueba FINANZAS · \d{1,2}\/\d{1,2}\/2026$/);
  assert.equal(plan.manuales["br.recuperoGastos"].valorCentavos, null);
  assert.equal(plan.manuales["br.recuperoGastos"].leyenda, null);
  assert.equal(plan.capital?.valorCentavos, 3100000000);
  assert.equal(Object.hasOwn(plan.manuales, "br.dBancoFci"), false);
});

test("manualDeEntrada: encuentra manuales y Capital; todo lo demás (Disponibilidades, otras de Cierre, claves raras) es null", () => {
  const plan = planDeCarga(PLANTILLA_BRILLANTE, []);
  assert.ok(manualDeEntrada(plan, { destino: "manual", clave: "br.ajusteCaja" }));
  assert.ok(manualDeEntrada(plan, { destino: "capital", clave: "br.capital" }));
  for (const clave of ["br.dBancoFci", "br.disponible", "br.saldo", "br.totalIngresos", "__proto__", "constructor", "nada"]) {
    assert.equal(manualDeEntrada(plan, { destino: "manual", clave }), null, clave);
  }
  // "capital" solo acepta la clave del Capital, no otra de Cierre.
  assert.equal(manualDeEntrada(plan, { destino: "capital", clave: "br.disponible" }), null);
  // Una clave de categoría no sirve como manual, ni al revés.
  assert.equal(manualDeEntrada(plan, { destino: "manual", clave: "br.sueldos" }), null);
});

test("nombreDeEntrada: manual y capital usan el texto de la fila", () => {
  assert.equal(nombreDeEntrada(PLANTILLA_BRILLANTE, { destino: "manual", clave: "br.ajusteCaja" }).startsWith("Ajuste Caja"), true);
  assert.equal(nombreDeEntrada(PLANTILLA_BRILLANTE, { destino: "capital", clave: "br.capital" }), "CAPITAL DE TRABAJO PROPUESTO (SUELDOS)");
});

test("vistaDeCarga: celdas manuales y Capital con su valor formateado, leyenda y sugerencia", () => {
  const plan = planDeCarga(PLANTILLA_BRILLANTE, [], [manual("br.ajusteCaja", 123456)]);
  const vista = vistaDeCarga(plan, 4_500_000_000);
  const aj = vista.celdas.find((c) => c.id === idCelda("manual", "br.ajusteCaja"))!;
  assert.equal(aj.destino, "manual");
  assert.equal(aj.importeInicial, "1.234,56");
  assert.ok(aj.leyenda?.startsWith("Cargó Prueba FINANZAS"));
  const vacia = vista.celdas.find((c) => c.id === idCelda("manual", "br.recuperoGastos"))!;
  assert.equal(vacia.importeInicial, "");
  assert.equal(vacia.leyenda, null);
  assert.equal(vista.celdas.some((c) => c.id === idCelda("manual", "br.dBancoFci")), false);
  const capital = vista.celdas.find((c) => c.id === idCelda("capital", "br.capital"))!;
  assert.equal(capital.importeInicial, "");
  assert.equal(vista.capital?.id, idCelda("capital", "br.capital"));
  assert.equal(vista.capital?.conFormula, true);
  assert.equal(vista.capital?.sugerido, "45.000.000,00");
  // La huella cambia si cambia un valor manual (la pantalla repone lo guardado).
  const otra = vistaDeCarga(planDeCarga(PLANTILLA_BRILLANTE, [], [manual("br.ajusteCaja", 999)]), 4_500_000_000);
  assert.notEqual(vista.huella, otra.huella);
});

test("vistaDeCarga: una plantilla sin Capital editable (Plate Silver, Avianor) no trae bloque de Capital", () => {
  for (const slug of ["plate-silver", "avianor"]) {
    const vista = vistaDeCarga(planDeCarga(PLANTILLAS_POR_SLUG[slug] as Plantilla, []));
    assert.equal(vista.capital, null, slug);
    assert.equal(vista.celdas.some((c) => c.destino === "capital"), false, slug);
  }
});
