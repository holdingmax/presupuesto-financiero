// Preguntas abiertas que bloquean filas del Reporte por plantilla (Etapa 2a,
// docs/reporte_etapa2a_plan.md §1.1). Cada código es la etiqueta que se ve junto
// a la fila — SOLO para ADMIN y FINANZAS: el resto de los roles ve el reporte
// limpio, sin códigos ni referencias a quién tiene que responder.
// Texto corto: es el tooltip de la etiqueta y el renglón de la lista de abajo.
export const PENDIENTES = {
  K1: "Repartos sin unidad: sueldos, SAC, F931 y tarjetas sin unidad de negocio, ¿se reparten en Ejecución con el prorrateo? ¿Los % del F931 son fijos?",
  K2: "Expensas: ¿cómo se reparte la unidad EXPENSAS entre las empresas?",
  K3: "IVA: ¿de qué clasificación salen las filas de IVA? No cierran contra IVA ni contra CH DIFERIDOS IVA.",
  K4: "Cobranzas: ¿alcanza con COBRANZAS de la unidad? ¿Con qué criterio se separan bancos/locales (Havanna) y Jujuy/MSNT (Mantenor)?",
  K5: "Fredy: ¿qué extractos o razones sociales entran en la cobranza y los sueldos?",
  K6: "Handy: ¿se carga el extracto de HWC? Sueldos, recaudaciones y pagos a aerolíneas, ¿de dónde salen?",
  K7: "Brillante / Gold: ¿se crea una unidad GOLD para separar las cobranzas de Gold Seguridad (fila GOLD SALTA)?",
  K8: "Categorías de presupuesto: Otras operaciones, pagos a aerolíneas y préstamo como ingreso, ¿se agregan categorías o se cargan a mano?",
} as const;

export type CodigoPendiente = keyof typeof PENDIENTES;
