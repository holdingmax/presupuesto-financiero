import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CHEQUEOS_SUMA_CERO,
  agruparUnidadesSugeridas,
  armarChequeo,
  totalizarSugerencias,
} from "@/lib/agregadosEjecucion";

// Los agregados que devuelve la edición desde el select de la tabla (guardarCampoMovimiento) y los
// que calcula la página (obtenerDatosSemana / calcularChequeosSumaCero) salen de las mismas
// funciones, alimentadas por los mismos groupBy / filtros. Acá se simula esa consulta sobre filas
// en memoria, se aplica la edición con la misma regla que el servidor y se compara con una
// definición independiente calculada a mano desde las filas.

type Fila = {
  id: string;
  fecha: Date;
  concepto: string;
  importe: number;
  bancoYCuenta: string;
  clasificacion: string;
  unidadNegocio: string;
  ignorado: boolean;
  sugeridaPorSistema: boolean;
  chequeIvaAmbiguo: boolean;
  unidadSugeridaPorSistema: boolean;
};

function fila(parcial: Partial<Fila> & { id: string }): Fila {
  return {
    fecha: new Date("2099-01-05T00:00:00Z"),
    concepto: "MED",
    importe: 100,
    bancoYCuenta: "SANT 123",
    clasificacion: "SIN CLASIFICAR",
    unidadNegocio: "SPP",
    ignorado: false,
    sugeridaPorSistema: false,
    chequeIvaAmbiguo: false,
    unidadSugeridaPorSistema: false,
    ...parcial,
  };
}

// Misma regla que aplicarActualizacionMovimiento (actions.ts).
function editar(filas: Fila[], id: string, datos: { clasificacion?: string; unidadNegocio?: string }): Fila[] {
  return filas.map((f) => {
    if (f.id !== id) return f;
    const unidadCambio = datos.unidadNegocio !== undefined && datos.unidadNegocio !== f.unidadNegocio;
    return {
      ...f,
      ...datos,
      ...(unidadCambio ? { unidadSugeridaPorSistema: false } : {}),
      ...(datos.clasificacion !== undefined ? { sugeridaPorSistema: false } : {}),
    };
  });
}

function groupBy<T>(filas: Fila[], clave: (f: Fila) => T, filtro: (f: Fila) => boolean) {
  const mapa = new Map<string, { k: T; n: number }>();
  for (const f of filas.filter(filtro)) {
    const k = clave(f);
    const key = JSON.stringify(k);
    mapa.set(key, { k, n: (mapa.get(key)?.n ?? 0) + 1 });
  }
  return [...mapa.values()];
}

// Lo que arma el servidor: groupBy + funciones compartidas.
function agregadosDelServidor(filas: Fila[]) {
  const sugerencias = totalizarSugerencias(
    groupBy(filas, (f) => ({ c: f.clasificacion, a: f.chequeIvaAmbiguo }), (f) => f.sugeridaPorSistema).map((g) => ({
      clasificacion: g.k.c,
      chequeIvaAmbiguo: g.k.a,
      _count: g.n,
    }))
  );
  const unidades = agruparUnidadesSugeridas(
    groupBy(filas, (f) => ({ b: f.bancoYCuenta, u: f.unidadNegocio }), (f) => f.unidadSugeridaPorSistema).map((g) => ({
      bancoYCuenta: g.k.b,
      unidadNegocio: g.k.u,
      _count: g.n,
    }))
  );
  const chequeos = CHEQUEOS_SUMA_CERO.map((def) =>
    armarChequeo(
      def,
      filas
        .filter((f) => f.clasificacion === def.clasificacion && !f.ignorado)
        .sort((a, b) => a.fecha.getTime() - b.fecha.getTime() || a.id.localeCompare(b.id))
    )
  );
  return { sugerencias, unidades, chequeos };
}

// Definición independiente, directo desde las filas.
function agregadosDeReferencia(filas: Fila[]) {
  const pendientes = filas.filter((f) => f.sugeridaPorSistema);
  const cantidadSugerencias = pendientes.length;
  const porClasificacion = new Map<string, number>();
  for (const f of pendientes) porClasificacion.set(f.clasificacion, (porClasificacion.get(f.clasificacion) ?? 0) + 1);
  const cantidadUnidadesSugeridas = filas.filter((f) => f.unidadSugeridaPorSistema).length;
  const netos = CHEQUEOS_SUMA_CERO.map((def) =>
    filas.filter((f) => f.clasificacion === def.clasificacion && !f.ignorado).reduce((a, f) => a + f.importe, 0)
  );
  return { cantidadSugerencias, porClasificacion, cantidadUnidadesSugeridas, netos };
}

function verificar(filas: Fila[]) {
  const srv = agregadosDelServidor(filas);
  const ref = agregadosDeReferencia(filas);
  const totalSug = [...srv.sugerencias.values()].reduce((a, g) => a + g.cantidad, 0);
  assert.equal(totalSug, ref.cantidadSugerencias);
  for (const [clasif, n] of ref.porClasificacion) assert.equal(srv.sugerencias.get(clasif)?.cantidad, n);
  assert.equal(srv.sugerencias.size, ref.porClasificacion.size);
  assert.equal(srv.unidades.reduce((a, g) => a + g.cantidad, 0), ref.cantidadUnidadesSugeridas);
  srv.chequeos.forEach((c, i) => {
    assert.equal(c.neto, ref.netos[i]);
    assert.equal(c.ok, Math.abs(ref.netos[i]) < 0.01);
    assert.equal(c.lineas.length, c.ok ? 0 : c.cantidad);
  });
  return srv;
}

const BASE: Fila[] = [
  fila({ id: "a", clasificacion: "PRESTAMOS", importe: 500, sugeridaPorSistema: true }),
  fila({ id: "b", clasificacion: "PRESTAMOS", importe: -500 }),
  fila({ id: "c", clasificacion: "OTROS", importe: 70, sugeridaPorSistema: true, unidadSugeridaPorSistema: true }),
  fila({ id: "d", clasificacion: "OTROS", importe: 30, unidadSugeridaPorSistema: true, bancoYCuenta: "FRANCES 891" }),
  fila({ id: "e", clasificacion: "TRANSF ENTRE BCOS", importe: 10, ignorado: true }),
];

test("línea base: los agregados del servidor coinciden con la definición directa", () => {
  const srv = verificar(BASE);
  assert.equal(srv.chequeos[0].ok, true);
});

test("reclasificar desde un chequeo: el chequeo de origen se desbalancea y cambian las sugerencias", () => {
  const despues = editar(BASE, "b", { clasificacion: "OTROS" });
  const srv = verificar(despues);
  assert.equal(srv.chequeos[0].ok, false);
  assert.equal(srv.chequeos[0].neto, 500);
  assert.equal(srv.chequeos[0].lineas.length, 1);
});

test("reclasificar una fila sugerida: confirma la sugerencia (baja el contador y desaparece el grupo)", () => {
  const antes = verificar(BASE).sugerencias;
  assert.equal(antes.get("PRESTAMOS")?.cantidad, 1);
  const despues = verificar(editar(BASE, "a", { clasificacion: "PRESTAMOS" })).sugerencias;
  assert.equal(despues.has("PRESTAMOS"), false);
  assert.equal(despues.get("OTROS")?.cantidad, 1);
});

test("cambiar la unidad de una fila con unidad sugerida: sale del panel de unidades sugeridas", () => {
  const antes = verificar(BASE).unidades;
  assert.equal(antes.reduce((a, g) => a + g.cantidad, 0), 2);
  const despues = verificar(editar(BASE, "c", { unidadNegocio: "RADIO" })).unidades;
  assert.equal(despues.reduce((a, g) => a + g.cantidad, 0), 1);
  // Reelegir la misma unidad no confirma nada (misma regla que el servidor).
  const igual = verificar(editar(BASE, "c", { unidadNegocio: "SPP" })).unidades;
  assert.equal(igual.reduce((a, g) => a + g.cantidad, 0), 2);
});

test("el Total $ no depende de la clasificación (sin filtro): solo de ignorado e importe", () => {
  const total = (filas: Fila[]) => filas.filter((f) => !f.ignorado).reduce((a, f) => a + f.importe, 0);
  assert.equal(total(editar(BASE, "a", { clasificacion: "OTROS" })), total(BASE));
  assert.equal(editar(BASE, "a", { clasificacion: "OTROS" }).length, BASE.length);
});
