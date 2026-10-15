import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { grillasDeBytes } from "@/lib/extractos/contenedor";
import { detectarFormato, leerExtractoCrudo } from "@/lib/extractos/detectar";
import { analizarContinuidad } from "@/lib/extractos/continuidad";

// Chequeo contra los 6 extractos REALES de Flavia. Se omite si no está definida
// EXTRACTOS_REALES_DIR (carpeta con los archivos; se leen en SOLO LECTURA y nada se copia
// al repo). Los números esperados salen de una lectura independiente en Python (plan
// docs/lector_bancos_plan.md §6), no de este lector: si alguno no cierra, NO se ajusta la
// expectativa — se frena y se muestra la diferencia.

const DIR = process.env.EXTRACTOS_REALES_DIR;
const omitir = DIR ? false : "EXTRACTOS_REALES_DIR no está definida";

const REALES = [
  {
    archivo: "BANCO MACRO SPP CTA 599.xls",
    banco: "MACRO",
    filas: 18,
    creditos: 24939457978,
    debitos: -9714750782,
    neto: 15224707196,
    enlaces: 17,
    saldoInicial: 9275248928,
    saldoFinal: 24499956124,
    cuenta: "315909409281599",
  },
  {
    archivo: "BANCO GALICIA CREAR CTA 731.xlsx",
    banco: "GALICIA",
    filas: 7,
    creditos: 0,
    debitos: -13073171,
    neto: -13073171,
    enlaces: 6,
    saldoInicial: 1585015010,
    saldoFinal: 1571941839,
    cuenta: null,
  },
  {
    archivo: "BANCO BBVA WEB MASTER CTA 891.xls",
    banco: "FRANCES",
    filas: 8,
    creditos: 0,
    debitos: -781863019,
    neto: -781863019,
    enlaces: 0,
    saldoInicial: null,
    saldoFinal: null,
    cuenta: "2230087891",
  },
  {
    archivo: "BANCO NACION HWC CTA 241.xls",
    banco: "BNA",
    filas: 7,
    creditos: 3619625967,
    debitos: -3676337913,
    neto: -56711946,
    enlaces: 6,
    saldoInicial: null, // saldo previo: ya se convirtió a "posterior"; se verifica con la cadena
    saldoFinal: null,
    cuenta: null,
  },
  {
    archivo: "BANCO SANTANDER HWC CTA 099.xls",
    banco: "SANT",
    filas: 25,
    creditos: 16235200764,
    debitos: -16860830176,
    neto: -625629412,
    enlaces: 24,
    saldoInicial: null,
    saldoFinal: null,
    cuenta: "0690086099",
  },
  {
    archivo: "BANCO SANTIAGO DEL ESTERO SPP CTA 560.csv",
    banco: "BSE",
    filas: 6,
    creditos: 400000000,
    debitos: -430663047,
    neto: -30663047,
    enlaces: 5,
    saldoInicial: null,
    saldoFinal: null,
    cuenta: "2700000000002560",
  },
] as const;

for (const esperado of REALES) {
  test(`real: ${esperado.archivo}`, { skip: omitir }, async () => {
    const bytes = new Uint8Array(readFileSync(join(DIR!, esperado.archivo)));
    const [hoja] = grillasDeBytes(bytes);
    assert.equal(detectarFormato(hoja), esperado.banco);

    const lectura = leerExtractoCrudo(hoja, { hoy: new Date(Date.UTC(2026, 9, 15)) });
    assert.equal(lectura.banco, esperado.banco);
    assert.equal(lectura.filas.length, esperado.filas, "cantidad de filas");
    assert.equal(lectura.cuentaEnArchivo, esperado.cuenta, "número de cuenta");

    const creditos = lectura.filas.filter((f) => f.importeCentavos > 0).reduce((a, f) => a + f.importeCentavos, 0);
    const debitos = lectura.filas.filter((f) => f.importeCentavos < 0).reduce((a, f) => a + f.importeCentavos, 0);
    assert.equal(creditos, esperado.creditos, "total créditos");
    assert.equal(debitos, esperado.debitos, "total débitos");
    assert.equal(creditos + debitos, esperado.neto, "neto");

    // Ninguna fila en $0 (salvo que el archivo la traiga así: ninguno de estos lo hace).
    assert.ok(lectura.filas.every((f) => f.importeCentavos !== 0), "hay filas en $0");

    // Control de saldo: con las filas ya en orden cronológico y saldo posterior, cierra en cadena.
    const [analisis] = analizarContinuidad(
      lectura.filas.map((f, i) => ({
        numeroFila: i,
        fecha: f.fecha,
        concepto: f.concepto,
        importe: f.importeCentavos / 100,
        saldo: f.saldoCentavos === null ? null : f.saldoCentavos / 100,
        bancoYCuenta: "CUENTA",
      }))
    );
    assert.equal(analisis.enlaces, esperado.enlaces, "enlaces de saldo");
    assert.equal(analisis.rupturas.length, 0, "rupturas de saldo");
    assert.equal(analisis.orientacion, "archivo");
    assert.equal(analisis.saldoPrevio, false);

    if (esperado.saldoFinal !== null) {
      const primera = lectura.filas[0];
      const ultima = lectura.filas[lectura.filas.length - 1];
      assert.equal(ultima.saldoCentavos, esperado.saldoFinal, "saldo final");
      assert.equal(primera.saldoCentavos! - primera.importeCentavos, esperado.saldoInicial, "saldo inicial implícito");
    }
  });
}
