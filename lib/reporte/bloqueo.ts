import type { Bloque } from "@/lib/reporte/motor";

// Regla de bloqueo de los valores manuales del Reporte (lo cerrado no se modifica para
// atrás), docs/reporte_etapa2b_plan.md §10. Pura, sin Prisma. Sin desbloqueo por ADMIN:
// la corrección se carga en el período siguiente.

export type EstadoSemanas = { abiertas: number; cerradas: number };

// "AAAA-MM" de hoy en hora de Argentina.
export function periodoActual(ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(ahora);
  const valor = (t: string) => partes.find((p) => p.type === t)!.value;
  return `${valor("year")}-${valor("month")}`;
}

// Mes cerrado: ya pasó y la empresa no tiene ninguna semana ABIERTA. Es el criterio de
// las filas con R = P (espejos, reservas) y del bloqueo del R manual de flujo.
export function esMesCerrado(periodo: string, actual: string, semanas: EstadoSemanas): boolean {
  return periodo < actual && semanas.abiertas === 0;
}

export type EntradaBloqueo = {
  periodo: string;
  actual: string;
  columna: "PRESUPUESTADO" | "REAL";
  bloque: Bloque;
  // El PresupuestoMensual de la empresa y el mes está VALIDADO (sin presupuesto = false).
  presupuestoValidado: boolean;
  semanas: EstadoSemanas;
};

// null = editable; si no, el motivo para mostrar.
export function motivoBloqueo(e: EntradaBloqueo): string | null {
  if (e.columna === "PRESUPUESTADO") {
    return e.presupuestoValidado ? "El presupuesto del mes está validado." : null;
  }
  const pasado = e.periodo < e.actual;
  if (e.bloque === "DISPONIBILIDADES") {
    return pasado && e.semanas.cerradas >= 1 ? "El mes ya pasó y tiene semanas cerradas." : null;
  }
  return pasado && e.semanas.abiertas === 0 ? "El mes ya pasó y no tiene semanas abiertas." : null;
}

// Un período bloqueado admite la PRIMERA carga (crear un valor que no existe); lo que no admite
// es modificar ni borrar un valor ya cargado. `motivo` es el de motivoBloqueo. null = permitido.
export function motivoRechazoCambio(motivo: string | null, existia: boolean): string | null {
  return motivo !== null && existia ? motivo : null;
}

export const AVISO_UNA_VEZ = "Período cerrado: solo se puede cargar una vez";

function terminoACentavos(texto: string): number | null {
  const limpio = texto.replace(/[$\s]/g, "");
  if (!/^\d[\d.]*(,\d+)?$/.test(limpio) && !/^\d+(\.\d+)?$/.test(limpio)) return null;
  // Con coma: la coma es el decimal y los puntos son miles. Sin coma, el punto es miles
  // (importes en pesos enteros), salvo "123.45" (un solo punto y 1–2 decimales).
  let normal: string;
  if (limpio.includes(",")) normal = limpio.replace(/\./g, "").replace(",", ".");
  else if (/^\d+\.\d{1,2}$/.test(limpio)) normal = limpio;
  else normal = limpio.replace(/\./g, "");
  const n = Number(normal);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

// "1.234,56" o una cuenta como las SM de Macchi: "321.235,44+17.755,22-1.000". Devuelve el
// resultado en centavos y, si era una cuenta, el texto tal cual se tipeó (para `nota`).
export function parsearCuenta(texto: string): { centavos: number; nota: string | null } | null {
  const t = texto.trim().replace(/−/g, "-").replace(/^=/, "");
  if (t === "") return null;
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
    const c = terminoACentavos(p);
    if (c === null) return null;
    total += signo * c;
    terminos++;
    signo = 1;
    esperaTermino = false;
  }
  if (terminos === 0 || esperaTermino) return null; // vacía o con operador al final
  return { centavos: total === 0 ? 0 : total, nota: terminos > 1 || /[+-]/.test(t.slice(1)) ? t : null };
}

// Centavos → "1.234,56" (coma decimal, puntos de miles); con "-" si es negativo.
export function formatearCentavos(centavos: number): string {
  const pesos = (Math.abs(centavos) / 100).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return centavos < 0 ? `-${pesos}` : pesos;
}

// Filas de Ingresos que reflejan un componente de Disponibilidades en el mes de pago:
// la pantalla de carga ofrece "usar −reserva de Disponibilidades" (no se guarda sola).
export const SUGERENCIA_ESPEJO: Record<string, string> = {
  "cx.reservaAguinaldo": "cx.dReservaAguinaldo",
  "br.reservaSac": "br.dReservaAguinaldo",
  "br.reservaIvaAvianor": "br.dReservaIvaAvianor",
  "fr.reservaAguinaldo": "fr.dReservaAguinaldo",
  "fr.reservaCapitalTrabajo": "fr.dReservaCapitalTrabajo",
  "hv.reservaAguinaldo": "hv.dReservaAguinaldo",
  "ra.reservaAguinaldo": "ra.dReservaAguinaldo",
  "hw.reservaSac": "hw.dPrevisionSac",
};
