import { armarIndiceRubros, rubroDe } from "@/lib/rubros";
import { normalizarTexto } from "@/lib/texto";
import { CLASIFICACIONES_PRESUPUESTO_TODAS } from "@/app/[empresa]/[periodo]/presupuesto/clasificacionesPresupuesto";
import { PENDIENTES, type CodigoPendiente } from "@/lib/reporte/pendientes";

// Motor del Reporte por plantilla (Etapa 2a, docs/reporte_etapa2a_plan.md §3).
// Puro: sin Prisma ni nada de servidor — recibe la plantilla de la empresa y,
// por mes, el Real por clasificación cruda (centavos con signo de banco) y el
// Presupuesto por clasificación guardada (centavos), y devuelve la grilla
// filas × meses × {presupuestado, real, % avance, falta ejecutar}. El motor no
// sabe nada de empresas: solo interpreta la plantilla.
//
// Todo en centavos enteros: nada de float para sumar.

// 2b agrega DISPONIBILIDADES y CIERRE.
export type Bloque = "INGRESOS" | "EGRESOS" | "ABAJO";

export type FuenteReal =
  // Valores crudos de Ejecución; se comparan sin mayúsculas/tildes y con los
  // alias confirmados de lib/rubros.ts (COM Y GTOS BRIOS ↔ Gastos bancarios…).
  | { tipo: "clasificaciones"; clasificaciones: string[] }
  // Valor que en la planilla se tipea (Resultado FCI, MS sin clasificar…): 2b.
  | { tipo: "manual2b" }
  // Espejo de un componente de Disponibilidades (Reserva aguinaldo, cheques
  // después del 10/15): 2b.
  | { tipo: "espejo2b" }
  | { tipo: "ninguna" };

// valorPersistido de clasificacionesPresupuesto.ts.
export type FuentePresupuesto = { tipo: "categorias"; categorias: string[] } | { tipo: "ninguna" };

export type FilaTitulo = { clave: string; bloque: Bloque; tipo: "titulo"; texto: string };
export type FilaLinea = {
  clave: string;
  bloque: Bloque;
  tipo: "linea";
  // Texto exacto de la planilla de Macchi (docs/reporte_diagnostico.md §2).
  texto: string;
  // Ingresos +1, egresos −1: valor = signo × neto con signo de banco. Un egreso
  // normal queda positivo; uno con más devoluciones que gastos queda negativo y
  // se muestra con "−", a propósito (sin Math.abs).
  signo: 1 | -1;
  real: FuenteReal;
  presupuesto: FuentePresupuesto;
  pendiente?: CodigoPendiente;
  // Lo calculado es solo una parte (ej. Sueldos sin el reparto de nómina).
  parcial?: boolean;
  // De dónde sale en la planilla de Macchi.
  nota?: string;
};
export type FilaTotal = { clave: string; bloque: Bloque; tipo: "total"; texto: string; suma: string[] };
export type Fila = FilaTitulo | FilaLinea | FilaTotal;

export type Plantilla = { empresa: string; filas: Fila[] };

export type DatosMes = {
  periodo: string;
  // Clasificación cruda de Ejecución → centavos con signo de banco.
  real: Map<string, number>;
  // Clasificación guardada en LineaPresupuesto → centavos. null = el mes no
  // tiene PresupuestoMensual ("sin presupuesto"; mirar el reporte no lo crea).
  presupuesto: Map<string, number> | null;
};

export type Celda = {
  presupuestado: number | null;
  real: number | null;
  // Porcentaje (98.5 = 98,5 %). null si falta P o R, o si P es 0.
  avance: number | null;
  faltaEjecutar: number | null;
  // Falta información para completar el valor (fila pendiente, parcial o de
  // carga manual; en un total: alguna de las filas que suma).
  presupuestoIncompleto: boolean;
  realIncompleto: boolean;
};

export type FilaReporte = { fila: Fila; celdas: Celda[] };

export type Reporte = {
  periodos: string[];
  sinPresupuesto: boolean[];
  filas: FilaReporte[];
  // Códigos K de la plantilla, en orden, sin repetir.
  pendientes: CodigoPendiente[];
};

// Clave para emparejar una clasificación (de Ejecución o de Presupuesto) con la
// fuente de una fila: el rubro de la lista de Presupuesto si es uno de ellos o
// un alias confirmado; si no, el texto normalizado ("CAMPO", "AVION", "MS").
const INDICE_EQUIVALENCIAS = armarIndiceRubros(
  Array.from(new Set(CLASIFICACIONES_PRESUPUESTO_TODAS.map((o) => o.valorPersistido)))
);
export function claveEquivalencia(valor: string): string {
  return rubroDe(INDICE_EQUIVALENCIAS, valor) ?? normalizarTexto(valor);
}

const CATEGORIAS_PRESUPUESTO = new Set(CLASIFICACIONES_PRESUPUESTO_TODAS.map((o) => o.valorPersistido));

function esCargaManual(fila: FilaLinea) {
  return fila.real.tipo === "manual2b" || fila.real.tipo === "espejo2b";
}

function realIncompletoDe(fila: FilaLinea): boolean {
  if (fila.parcial || esCargaManual(fila)) return true;
  // K8 es una pregunta de presupuesto: no deja incompleto el real.
  return fila.real.tipo === "ninguna" && fila.pendiente !== undefined && fila.pendiente !== "K8";
}

function presupuestoIncompletoDe(fila: FilaLinea): boolean {
  return fila.presupuesto.tipo === "ninguna" && (fila.pendiente !== undefined || esCargaManual(fila));
}

// −1 × 0 da −0 en JS: un egreso sin movimientos tiene que ser 0, no "−0".
function aplicarSigno(signo: 1 | -1, centavos: number): number {
  const valor = signo * centavos;
  return valor === 0 ? 0 : valor;
}

function porcentaje(real: number, presupuestado: number): number {
  return (real / presupuestado) * 100;
}

function sumarAgrupado(datos: Map<string, number>, indice: Map<string, string>): Map<string, number> {
  const porFila = new Map<string, number>();
  for (const [clasificacion, centavos] of datos) {
    const clave = indice.get(claveEquivalencia(clasificacion));
    if (clave === undefined) continue;
    porFila.set(clave, (porFila.get(clave) ?? 0) + centavos);
  }
  return porFila;
}

export function armarReporte(plantilla: Plantilla, meses: DatosMes[]): Reporte {
  // Índices clave de equivalencia → clave de fila. validarPlantilla garantiza
  // que ninguna clasificación ni categoría aparece en dos filas.
  const indiceReal = new Map<string, string>();
  const indicePresupuesto = new Map<string, string>();
  for (const fila of plantilla.filas) {
    if (fila.tipo !== "linea") continue;
    if (fila.real.tipo === "clasificaciones") {
      for (const c of fila.real.clasificaciones) indiceReal.set(claveEquivalencia(c), fila.clave);
    }
    if (fila.presupuesto.tipo === "categorias") {
      for (const c of fila.presupuesto.categorias) indicePresupuesto.set(claveEquivalencia(c), fila.clave);
    }
  }

  const celdasPorClave = new Map<string, Celda[]>();
  const filas: FilaReporte[] = [];
  const realPorMes = meses.map((m) => sumarAgrupado(m.real, indiceReal));
  const presupuestoPorMes = meses.map((m) => (m.presupuesto ? sumarAgrupado(m.presupuesto, indicePresupuesto) : null));

  for (const fila of plantilla.filas) {
    if (fila.tipo === "titulo") {
      filas.push({ fila, celdas: [] });
      continue;
    }
    let celdas: Celda[];
    if (fila.tipo === "linea") {
      celdas = meses.map((_, i) => {
        const real =
          fila.real.tipo === "clasificaciones" ? aplicarSigno(fila.signo, realPorMes[i].get(fila.clave) ?? 0) : null;
        const presupuestosMes = presupuestoPorMes[i];
        const presupuestado =
          fila.presupuesto.tipo === "categorias" && presupuestosMes
            ? presupuestosMes.get(fila.clave) ?? 0
            : null;
        return completarCelda(presupuestado, real, presupuestoIncompletoDe(fila), realIncompletoDe(fila));
      });
    } else {
      const sumandos = fila.suma.map((clave) => {
        const c = celdasPorClave.get(clave);
        if (!c) throw new Error(`El total "${fila.clave}" suma "${clave}", que no está antes en la plantilla.`);
        return c;
      });
      celdas = meses.map((_, i) => {
        const delMes = sumandos.map((c) => c[i]);
        return completarCelda(
          sumarNoNulos(delMes.map((c) => c.presupuestado)),
          sumarNoNulos(delMes.map((c) => c.real)),
          delMes.some((c) => c.presupuestoIncompleto),
          delMes.some((c) => c.realIncompleto)
        );
      });
    }
    celdasPorClave.set(fila.clave, celdas);
    filas.push({ fila, celdas });
  }

  const pendientes: CodigoPendiente[] = [];
  for (const fila of plantilla.filas) {
    if (fila.tipo === "linea" && fila.pendiente && !pendientes.includes(fila.pendiente)) {
      pendientes.push(fila.pendiente);
    }
  }

  return {
    periodos: meses.map((m) => m.periodo),
    sinPresupuesto: meses.map((m) => m.presupuesto === null),
    filas,
    pendientes,
  };
}

// Se suman solo las filas con valor; sin ninguna con valor, el total es null.
function sumarNoNulos(valores: (number | null)[]): number | null {
  const conValor = valores.filter((v): v is number => v !== null);
  return conValor.length === 0 ? null : conValor.reduce((a, b) => a + b, 0);
}

function completarCelda(
  presupuestado: number | null,
  real: number | null,
  presupuestoIncompleto: boolean,
  realIncompleto: boolean
): Celda {
  return {
    presupuestado,
    real,
    avance: presupuestado === null || real === null || presupuestado === 0 ? null : porcentaje(real, presupuestado),
    faltaEjecutar: presupuestado === null || real === null ? null : presupuestado - real,
    presupuestoIncompleto,
    realIncompleto,
  };
}

// Errores de estructura de una plantilla (vacío = válida). Lo usan los tests de
// las 7 plantillas.
export function validarPlantilla(plantilla: Plantilla): string[] {
  const errores: string[] = [];
  const vistas = new Set<string>();
  const clasificacionEnFila = new Map<string, string>();
  const categoriaEnFila = new Map<string, string>();
  for (const fila of plantilla.filas) {
    if (vistas.has(fila.clave)) errores.push(`Clave repetida: ${fila.clave}`);
    if (fila.tipo === "total") {
      for (const clave of fila.suma) {
        if (!vistas.has(clave)) errores.push(`${fila.clave} suma "${clave}", que no existe antes`);
      }
    }
    vistas.add(fila.clave);
    if (fila.tipo !== "linea") continue;
    if (fila.pendiente && !(fila.pendiente in PENDIENTES)) {
      errores.push(`${fila.clave}: pendiente ${fila.pendiente} fuera del catálogo`);
    }
    if (fila.real.tipo === "clasificaciones") {
      for (const c of fila.real.clasificaciones) {
        const clave = claveEquivalencia(c);
        const otra = clasificacionEnFila.get(clave);
        if (otra) errores.push(`La clasificación ${c} está en ${otra} y en ${fila.clave}`);
        clasificacionEnFila.set(clave, fila.clave);
      }
    }
    if (fila.presupuesto.tipo === "categorias") {
      for (const c of fila.presupuesto.categorias) {
        if (!CATEGORIAS_PRESUPUESTO.has(c)) errores.push(`${fila.clave}: la categoría ${c} no existe en Presupuesto`);
        const clave = claveEquivalencia(c);
        const otra = categoriaEnFila.get(clave);
        if (otra) errores.push(`La categoría ${c} está en ${otra} y en ${fila.clave}`);
        categoriaEnFila.set(clave, fila.clave);
      }
    }
  }
  return errores;
}

// Todas las clasificaciones crudas que pide la plantilla (para la consulta del
// Real y el bloque "No asignado").
export function clasificacionesDePlantilla(plantilla: Plantilla): string[] {
  return plantilla.filas.flatMap((f) =>
    f.tipo === "linea" && f.real.tipo === "clasificaciones" ? f.real.clasificaciones : []
  );
}

// Los N períodos "AAAA-MM" que terminan en `periodo`, del más viejo al más nuevo.
export function periodosHasta(periodo: string, cantidad: number): string[] {
  const [anio, mes] = periodo.split("-").map(Number);
  const periodos: string[] = [];
  for (let i = cantidad - 1; i >= 0; i--) {
    const total = anio * 12 + (mes - 1) - i;
    periodos.push(`${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`);
  }
  return periodos;
}
