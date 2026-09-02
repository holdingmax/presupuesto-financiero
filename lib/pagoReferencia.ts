import ExcelJS from "exceljs";
import { quitarDiacriticos } from "@/lib/slug";

// PAGOS_2025-2026.xlsx no es una planilla plana: cada "día" es una sección
// impresa (fila con solo la fecha, ej. "MIERCOLES 01/04/2026"), con
// subsecciones ("EFECTIVO", o "Empresa: X") que repiten su propio
// encabezado de columna, filas de pago, y una fila SUBTOTAL — varias veces
// por día. No hay columna "Fecha" por fila: hay que recordar la última
// fecha de sección vista y aplicarla a cada fila de pago siguiente.
//
// Conviven al menos dos formatos de encabezado con nombres de columna
// distintos ("PROVEEDOR / DETALLE | TIPO | NUMERO | UN | IMPORTE" vs.
// "Cliente/Proveedor | N OP | Detalle | UN | Monto | Forma de Pago |
// Banco") — pero en ambos la leyenda de pago cae siempre en la 3ra
// columna (verificado contra las 23 filas reales de "LIQUIDACION FINAL" en
// DEFINITIVO: las 23 en la 3ra columna, cero en otra). Por eso el parseo es
// por posición, no por nombre de encabezado.

// ÚNICO punto que decide qué hoja(s) parsear — aislado a propósito, era un
// cambio de una línea cuando Macchi confirmara el ritmo de "DEFINITIVO"
// contra las hojas mensuales. Confirmado 2026-09-02: "DEFINITIVO" va
// atrasada (cubre solo abril-junio 2026, las mensuales ya llegan a agosto)
// — no sirve como única fuente, se perderían julio y agosto. Se lee todo
// MENOS "DEFINITIVO" (no una lista fija de nombres de mes) para que un mes
// nuevo que Macchi agregue a futuro (ej. "SEP26") entre solo sin tocar este
// código.
export function resolverHojasAParsear(workbook: ExcelJS.Workbook): ExcelJS.Worksheet[] {
  return workbook.worksheets.filter((hoja) => hoja.name.toUpperCase() !== "DEFINITIVO");
}

export type FilaPagoReferencia = {
  fecha: Date;
  proveedor: string;
  leyenda: string;
  unidadNegocio: string;
  importe: number;
  esLiquidacionFinal: boolean;
};

function textoDeCelda(valor: ExcelJS.CellValue): string {
  if (valor == null) return "";
  if (typeof valor === "object" && "result" in valor && typeof valor.result !== "object") {
    return String(valor.result ?? "");
  }
  return String(valor).trim();
}

// Mismo criterio que extraerImporte en ejecucion/actions.ts: una celda con
// fórmula viene como { formula, result }, incluidas fórmulas compuestas
// (ej. "133000+211200").
function numeroDeCelda(valor: ExcelJS.CellValue): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (
    typeof valor === "object" &&
    valor !== null &&
    "result" in valor &&
    typeof valor.result === "number" &&
    Number.isFinite(valor.result)
  ) {
    return valor.result;
  }
  return null;
}

// "MIERCOLES 01/04/2026" -> Date. Tolerante al día de la semana (no lo
// valida, solo busca el patrón DD/MM/AAAA) para no depender de acentos ni
// de que el nombre del día esté bien escrito.
function extraerFechaDeEncabezado(texto: string): Date | null {
  const m = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const [, dd, mm, aaaa] = m;
  const fecha = new Date(`${aaaa}-${mm}-${dd}T00:00:00.000Z`);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

// Requiere "FINAL" (o "FINALES") después de "LIQ"/"LIQUIDACION" — no alcanza
// con la sola palabra "LIQUIDACION"/"LIQ". Dos hallazgos reales que corrigieron
// esto (2026-09-02, contra el archivo completo):
// 1) "LIQ" abreviado es una forma real y frecuente de "LIQUIDACION FINAL" —
//    125 leyendas distintas usan "LIQ" en vez de la palabra completa, y de
//    esas, TODAS las que dicen además "FINAL" (ej. "1 CUOTA LIQ FINAL",
//    "LIQ FINAL P/DESPIDO") son liquidaciones de sueldo reales — cero falsos
//    positivos revisados a mano.
// 2) "LIQUIDACION" SOLA (sin "FINAL") NO alcanza — ej. "FC0001-00000256
//    LIQUIDACION 02/2026" (GLOBE AIR CARGO SA) es una liquidación de
//    facturación mensual de un proveedor, no de sueldo. El patrón viejo
//    (/LIQUIDACION/ a secas) la marcaba mal como liquidación final.
// "LIQ" en el resto de los 125 casos (sin "FINAL") es "liquidación" en el
// sentido genérico de "cierre de cuenta" (honorarios, IATA CASS, farmacia,
// correo, aeronavegación) — no tiene nada que ver con sueldos, por eso no
// alcanza con la palabra suelta.
const PATRON_LIQUIDACION_FINAL = /LIQ(UIDACION)?(ES)? FINAL/;

function esLeyendaLiquidacionFinal(texto: string): boolean {
  return PATRON_LIQUIDACION_FINAL.test(quitarDiacriticos(texto).toUpperCase());
}

// Recorre las hojas resueltas por resolverHojasAParsear y devuelve solo las
// filas que son pagos reales — descarta encabezados de día/sección,
// repeticiones del encabezado de columna, y filas SUBTOTAL/TOTAL A ABONAR.
// Validado contra las 10 hojas mensuales reales (2025-04 a 2026-08): 13185
// filas de pago reconstruidas, 121 liquidaciones finales. La heurística de
// descarte de ruido (encabezados/secciones/subtotales) se validó primero
// contra "DEFINITIVO" sola (6122 filas, 3092 de pago, 111 descartadas
// legítimamente) antes de aplicarse acá — mismo criterio, sin sorpresas al
// extenderlo a las mensuales.
export function parsearPagoReferencia(workbook: ExcelJS.Workbook): FilaPagoReferencia[] {
  const filas: FilaPagoReferencia[] = [];

  for (const hoja of resolverHojasAParsear(workbook)) {
    let fechaActual: Date | null = null;

    hoja.eachRow((fila) => {
      const c1 = textoDeCelda(fila.getCell(1).value);
      const c2 = textoDeCelda(fila.getCell(2).value);
      const c3 = textoDeCelda(fila.getCell(3).value);
      const c4 = textoDeCelda(fila.getCell(4).value);
      const importe = numeroDeCelda(fila.getCell(5).value);

      if (fila.cellCount === 0) return;

      const soloC1 = Boolean(c1) && !c2 && !c3 && !c4 && importe === null;
      if (soloC1) {
        const fechaDetectada = extraerFechaDeEncabezado(c1);
        if (fechaDetectada) fechaActual = fechaDetectada;
        return; // encabezado de día, o etiqueta de sección tipo "EFECTIVO"
      }
      if (/^empresa:/i.test(c1)) return;
      if (c1 === "PROVEEDOR / DETALLE" || c1 === "Cliente/Proveedor") return;
      if (/^subtotal/i.test(c4) || /^total a abonar/i.test(c4)) return;

      if (c1 && c4 && importe !== null && fechaActual) {
        filas.push({
          fecha: fechaActual,
          proveedor: c1,
          leyenda: c3,
          unidadNegocio: c4,
          importe,
          esLiquidacionFinal: esLeyendaLiquidacionFinal(`${c1} ${c2} ${c3}`),
        });
      }
    });
  }

  // Leer todas las hojas mensuales (en vez de solo "DEFINITIVO") trae overlap
  // real entre meses consecutivos — validado contra el archivo real: 26
  // grupos de filas idénticas (mismo proveedor+fecha+importe+leyenda),
  // ninguna liquidación hoy, pero es exactamente el ruido que podría generar
  // una falsa "ambigüedad" si algún mes una liquidación real queda duplicada
  // por el mismo motivo. Se queda con la primera aparición.
  const vistas = new Set<string>();
  return filas.filter((f) => {
    const clave = `${f.fecha.toISOString().slice(0, 10)}|${f.proveedor}|${f.importe.toFixed(2)}|${f.leyenda}`;
    if (vistas.has(clave)) return false;
    vistas.add(clave);
    return true;
  });
}
