import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { leerArchivoSubido } from "@/lib/extractos/archivo";
import { cuentaEsVerificable, exigirConfirmacionDeCuenta } from "@/lib/cuentasBancarias";

// Con los extractos REALES de Flavia (solo lectura; se omite sin EXTRACTOS_REALES_DIR): Galicia y
// Nación no traen número de cuenta y exigen confirmación; los otros cuatro son verificables.

const DIR = process.env.EXTRACTOS_REALES_DIR;
const omitir = DIR ? false : "EXTRACTOS_REALES_DIR no está definida";

const REALES: { archivo: string; cuenta: string; verificable: boolean }[] = [
  { archivo: "BANCO GALICIA CREAR CTA 731.xlsx", cuenta: "GALICIA 731", verificable: false },
  { archivo: "BANCO NACION HWC CTA 241.xls", cuenta: "BNA 241", verificable: false },
  { archivo: "BANCO MACRO SPP CTA 599.xls", cuenta: "MACRO 599", verificable: true },
  { archivo: "BANCO BBVA WEB MASTER CTA 891.xls", cuenta: "FRANCES 891", verificable: true },
  { archivo: "BANCO SANTANDER HWC CTA 099.xls", cuenta: "SANT 099", verificable: true },
  { archivo: "BANCO SANTIAGO DEL ESTERO SPP CTA 560.csv", cuenta: "BSE 560", verificable: true },
];

for (const r of REALES) {
  test(`real: ${r.archivo} → ${r.verificable ? "verificable" : "exige confirmación"}`, { skip: omitir }, async () => {
    const leido = await leerArchivoSubido(new Uint8Array(readFileSync(join(DIR!, r.archivo))));
    assert.equal(leido.tipo, "crudo");
    if (leido.tipo !== "crudo") return;
    const { cuentaEnArchivo } = leido.lectura;
    assert.equal(cuentaEsVerificable(cuentaEnArchivo), r.verificable);
    // Sin confirmar: solo pasa si es verificable. Confirmado: siempre pasa.
    assert.equal(exigirConfirmacionDeCuenta(cuentaEnArchivo, false, r.cuenta).ok, r.verificable);
    assert.equal(exigirConfirmacionDeCuenta(cuentaEnArchivo, true, r.cuenta).ok, true);
  });
}
