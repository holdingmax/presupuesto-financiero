import ExcelJS from "exceljs";
import { quitarDiacriticos } from "@/lib/slug";

// IVA_NUEVO4.xlsx, hoja "operaciones_cheques" — mismo problema estructural
// que PAGOS_2025-2026.xlsx: FECHA no está poblada en cada fila (de ~12.824
// filas con datos reales, solo 1.627 traen fecha propia; el resto hereda de
// la fila anterior — mismo patrón de "bloque" que ya resolvimos ahí). La
// hoja además mezcla dos tipos de fila en el mismo rango: operaciones de
// cheque reales, y ajustes/comisiones sueltos que reutilizan la columna N°
// CHEQUE para texto libre (ej. "COM", nombres de personas) — de ahí el
// filtro por tipo numérico.
const NOMBRE_HOJA = "operaciones_cheques";
const FILA_ENCABEZADO = 4; // fila 2: título fusionado; fila 3: blanco; fila 4: encabezados reales

export type FilaChequeIvaReferencia = {
  fecha: Date;
  empresa: string;
  razonSocial: string;
  numeroCheque: number;
  banco: string;
  importeCh: number;
  comision: number | null;
  aIngresar: number | null;
  duplicadoAmbiguo: boolean;
};

function valorCrudo(v: ExcelJS.CellValue): unknown {
  if (typeof v === "object" && v !== null && "result" in v && typeof v.result !== "object") {
    return v.result;
  }
  return v;
}

function numeroDeCelda(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// Validado contra el archivo real (2026-09): "DEVUELTO"/"RECHAZADO" aparecen
// en RAZON SOCIAL o DESTINO (ej. "CHEQUE 48HS. DEVUELTO CAP F", "REPOSICION
// CHEQUE RECHAZADO N°... - LEMON TUC") — un cheque rechazado no es un cobro
// exitoso, no corresponde clasificarlo como IVA/CH DIFERIDOS IVA.
function esRechazadoODevuelto(texto: string): boolean {
  const normalizado = quitarDiacriticos(texto).toUpperCase();
  return normalizado.includes("DEVUELTO") || normalizado.includes("RECHAZADO");
}

// Defensivo: una fila de "reemplazo" que liste varios cheques juntos (ej.
// "REEMPLAZO CHEQUES 123/456/789 NEGOCIADOS...") no es una operación de un
// solo cheque — no se parsea acá, queda para carga manual. No confirmé que
// este patrón exista tal cual dentro de esta hoja (si N° CHEQUE ya es una
// celda numérica, un listado de varios números no podría vivir ahí de
// todos modos y ya quedaría descartado por el filtro numérico) — se deja
// como resguardo explícito igual, por si el texto aparece en otra columna.
function esReemplazoDeVariosCheques(texto: string): boolean {
  return /REEMPLAZO\s+CHEQUE/i.test(quitarDiacriticos(texto).toUpperCase());
}

// Recorre "operaciones_cheques", reconstruye FECHA por forward-fill, descarta
// filas de ajuste/comisión (N° CHEQUE o IMPORTE CH no numéricos) y cheques
// rechazados/devueltos, y dedupea por (numeroCheque, importeCh) quedándose
// con la primera aparición — la fila conservada queda con duplicadoAmbiguo
// en true si había más de una candidata para esa clave (revisión manual
// posterior, no resuelto acá).
export function parsearChequeIvaReferencia(workbook: ExcelJS.Workbook): FilaChequeIvaReferencia[] {
  const hoja = workbook.getWorksheet(NOMBRE_HOJA);
  if (!hoja) return [];

  const candidatas: Omit<FilaChequeIvaReferencia, "duplicadoAmbiguo">[] = [];
  let fechaActual: Date | null = null;

  hoja.eachRow((fila, numeroFila) => {
    if (numeroFila <= FILA_ENCABEZADO) return;

    const fechaCruda = valorCrudo(fila.getCell(1).value);
    if (fechaCruda instanceof Date) fechaActual = fechaCruda;

    const razonSocial = String(valorCrudo(fila.getCell(3).value) ?? "").trim();
    const destino = String(valorCrudo(fila.getCell(9).value) ?? "").trim();
    const numeroCheque = numeroDeCelda(valorCrudo(fila.getCell(4).value));
    const importeCh = numeroDeCelda(valorCrudo(fila.getCell(6).value));

    if (numeroCheque === null) return; // fila de ajuste/comisión (texto libre en N° CHEQUE)
    if (importeCh === null) return; // celda corrupta (ej. formateada como fecha)
    if (!fechaActual) return; // todavía no vimos ninguna fecha real más arriba

    if (esReemplazoDeVariosCheques(razonSocial) || esReemplazoDeVariosCheques(destino)) return;
    if (esRechazadoODevuelto(razonSocial) || esRechazadoODevuelto(destino)) return;

    candidatas.push({
      fecha: fechaActual,
      empresa: String(valorCrudo(fila.getCell(2).value) ?? "").trim(),
      razonSocial,
      numeroCheque,
      banco: String(valorCrudo(fila.getCell(5).value) ?? "").trim(),
      importeCh,
      comision: numeroDeCelda(valorCrudo(fila.getCell(7).value)),
      aIngresar: numeroDeCelda(valorCrudo(fila.getCell(8).value)),
    });
  });

  const indicePorClave = new Map<string, number>();
  const resultado: FilaChequeIvaReferencia[] = [];
  for (const c of candidatas) {
    const clave = `${c.numeroCheque}|${c.importeCh.toFixed(2)}`;
    const indiceExistente = indicePorClave.get(clave);
    if (indiceExistente === undefined) {
      indicePorClave.set(clave, resultado.length);
      resultado.push({ ...c, duplicadoAmbiguo: false });
    } else {
      resultado[indiceExistente].duplicadoAmbiguo = true;
    }
  }
  return resultado;
}
