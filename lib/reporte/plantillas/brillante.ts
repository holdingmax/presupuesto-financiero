import type { Plantilla } from "@/lib/reporte/motor";
import { abajo, cat, clasif, egreso, ESPEJO_2B, ingreso, MANUAL_2B, SIN_PRESUPUESTO, SIN_REAL, titulo, total } from "./filas";

// "PF - BRILLANTE - AGOSTO 2026", hoja PRESUPUESTO MES A MES (diagnóstico §2.3).
// Unidad de negocio: BRILLANTE (incluye la razón social Gold Seguridad).

const ingresos = [
  ingreso("br.cobranzaContado", "Cobranza Contado", clasif("COBRANZAS"), cat("COBRANZAS"), {
    pendiente: "K7",
    parcial: true,
    nota: "Planilla: COBRANZAS de la unidad sin las de Gold Seguridad. Hasta resolver K7 incluye las de Gold.",
  }),
  ingreso("br.cobranzaChequeDiferido", "Cobranza Cheque Diferido", SIN_REAL, SIN_PRESUPUESTO),
  ingreso("br.otrasOperacionesJujuy", "Otras operaciones (MANTENOR JUJUY)", SIN_REAL, SIN_PRESUPUESTO, {
    pendiente: "K8",
  }),
  ingreso("br.goldSalta", "Otros Operaciones (GOLD SALTA)", SIN_REAL, SIN_PRESUPUESTO, {
    pendiente: "K7",
    nota: "Cobranzas de la razón social Gold Seguridad.",
  }),
  ingreso("br.cobroIvaInterempresa", "Otro (Cobro IVA interempresa)", SIN_REAL, SIN_PRESUPUESTO),
  ingreso("br.resultadoFci", "Resultado FCI", MANUAL_2B, cat("Intereses FCI")),
  ingreso("br.prestamoMs", "Préstamo MS", SIN_REAL, SIN_PRESUPUESTO, { pendiente: "K8" }),
  ingreso("br.reservaIvaAvianor", "Reserva pago IVA avianor", ESPEJO_2B, SIN_PRESUPUESTO, {
    nota: "Espejo de RESERVA PAGO IVA AVIANOR de Disponibilidades.",
  }),
  ingreso("br.ventaHsAvianor", "Venta HS Vuelos Avianor", SIN_REAL, SIN_PRESUPUESTO),
  ingreso("br.aporteMsLuque", "Aporte MS - Devolucion Luque", SIN_REAL, SIN_PRESUPUESTO),
  ingreso("br.diferenciaExpensas", "Diferencia Expensas a Recuperar", SIN_REAL, SIN_PRESUPUESTO),
  ingreso("br.reservaSac", "Reserva SAC", ESPEJO_2B, SIN_PRESUPUESTO, {
    nota: "Espejo de RESERVA AGUINALDO de Disponibilidades.",
  }),
  ingreso("br.retroactivoIpsst", "Retroactivo IPSST", SIN_REAL, SIN_PRESUPUESTO),
  ingreso("br.otroMsnt", "Otro (MSNT Av Papa F./Av Siria / Av Sarmiento)", MANUAL_2B, SIN_PRESUPUESTO, {
    nota: "Cobro que entró por Mantenor, tipeado a mano.",
  }),
];

const egresos = [
  egreso("br.chequesDiferidos", "Cheques diferidos", clasif("CHEQUES DIFERIDOS"), cat("CHEQUES DIFERIDOS")),
  egreso("br.sueldos", "Sueldos", clasif("SUELDOS"), cat("SUELDOS"), {
    pendiente: "K1",
    parcial: true,
    nota: "Planilla: SUELDOS de la unidad + reparto de la nómina sin unidad.",
  }),
  egreso("br.prestamosTarjetas", "Prestamos y tarjetas", clasif("PREST BRIOS Y TC"), cat("Prestamos y tarjetas"), {
    pendiente: "K1",
    parcial: true,
    nota: "Planilla: PREST BRIOS Y TC + reparto de tarjetas.",
  }),
  egreso("br.sac", "SAC", clasif("SAC"), cat("SAC"), {
    pendiente: "K1",
    parcial: true,
    nota: "Planilla: SAC de la unidad + reparto del SAC sin unidad.",
  }),
  egreso(
    "br.comisionesEspeciales",
    "Adicionales y comisiones especiales",
    clasif("COMISIONES ESPECIALES"),
    cat("COMISIONES ESPECIALES"),
    { parcial: true, nota: "Jul-26: la planilla suma además 6,3M movidos a mano desde Mantenor." }
  ),
  egreso("br.impuestos", "Impuestos", clasif("IMP Y PREVISIONALES"), cat("IMP Y PREVISIONALES"), {
    pendiente: "K1",
    parcial: true,
    nota: "Planilla: IMP Y PREVISIONALES + PRORRATEO IMPUESTOS (F931/SP).",
  }),
  egreso("br.expensas", "Expensas", SIN_REAL, cat("EXPENSAS"), {
    pendiente: "K2",
    nota: "Planilla: reparto de la unidad EXPENSAS.",
  }),
  egreso("br.gastosBancarios", "Gastos Bancarios", clasif("COM Y GTOS BRIOS"), cat("Gastos bancarios")),
  egreso("br.proveedores", "Proveedores", clasif("PROV Y SERV"), cat("PROV Y SERV")),
  egreso("br.compraIva", "Compra IVA", clasif("IVA"), cat("IVA")),
  egreso(
    "br.liquidacionesJuicios",
    "Liquidaciones finales y juicios",
    clasif("LIQ FINAL", "JUICIOS"),
    cat("Liquidación final", "Juicios")
  ),
  egreso("br.gastosGold", "Gastos Gold Seguridad", SIN_REAL, SIN_PRESUPUESTO),
];

const deAbajo = [
  abajo("br.reembolsosPrestamos", "Reembolsos de préstamos", clasif("PRESTAMOS MS"), cat("Préstamo MS")),
  abajo("br.dividendos", "Dividendos", clasif("DIVIDENDOS"), cat("Dividendos")),
  abajo("br.devolucionMsCamioneta", "Devolcion MS - Aporte Camioneta", SIN_REAL, SIN_PRESUPUESTO),
  abajo("br.traspasoPrestamoMs", "Traspaso Saldo Prestamo MS - Brillante a Mantenor", SIN_REAL, SIN_PRESUPUESTO),
  abajo("br.traspasoSaldoInicial", "Traspaso Saldo Inicial Brillante - Mantenor", MANUAL_2B, SIN_PRESUPUESTO, {
    nota: "Jul-26: 254.780.390 tipeado.",
  }),
  abajo("br.ajusteCaja", "Ajuste Caja -  A conciliar", SIN_REAL, SIN_PRESUPUESTO),
  abajo("br.devolucionLuque", "Devolucion Luque - Aporte MS", SIN_REAL, SIN_PRESUPUESTO),
  abajo("br.aporteBlanqueo", "Aporte para blanqueo", SIN_REAL, SIN_PRESUPUESTO),
  abajo("br.recuperoGastos", "Recupero Gastos", SIN_REAL, SIN_PRESUPUESTO),
  abajo("br.inversiones", "Inversiones", clasif("INVERSIONES"), cat("INVERSIONES")),
];

export const PLANTILLA_BRILLANTE: Plantilla = {
  empresa: "Brillante",
  filas: [
    titulo("br.tituloIngresos", "INGRESOS", "INGRESOS"),
    ...ingresos,
    total("br.totalIngresos", "INGRESOS", "TOTAL INGRESOS", ingresos.map((f) => f.clave)),
    titulo("br.tituloEgresos", "EGRESOS", "EGRESOS"),
    ...egresos,
    total("br.totalEgresosOperativos", "EGRESOS", "TOTAL EGRESOS OPERATIVOS", egresos.map((f) => f.clave)),
    ...deAbajo,
    total("br.totalEgresos", "ABAJO", "TOTAL EGRESOS", ["br.totalEgresosOperativos", ...deAbajo.map((f) => f.clave)]),
  ],
};
