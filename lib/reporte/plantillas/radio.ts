import type { Plantilla } from "@/lib/reporte/motor";
import { abajo, cat, clasif, egreso, ESPEJO_2B, ingreso, MANUAL_2B, SIN_PRESUPUESTO, SIN_REAL, titulo, total } from "./filas";

// "PF - RADIO - AGOSTO 2026", hoja PRESUPUESTO MES A MES (diagnóstico §2.5).
// Unidad de negocio: RADIO.

const ingresos = [
  ingreso("ra.cobranza", "Cobranza clientes", clasif("COBRANZAS"), cat("COBRANZAS")),
  ingreso("ra.otrasOperaciones", "Otras operaciones", SIN_REAL, SIN_PRESUPUESTO, { pendiente: "K8" }),
  ingreso("ra.resultadoFci", "Resultado FCI", MANUAL_2B, cat("Intereses FCI")),
  ingreso("ra.reservaAguinaldo", "Reserva de aguinaldo", ESPEJO_2B, SIN_PRESUPUESTO, {
    nota: "Espejo de RESERVA AGUINALDO de Disponibilidades.",
  }),
  ingreso("ra.chequesDespuesDel15", "Cheques despues del 15", ESPEJO_2B, SIN_PRESUPUESTO, {
    nota: "Espejo de CHEQUES EN CARTERA DESPUES DEL 15 de Disponibilidades.",
  }),
  ingreso("ra.cobroJuicio", "Ingreso - Cobro juicio Municipalidad", SIN_REAL, SIN_PRESUPUESTO),
  ingreso("ra.devolucionEmbargo", "Devolucion embargo", SIN_REAL, SIN_PRESUPUESTO),
  ingreso("ra.otroIngreso", "Otro", SIN_REAL, SIN_PRESUPUESTO),
];

const egresos = [
  egreso("ra.chequesDiferidos", "Cheques diferidos", clasif("CHEQUES DIFERIDOS"), cat("CHEQUES DIFERIDOS")),
  egreso("ra.sueldos", "Sueldos", clasif("SUELDOS"), cat("SUELDOS")),
  egreso("ra.sac", "SAC", clasif("SAC"), cat("SAC")),
  egreso("ra.prestamosTarjetas", "Prestamos y tarjetas", clasif("PREST BRIOS Y TC"), cat("Prestamos y tarjetas")),
  egreso("ra.comisionesEspeciales", "Comisiones Especiales", clasif("COMISIONES ESPECIALES"), cat("COMISIONES ESPECIALES")),
  egreso("ra.impuestos", "Impuestos", clasif("IMP Y PREVISIONALES"), cat("IMP Y PREVISIONALES")),
  egreso("ra.expensas", "Expensas", SIN_REAL, cat("EXPENSAS"), {
    pendiente: "K2",
    nota: "Planilla: reparto de la unidad EXPENSAS.",
  }),
  egreso("ra.expensasNoSocios", "Expensas - No socios", SIN_REAL, SIN_PRESUPUESTO),
  egreso("ra.impuestoAlCheque", "Impuesto al cheque (Gto Brio)", clasif("COM Y GTOS BRIOS"), cat("Gastos bancarios"), {
    nota: "Jul-26: la planilla tipea 1.472.404; COM Y GTOS BRIOS da 1.607.849.",
  }),
  egreso("ra.costoIva", "Costo IVA / Factura C / Efectivo", SIN_REAL, cat("IVA"), { pendiente: "K3" }),
  egreso("ra.proveedores", "Proveedores", clasif("PROV Y SERV"), cat("PROV Y SERV"), {
    nota: "Jul-26: la planilla suma además GASTOS TARJETAS (330.409).",
  }),
  egreso("ra.juicios", "Juicios", clasif("JUICIOS"), cat("Juicios")),
];

const deAbajo = [
  abajo("ra.reembolsosPrestamos", "Reembolsos de préstamos", clasif("PRESTAMOS MS"), cat("Préstamo MS")),
  abajo("ra.dividendos", "Dividendos", clasif("DIVIDENDOS"), cat("Dividendos")),
  abajo("ra.ajusteCaja", "Ajuste caja - A conciliar", SIN_REAL, SIN_PRESUPUESTO),
  abajo("ra.otro", "Otro", SIN_REAL, SIN_PRESUPUESTO),
];

export const PLANTILLA_RADIO: Plantilla = {
  empresa: "Radio",
  filas: [
    titulo("ra.tituloIngresos", "INGRESOS", "INGRESOS"),
    ...ingresos,
    total("ra.totalIngresos", "INGRESOS", "TOTAL INGRESOS", ingresos.map((f) => f.clave)),
    titulo("ra.tituloEgresos", "EGRESOS", "EGRESOS"),
    ...egresos,
    total("ra.totalEgresosOperativos", "EGRESOS", "TOTAL EGRESOS OPERATIVOS", egresos.map((f) => f.clave)),
    ...deAbajo,
    total("ra.totalEgresos", "ABAJO", "TOTAL EGRESOS", ["ra.totalEgresosOperativos", ...deAbajo.map((f) => f.clave)]),
  ],
};
