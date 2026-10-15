import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { grillasDeBytes, tipoContenedor, grillaDeHojaExcelJs } from "@/lib/extractos/contenedor";
import { detectarFormato, leerExtractoCrudo } from "@/lib/extractos/detectar";
import { analizarContinuidad, verificarContinuidadSaldo } from "@/lib/extractos/continuidad";
import { centavosDeTextoArgentino, centavosDeCelda } from "@/lib/extractos/numero";
import { fechaDeCelda } from "@/lib/extractos/fechas";
import { ErrorExtracto, type HojaGrilla, type LecturaExtracto } from "@/lib/extractos/tipos";
import {
  DIAS,
  IMPORTES_CENTAVOS,
  SALDO_INICIAL_CENTAVOS,
  fixtureBbva,
  fixtureGalicia,
  fixtureHtml,
  fixtureMacro,
  fixtureNacion,
  fixtureSantander,
  fixtureSantiago,
  saldosPosteriores,
} from "./fixtures/bancos";
import { madreNormal } from "./fixtures/madre";

const HOY = new Date(Date.UTC(2026, 9, 15));
const leer = (bytes: Uint8Array) => leerExtractoCrudo(grillasDeBytes(bytes)[0], { hoy: HOY });

const CREDITOS = IMPORTES_CENTAVOS.filter((i) => i > 0).reduce((a, b) => a + b, 0); // 600.050
const DEBITOS = IMPORTES_CENTAVOS.filter((i) => i < 0).reduce((a, b) => a + b, 0); // -100.030
const SALDO_FINAL = saldosPosteriores().at(-1)!;

const CASOS: { nombre: string; fixture: () => Uint8Array; banco: string; conSaldo: boolean }[] = [
  { nombre: "Macro", fixture: fixtureMacro, banco: "MACRO", conSaldo: true },
  { nombre: "Galicia", fixture: fixtureGalicia, banco: "GALICIA", conSaldo: true },
  { nombre: "BBVA", fixture: fixtureBbva, banco: "FRANCES", conSaldo: false },
  { nombre: "Nación", fixture: fixtureNacion, banco: "BNA", conSaldo: true },
  { nombre: "Santander", fixture: () => fixtureSantander(), banco: "SANT", conSaldo: true },
  { nombre: "Santiago", fixture: fixtureSantiago, banco: "BSE", conSaldo: true },
];

for (const c of CASOS) {
  test(`${c.nombre}: se detecta por contenido y los totales cierran exacto`, () => {
    const hoja = grillasDeBytes(c.fixture())[0];
    assert.equal(detectarFormato(hoja), c.banco);
    const l = leer(c.fixture());
    assert.equal(l.banco, c.banco);
    assert.equal(l.filas.length, 5);
    assert.equal(l.filas.filter((f) => f.importeCentavos > 0).reduce((a, f) => a + f.importeCentavos, 0), CREDITOS);
    assert.equal(l.filas.filter((f) => f.importeCentavos < 0).reduce((a, f) => a + f.importeCentavos, 0), DEBITOS);
    assert.deepEqual(
      l.filas.map((f) => f.importeCentavos),
      IMPORTES_CENTAVOS,
      "en orden CRONOLÓGICO"
    );
    assert.deepEqual(
      l.filas.map((f) => f.fecha.toISOString().slice(0, 10)),
      DIAS.map((d) => `2026-10-0${d}`)
    );
    if (c.conSaldo) {
      assert.equal(l.filas.at(-1)!.saldoCentavos, SALDO_FINAL);
      assert.equal(l.filas[0].saldoCentavos! - l.filas[0].importeCentavos, SALDO_INICIAL_CENTAVOS);
    } else {
      assert.ok(l.filas.every((f) => f.saldoCentavos === null));
    }
  });

  test(`${c.nombre}: control de saldo cierra en cadena y un saldo roto da exactamente 1 ruptura`, () => {
    const l = leer(c.fixture());
    const aFilas = (ls: LecturaExtracto, romperUltimo = false) =>
      ls.filas.map((f, i) => ({
        numeroFila: i,
        fecha: f.fecha,
        concepto: f.concepto,
        importe: f.importeCentavos / 100,
        saldo:
          f.saldoCentavos === null ? null : (f.saldoCentavos + (romperUltimo && i === ls.filas.length - 1 ? 1 : 0)) / 100,
        bancoYCuenta: "X",
      }));
    const [ok] = analizarContinuidad(aFilas(l));
    assert.equal(ok.rupturas.length, 0);
    if (!c.conSaldo) {
      assert.equal(ok.enlaces, 0);
      return;
    }
    assert.equal(ok.enlaces, 4);
    assert.equal(ok.orientacion, "archivo");
    assert.equal(ok.saldoPrevio, false);
    assert.equal(verificarContinuidadSaldo(aFilas(l, true))[0].cantidad, 1);
  });
}

test("Macro: número de cuenta, CUIT, referencia con ceros y causal", () => {
  const l = leer(fixtureMacro());
  assert.equal(l.cuentaEnArchivo, "123456789000599");
  assert.equal(l.cuitEnArchivo, "30111111112");
  assert.equal(l.filas[0].referencia, "001000"); // conserva los ceros a la izquierda
  assert.equal(l.filas[0].causal, "500");
});

test("Galicia: importe = créditos − débitos, y NO trae cuenta", () => {
  const l = leer(fixtureGalicia());
  assert.equal(l.cuentaEnArchivo, null);
  assert.equal(l.filas[1].importeCentavos, -25025);
  assert.equal(l.filas[0].importeCentavos, 500000);
  assert.equal(l.filas[0].referencia, "Comp 0");
});

test("Galicia: la fecha t=\"d\" (ISO) se lee bien con el lector nuevo; ExcelJS la lee como 1905", async () => {
  const bytes = fixtureGalicia();
  // Lo que pasaba antes: ExcelJS hace parseFloat("2026-10-01T…") = 2026 → año 1905.
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(bytes as unknown as ExcelJS.Buffer);
  const celda = libro.worksheets[0].getRow(2).getCell(1).value as Date;
  assert.equal(celda.getUTCFullYear(), 1905);
  // Y el lector nuevo (SheetJS, serial) da el día correcto, sin importar la zona horaria.
  assert.equal(leer(bytes).filas[0].fecha.toISOString(), "2026-10-01T00:00:00.000Z");
  // Si alguna vez una fecha así llegara al lector, se rechaza en vez de guardarse mal.
  const hojaExcelJs = grillaDeHojaExcelJs(libro.worksheets[0]);
  assert.throws(() => leerExtractoCrudo(hojaExcelJs, { hoy: HOY }), /fecha inválida.*1905/);
});

test("BBVA: débito ya negativo, vacíos como texto, Fecha (no Fecha Valor), cuenta y CUIT", () => {
  const l = leer(fixtureBbva());
  assert.equal(l.cuentaEnArchivo, "2230012345");
  assert.equal(l.cuitEnArchivo, "30111111112");
  assert.equal(l.filas[2].fecha.toISOString().slice(0, 10), "2026-10-01"); // Fecha Valor 30-09 ignorada
  assert.equal(l.filas[3].concepto, "CONCEPTO BBVA 3 CTE 000000000983"); // Concepto + Detalle
  assert.equal(l.filas[3].detalle, "CTE 000000000983");
  assert.equal(l.filas[1].referencia, null);
});

test("Nación: el saldo previo se convierte a posterior y la lista queda cronológica", () => {
  const l = leer(fixtureNacion());
  assert.deepEqual(
    l.filas.map((f) => f.saldoCentavos),
    saldosPosteriores()
  );
  assert.equal(l.cuentaEnArchivo, null);
  assert.equal(l.filas[0].concepto, "CONCEPTO BNA 0");
});

test("Santander: más nuevo a más viejo se invierte; paréntesis = negativo; ceros de la referencia", () => {
  const l = leer(fixtureSantander());
  assert.equal(l.cuentaEnArchivo, "0690012345");
  assert.equal(l.filas[1].importeCentavos, -25025);
  assert.equal(l.filas[0].referencia, "000012710");
  assert.equal(l.filas[0].causal, "0567");
  // La línea de pie "15/10/2026 11:36:00" no es un movimiento.
  assert.equal(l.filas.length, 5);
});

test("Santiago: coma decimal sin miles, relleno de espacios, cuenta y CUIT", () => {
  const l = leer(fixtureSantiago());
  assert.equal(l.cuentaEnArchivo, "2700000000001234");
  assert.equal(l.cuitEnArchivo, "30111111112");
  assert.equal(l.filas[0].importeCentavos, 500000);
  assert.equal(l.filas[0].referencia, "770");
});

test("codificación: latin-1 con Ú, ó y º se lee bien, y el mismo texto en UTF-8 también", () => {
  const latin = leer(fixtureSantander("latin1"));
  const utf8 = leer(fixtureSantander("utf8"));
  assert.ok(latin.filas[0].concepto.includes("Comisión ú"), latin.filas[0].concepto);
  assert.deepEqual(
    latin.filas.map((f) => f.concepto),
    utf8.filas.map((f) => f.concepto)
  );
  assert.ok(leer(fixtureSantiago()).filas[0].concepto.includes("DESCRIPCIÓN 0 º"));
});

test("el madre sigue siendo madre, y un crudo no se confunde con él", () => {
  const ws = madreNormal();
  const hoja = grillaDeHojaExcelJs(ws);
  assert.equal(detectarFormato(hoja), "MADRE");
  for (const c of CASOS) assert.notEqual(detectarFormato(grillasDeBytes(c.fixture())[0]), "MADRE");
});

test("contenedor: se detecta por los primeros bytes, no por la extensión", () => {
  assert.equal(tipoContenedor(fixtureGalicia()), "xlsx");
  assert.equal(tipoContenedor(fixtureMacro()), "xls");
  assert.equal(tipoContenedor(fixtureSantander()), "texto");
  assert.equal(tipoContenedor(fixtureHtml()), "html");
  assert.throws(() => grillasDeBytes(fixtureHtml()), /Formato no soportado/);
});

test("formato desconocido: error claro, sin leer nada", () => {
  const hoja: HojaGrilla = { nombre: "x", filas: [["a", "b"], ["1", "2"]], date1904: false };
  assert.equal(detectarFormato(hoja), null);
  assert.throws(() => leerExtractoCrudo(hoja), /No reconozco este formato/);
});

// --- Fechas ---------------------------------------------------------------------------
test("fechas: 01/10/2026 es 1 de octubre (no 10 de enero) y dd-mm-aaaa de BBVA", () => {
  const f = fechaDeCelda("01/10/2026", { separadorTexto: "/" });
  assert.ok(f.estado === "ok");
  assert.equal(f.fecha.toISOString(), "2026-10-01T00:00:00.000Z");
  const g = fechaDeCelda("01-10-2026", { separadorTexto: "-" });
  assert.ok(g.estado === "ok");
  assert.equal(g.fecha.toISOString(), "2026-10-01T00:00:00.000Z");
});

test("fechas: 31/02, año fuera de rango y separador equivocado se rechazan con el número de fila", () => {
  assert.equal(fechaDeCelda("31/02/2026", { separadorTexto: "/" }).estado, "invalida");
  assert.equal(fechaDeCelda("01/10/1905", { separadorTexto: "/" }).estado, "invalida");
  assert.equal(fechaDeCelda("01-10-2026", { separadorTexto: "/" }).estado, "invalida");
  assert.equal(fechaDeCelda(2026).estado, "invalida"); // serial 2026 = año 1905
  assert.equal(fechaDeCelda("texto cualquiera").estado, "vacia");

  const hoja: HojaGrilla = {
    nombre: "x",
    date1904: false,
    filas: [
      ["Banco Nación"],
      ["Fecha", "Comprobante", "Concepto", "Monto", "Saldo"],
      ["01/10/2026", "1", "OK", "$ 1,00", "$ 1,00"],
      ["31/02/2026", "1", "X", "$ 1,00", "$ 1,00"],
    ],
  };
  assert.throws(
    () => leerExtractoCrudo(hoja, { hoy: HOY }),
    (e: unknown) => e instanceof ErrorExtracto && /Fila 4: fecha inválida/.test(e.message)
  );
});

// --- Números --------------------------------------------------------------------------
test("números argentinos → centavos exactos", () => {
  const c = (t: string) => centavosDeTextoArgentino(t)?.centavos;
  assert.equal(c("(74.223,22)"), -7422322);
  assert.equal(c("$ -36.000.000,00"), -3600000000);
  assert.equal(c("-4280727,00"), -428072700);
  assert.equal(c("1.234.567,89"), 123456789);
  assert.equal(c("0,05"), 5);
  assert.equal(c("1.234,56-"), -123456);
  assert.equal(c("$ 36.221.007,73"), 3622100773);
  assert.equal(c("  12,5 "), 1250);
});

test("números: formas no reconocidas se rechazan, no se adivinan", () => {
  for (const t of ["1234.56", "1,234.56", "abc", "", "--5", "(1,00)-"]) {
    assert.equal(centavosDeTextoArgentino(t), null, t);
  }
});

test("números: 3 decimales avisan; 1.005 no pierde el centavo", () => {
  assert.deepEqual(centavosDeTextoArgentino("1,005"), { centavos: 101, redondeado: true });
  assert.deepEqual(centavosDeTextoArgentino("1,500"), { centavos: 150, redondeado: false });
  // Número de celda: 1.005 en binario es 1.00499999…, pero se redondea sobre su forma decimal.
  assert.deepEqual(centavosDeCelda(1.005), { centavos: 101, redondeado: true });
  assert.deepEqual(centavosDeCelda(779.71), { centavos: 77971, redondeado: false });
  // Ruido de coma flotante no es un decimal "de verdad".
  assert.equal(centavosDeCelda(0.1 + 0.2)?.redondeado, false);
  // En texto, "1.005" es MIL CINCO pesos (el punto es de miles).
  assert.equal(centavosDeTextoArgentino("1.005")?.centavos, 100500);
});

test("una fila con fecha válida pero importe ilegible frena la carga con el número de fila", () => {
  const hoja: HojaGrilla = {
    nombre: "x",
    date1904: false,
    filas: [
      ["Banco Nación", "[BNA + Empresas]"],
      ["Fecha", "Comprobante", "Concepto", "Monto", "Saldo"],
      ["01/10/2026", "1", "OK", "$ 1,00", "$ 5,00"],
      ["01/10/2026", "2", "MAL", "$ 1;00", "$ 5,00"],
    ],
  };
  assert.throws(() => leerExtractoCrudo(hoja, { hoy: HOY }), /Fila 4: no pude leer el monto/);
});

test("aviso si las fechas están a más de un año de hoy", () => {
  const l = leerExtractoCrudo(grillasDeBytes(fixtureSantiago())[0], { hoy: new Date(Date.UTC(2028, 0, 1)) });
  assert.ok(l.avisos.some((a) => /más de un año de hoy/.test(a)));
  assert.equal(leer(fixtureSantiago()).avisos.length, 0);
});
