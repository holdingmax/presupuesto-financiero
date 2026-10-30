import { normalizarTexto } from "@/lib/texto";
import { claveEquivalencia, type Fila, type FilaLinea, type FilaTotal, type Plantilla } from "@/lib/reporte/motor";
import { PRESUPUESTO_MANUAL, REAL_MANUAL } from "@/lib/reporte/plantillas/filas";

// Filas extra del Reporte: las que agrega ADMIN/FINANZAS a UNA empresa mientras revisa lo que cargaron los
// gerentes. Puro: sin Prisma ni next/* (el resolver que lee la base está en plantillaConExtras.ts).
//
// Una fila extra es siempre manual (Presupuestado y Real tipeados, en ValorManualReporte con
// filaClave = "extra." + id) y suma en el total de su bloque. Las plantillas siguen siendo archivos .ts:
// conFilasExtra arma, en memoria, una plantilla nueva con las filas insertadas. Las acciones del gerente
// (carga del Presupuestado) NO usan esa plantilla: con ella, esFilaManualEditable (cargaGerente.ts) le
// abriría la celda de Presupuestado de la fila nueva.

export type BloqueExtra = "INGRESOS" | "EGRESOS" | "ABAJO";

export const BLOQUES_EXTRA: readonly BloqueExtra[] = ["INGRESOS", "EGRESOS", "ABAJO"];

export type FilaExtra = {
  id: string;
  bloque: BloqueExtra;
  // Ya normalizado (normalizarNombreFila).
  nombre: string;
  desdePeriodo: string;
  // Inclusive; null = sin fin.
  hastaPeriodo: string | null;
};

export const PREFIJO_CLAVE_EXTRA = "extra.";

export function claveDeFilaExtra(id: string): string {
  return `${PREFIJO_CLAVE_EXTRA}${id}`;
}

export function esClaveDeFilaExtra(clave: string): boolean {
  return clave.startsWith(PREFIJO_CLAVE_EXTRA);
}

// ---------------------------------------------------------------------------------------------
// Nombres
// ---------------------------------------------------------------------------------------------

export const LARGO_MIN_NOMBRE = 3;
export const LARGO_MAX_NOMBRE = 80;

// Nombres que no dicen nada: "Otros" sin explicación no le sirve a nadie (mismo criterio que la
// aclaración obligatoria de Presupuesto). Se comparan sin tildes, sin mayúsculas y sin puntuación.
const NOMBRES_GENERICOS: ReadonlySet<string> = new Set(["OTRO", "OTROS", "VARIOS"]);

// Mayúsculas, sin espacios de más (los internos se colapsan a uno).
export function normalizarNombreFila(texto: string): string {
  return texto.trim().replace(/\s+/g, " ").toLocaleUpperCase("es-AR");
}

// Clave para comparar nombres: sin tildes, mayúsculas, espacios colapsados (lib/texto.ts).
export function claveDeNombreFila(nombre: string): string {
  return normalizarTexto(nombre);
}

export type NombreFilaValido = { ok: true; nombre: string; nombreClave: string } | { ok: false; error: string };

// `plantilla`: la ESTÁTICA de la empresa. `extras`: todas las filas extra de la empresa, también las que
// ya no se muestran (la base no admite dos con el mismo nombre).
//
// Se rechaza un nombre solo si YA EXISTE UNA FILA con esa clave en la empresa (de la plantilla o extra).
// NO se rechaza por coincidir con una categoría de Presupuesto que no tiene fila: «Préstamo Cocos»,
// «Pagos especiales» son justo los casos que se necesitan agregar.
export function validarNombreFila(
  texto: unknown,
  plantilla: Plantilla,
  extras: readonly { nombre: string }[]
): NombreFilaValido {
  if (typeof texto !== "string") return { ok: false, error: "El nombre de la fila es obligatorio." };
  const nombre = normalizarNombreFila(texto);
  if (nombre === "") return { ok: false, error: "El nombre de la fila es obligatorio." };
  if (nombre.length < LARGO_MIN_NOMBRE) {
    return { ok: false, error: `El nombre tiene que tener al menos ${LARGO_MIN_NOMBRE} caracteres.` };
  }
  if (nombre.length > LARGO_MAX_NOMBRE) {
    return { ok: false, error: `El nombre es demasiado largo (máximo ${LARGO_MAX_NOMBRE} caracteres).` };
  }
  if (/[\u0000-\u001f\u007f]/.test(nombre)) return { ok: false, error: "El nombre tiene caracteres que no se admiten." };
  // Un nombre que empieza así se lee como fórmula si algún día se exporta a una planilla.
  if (/^[=+\-@]/.test(nombre)) return { ok: false, error: "El nombre no puede empezar con =, +, - ni @." };

  const nombreClave = claveDeNombreFila(nombre);
  if (NOMBRES_GENERICOS.has(nombreClave.replace(/[^A-Z0-9 ]/g, "").trim())) {
    return { ok: false, error: `«${nombre}» no alcanza: poné qué es (por ejemplo «PRÉSTAMO COCOS»).` };
  }

  const equivalencia = claveEquivalencia(nombre);
  for (const fila of plantilla.filas) {
    if (claveDeNombreFila(fila.texto) === nombreClave || claveEquivalencia(fila.texto) === equivalencia) {
      return { ok: false, error: `Ya existe una fila «${fila.texto.trim()}» en esta empresa.` };
    }
  }
  for (const extra of extras) {
    if (claveDeNombreFila(extra.nombre) === nombreClave) {
      return { ok: false, error: `Ya existe una fila «${extra.nombre}» en esta empresa.` };
    }
  }
  return { ok: true, nombre, nombreClave };
}

// ---------------------------------------------------------------------------------------------
// Qué filas se ven en un mes y cómo entran en la plantilla
// ---------------------------------------------------------------------------------------------

// Se ve desde el mes de creación en adelante, no en los anteriores; y hasta `hastaPeriodo` si lo tiene.
export function extrasVisibles(extras: readonly FilaExtra[], periodo: string): FilaExtra[] {
  return extras.filter((e) => e.desdePeriodo <= periodo && (e.hastaPeriodo === null || periodo <= e.hastaPeriodo));
}

// El total en el que suma cada bloque (rol de la plantilla).
const ROL_DE_BLOQUE = {
  INGRESOS: "totalIngresos",
  EGRESOS: "totalEgresosOperativos",
  ABAJO: "totalEgresos",
} as const satisfies Record<BloqueExtra, NonNullable<FilaTotal["rol"]>>;

// Al revés: a qué bloque de filas extra cierra un total (null = no es uno de los tres).
export function bloqueDeRolTotal(rol: FilaTotal["rol"]): BloqueExtra | null {
  return BLOQUES_EXTRA.find((b) => ROL_DE_BLOQUE[b] === rol) ?? null;
}

// "extra.<id>" → <id>.
export function idDeClaveExtra(clave: string): string {
  return clave.slice(PREFIJO_CLAVE_EXTRA.length);
}

function filaDeExtra(extra: FilaExtra): FilaLinea {
  return {
    clave: claveDeFilaExtra(extra.id),
    bloque: extra.bloque,
    tipo: "linea",
    texto: extra.nombre,
    // Ingresos +1; egresos y «de abajo» −1. Un valor manual se guarda tal como se muestra: un negativo en
    // egresos los baja (como «Recupero Gastos»).
    signo: extra.bloque === "INGRESOS" ? 1 : -1,
    real: REAL_MANUAL,
    presupuesto: PRESUPUESTO_MANUAL,
    extra: true,
  };
}

// Plantilla de la empresa más sus filas extra: cada una va al final de su bloque, justo antes del total, y
// el total la suma. Sin extras devuelve LA MISMA plantilla (misma referencia): con la tabla vacía no hay
// ninguna diferencia. Si la plantilla no marca el total del bloque (rol), falla fuerte: nunca suma a medias.
export function conFilasExtra(plantilla: Plantilla, extras: readonly FilaExtra[]): Plantilla {
  if (extras.length === 0) return plantilla;
  const existentes = new Set(plantilla.filas.map((f) => f.clave));
  const porRol = new Map<NonNullable<FilaTotal["rol"]>, FilaLinea[]>();
  for (const extra of extras) {
    const fila = filaDeExtra(extra);
    if (existentes.has(fila.clave)) throw new Error(`La fila extra ${fila.clave} está repetida.`);
    existentes.add(fila.clave);
    const rol = ROL_DE_BLOQUE[extra.bloque];
    porRol.set(rol, [...(porRol.get(rol) ?? []), fila]);
  }
  const roles = new Set(plantilla.filas.flatMap((f) => (f.tipo === "total" && f.rol ? [f.rol] : [])));
  for (const rol of porRol.keys()) {
    if (!roles.has(rol)) {
      throw new Error(`La plantilla de ${plantilla.empresa} no admite filas extra: falta el total con rol «${rol}».`);
    }
  }
  const filas: Fila[] = [];
  for (const fila of plantilla.filas) {
    if (fila.tipo === "total" && fila.rol) {
      const nuevas = porRol.get(fila.rol);
      if (nuevas) {
        filas.push(...nuevas, { ...fila, suma: [...fila.suma, ...nuevas.map((n) => n.clave)] });
        continue;
      }
    }
    filas.push(fila);
  }
  return { ...plantilla, filas };
}

// ¿La plantilla tiene los tres totales marcados? (Lo controla un test para las empresas del interruptor.)
export function admiteFilasExtra(plantilla: Plantilla): boolean {
  const roles = new Set(plantilla.filas.flatMap((f) => (f.tipo === "total" && f.rol ? [f.rol] : [])));
  return BLOQUES_EXTRA.every((b) => roles.has(ROL_DE_BLOQUE[b]));
}
