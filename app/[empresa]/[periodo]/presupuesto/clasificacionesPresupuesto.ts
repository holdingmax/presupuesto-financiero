// Lista propia y cerrada de Clasificación para Presupuesto, confirmada por
// Kike (2026-09-25) — separada a propósito de CLASIFICACIONES_SUGERIDAS
// (lib/clasificaciones.ts), que es la lista compartida con Ejecución.
// Alcance explícito: Presupuesto no debe mezclarse con lo que aparezca
// suelto en MovimientoBancario, así que esta lista es fija, no consulta la
// base (a diferencia de calcularClasificacionesDisponibles).
//
// Cada opción separa el texto que ve el gerente/revisor (textoVisible, el
// nombre completo que dio Kike, nunca abreviado) del valor que se persiste
// (valorPersistido). Regla de mapeo: cuando el concepto ya tiene un valor
// técnico existente en el sistema (el mismo que usan Ejecución/líneas viejas
// de Presupuesto/el reporte "PRESUPUESTO MES A MES"), valorPersistido
// reutiliza ESE string exacto — así una carga nueva sigue sumando junto con
// datos históricos en vez de fragmentar el rubro en dos strings distintos.
// Para conceptos sin ningún equivalente confirmado hoy, valorPersistido es
// el nombre completo tal cual (no hay nada que preservar).
//
// Dos mapeos NO son 100% seguros y quedan marcados como decisión propia,
// pendiente de que Kike la confirme (mismo criterio que ya usa este archivo
// hermano en lib/clasificaciones.ts: no fusionar por adivinanza):
// - "SAC": en el resto del sistema (NOMBRES_PRESENTACION_CLASIFICACION) el
//   valor técnico "SAC" se muestra como "Aguinaldo" — pero Kike dio "SAC"
//   como el nombre completo para ESTA lista puntual, así que se lo dejó tal
//   cual dijo, sin "corregirlo" a "Aguinaldo".
// - "Intereses FCI" (Ingreso): NO se fusionó con el valor técnico existente
//   "FCI" (que en Ejecución representa "Fondos comunes de inversión", un
//   concepto que hoy aparece del lado de Egreso/Inversiones) — son
//   conceptualmente distintos (interés cobrado vs. el movimiento del fondo
//   en sí) y no hay confirmación explícita de que deban compartir el mismo
//   valor técnico. Se persiste como concepto nuevo, "Intereses FCI".
export type OpcionClasificacionPresupuesto = {
  textoVisible: string;
  valorPersistido: string;
};

export const CLASIFICACIONES_PRESUPUESTO_INGRESO: OpcionClasificacionPresupuesto[] = [
  { textoVisible: "Cobranzas", valorPersistido: "COBRANZAS" },
  { textoVisible: "Intereses FCI", valorPersistido: "Intereses FCI" },
  { textoVisible: "Préstamo Cocos", valorPersistido: "Préstamo Cocos" },
  { textoVisible: "Préstamo MS", valorPersistido: "Préstamo MS" },
];

export const CLASIFICACIONES_PRESUPUESTO_EGRESO: OpcionClasificacionPresupuesto[] = [
  { textoVisible: "Cheque diferido", valorPersistido: "CHEQUES DIFERIDOS" },
  { textoVisible: "Comisiones especiales", valorPersistido: "COMISIONES ESPECIALES" },
  { textoVisible: "Dividendos", valorPersistido: "Dividendos" },
  { textoVisible: "Expensas", valorPersistido: "EXPENSAS" },
  { textoVisible: "Gastos bancarios", valorPersistido: "Gastos bancarios" },
  { textoVisible: "Impuestos y previsionales", valorPersistido: "IMP Y PREVISIONALES" },
  { textoVisible: "Inversiones", valorPersistido: "INVERSIONES" },
  { textoVisible: "IVA", valorPersistido: "IVA" },
  { textoVisible: "Juicios", valorPersistido: "Juicios" },
  { textoVisible: "Liquidación final", valorPersistido: "Liquidación final" },
  { textoVisible: "Otros", valorPersistido: "OTROS" },
  { textoVisible: "Pagos especiales", valorPersistido: "PAGOS ESPECIALES" },
  {
    textoVisible: "Préstamos bancarios y tarjetas de crédito",
    valorPersistido: "Prestamos y tarjetas",
  },
  { textoVisible: "Préstamo Cocos", valorPersistido: "Préstamo Cocos" },
  { textoVisible: "Préstamo MS", valorPersistido: "Préstamo MS" },
  { textoVisible: "Proveedores", valorPersistido: "PROV Y SERV" },
  { textoVisible: "SAC", valorPersistido: "SAC" },
  { textoVisible: "Sueldos", valorPersistido: "SUELDOS" },
];

// Para EditarLineaPanel.tsx: ese panel no tiene toggle Ingreso/Egreso, así
// que muestra las 22 opciones combinadas sin filtrar (pedido explícito).
export const CLASIFICACIONES_PRESUPUESTO_TODAS: OpcionClasificacionPresupuesto[] = [
  ...CLASIFICACIONES_PRESUPUESTO_INGRESO,
  ...CLASIFICACIONES_PRESUPUESTO_EGRESO,
];

// Leyendas de ayuda para Clasificación, confirmadas por Kike (2026-09-26) —
// mismo criterio que NOMBRES_PRESENTACION_CLASIFICACION en
// lib/clasificaciones.ts: solo entran acá los casos confirmados, nunca una
// traducción/explicación inventada. Indexado por valorPersistido (no por
// textoVisible) — así "Préstamo Cocos"/"Préstamo MS", que aparecen
// duplicados como objeto completo en Ingreso y en Egreso, comparten una sola
// entrada acá en vez de tener que repetirse.
//
// Sin entrada a propósito, pendientes de confirmar con Kike: "Préstamo
// Cocos", "Préstamo MS" y "Sueldos" — esta última en particular es
// deliberada (parece obvia, pero no hay que asumir que no necesita
// explicación sin que él lo confirme).
const AYUDA_CLASIFICACION_PRESUPUESTO: Record<string, string> = {
  "CHEQUES DIFERIDOS":
    "Cheques emitidos un mes que todavía no fueron cobrados y pueden ingresar el mes siguiente.",
  "COMISIONES ESPECIALES":
    "Cuando se contabiliza un mayor especial — tratamiento manual, no automatizado.",
  "IVA":
    "Operaciones para hacerse de efectivo, mandando cheques a la financiera a cambio de efectivo con un costo.",
  "OTROS": "Reintegros de obra social y fondo fijo (específico de Fredy Publicidad).",
  "PAGOS ESPECIALES": "Personas que prestan su nombre/CUIT y cobran por eso.",
  "INVERSIONES": "Gastos cuando el negocio compra maquinaria o abre un nuevo local.",
  "SAC": "Sueldo Anual Complementario (aguinaldo) — pago obligatorio de ley en junio y diciembre.",
  "Dividendos": "Parte de las ganancias que la empresa reparte entre sus dueños/socios.",
  "Juicios": "Pagos relacionados con demandas o procesos judiciales en curso.",
  "Intereses FCI": "Intereses generados por dinero colocado en un Fondo Común de Inversión.",
  "Prestamos y tarjetas":
    "Pago de cuotas o intereses de préstamos bancarios o tarjetas de crédito.",
  "EXPENSAS": "Gastos de mantenimiento de un edificio u oficina.",
  "Gastos bancarios": "Comisiones que cobra el banco por mantener cuentas y hacer operaciones.",
  "IMP Y PREVISIONALES":
    "Pago de impuestos y aportes obligatorios (como los de seguridad social).",
  "Liquidación final": "Pago que se hace a un empleado cuando deja la empresa.",
  "PROV Y SERV": "Pagos a quienes venden productos o servicios al negocio.",
  "COBRANZAS": "Dinero que entra por cobrar ventas o servicios a los clientes.",
};

// null cuando no hay leyenda confirmada — el llamador tiene que ocultar el
// elemento, no mostrar un texto genérico ni inventado.
export function obtenerAyudaClasificacion(valorPersistido: string): string | null {
  return AYUDA_CLASIFICACION_PRESUPUESTO[valorPersistido] ?? null;
}
