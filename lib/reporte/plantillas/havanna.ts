import type { Plantilla } from "@/lib/reporte/motor";
import { abajo, cat, clasif, egreso, ESPEJO_2B, ingreso, MANUAL_2B, SIN_PRESUPUESTO, SIN_REAL, titulo, total } from "./filas";

// "PF - HAVANNA - AGOSTO 2026", hoja PRESUPUESTO MES A MES (diagnóstico §2.4).
// Unidad de negocio: HAVANNA (razones sociales PANINI + TUCSON).

const ingresos = [
  ingreso("hv.cobranzaBancos", "Cobranza Bancos Ingreso Neto", clasif("COBRANZAS"), cat("COBRANZAS"), {
    pendiente: "K4",
    parcial: true,
    nota: "Hasta resolver K4 lleva toda la cobranza de la unidad. Planilla: cobranza bancaria + comisiones y tarjetas a cobrar.",
  }),
  ingreso("hv.cobranzasLocales", "Cobranzas locales", SIN_REAL, SIN_PRESUPUESTO, {
    pendiente: "K4",
    nota: "Planilla: efectivo de los locales + sueldos y gastos pagados en los locales.",
  }),
  ingreso("hv.acreditacionTarjetas", "Acreditacion Tarjetas pendientes", ESPEJO_2B, SIN_PRESUPUESTO, {
    nota: "Espejo de la fila Otro tarjeta no ingresada del mes anterior.",
  }),
  ingreso("hv.resultadoFci", "Resultado FCI", MANUAL_2B, cat("Intereses FCI")),
  ingreso("hv.reservaAguinaldo", "Reserva Aguinaldo", ESPEJO_2B, SIN_PRESUPUESTO, {
    nota: "Espejo de RESERVA AGUINALDO de Disponibilidades.",
  }),
  ingreso("hv.prestamo", "Préstamo", SIN_REAL, SIN_PRESUPUESTO, { pendiente: "K8" }),
  ingreso("hv.prestamoMs", "Préstamo MS ", SIN_REAL, SIN_PRESUPUESTO, { pendiente: "K8" }),
  ingreso("hv.tarjetaNoIngresada", "Otro tarjeta no ingresada", MANUAL_2B, SIN_PRESUPUESTO),
  ingreso("hv.otrosIngresos", "Otros Ingresos", clasif("IVA"), SIN_PRESUPUESTO, {
    nota: "Jul-26: la planilla pone acá el IVA neto (+29.885).",
  }),
  ingreso("hv.recuperoGastosMs", "Recupero Gastos MS ", SIN_REAL, SIN_PRESUPUESTO),
];

const egresos = [
  egreso("hv.chequesDiferidos", "Cheques diferidos", clasif("CHEQUES DIFERIDOS"), cat("CHEQUES DIFERIDOS")),
  egreso("hv.sueldos", "Sueldos", clasif("SUELDOS"), cat("SUELDOS"), {
    parcial: true,
    nota: "Planilla: SUELDOS de la unidad + sueldos pagados en efectivo en los locales (DATOS ADICIONALES).",
  }),
  egreso("hv.sacVacaciones", "SAC Y VACACIONES", clasif("SAC"), cat("SAC")),
  egreso("hv.prestamos", "Prestamos", clasif("PREST BRIOS Y TC"), cat("Prestamos y tarjetas"), {
    nota: "Jul-26: la planilla suma PREST BRIOS Y TC dentro de Proveedores (GASTOS TARJETAS).",
  }),
  egreso("hv.tarjetasComisiones", "Tarjetas y Comisiones", MANUAL_2B, SIN_PRESUPUESTO, {
    nota: "Liquidación de tarjetas PANINI + TUCSON (DATOS ADICIONALES).",
  }),
  egreso("hv.inversiones", "Inversiones", clasif("INVERSIONES"), cat("INVERSIONES")),
  egreso("hv.impuestos", "Impuestos", clasif("IMP Y PREVISIONALES"), cat("IMP Y PREVISIONALES")),
  egreso("hv.expensas", "Expensas", SIN_REAL, cat("EXPENSAS"), {
    pendiente: "K2",
    nota: "Planilla: reparto de la unidad EXPENSAS.",
  }),
  egreso("hv.impuestoAlCheque", "Impuesto al cheque", clasif("COM Y GTOS BRIOS"), cat("Gastos bancarios")),
  egreso("hv.compraIva", "Compra IVA", SIN_REAL, cat("IVA")),
  egreso("hv.proveedores", "Proveedores", clasif("PROV Y SERV"), cat("PROV Y SERV"), {
    parcial: true,
    nota: "Planilla: PROV Y SERV + GASTOS TARJETAS + GASTOS VS BARES (tipeado).",
  }),
  egreso("hv.juicios", "Juicios", clasif("JUICIOS"), cat("Juicios"), {
    nota: "Jul-26: la planilla pone JUICIOS en la fila Liq Final; acá va en su fila.",
  }),
  egreso("hv.liqFinal", "Liq Final", clasif("LIQ FINAL"), cat("Liquidación final")),
];

const deAbajo = [
  abajo("hv.devolucionExpensas", "Devolucion prestamo - Deuda expensas", SIN_REAL, SIN_PRESUPUESTO),
  abajo("hv.devolucionPrestamoMs", "Devolucion prestamo - Prestamo MS", clasif("PRESTAMOS MS"), cat("Préstamo MS")),
  abajo("hv.dividendos", "Dividendos", clasif("DIVIDENDOS"), cat("Dividendos")),
  abajo("hv.cuentaParticularMs", "Cuenta Particular MS -  Aporte liquidacion Mundo Cell", SIN_REAL, SIN_PRESUPUESTO),
  abajo("hv.ajusteCaja", "Ajuste Caja - A conciliar", SIN_REAL, SIN_PRESUPUESTO),
  abajo("hv.pagosMs", "Pagos solicitados MS", clasif("MS"), SIN_PRESUPUESTO),
  abajo("hv.retirosMs", "Retiros MS", SIN_REAL, SIN_PRESUPUESTO),
];

export const PLANTILLA_HAVANNA: Plantilla = {
  empresa: "Havanna",
  filas: [
    titulo("hv.tituloIngresos", "INGRESOS", "INGRESOS"),
    ...ingresos,
    total("hv.totalIngresos", "INGRESOS", "TOTAL INGRESOS", ingresos.map((f) => f.clave)),
    titulo("hv.tituloEgresos", "EGRESOS", "EGRESOS"),
    ...egresos,
    total("hv.totalEgresosOperativos", "EGRESOS", "TOTAL EGRESOS OPERATIVOS", egresos.map((f) => f.clave)),
    ...deAbajo,
    total("hv.totalEgresos", "ABAJO", "TOTAL EGRESOS", ["hv.totalEgresosOperativos", ...deAbajo.map((f) => f.clave)]),
  ],
};
