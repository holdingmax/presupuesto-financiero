import type { Plantilla } from "@/lib/reporte/motor";
import { abajo, cat, clasif, egreso, ESPEJO_2B, ingreso, MANUAL_2B, SIN_PRESUPUESTO, SIN_REAL, titulo, total } from "./filas";

// "PF - FREDY - AGOSTO 2026", hoja PRESUPUESTO MES A MES (diagnóstico §2.2).
// Unidad de negocio: FREDY. Ojo: la planilla toma el Real del extracto propio de
// Fredy; en la app, cobranza y sueldos dependen de K5.

const ingresos = [
  ingreso("fr.cobranza", "Cobranza clientes", clasif("COBRANZAS"), cat("COBRANZAS"), {
    pendiente: "K5",
    parcial: true,
    nota: "Jul-26: 209,8M en la planilla contra 43,2M de COBRANZAS de la unidad FREDY en la Ejecución consolidada.",
  }),
  ingreso("fr.otrasOperaciones", "Otras operaciones (APORTES)", SIN_REAL, SIN_PRESUPUESTO, { pendiente: "K8" }),
  ingreso("fr.resultadoFci", "Resultado FCI", MANUAL_2B, cat("Intereses FCI")),
  ingreso("fr.reservaAguinaldo", "Reserva Aguinaldo", ESPEJO_2B, SIN_PRESUPUESTO, {
    nota: "Espejo de RESERVA AGUINALDO de Disponibilidades.",
  }),
  ingreso("fr.reservaCapitalTrabajo", "Reserva Capital de Trabajo", ESPEJO_2B, SIN_PRESUPUESTO, {
    nota: "Espejo de RESERVA CAPITAL DE TRABAJO de Disponibilidades.",
  }),
  ingreso("fr.aporteBlanqueo", "Aporte para blaqueo otras empresas", SIN_REAL, SIN_PRESUPUESTO),
  ingreso("fr.prestamoMs", "Prestamo MS", SIN_REAL, SIN_PRESUPUESTO, { pendiente: "K8" }),
  ingreso("fr.chequesNegociadosIva", "Cheques negociados no ingresados IVA", SIN_REAL, SIN_PRESUPUESTO),
  ingreso("fr.otroIngreso", "Otro", SIN_REAL, SIN_PRESUPUESTO),
];

const egresos = [
  egreso("fr.chequesDiferidos", "Cheques diferidos", clasif("CHEQUES DIFERIDOS"), cat("CHEQUES DIFERIDOS")),
  egreso("fr.sueldos", "Sueldos", clasif("SUELDOS"), cat("SUELDOS"), {
    pendiente: "K5",
    parcial: true,
    nota: "Jul-26: 15,8M en la planilla contra 10,2M de SUELDOS de la unidad FREDY en la Ejecución consolidada.",
  }),
  egreso("fr.sac", "SAC", clasif("SAC"), cat("SAC"), { pendiente: "K5", parcial: true }),
  egreso("fr.comisionEspecial", "Comision Especial", clasif("COMISIONES ESPECIALES"), cat("COMISIONES ESPECIALES")),
  egreso("fr.compraIva", "Compra de IVA", SIN_REAL, cat("IVA"), { pendiente: "K3" }),
  egreso("fr.pagosEspeciales", "Pagos especiales", clasif("PAGOS ESPECIALES"), cat("PAGOS ESPECIALES")),
  egreso("fr.impuestos", "Impuestos", clasif("IMP Y PREVISIONALES"), cat("IMP Y PREVISIONALES")),
  egreso("fr.expensas", "Expensas", SIN_REAL, cat("EXPENSAS"), {
    pendiente: "K2",
    nota: "Planilla: reparto de la unidad EXPENSAS.",
  }),
  egreso("fr.expensasNoSocios", "Expensas - No socios", SIN_REAL, SIN_PRESUPUESTO),
  egreso("fr.impuestoAlCheque", "Impuesto al cheque", clasif("COM Y GTOS BRIOS"), cat("Gastos bancarios")),
  egreso("fr.proveedores", "Proveedores", clasif("PROV Y SERV"), cat("PROV Y SERV")),
  egreso("fr.liqFinal", "Liq final", clasif("LIQ FINAL"), cat("Liquidación final")),
  egreso("fr.otro", "Otro", clasif("OTROS"), cat("OTROS")),
];

const deAbajo = [
  abajo("fr.reembolsosPrestamos", "Reembolsos de préstamos", clasif("PRESTAMOS MS"), cat("Préstamo MS")),
  abajo("fr.blanqueoPropios", "Aporte para blanqueo con fondos propios", SIN_REAL, SIN_PRESUPUESTO),
  abajo("fr.blanqueoTerceros", "Aporte para blanqueo con fondos de terceros", SIN_REAL, SIN_PRESUPUESTO),
  abajo("fr.ajusteCaja", "Ajuste Caja - A conciliar", SIN_REAL, SIN_PRESUPUESTO),
  abajo("fr.dividendos", "Dividendos", clasif("DIVIDENDOS"), cat("Dividendos")),
  abajo("fr.inversiones", "Inversiones", clasif("INVERSIONES"), cat("INVERSIONES")),
  abajo("fr.pagosMs", "Pagos solicitados por MS", clasif("MS"), SIN_PRESUPUESTO),
];

export const PLANTILLA_FREDY: Plantilla = {
  empresa: "Fredy Publicidad",
  filas: [
    titulo("fr.tituloIngresos", "INGRESOS", "INGRESOS"),
    ...ingresos,
    total("fr.totalIngresos", "INGRESOS", "TOTAL INGRESOS", ingresos.map((f) => f.clave)),
    titulo("fr.tituloEgresos", "EGRESOS", "EGRESOS"),
    ...egresos,
    total("fr.totalEgresosOperativos", "EGRESOS", "TOTAL EGRESOS OPERATIVOS", egresos.map((f) => f.clave)),
    ...deAbajo,
    total("fr.totalEgresos", "ABAJO", "TOTAL EGRESOS", ["fr.totalEgresosOperativos", ...deAbajo.map((f) => f.clave)]),
  ],
};
