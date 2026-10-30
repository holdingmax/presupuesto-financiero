import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  MAX_BYTES_EXTRACTO,
  MAX_FILAS_EXTRACTO,
  MAX_BYTES_MADRE,
  MAX_FILAS_MADRE,
  MENSAJE_MADRE_DIVIDIR,
  verificarCantidadFilas,
  verificarCantidadFilasMadre,
  verificarCuentaElegida,
  verificarTamanoArchivo,
  verificarTamanoMadre,
} from "@/lib/extractos/limites";
import { leerArchivoSubido } from "@/lib/extractos/archivo";

// Madre real medida (EJECUCION FINANCIERA 31.07.xlsx): 1,28 MB y 16.521 filas.
const MADRE_BYTES = 1280281;
const MADRE_FILAS = 16521;

test("constantes: extracto 1 MB / 1.000 filas; madre 2 MB / 20.000 filas, iguales para todos los roles", () => {
  assert.equal(MAX_BYTES_EXTRACTO, 1048576);
  assert.equal(MAX_FILAS_EXTRACTO, 1000);
  assert.equal(MAX_BYTES_MADRE, 2097152);
  assert.equal(MAX_FILAS_MADRE, 20000);
  assert.ok(MADRE_BYTES > MAX_BYTES_EXTRACTO && MADRE_FILAS > MAX_FILAS_EXTRACTO);
});

test("tamaño de extracto: justo en el límite pasa, +1 byte no, y el mensaje señala la opción madre", () => {
  assert.deepEqual(verificarTamanoArchivo(MAX_BYTES_EXTRACTO), { ok: true });
  const r = verificarTamanoArchivo(MAX_BYTES_EXTRACTO + 1);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.ok(r.error.includes("«Archivo madre»"));
    assert.ok(!r.error.includes("script"));
  }
});

test("filas de extracto: 1.000 pasa, 1.001 no, y la madre (16.521) no", () => {
  assert.deepEqual(verificarCantidadFilas(MAX_FILAS_EXTRACTO), { ok: true });
  const r = verificarCantidadFilas(MAX_FILAS_EXTRACTO + 1);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /1\.001/);
  assert.equal(verificarCantidadFilas(MADRE_FILAS).ok, false);
});

test("cuenta elegida: obligatoria en el camino del extracto (vacía o en blanco se rechaza y se indica la opción madre)", () => {
  for (const vacia of ["", "   "]) {
    const r = verificarCuentaElegida(vacia);
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.error.includes("«Archivo madre»"));
  }
  assert.deepEqual(verificarCuentaElegida("MACRO 599"), { ok: true });
});

// --- Archivo madre por la web (incluido el histórico) ------------------------------------------

test("madre, tamaño: 2 MB pasa, +1 byte no; el mensaje pide dividir y no menciona el script", () => {
  assert.deepEqual(verificarTamanoMadre(MAX_BYTES_MADRE), { ok: true });
  const r = verificarTamanoMadre(MAX_BYTES_MADRE + 1);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.ok(r.error.includes(MENSAJE_MADRE_DIVIDIR));
    assert.ok(r.error.includes("2,00 MB"));
    assert.ok(!r.error.includes("script"));
  }
});

test("madre, tamaño: la madre real histórica (1,28 MB) entra por la web", () => {
  assert.deepEqual(verificarTamanoMadre(MADRE_BYTES), { ok: true });
});

test("madre, filas: 20.000 pasa, 20.001 no; la histórica (16.521) pasa", () => {
  assert.deepEqual(verificarCantidadFilasMadre(MAX_FILAS_MADRE), { ok: true });
  const r = verificarCantidadFilasMadre(MAX_FILAS_MADRE + 1);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.match(r.error, /20\.001/);
    assert.ok(r.error.includes(MENSAJE_MADRE_DIVIDIR));
    assert.ok(!r.error.includes("script"));
  }
  assert.deepEqual(verificarCantidadFilasMadre(MADRE_FILAS), { ok: true });
});

// --- Contra archivos reales (se omiten si falta la variable; se leen en SOLO LECTURA) --------

const DIR = process.env.EXTRACTOS_REALES_DIR;
const REALES = [
  "BANCO MACRO SPP CTA 599.xls",
  "BANCO GALICIA CREAR CTA 731.xlsx",
  "BANCO BBVA WEB MASTER CTA 891.xls",
  "BANCO NACION HWC CTA 241.xls",
  "BANCO SANTANDER HWC CTA 099.xls",
  "BANCO SANTIAGO DEL ESTERO SPP CTA 560.csv",
];

for (const nombre of REALES) {
  test(`real: ${nombre} pasa los límites`, { skip: DIR ? false : "EXTRACTOS_REALES_DIR no está definida" }, async () => {
    const ruta = join(DIR!, nombre);
    assert.deepEqual(verificarTamanoArchivo(statSync(ruta).size), { ok: true });
    const leido = await leerArchivoSubido(new Uint8Array(readFileSync(ruta)));
    assert.equal(leido.tipo, "crudo");
    if (leido.tipo === "crudo") {
      assert.deepEqual(verificarCantidadFilas(leido.lectura.filas.length), { ok: true });
    }
  });
}

const MADRE_REAL = process.env.MADRE_REAL_PATH;

test(
  "madre real histórica: pasa los topes de tamaño y de filas de la web",
  { skip: MADRE_REAL ? false : "MADRE_REAL_PATH no está definida" },
  async () => {
    const bytes = statSync(MADRE_REAL!).size;
    assert.equal(bytes, MADRE_BYTES);
    assert.deepEqual(verificarTamanoMadre(bytes), { ok: true });

    const leido = await leerArchivoSubido(new Uint8Array(readFileSync(MADRE_REAL!)));
    assert.equal(leido.tipo, "madre");
    if (leido.tipo === "madre") {
      assert.equal(leido.filas.length, MADRE_FILAS);
      assert.deepEqual(verificarCantidadFilasMadre(leido.filas.length), { ok: true });
    }
  }
);
