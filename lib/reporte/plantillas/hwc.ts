import type { Plantilla } from "@/lib/reporte/motor";
import { abajo, cat, clasif, egreso, ESPEJO_2B, ingreso, MANUAL_2B, SIN_PRESUPUESTO, SIN_REAL, titulo, total } from "./filas";

// "PF - HANDY - AGOSTO 2026" (= HWC), hoja PRESUPUESTO MES A MES (diagnóstico
// §2.7). Unidad de negocio: HWC. La planilla dice ESPERADO y % EJECUCION en vez
// de PRESUPUESTADO y % AVANCE (pregunta 4, queda abierta).

const ingresos = [
  ingreso("hw.clientesPropios", "CLIENTES PROPIOS", clasif("COBRANZAS"), cat("COBRANZAS"), {
    pendiente: "K6",
    parcial: true,
    nota: "Hasta resolver K6 lleva toda la cobranza de la unidad HWC.",
  }),
  ingreso("hw.facturacionLatam", "FACTURACION HANDY A LATAM", SIN_REAL, SIN_PRESUPUESTO, { pendiente: "K6" }),
  ingreso("hw.recaudacionLatamAvianca", "RECAUDACION LATAM Y AVIANCA", SIN_REAL, SIN_PRESUPUESTO, { pendiente: "K6" }),
  ingreso("hw.recaudacionJetsmart", "RECAUDACION JETSMART", SIN_REAL, SIN_PRESUPUESTO, { pendiente: "K6" }),
  ingreso("hw.reservaSac", "RESERVA SAC", ESPEJO_2B, SIN_PRESUPUESTO, {
    nota: "Espejo de PREVISION SAC de Disponibilidades.",
  }),
  ingreso("hw.recuperoExpensas", "RECUPERO EXPENSAS", SIN_REAL, SIN_PRESUPUESTO),
  ingreso("hw.recuperoBlanqueo", "RECUPERO APORTE BLANQUEO", SIN_REAL, SIN_PRESUPUESTO),
  ingreso("hw.resultadoFci", "RESULTADO FCI", MANUAL_2B, cat("Intereses FCI")),
];

const egresos = [
  egreso("hw.impuestoAlCheque", "IMPUESTO AL CHEQUE", clasif("COM Y GTOS BRIOS"), cat("Gastos bancarios")),
  egreso("hw.chequesDiferidos", "CHEQUES DIFERIDOS", clasif("CHEQUES DIFERIDOS"), cat("CHEQUES DIFERIDOS")),
  egreso("hw.impuestos", "IMPUESTOS", clasif("IMP Y PREVISIONALES"), cat("IMP Y PREVISIONALES")),
  egreso("hw.prestamosTc", "PRESTAMOS BANCARIOS Y TC", clasif("PREST BRIOS Y TC"), cat("Prestamos y tarjetas")),
  egreso("hw.proveedores", "PROVEEDORES Y SERVICIOS", clasif("PROV Y SERV"), cat("PROV Y SERV")),
  egreso("hw.sueldos", "SUELDOS", clasif("SUELDOS"), cat("SUELDOS"), {
    pendiente: "K6",
    parcial: true,
    nota: "Jul-26: 243,3M en la planilla contra 39,3M de SUELDOS de la unidad HWC en la Ejecución consolidada.",
  }),
  egreso("hw.sac", "SAC", clasif("SAC"), cat("SAC")),
  egreso("hw.expensas", "EXPENSAS", SIN_REAL, cat("EXPENSAS"), { pendiente: "K2" }),
  egreso("hw.costoIva", "COSTO OPERACIONES IVA", SIN_REAL, cat("IVA"), { pendiente: "K3" }),
  egreso("hw.liquidacionesFinales", "LIQUIDACIONES FINALES", clasif("LIQ FINAL"), cat("Liquidación final")),
  egreso("hw.comisionesEspeciales", "COMISIONES ESPECIALES", clasif("COMISIONES ESPECIALES"), cat("COMISIONES ESPECIALES")),
];

const deAbajo = [
  abajo("hw.pagoGlobe", "PAGO GLOBE AIR CARGO", SIN_REAL, SIN_PRESUPUESTO, { pendiente: "K6" }),
  abajo("hw.pagoLatam", "PAGO LATAM Y LAN ECUADOR", SIN_REAL, SIN_PRESUPUESTO, { pendiente: "K6" }),
  abajo("hw.pagoAvianca", "PAGO AVIANCA", SIN_REAL, SIN_PRESUPUESTO, { pendiente: "K6" }),
  abajo("hw.pagoFlybondi", "PAGO FLYBONDI", SIN_REAL, SIN_PRESUPUESTO, { pendiente: "K6" }),
  abajo("hw.pagoGol", "PAGO GOL LINEAS AEREAS", SIN_REAL, SIN_PRESUPUESTO, { pendiente: "K6" }),
  abajo("hw.dividendos", "Dividendos Entregados", clasif("DIVIDENDOS"), cat("Dividendos")),
  abajo("hw.gastosAvion", "Gastos Avion", clasif("AVION"), SIN_PRESUPUESTO),
  abajo("hw.ms", "MS", clasif("MS"), SIN_PRESUPUESTO),
  abajo("hw.ajusteCaja", "Ajuste Caja - A conciliar", SIN_REAL, SIN_PRESUPUESTO),
  abajo("hw.aporteBlanqueo", "Aporte Blanqueo", SIN_REAL, SIN_PRESUPUESTO),
  abajo("hw.dividendosPendientes", "Dividendos Pendientes", SIN_REAL, SIN_PRESUPUESTO),
];

export const PLANTILLA_HWC: Plantilla = {
  empresa: "HWC",
  filas: [
    titulo("hw.tituloIngresos", "INGRESOS", "INGRESOS"),
    ...ingresos,
    total("hw.totalIngresos", "INGRESOS", "TOTAL DE INGRESOS", ingresos.map((f) => f.clave)),
    titulo("hw.tituloGastos", "EGRESOS", "GASTOS"),
    ...egresos,
    total("hw.subtotalEstructura", "EGRESOS", "SUBTOTAL ESTRUCTURA DE GASTOS", egresos.map((f) => f.clave)),
    ...deAbajo,
    total("hw.totalPagado", "ABAJO", "TOTAL EN EFECTIVO PAGADO", ["hw.subtotalEstructura", ...deAbajo.map((f) => f.clave)]),
  ],
};
