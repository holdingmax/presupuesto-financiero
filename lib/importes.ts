// Único lugar donde se interpreta un importe TIPEADO por una persona (formato argentino). Puro: sin
// Prisma ni next/*, lo usan servidor y cliente. parsearImporteArgentino (lib/numero.ts), parsearCuenta
// (lib/reporte/bloqueo.ts), parsearMontoACentavos (lib/prorrateo.ts) y el «Total de referencia» de
// Presupuesto son envoltorios de esto: no hay otra copia de las reglas.
//
// NO es el parser de los extractos de banco (lib/extractos/numero.ts) ni el de las celdas de Excel de la
// carga masiva (lib/importeCelda.ts): esos leen archivos y tienen sus propias reglas.
//
// Reglas (son plata: ante la duda se rechaza con un mensaje claro, nunca se adivina):
// - punto = miles, coma = decimales;
// - el punto cuenta como separador de miles SOLO si lo que sigue son grupos de exactamente 3 dígitos
//   ("1.234", "100.000", "1.234.567"); "100.5", "1.5", "123.45", "12.34.56" se rechazan;
// - la coma admite hasta 2 decimales ("100.000,00", "100000,5", ",5" = 0,50); más de 2 se rechaza
//   ("1234,567", "100,000"), no se redondea en silencio;
// - se ignoran "$" y los espacios;
// - cuentas con "+" y "-" ("321.235,44+17.755,22"): cada término sigue estas mismas reglas.

export type ErrorImporte = { ok: false; error: string };
export type LecturaImporte = { ok: true; centavos: number } | ErrorImporte;
export type LecturaCuenta = { ok: true; centavos: number; nota: string | null } | ErrorImporte;

export const ERROR_MAX_DECIMALES = "Máximo 2 decimales.";
export const ERROR_VACIO = "El importe está vacío.";
export const ERROR_DEMASIADO_GRANDE = "El importe es demasiado grande.";

// Más de 13 dígitos enteros ya no entran en centavos exactos de un double.
const MAX_DIGITOS_ENTEROS = 13;

const ENTERO = /^\d+$/;
// 1-3 dígitos y grupos de exactamente 3 separados por punto.
const MILES = /^\d{1,3}(\.\d{3})+$/;
const ENTERO_O_MILES = /^(\d+|\d{1,3}(\.\d{3})+)$/;

function ambiguo(texto: string): ErrorImporte {
  return {
    ok: false,
    error: `«${texto}» es ambiguo: los puntos son miles en grupos de 3 (1.234) y los decimales van con coma (100,50).`,
  };
}

function invalido(texto: string): ErrorImporte {
  return {
    ok: false,
    error: `«${texto}» no es un importe válido. Ejemplos: 100000, 100.000, 100.000,00, 100000,50.`,
  };
}

function aCentavos(entero: string, decimales: string): LecturaImporte {
  if (entero.length > MAX_DIGITOS_ENTEROS) return { ok: false, error: ERROR_DEMASIADO_GRANDE };
  return { ok: true, centavos: Number(entero) * 100 + Number(decimales.padEnd(2, "0")) };
}

// Un solo importe, sin signo ni cuentas: "100.000,50".
export function leerTermino(texto: string): LecturaImporte {
  const mostrado = texto.trim();
  const t = texto.replace(/[$\s]/g, "");
  if (t === "") return { ok: false, error: ERROR_VACIO };

  const partes = t.split(",");
  if (partes.length > 2) return invalido(mostrado);

  if (partes.length === 2) {
    const [entero, decimales] = partes;
    // La parte entera vacía es válida (",5" = 0,50); si no, dígitos o miles bien formados.
    if (entero !== "" && !ENTERO_O_MILES.test(entero)) {
      return /^[\d.]+$/.test(entero) ? ambiguo(mostrado) : invalido(mostrado);
    }
    if (!ENTERO.test(decimales)) return /^\d+\./.test(decimales) ? ambiguo(mostrado) : invalido(mostrado);
    if (decimales.length > 2) {
      // "100,000" suele ser un cien mil escrito a la inglesa.
      const pareceMiles = decimales.length === 3 && /^[1-9]\d{0,2}$/.test(entero);
      return {
        ok: false,
        error: pareceMiles ? `${ERROR_MAX_DECIMALES} Si es un número con miles, escribilo con punto: 100.000.` : ERROR_MAX_DECIMALES,
      };
    }
    return aCentavos(entero.replace(/\./g, ""), decimales);
  }

  if (ENTERO.test(t) || MILES.test(t)) return aCentavos(t.replace(/\./g, ""), "");
  // "0.00" / "0.0": cero se lee igual con cualquier criterio (no hay nada que adivinar) y ya se aceptaba.
  if (/^0+\.0+$/.test(t)) return aCentavos("0", "");
  if (/^[\d.]+$/.test(t)) return ambiguo(mostrado); // hay puntos que no son miles ("100.5", "12.34.56", ".5", "1.")
  return invalido(mostrado);
}

// Un importe con signo opcional ("-1.000", "+500"): lo que tipea una persona en un solo campo.
export function leerImporte(texto: string): LecturaImporte {
  const limpio = texto.replace(/[$\s]/g, "").replace(/−/g, "-");
  const signo = limpio.startsWith("-") ? -1 : 1;
  const termino = leerTermino(/^[+-]/.test(limpio) ? limpio.slice(1) : limpio);
  if (!termino.ok) return termino;
  return { ok: true, centavos: termino.centavos === 0 ? 0 : signo * termino.centavos };
}

// "1.234,56" o una cuenta como las SM de Macchi: "321.235,44+17.755,22-1.000". Devuelve el resultado
// en centavos y, si era una cuenta, el texto tal cual se tipeó (para `nota`).
export function leerCuenta(texto: string): LecturaCuenta {
  const t = texto.trim().replace(/−/g, "-").replace(/^=/, "");
  if (t === "") return { ok: false, error: ERROR_VACIO };
  const partes = t.split(/([+-])/).map((x) => x.trim());
  let signo = 1;
  let total = 0;
  let terminos = 0;
  let esperaTermino = true;
  for (let i = 0; i < partes.length; i++) {
    const p = partes[i];
    if (p === "+" || p === "-") {
      // Un signo al principio o después de otro signo: modifica el término que sigue.
      if (!esperaTermino && i > 0) {
        signo = p === "-" ? -1 : 1;
        esperaTermino = true;
      } else if (p === "-") signo = -signo;
      continue;
    }
    if (p === "") continue;
    const c = leerTermino(p);
    if (!c.ok) return c;
    total += signo * c.centavos;
    terminos++;
    signo = 1;
    esperaTermino = false;
  }
  // Vacía o con operador al final.
  if (terminos === 0 || esperaTermino) return invalido(t);
  return { ok: true, centavos: total === 0 ? 0 : total, nota: terminos > 1 || /[+-]/.test(t.slice(1)) ? t : null };
}

// Mensaje para mostrar cuando un campo de UN importe no se entiende; null si se entiende o está vacío
// (el vacío lo trata cada pantalla a su manera).
export function mensajeDeImporte(texto: string): string | null {
  if (texto.replace(/[$\s]/g, "") === "") return null;
  const r = leerImporte(texto);
  return r.ok ? null : r.error;
}
