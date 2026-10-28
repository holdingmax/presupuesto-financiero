import { normalizarTexto } from "@/lib/texto";
import {
  CLASIFICACIONES_PRESUPUESTO_EGRESO,
  CLASIFICACIONES_PRESUPUESTO_INGRESO,
} from "@/app/[empresa]/[periodo]/presupuesto/clasificacionesPresupuesto";

// Totales de la barra de Presupuesto: SUMA SIMPLE de las líneas guardadas del mes, por tipo.
// No usa el motor del Reporte ni las plantillas (funciona igual para toda empresa). El tipo se
// deduce SOLO del valor guardado de `clasificacion` (LineaPresupuesto no guarda el tipo; el
// toggle Ingreso/Egreso del formulario es informativo y no se persiste):
//   - solo en la lista de ingresos → ingreso; solo en la de egresos → egreso;
//   - Préstamo MS / Préstamo Cocos están en las dos listas: no son ni ingreso ni egreso acá,
//     se informan aparte (y "PRESTAMOS MS", alias confirmado de lib/rubros.ts);
//   - cualquier otra cosa (vacía o fuera de lista) va a "sinClasificar", sin asignarle tipo.
// La comparación ignora mayúsculas, tildes y espacios (normalizarTexto). Todo en centavos
// enteros; los importes negativos se suman con su signo.

export type LineaParaTotales = { clasificacion: string; importe: number };

export type TotalesPresupuesto = {
  ingresos: number;
  egresos: number;
  // ingresos − egresos
  diferencia: number;
  prestamos: { centavos: number; lineas: number };
  sinClasificar: { centavos: number; lineas: number };
};

const clavesDe = (opciones: { valorPersistido: string }[]) =>
  new Set(opciones.map((o) => normalizarTexto(o.valorPersistido)));

const INGRESO = clavesDe(CLASIFICACIONES_PRESUPUESTO_INGRESO);
const EGRESO = clavesDe(CLASIFICACIONES_PRESUPUESTO_EGRESO);
const PRESTAMOS = new Set(["Préstamo MS", "Préstamo Cocos", "PRESTAMOS MS"].map(normalizarTexto));

export function calcularTotalesPresupuesto(lineas: readonly LineaParaTotales[]): TotalesPresupuesto {
  let ingresos = 0;
  let egresos = 0;
  const prestamos = { centavos: 0, lineas: 0 };
  const sinClasificar = { centavos: 0, lineas: 0 };
  for (const l of lineas) {
    const centavos = Math.round(l.importe * 100);
    const clave = normalizarTexto(l.clasificacion);
    if (PRESTAMOS.has(clave)) {
      prestamos.centavos += centavos;
      prestamos.lineas++;
    } else if (INGRESO.has(clave) && !EGRESO.has(clave)) {
      ingresos += centavos;
    } else if (EGRESO.has(clave) && !INGRESO.has(clave)) {
      egresos += centavos;
    } else {
      sinClasificar.centavos += centavos;
      sinClasificar.lineas++;
    }
  }
  return { ingresos, egresos, diferencia: ingresos - egresos, prestamos, sinClasificar };
}
