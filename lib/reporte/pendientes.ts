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
  K9: "Arrastre: ¿Efectivo es el número que cuadra las Disponibilidades con el cierre del mes anterior? ¿Es correcta la lista de componentes de ajuste (Comisiones pendientes, Cheques después del 10 / 15)? Filas espejo (cheques después del 10 / 15, acreditación de tarjetas, reservas): se muestra R vacío mientras el mes está en curso y R = P cuando cierra, ¿es así?",
  K10: "Reserva aguinaldo: ¿cómo se calcula? ¿Por qué en jun-26 se resta en Disponibilidades sin espejo en Ingresos (o solo en P / solo en R)?",
  K11: "Capital de trabajo: ¿qué son los 31M de Brillante, Inversiones entera o ÷3 en Havanna, de dónde sale el de Mantenor? ¿Regla fija o carga a mano?",
  K12: "Disponible: en Brillante va a Reembolsos o a Dividendos según el mes. ¿Quién decide la fila?",
  K13: "Préstamo MS: ¿la entrada se clasifica PRESTAMOS MS en la Ejecución? En Conexión la devolución está dentro de los egresos operativos: ¿es a propósito?",
  K14: "Rangos de suma: el total de Disponibilidades de Brillante (ago) no suma Recupero aporte blanqueo y el de HWC (jul) no sumaba Previsión SAC ni Pago LATAM; Mantenor jul y ago R sin fórmulas. ¿Errores o a propósito?",
} as const;

// Los códigos que dejan INCOMPLETO el Real de una fila sin fuente (falta saber de
// dónde sale el número). El resto (K8–K14) son preguntas de presupuesto, de
// arrastre o de cierre: no vacían el Real.
export const PENDIENTES_DE_REAL: readonly CodigoPendiente[] = ["K1", "K2", "K3", "K4", "K5", "K6", "K7"];

export type CodigoPendiente = keyof typeof PENDIENTES;
