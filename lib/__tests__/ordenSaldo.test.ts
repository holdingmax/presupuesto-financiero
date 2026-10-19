import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ordenarPorCadenaDeSaldo, type FilaOrdenable } from "@/lib/ordenSaldo";
import { grillasDeBytes } from "@/lib/extractos/contenedor";
import { leerExtractoCrudo } from "@/lib/extractos/detectar";

type F = FilaOrdenable & { id: string };
const f = (id: string, fecha: string, cuenta: string, importe: number, saldo: number | null): F => ({
  id,
  fecha,
  bancoYCuenta: cuenta,
  importeCentavos: importe,
  saldoCentavos: saldo,
});
const ids = (filas: F[]) => filas.map((x) => x.id);

test("reordena un día para que cada saldo sea el anterior + su importe", () => {
  // Cadena real: a (+100 → 1100), b (-300 → 800), c (+50 → 850). Llegan en orden de id: c, a, b.
  const entrada = [f("c", "2026-09-01", "MACRO 599", 5000, 85000), f("a", "2026-09-01", "MACRO 599", 10000, 110000), f("b", "2026-09-01", "MACRO 599", -30000, 80000)];
  assert.deepEqual(ids(ordenarPorCadenaDeSaldo(entrada)), ["a", "b", "c"]);
});

test("no cambia el orden entre fechas ni entre cuentas, y no muta la entrada", () => {
  const entrada = [
    f("x1", "2026-09-01", "OTRA", 100, 100),
    f("c", "2026-09-01", "MACRO 599", 5000, 15000),
    f("y1", "2026-09-01", "OTRA", 100, 200),
    f("a", "2026-09-01", "MACRO 599", 10000, 10000),
    f("d", "2026-09-02", "MACRO 599", 1, 15001),
  ];
  const copia = ids(entrada);
  // En OTRA ya cadena; en MACRO a→c; los slots de cada cuenta se conservan.
  assert.deepEqual(ids(ordenarPorCadenaDeSaldo(entrada)), ["x1", "a", "y1", "c", "d"]);
  assert.deepEqual(ids(entrada), copia);
});

test("sin saldo en alguna fila (BBVA): el grupo queda igual", () => {
  const entrada = [f("2", "2026-09-01", "BBVA 891", -5, null), f("1", "2026-09-01", "BBVA 891", -7, null)];
  assert.deepEqual(ids(ordenarPorCadenaDeSaldo(entrada)), ["2", "1"]);
  const mixto = [f("2", "2026-09-01", "X", -5, 95), f("1", "2026-09-01", "X", -7, null)];
  assert.deepEqual(ids(ordenarPorCadenaDeSaldo(mixto)), ["2", "1"]);
});

test("saldos que no encadenan: queda igual", () => {
  const entrada = [f("b", "2026-09-01", "X", 100, 999), f("a", "2026-09-01", "X", 100, 500)];
  assert.deepEqual(ids(ordenarPorCadenaDeSaldo(entrada)), ["b", "a"]);
});

test("cadena incompleta (falta una fila del día): queda igual", () => {
  // a→b→c encadena, pero d no engancha con nadie.
  const entrada = [f("c", "2026-09-01", "X", 10, 130), f("a", "2026-09-01", "X", 10, 110), f("d", "2026-09-01", "X", 10, 5000), f("b", "2026-09-01", "X", 10, 120)];
  assert.deepEqual(ids(ordenarPorCadenaDeSaldo(entrada)), ["c", "a", "d", "b"]);
});

test("empate (más de un orden posible): queda igual", () => {
  // 100 → 150 → 100 → 150: dos depósitos de +50 y dos retiros de -50 alternados, orden ambiguo.
  const entrada = [
    f("r1", "2026-09-01", "X", -50, 100),
    f("d1", "2026-09-01", "X", 50, 150),
    f("r2", "2026-09-01", "X", -50, 100),
    f("d2", "2026-09-01", "X", 50, 150),
  ];
  assert.deepEqual(ids(ordenarPorCadenaDeSaldo(entrada)), ["r1", "d1", "r2", "d2"]);
});

test("compara en centavos enteros: sin error de punto flotante", () => {
  // 0,1 + 0,2 en flotante da 0,30000000000000004; en centavos 10 + 20 = 30 exacto.
  const entrada = [f("b", "2026-09-01", "X", 20, 30), f("a", "2026-09-01", "X", 10, 10)];
  assert.deepEqual(ids(ordenarPorCadenaDeSaldo(entrada)), ["a", "b"]);
});

test("el resultado es el mismo sin importar el orden de entrada del día", () => {
  const cadena = [f("a", "2026-09-01", "X", 700, 1700), f("b", "2026-09-01", "X", -200, 1500), f("c", "2026-09-01", "X", 40, 1540), f("d", "2026-09-01", "X", -1000, 540)];
  const permutaciones = [[3, 1, 0, 2], [2, 3, 1, 0], [1, 0, 3, 2], [0, 1, 2, 3]];
  for (const p of permutaciones) {
    assert.deepEqual(ids(ordenarPorCadenaDeSaldo(p.map((i) => cadena[i]))), ["a", "b", "c", "d"]);
  }
});

test("un grupo de una sola fila o una lista vacía no se tocan", () => {
  assert.deepEqual(ordenarPorCadenaDeSaldo([]), []);
  const una = [f("a", "2026-09-01", "X", 1, 1)];
  assert.deepEqual(ids(ordenarPorCadenaDeSaldo(una)), ["a"]);
});

// Cadena sintética de n filas de la misma cuenta y día con saldos únicos, mezclada al azar.
function cadenaSintetica(n: number) {
  const base: F[] = [];
  let previo = 1_000_000;
  for (let i = 0; i < n; i++) {
    const saldo = 1_000_000 + 10 + i * 10 + (i % 2) * 5_000_000; // alterna alto/bajo, todos distintos
    base.push(f(String(i).padStart(5, "0"), "2026-09-01", "X", saldo - previo, saldo));
    previo = saldo;
  }
  const mezcladas = [...base];
  let semilla = 7;
  for (let i = mezcladas.length - 1; i > 0; i--) {
    semilla = (semilla * 1103515245 + 12345) % 2147483648;
    const j = semilla % (i + 1);
    [mezcladas[i], mezcladas[j]] = [mezcladas[j], mezcladas[i]];
  }
  return { base, mezcladas };
}

for (const n of [1000, 5000]) {
  test(`${n} filas de la misma cuenta y día con saldos únicos, mezcladas: las ordena`, () => {
    const { base, mezcladas } = cadenaSintetica(n);
    const inicio = performance.now();
    const ordenadas = ordenarPorCadenaDeSaldo(mezcladas);
    const ms = performance.now() - inicio;
    assert.deepEqual(ids(ordenadas), ids(base));
    assert.ok(ms < 1000, `tardó ${ms.toFixed(0)} ms`);
  });
}

test("20.000 filas de la misma cuenta y día: no tira error (puede ordenar o no)", () => {
  const { base, mezcladas } = cadenaSintetica(20000);
  let resultado: F[] = [];
  assert.doesNotThrow(() => {
    resultado = ordenarPorCadenaDeSaldo(mezcladas);
  });
  assert.equal(resultado.length, mezcladas.length);
  // Mismas filas, ordenadas o tal como venían (nunca perdidas ni duplicadas).
  assert.deepEqual([...ids(resultado)].sort(), [...ids(base)].sort());
});

test("varias candidatas a inicio (una fila suelta) o ninguna (ciclo): sin cadena única, queda igual", () => {
  // Dos filas sin predecesora: no existe una cadena que las incluya a todas.
  const dosInicios = [f("b", "2026-09-01", "X", 10, 120), f("a", "2026-09-01", "X", 10, 110), f("z", "2026-09-01", "X", 10, 900)];
  assert.deepEqual(ids(ordenarPorCadenaDeSaldo(dosInicios)), ["b", "a", "z"]);
  // Ciclo 100 → 150 → 100: todas se enganchan, hay dos órdenes posibles (empate).
  const ciclo = [f("r", "2026-09-01", "X", -50, 100), f("d", "2026-09-01", "X", 50, 150)];
  assert.deepEqual(ids(ordenarPorCadenaDeSaldo(ciclo)), ["r", "d"]);
});

// ---- Datos reales (solo lectura; se omite sin EXTRACTOS_REALES_DIR) ----
const DIR = process.env.EXTRACTOS_REALES_DIR;
const omitir = DIR ? false : "EXTRACTOS_REALES_DIR no está definida";

function filasReales(archivo: string): F[] {
  const [hoja] = grillasDeBytes(new Uint8Array(readFileSync(join(DIR!, archivo))));
  const lectura = leerExtractoCrudo(hoja, { hoy: new Date(Date.UTC(2026, 9, 15)) });
  return lectura.filas.map((x, i) => f(String(i).padStart(4, "0"), x.fecha.toISOString().slice(0, 10), "CUENTA", x.importeCentavos, x.saldoCentavos));
}

// Baraja determinísticamente (LCG) para simular el orden por id que no sigue la cadena.
function barajarDentroDelDia(filas: F[], semilla: number): F[] {
  let s = semilla;
  const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  const porDia = new Map<string, F[]>();
  for (const x of filas) porDia.set(x.fecha, [...(porDia.get(x.fecha) ?? []), x]);
  return [...porDia.values()].flatMap((g) => {
    const c = [...g];
    for (let i = c.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [c[i], c[j]] = [c[j], c[i]];
    }
    return c;
  });
}

function cierraDePuntaAPunta(filas: F[]): boolean {
  for (let i = 1; i < filas.length; i++) {
    if (filas[i].fecha !== filas[i - 1].fecha) continue;
    if (filas[i].saldoCentavos !== filas[i - 1].saldoCentavos! + filas[i].importeCentavos) return false;
  }
  return true;
}

for (const archivo of ["BANCO MACRO SPP CTA 599.xls", "BANCO GALICIA CREAR CTA 731.xlsx", "BANCO SANTANDER HWC CTA 099.xls"]) {
  test(`real: ${archivo} — el orden resultante encadena los saldos`, { skip: omitir }, () => {
    const original = filasReales(archivo);
    assert.ok(cierraDePuntaAPunta(original), "el extracto original debe encadenar");
    for (const semilla of [1, 2, 3, 4, 5]) {
      const barajado = barajarDentroDelDia(original, semilla);
      const ordenado = ordenarPorCadenaDeSaldo(barajado);
      assert.ok(cierraDePuntaAPunta(ordenado), `semilla ${semilla}: no encadena`);
      assert.deepEqual(ordenado.map((x) => x.fecha), barajado.map((x) => x.fecha), "el orden entre fechas no cambia");
    }
    // Ya ordenado: no se mueve nada.
    assert.deepEqual(ids(ordenarPorCadenaDeSaldo(original)), ids(original));
  });
}

test("real: BBVA 891 queda sin cambios", { skip: omitir }, () => {
  const original = filasReales("BANCO BBVA WEB MASTER CTA 891.xls");
  assert.ok(original.every((x) => x.saldoCentavos === null));
  for (const semilla of [1, 2, 3]) {
    const barajado = barajarDentroDelDia(original, semilla);
    assert.deepEqual(ids(ordenarPorCadenaDeSaldo(barajado)), ids(barajado));
  }
});
