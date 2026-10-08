import type { Plantilla } from "@/lib/reporte/motor";
import { abajo, cat, clasif, egreso, ingreso, MANUAL_2B, SIN_PRESUPUESTO, SIN_REAL, titulo, total } from "./filas";

// "PF - MANTENOR - AGOSTO 2026", hoja PRESUPUESTO MES A MES (diagnóstico §2.6).
// Unidad de negocio: MANTENOR.

const ingresos = [
  ingreso("mn.cobranzaJujuy", "Cobranza Mantenor Jujuy", clasif("COBRANZAS"), cat("COBRANZAS"), {
    pendiente: "K4",
    parcial: true,
    nota: "Hasta resolver K4 lleva toda la cobranza de la unidad (Jujuy + MSNT).",
  }),
  ingreso("mn.cobranzaMsnt", "Cobranza MSNT Av Papa F./Av Siria / Av Sarmiento", SIN_REAL, SIN_PRESUPUESTO, {
    pendiente: "K4",
  }),
  ingreso("mn.traspasoSaldoInicial", "Traspaso Saldo Inicial Brillante - Mantenor", MANUAL_2B, SIN_PRESUPUESTO),
  ingreso("mn.traspasoPrestamoMs", "Traspaso Saldo Prestamo MS - Brillante a Mantenor", MANUAL_2B, SIN_PRESUPUESTO),
  ingreso("mn.resultadoFci", "Resultado FCI", MANUAL_2B, cat("Intereses FCI")),
  ingreso("mn.prestamoMs", "Préstamo MS", SIN_REAL, SIN_PRESUPUESTO, { pendiente: "K8" }),
];

const egresos = [
  egreso("mn.chequesDiferidos", "Cheques diferidos", clasif("CHEQUES DIFERIDOS"), cat("CHEQUES DIFERIDOS")),
  egreso("mn.sueldos", "Sueldos", clasif("SUELDOS"), cat("SUELDOS"), {
    pendiente: "K1",
    parcial: true,
    nota: "Planilla: SUELDOS de la unidad + reparto de la nómina sin unidad.",
  }),
  egreso("mn.sac", "SAC", clasif("SAC"), cat("SAC"), {
    pendiente: "K1",
    parcial: true,
    nota: "Planilla: SAC de la unidad + reparto del SAC sin unidad.",
  }),
  egreso("mn.tarjetas", "Tarjetas", clasif("PREST BRIOS Y TC"), cat("Prestamos y tarjetas"), {
    pendiente: "K1",
    parcial: true,
  }),
  egreso(
    "mn.comisionesEspeciales",
    "Adicionales y comisiones especiales",
    clasif("COMISIONES ESPECIALES"),
    cat("COMISIONES ESPECIALES"),
    { nota: "Jul-26: la planilla movió 6,3M de comisiones a Brillante." }
  ),
  egreso("mn.impuestos", "Impuestos", clasif("IMP Y PREVISIONALES"), cat("IMP Y PREVISIONALES"), {
    pendiente: "K1",
    parcial: true,
    nota: "Planilla: IMP Y PREVISIONALES + PRORRATEO IMPUESTOS (F931/SP).",
  }),
  egreso("mn.expensas", "Expensas", SIN_REAL, cat("EXPENSAS"), {
    pendiente: "K2",
    nota: "Planilla: reparto de la unidad EXPENSAS.",
  }),
  egreso("mn.gastosBancarios", "Gastos Bancarios", clasif("COM Y GTOS BRIOS"), cat("Gastos bancarios")),
  egreso("mn.compraIva", "Compra IVA", clasif("IVA"), cat("IVA")),
  egreso("mn.proveedores", "Proveedores", clasif("PROV Y SERV"), cat("PROV Y SERV")),
  egreso(
    "mn.liquidacionesJuicios",
    "Liquidaciones Finales y Juicios",
    clasif("LIQ FINAL", "JUICIOS"),
    cat("Liquidación final", "Juicios")
  ),
];

const deAbajo = [
  abajo("mn.prestamos", "Prestamos", clasif("PRESTAMOS MS"), cat("Préstamo MS")),
  abajo("mn.dividendos", "Dividendos", clasif("DIVIDENDOS"), cat("Dividendos")),
  abajo("mn.inversiones", "Inversiones", clasif("INVERSIONES"), cat("INVERSIONES")),
];

export const PLANTILLA_MANTENOR: Plantilla = {
  empresa: "Mantenor",
  filas: [
    titulo("mn.tituloIngresos", "INGRESOS", "INGRESOS"),
    ...ingresos,
    total("mn.totalIngresos", "INGRESOS", "TOTAL INGRESOS", ingresos.map((f) => f.clave)),
    titulo("mn.tituloGastos", "EGRESOS", "GASTOS"),
    ...egresos,
    total("mn.totalGastosOperativos", "EGRESOS", "TOTAL GASTOS OPERATIVOS", egresos.map((f) => f.clave)),
    ...deAbajo,
    total("mn.totalGastos", "ABAJO", "TOTAL GASTOS", ["mn.totalGastosOperativos", ...deAbajo.map((f) => f.clave)]),
  ],
};
