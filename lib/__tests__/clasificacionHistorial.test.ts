import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizarConcepto,
  construirIndice,
  sugerir,
  aplicarSugerenciasDeHistorial,
  UMBRALES_INICIALES,
  type MovimientoParaIndice,
} from "@/lib/clasificacionHistorial";

// El proyecto usa el runner de Node (node:test), no vitest.

function mov(concepto: string, importe: number, clasificacion: string, extra: Partial<MovimientoParaIndice> = {}) {
  return { concepto, importe, clasificacion, ignorado: false, sugeridaPorSistema: false, ...extra };
}

test("normaliza: mayúsculas, sin tildes, sin signos y sin secuencias de 4+ dígitos", () => {
  assert.equal(normalizarConcepto("Débito Fiscal IVA Básico"), "DEBITO FISCAL IVA BASICO");
  assert.equal(normalizarConcepto("PP3-PAGO PROVEEDORES DE 3OS-ENVIO 1819076"), "PP3 PAGO PROVEEDORES DE 3OS ENVIO");
  // Los números cortos se conservan (sucursal 809).
  assert.equal(normalizarConcepto("COMISION ADM.VALORES AL COBRO CC Suc.:809"), "COMISION ADM VALORES AL COBRO CC SUC 809");
  assert.equal(normalizarConcepto("  a   b\t c "), "A B C");
  assert.equal(normalizarConcepto("20123456789"), "");
});

test("un concepto con CUIT o referencia variable cae en la misma clave", () => {
  const indice = construirIndice([
    mov("TEF DATANET PAGOS AFIP 30711223344", -100, "IMP Y PREVISIONALES"),
    mov("TEF DATANET PAGOS AFIP 30755667788", -200, "IMP Y PREVISIONALES"),
    mov("TEF DATANET PAGOS AFIP 27999888777", -300, "IMP Y PREVISIONALES"),
  ]);
  const s = sugerir("TEF DATANET PAGOS AFIP 20111222333", -50, indice);
  assert.deepEqual(s, { clasificacion: "IMP Y PREVISIONALES", apariciones: 3, dominancia: 1 });
});

test("el mismo concepto con signo opuesto no mezcla historiales", () => {
  const indice = construirIndice([
    mov("TRANSFERENCIA RECIBIDA", 500, "COBRANZAS"),
    mov("TRANSFERENCIA RECIBIDA", 600, "COBRANZAS"),
    mov("TRANSFERENCIA RECIBIDA", 700, "COBRANZAS"),
  ]);
  assert.equal(sugerir("TRANSFERENCIA RECIBIDA", 800, indice)?.clasificacion, "COBRANZAS");
  // Como egreso, ese texto no tiene historial: no se sugiere cobranza para una salida.
  assert.equal(sugerir("TRANSFERENCIA RECIBIDA", -800, indice), null);
});

test("caso ambiguo: la dominancia no llega al umbral → null", () => {
  const filas = [
    ...Array.from({ length: 8 }, () => mov("PAGO VARIOS", -10, "PROV Y SERV")),
    ...Array.from({ length: 2 }, () => mov("PAGO VARIOS", -10, "OTROS")),
  ];
  const indice = construirIndice(filas);
  // 8 de 10 = 0,8 < 0,9.
  assert.equal(sugerir("PAGO VARIOS", -1, indice), null);
  // Con un umbral más bajo sí sugiere, con la dominancia real.
  assert.deepEqual(sugerir("PAGO VARIOS", -1, indice, { minApariciones: 3, minDominancia: 0.8 }), {
    clasificacion: "PROV Y SERV",
    apariciones: 10,
    dominancia: 0.8,
  });
});

test("empate entre dos clasificaciones: nunca sugiere, aunque el umbral sea bajo", () => {
  const indice = construirIndice([
    mov("PAGO X", -1, "SUELDOS"),
    mov("PAGO X", -1, "SUELDOS"),
    mov("PAGO X", -1, "SAC"),
    mov("PAGO X", -1, "SAC"),
  ]);
  assert.equal(sugerir("PAGO X", -1, indice, { minApariciones: 1, minDominancia: 0.1 }), null);
});

test("pocas apariciones → null", () => {
  const indice = construirIndice([mov("CONCEPTO RARO", -1, "OTROS"), mov("CONCEPTO RARO", -1, "OTROS")]);
  assert.equal(UMBRALES_INICIALES.minApariciones, 3);
  assert.equal(sugerir("CONCEPTO RARO", -1, indice), null);
  assert.equal(sugerir("CONCEPTO RARO", -1, indice, { minApariciones: 2, minDominancia: 0.9 })?.clasificacion, "OTROS");
});

test("el índice solo aprende de lo confirmado: sin ignorados, sin SIN CLASIFICAR, sin sugerencias sin confirmar", () => {
  const indice = construirIndice([
    mov("A B C", -1, "SUELDOS", { ignorado: true }),
    mov("A B C", -1, "SIN CLASIFICAR"),
    mov("A B C", -1, "SUELDOS", { sugeridaPorSistema: true }),
    mov("A B C", -1, "  "),
    mov("1234567", -1, "SUELDOS"), // queda vacío al normalizar
  ]);
  assert.equal(indice.size, 0);
});

test("concepto vacío al normalizar → null", () => {
  assert.equal(sugerir("12345678", -1, construirIndice([])), null);
});

test("historial agrupado por la base (veces) equivale a las filas sueltas", () => {
  const suelto = construirIndice(Array.from({ length: 5 }, () => mov("DEBITO FISCAL IVA BASICO", -1, "COM Y GTOS BRIOS")));
  const agrupado = construirIndice([{ ...mov("DEBITO FISCAL IVA BASICO", -1, "COM Y GTOS BRIOS"), veces: 5 }]);
  assert.deepEqual(sugerir("DEBITO FISCAL IVA BASICO", -9, agrupado), sugerir("DEBITO FISCAL IVA BASICO", -9, suelto));
  assert.equal(sugerir("DEBITO FISCAL IVA BASICO", -9, agrupado)?.apariciones, 5);
});

// Integración con la forma de las filas de un extracto crudo (subirExtracto): todas entran SIN CLASIFICAR.
function filaCruda(concepto: string, importe: number) {
  return { concepto, importe, clasificacion: "SIN CLASIFICAR", sugeridaPorSistema: false, unidadNegocio: "SPP" };
}

test("extracto crudo: la fila con historial queda sugerida; la que no, SIN CLASIFICAR", () => {
  const indice = construirIndice([
    { ...mov("TEF DATANET PAGOS AFIP", -1, "IMP Y PREVISIONALES"), veces: 47 },
    { ...mov("DB PAGO REMUNERACIONES", -1, "SUELDOS"), veces: 20 },
    { ...mov("DB PAGO REMUNERACIONES", -1, "SAC"), veces: 23 },
  ]);
  const entrada = [
    filaCruda("TEF DATANET PAGOS AFIP", -153985.59),
    filaCruda("TRANSF SUELDO OTROS BANCOS", -1624212), // sin historial
    filaCruda("DB PAGO REMUNERACIONES", -59545698), // historial dividido: no domina
    filaCruda("TEF DATANET PAGOS AFIP", 500), // el mismo texto como ingreso: sin historial
  ];
  const { filas, sugeridas } = aplicarSugerenciasDeHistorial(entrada, indice);
  assert.equal(sugeridas, 1);
  assert.equal(filas[0].clasificacion, "IMP Y PREVISIONALES");
  assert.equal(filas[0].sugeridaPorSistema, true);
  for (const i of [1, 2, 3]) {
    assert.equal(filas[i].clasificacion, "SIN CLASIFICAR");
    assert.equal(filas[i].sugeridaPorSistema, false);
  }
  // No muta la entrada y conserva el resto de los campos.
  assert.equal(entrada[0].clasificacion, "SIN CLASIFICAR");
  assert.equal(filas[0].unidadNegocio, "SPP");
});

test("sin historial en absoluto, ninguna fila se sugiere y no se inventa nada", () => {
  const { filas, sugeridas } = aplicarSugerenciasDeHistorial([filaCruda("LO QUE SEA", -1)], construirIndice([]));
  assert.equal(sugeridas, 0);
  assert.equal(filas[0].clasificacion, "SIN CLASIFICAR");
  assert.equal(filas[0].sugeridaPorSistema, false);
});

test("subir dos veces: las filas sugeridas o SIN CLASIFICAR de la subida anterior no entran al índice", () => {
  const primera = aplicarSugerenciasDeHistorial(
    [filaCruda("CONCEPTO NUEVO", -1), filaCruda("CONCEPTO NUEVO", -1), filaCruda("CONCEPTO NUEVO", -1)],
    construirIndice([{ ...mov("CONCEPTO NUEVO", -1, "OTROS"), veces: 3 }])
  );
  assert.equal(primera.sugeridas, 3);
  // Lo guardado de la primera subida (sugeridaPorSistema = true) no se aprende a sí mismo.
  const indiceSegunda = construirIndice(primera.filas.map((f) => ({ ...f, ignorado: false })));
  assert.equal(indiceSegunda.size, 0);
  // Y con el mismo historial de antes, la segunda subida da exactamente las mismas sugerencias.
  const base = construirIndice([{ ...mov("CONCEPTO NUEVO", -1, "OTROS"), veces: 3 }]);
  const segunda = aplicarSugerenciasDeHistorial([filaCruda("CONCEPTO NUEVO", -1)], base);
  assert.equal(segunda.filas[0].clasificacion, "OTROS");
});
