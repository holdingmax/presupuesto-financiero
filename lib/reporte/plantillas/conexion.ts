import type { Plantilla } from "@/lib/reporte/motor";
import { abajo, cat, clasif, egreso, ESPEJO_2B, ingreso, MANUAL_2B, SIN_PRESUPUESTO, SIN_REAL, titulo, total } from "./filas";

// "PF - CONEXION LOGISTICA - AGOSTO 2026", hoja PRESUPUESTO Y REAL MES A MES
// (diagnóstico §2.1). Unidades de negocio: SPP + LOGISTICA.

const ingresos = [
  ingreso("cx.cobranzaContado", "Cobranza Contado", clasif("COBRANZAS"), cat("COBRANZAS"), {
    nota: "Jul-26: COBRANZAS SPP+LOGISTICA 2.317,2M; la planilla tipea 2.311,3M (dif. 5,8M).",
  }),
  ingreso("cx.cobranzaChequeDiferido", "Cobranza Cheque Diferido", SIN_REAL, SIN_PRESUPUESTO),
  ingreso("cx.otrasOperaciones", "Otras operaciones (VENTA MOTO)", SIN_REAL, SIN_PRESUPUESTO, { pendiente: "K8" }),
  ingreso("cx.prestamoMsCiber", "Prestamo MS Ciber", SIN_REAL, SIN_PRESUPUESTO, { pendiente: "K8" }),
  ingreso("cx.resultadoFci", "Resultado FCI", MANUAL_2B, cat("Intereses FCI"), {
    nota: "Rendimientos de FCI tipeados a mano.",
  }),
  ingreso("cx.reservaAguinaldo", "Reserva Aguinaldo", ESPEJO_2B, SIN_PRESUPUESTO, {
    nota: "Espejo de RESERVA AGUINALDO de Disponibilidades.",
  }),
  ingreso("cx.prestamo", "Préstamo", SIN_REAL, SIN_PRESUPUESTO, { pendiente: "K8" }),
  ingreso("cx.gastosMsARecuperar", "Gastos MS a recuperar", SIN_REAL, SIN_PRESUPUESTO),
  ingreso("cx.chequesDespuesDel10", "Cheques en cartera despues del 10", ESPEJO_2B, SIN_PRESUPUESTO, {
    nota: "Espejo de CHEQUES EN CARTERA DESPUES DEL 10 de Disponibilidades.",
  }),
  ingreso("cx.gastosAvionARecuperar", "Gastos avion a recuperar", SIN_REAL, SIN_PRESUPUESTO),
];

const egresos = [
  egreso("cx.chequesDiferidos", "Cheques diferidos", clasif("CHEQUES DIFERIDOS"), cat("CHEQUES DIFERIDOS")),
  egreso("cx.sueldos", "Sueldos", clasif("SUELDOS"), cat("SUELDOS"), {
    pendiente: "K1",
    parcial: true,
    nota: "Planilla: SUELDOS de la unidad + reparto de la nómina sin unidad (hoja DETALLE SUELDOS).",
  }),
  egreso("cx.sac", "SAC", clasif("SAC"), cat("SAC"), {
    pendiente: "K1",
    parcial: true,
    nota: "Planilla: SAC de la unidad + reparto del SAC sin unidad.",
  }),
  egreso("cx.prestamosTarjetas", "Prestamos y tarjetas", clasif("PREST BRIOS Y TC"), cat("Prestamos y tarjetas"), {
    pendiente: "K1",
    parcial: true,
    nota: "Planilla: PREST BRIOS Y TC + reparto de la hoja TARJETAS Y PRESTAMOS.",
  }),
  egreso(
    "cx.comisionesEspeciales",
    "Adicionales y comisiones especiales",
    clasif("COMISIONES ESPECIALES"),
    cat("COMISIONES ESPECIALES")
  ),
  egreso("cx.impuestos", "Impuestos", clasif("IMP Y PREVISIONALES"), cat("IMP Y PREVISIONALES"), {
    pendiente: "K1",
    parcial: true,
    nota: "Planilla: IMP Y PREVISIONALES + PRORRATEO IMPUESTOS (F931/SP).",
  }),
  egreso("cx.expensas", "Expensas", SIN_REAL, cat("EXPENSAS"), {
    pendiente: "K2",
    nota: "Planilla: reparto de la unidad EXPENSAS.",
  }),
  egreso("cx.expensasNoSocios", "Expensas - No socios", SIN_REAL, SIN_PRESUPUESTO),
  egreso("cx.impuestoAlCheque", "Impuesto al cheque (Gto Brio)", clasif("COM Y GTOS BRIOS"), cat("Gastos bancarios")),
  egreso("cx.proveedores", "Proveedores", clasif("PROV Y SERV"), cat("PROV Y SERV"), {
    nota: "Jul-26: la hoja DETALLE GASTOS REALES suma 3.973.586,86 menos que PROV Y SERV de la Ejecución.",
  }),
  egreso("cx.peru", "Peru", SIN_REAL, SIN_PRESUPUESTO),
  egreso("cx.bolivia", "Bolivia", SIN_REAL, SIN_PRESUPUESTO),
  egreso("cx.proveedoresIva", "Proveedores IVA", SIN_REAL, cat("IVA"), { pendiente: "K3" }),
  egreso("cx.liquidacionesFinales", "Liquidaciones Finales", clasif("LIQ FINAL"), cat("Liquidación final")),
  egreso("cx.juicios", "Juicios y requerimientos AFIP", clasif("JUICIOS"), cat("Juicios")),
  egreso("cx.prestamoMs", "Préstamo MS", clasif("PRESTAMOS MS"), cat("Préstamo MS")),
];

const deAbajo = [
  abajo("cx.recuperoGastos", "Recupero Gastos", SIN_REAL, SIN_PRESUPUESTO),
  abajo("cx.gastosCampo", "Gastos Campo", clasif("CAMPO"), SIN_PRESUPUESTO, {
    parcial: true,
    nota: "Planilla: CAMPO + Sueldos y SAC de la unidad CAMPO.",
  }),
  abajo("cx.gastosJps", "Gastos Jet Parts Solutions a recuperar", SIN_REAL, SIN_PRESUPUESTO),
  abajo("cx.gastosMs", "Gastos MS", clasif("MS"), SIN_PRESUPUESTO, {
    parcial: true,
    nota: "Jul-26: MS 9.919.918,85 + 13.473.929,75 tipeados sin identificar.",
  }),
  abajo("cx.aporteBlanqueo", "Aporte para blanqueo", SIN_REAL, SIN_PRESUPUESTO),
  abajo("cx.expensasHavannaPeru", "Expensas Havanna peru a recuperar", SIN_REAL, SIN_PRESUPUESTO),
  abajo("cx.expensasAmericanas", "Expensas Empresas Americanas a recuperar", SIN_REAL, SIN_PRESUPUESTO),
  abajo("cx.ajusteCaja", "Ajuste Caja - A conciliar", SIN_REAL, SIN_PRESUPUESTO),
  abajo("cx.reintegroExpensas", "Reintegro expensas grupo ", SIN_REAL, SIN_PRESUPUESTO),
  abajo("cx.dividendosExpensas", "Dividendos - Expensas Havanna Peru y Americanas", MANUAL_2B, SIN_PRESUPUESTO, {
    nota: "Jul-26: 28.990.000 tipeado.",
  }),
  abajo("cx.dividendosEfectivo", "Dividendos en efectivo", clasif("DIVIDENDOS"), cat("Dividendos")),
  abajo("cx.dividendosRecuperoExpensas", "Dividendos - Recupero expensas y prestamos grupo", SIN_REAL, SIN_PRESUPUESTO),
  abajo("cx.dividendosRecuperoGastos", "Dividendos - Recupero de gastos", SIN_REAL, SIN_PRESUPUESTO),
  abajo("cx.gastosAvion", "Gastos Avion a recuperar", clasif("AVION"), SIN_PRESUPUESTO, {
    parcial: true,
    nota: "Planilla: AVION + expensas y tarjetas de Avianor pagadas por Conexión.",
  }),
];

export const PLANTILLA_CONEXION: Plantilla = {
  empresa: "Conexión Logística",
  filas: [
    titulo("cx.tituloIngresos", "INGRESOS", "INGRESOS"),
    ...ingresos,
    total("cx.totalIngresos", "INGRESOS", "TOTAL INGRESOS", ingresos.map((f) => f.clave)),
    titulo("cx.tituloEgresos", "EGRESOS", "EGRESOS"),
    ...egresos,
    total("cx.totalEgresosOperativos", "EGRESOS", "TOTAL EGRESOS OPERATIVOS", egresos.map((f) => f.clave)),
    ...deAbajo,
    total("cx.totalEgresos", "ABAJO", "TOTAL DE EGRESOS", [
      "cx.totalEgresosOperativos",
      ...deAbajo.map((f) => f.clave),
    ]),
  ],
};
