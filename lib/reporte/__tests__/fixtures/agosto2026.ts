// Fixtures de AGOSTO 2026 para los tests de la Etapa 2b (docs/reporte_etapa2b_plan.md §8).
// Generadas el 2026-10-13 con un script FUERA del repo que lee los 7 `PF - <EMPRESA> - AGOSTO 2026.xlsx`
// en modo solo lectura (valores cacheados y fórmulas). La de Avianor se agregó el 2026-10-28 con el mismo criterio. Importes en centavos, redondeados al centavo como
// los guardaría la base. NO se editan a mano para que un test cierre: si algo no cierra, se frena y se
// muestra la diferencia.
//
// Una entrada por cada fila con etiqueta de la planilla, en el mismo orden que `Plantilla.filas`.
//   p / r      : valor cacheado de PRESUPUESTADO (ESPERADO en Handy) y REAL de agosto, en centavos (null = vacío).
//   calcP/calcR: true si la celda es una fórmula entre celdas de la hoja (total, saldo, capital…): el motor
//                la tiene que calcular. false = número tipeado o referencia a otra hoja: es dato de entrada.
//   tolP/tolR  : diferencia permitida en centavos (D1): 1 centavo por cada sumando de entrada que en el
//                Excel tiene más de 2 decimales (+1 si la fórmula divide), contados al generar.
export type FilaAgosto = {
  fila: number; texto: string;
  p: number | null; r: number | null;
  calcP: boolean; calcR: boolean;
  tolP: number; tolR: number;
};
export type DatosAgosto = {
  archivo: string;
  celdaP: string; // columna de PRESUPUESTADO de agosto
  filas: FilaAgosto[];
  // Valores de un mes anterior que una fórmula de agosto referencia (Havanna: =-DP21).
  previos: { celda: string; fila: number; texto: string; columna: "P" | "R"; mesesAtras: number; valor: number }[];
};
export const AGOSTO_2026: Record<string, DatosAgosto> = {
  "conexion-logistica": {
    archivo: "PF - CONEXION LOGISTICA  - AGOSTO 2026.xlsx",
    celdaP: "DR",
    filas: [
      { fila: 4, texto: "DISPONIBILIDADES ", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR4 = None · DS4 = None
      { fila: 5, texto: "BANCO", p: 33036860191, r: 33036860191, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR5 = 330368601.91 · DS5 = 330368601.91
      { fila: 6, texto: "EFECTIVO", p: 3157998423, r: 3157998423, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR6 = 31579984.23 · DS6 = 31579984.23
      { fila: 7, texto: "DOLARES", p: 633074050, r: 633074050, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR7 = 6330740.5 · DS7 = 6330740.5
      { fila: 8, texto: "CHEQUES EN CARTERA ", p: 111527488839, r: 111527488839, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR8 = 1115274888.3899999 · DS8 = 1115274888.3899999
      { fila: 9, texto: "CHEQUES NEGOCIADOS PENDIENTES DE INGRESO", p: -24311669996, r: -24311669996, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR9 = -243116699.95999998 · DS9 = -243116699.95999998
      { fila: 10, texto: "COBRANZA TECH PACK 02 Y 09", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR10 = None · DS10 = None
      { fila: 11, texto: "RESERVA AGUINALDO", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR11 = None · DS11 = None
      { fila: 12, texto: "CHEQUES EN CARTERA DESPUES DEL 10", p: -19649143618, r: -19649143618, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR12 = -196491436.18 · DS12 = -196491436.18
      { fila: 13, texto: "ADICIONALES PENDIENTES", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR13 = None · DS13 = None
      { fila: 14, texto: "RECUPERO APORTE BLANQUEO", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR14 = None · DS14 = None
      { fila: 15, texto: "GASTOS JET PARTS SOLUTIONS A RECUPERAR", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR15 = None · DS15 = None
      { fila: 16, texto: " TOTAL DISPONIBILIDADES", p: 104394607889, r: 104394607889, calcP: true, calcR: true, tolP: 0, tolR: 0 }, // DR16 = '=SUM(DR5:DR15)' · DS16 = '=SUM(DS5:DS15)'
      { fila: 18, texto: "INGRESOS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR18 = None · DS18 = None
      { fila: 19, texto: "Cobranza Contado", p: 233237178000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR19 = 2332371780 · DS19 = None
      { fila: 20, texto: "Cobranza Cheque Diferido", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR20 = None · DS20 = None
      { fila: 21, texto: "Otras operaciones (VENTA MOTO)", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR21 = None · DS21 = None
      { fila: 22, texto: "Prestamo MS Ciber", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR22 = None · DS22 = None
      { fila: 23, texto: "Resultado FCI", p: 182875109, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR23 = 1828751.0899999999 · DS23 = None
      { fila: 24, texto: "Reserva Aguinaldo", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR24 = None · DS24 = None
      { fila: 25, texto: "Préstamo", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR25 = None · DS25 = None
      { fila: 26, texto: "Gastos MS a recuperar", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR26 = None · DS26 = None
      { fila: 27, texto: "Cheques en cartera despues del 10", p: 19649143618, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR27 = 196491436.18 · DS27 = None
      { fila: 28, texto: "Gastos avion a recuperar", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR28 = None · DS28 = None
      { fila: 29, texto: "TOTAL INGRESOS", p: 253069196727, r: 0, calcP: true, calcR: true, tolP: 0, tolR: 0 }, // DR29 = '=SUM(DR19:DR28)' · DS29 = '=SUM(DS19:DS28)'
      { fila: 30, texto: "DISPONIBLE ANTES DE GASTOS", p: 357463804616, r: 104394607889, calcP: true, calcR: true, tolP: 0, tolR: 0 }, // DR30 = '=DR16+DR29' · DS30 = '=DS16+DS29'
      { fila: 32, texto: "EGRESOS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR32 = None · DS32 = None
      { fila: 33, texto: "Cheques diferidos", p: 1970585394, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR33 = "=+'DETALLE GASTOS PRESUPUESTADOS'!B2" · DS33 = None
      { fila: 34, texto: "Sueldos", p: 27385533400, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR34 = "=+'DETALLE GASTOS PRESUPUESTADOS'!B3" · DS34 = None
      { fila: 35, texto: "SAC", p: 2829838451, r: null, calcP: false, calcR: false, tolP: 1, tolR: 0 }, // DR35 = "=+'DETALLE GASTOS PRESUPUESTADOS'!B4" · DS35 = None
      { fila: 36, texto: "Prestamos y tarjetas", p: 1410655225, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR36 = "=+'DETALLE GASTOS PRESUPUESTADOS'!B5" · DS36 = None
      { fila: 37, texto: "Adicionales y comisiones especiales", p: 5362393549, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR37 = "=+'DETALLE GASTOS PRESUPUESTADOS'!B6" · DS37 = None
      { fila: 38, texto: "Impuestos", p: 19357692308, r: null, calcP: false, calcR: false, tolP: 1, tolR: 0 }, // DR38 = "=+'DETALLE GASTOS PRESUPUESTADOS'!B15" · DS38 = None
      { fila: 39, texto: "Expensas", p: 3872800000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR39 = "=+'DETALLE GASTOS PRESUPUESTADOS'!B16" · DS39 = None
      { fila: 40, texto: "Expensas - No socios", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR40 = None · DS40 = None
      { fila: 41, texto: "Impuesto al cheque (Gto Brio)", p: 3570061310, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR41 = "=+'DETALLE GASTOS PRESUPUESTADOS'!B17" · DS41 = None
      { fila: 42, texto: "Proveedores", p: 133504919877, r: null, calcP: false, calcR: false, tolP: 1, tolR: 0 }, // DR42 = "=+'DETALLE GASTOS PRESUPUESTADOS'!B24" · DS42 = None
      { fila: 43, texto: "Peru", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR43 = None · DS43 = None
      { fila: 44, texto: "Bolivia", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR44 = None · DS44 = None
      { fila: 45, texto: "Proveedores IVA", p: 8750000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR45 = "=+'DETALLE GASTOS PRESUPUESTADOS'!B21" · DS45 = None
      { fila: 46, texto: "Liquidaciones Finales", p: 4711331000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR46 = "=+'DETALLE GASTOS PRESUPUESTADOS'!B22" · DS46 = None
      { fila: 47, texto: "Juicios y requerimientos AFIP", p: 100000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR47 = "=+'DETALLE GASTOS PRESUPUESTADOS'!B23" · DS47 = None
      { fila: 48, texto: "Préstamo MS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR48 = None · DS48 = None
      { fila: 49, texto: "TOTAL EGRESOS OPERATIVOS", p: 212825810514, r: 0, calcP: true, calcR: true, tolP: 3, tolR: 0 }, // DR49 = '=SUM(DR33:DR48)' · DS49 = '=SUM(DS33:DS48)'
      { fila: 50, texto: "Recupero Gastos", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR50 = None · DS50 = None
      { fila: 51, texto: "Gastos Campo", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR51 = None · DS51 = None
      { fila: 52, texto: "Gastos Jet Parts Solutions a recuperar", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR52 = None · DS52 = None
      { fila: 53, texto: "Gastos MS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR53 = None · DS53 = None
      { fila: 54, texto: "Aporte para blanqueo", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR54 = None · DS54 = None
      { fila: 55, texto: "Expensas Havanna peru a recuperar", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR55 = None · DS55 = None
      { fila: 56, texto: "Expensas Empresas Americanas a recuperar", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR56 = None · DS56 = None
      { fila: 57, texto: "Ajuste Caja - A conciliar", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR57 = None · DS57 = None
      { fila: 58, texto: "Reintegro expensas grupo ", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR58 = None · DS58 = None
      { fila: 59, texto: "Dividendos - Expensas Havanna Peru y Americanas", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR59 = None · DS59 = None
      { fila: 60, texto: "Dividendos en efectivo", p: 0, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR60 = 0 · DS60 = None
      { fila: 61, texto: "Dividendos - Recupero expensas y prestamos grupo", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR61 = None · DS61 = None
      { fila: 62, texto: "Dividendos - Recupero de gastos", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR62 = None · DS62 = None
      { fila: 63, texto: "Gastos Avion a recuperar", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DR63 = None · DS63 = None
      { fila: 64, texto: "TOTAL DE EGRESOS", p: 212825810514, r: 0, calcP: true, calcR: true, tolP: 3, tolR: 0 }, // DR64 = '=SUM(DR49:DR63)' · DS64 = '=SUM(DS49:DS63)'
      { fila: 65, texto: "SALDO INICIAL + INGRESOS - TOTAL EGRESOS", p: 144637994102, r: 104394607889, calcP: true, calcR: true, tolP: 3, tolR: 0 }, // DR65 = '=DR30-DR64' · DS65 = '=DS30-DS64'
      { fila: 66, texto: "CAPITAL DE TRABAJO PROPUESTO (15 DIAS)", p: 106412905257, r: null, calcP: true, calcR: false, tolP: 4, tolR: 0 }, // DR66 = '=+(DR49-DR24)/2' · DS66 = None
      { fila: 67, texto: "DISPONIBLE SI - CAPITAL DE TRABAJO", p: -2018297368, r: null, calcP: true, calcR: false, tolP: 4, tolR: 0 }, // DR67 = '=+DR16-DR66' · DS67 = None
    ],
    previos: [
    ],
  },
  "brillante": {
    archivo: "PF - BRILLANTE - AGOSTO 2026.xlsx",
    celdaP: "DS",
    filas: [
      { fila: 3, texto: "Disponibilidades", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS3 = 'PRESUPUESTADO' · DT3 = 'REAL'
      { fila: 4, texto: "BANCO Y FCI", p: 32448712752, r: 32448712752, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS4 = '=388561658.52-64074531' · DT4 = '=388561658.52-64074531'
      { fila: 5, texto: "EFECTIVO", p: -44, r: -44, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS5 = '=-136170039+78411842.93-6316335.37+64074531' · DT5 = '=-136170039+78411842.93-6316335.37+64074531'
      { fila: 6, texto: "DOLARES", p: 38892100, r: 38892100, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS6 = 388921 · DT6 = 388921
      { fila: 7, texto: "RESERVA PAGO IVA AVIANOR", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS7 = None · DT7 = None
      { fila: 8, texto: "CHEQUES EN CARTERA", p: 4092913658, r: 4092913658, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS8 = 40929136.58 · DT8 = 40929136.58
      { fila: 9, texto: "CHEQUES NEGOCIADOS PENDIENTES DE INGRESO", p: -753893939, r: -753893939, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS9 = -7538939.39 · DT9 = -7538939.39
      { fila: 10, texto: "COBRANZA MACRO LI 03/01", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS10 = None · DT10 = None
      { fila: 11, texto: "RESERVA AGUINALDO", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS11 = None · DT11 = None
      { fila: 12, texto: "ADICIONALES / COMISIONES PENDIENTES", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS12 = None · DT12 = None
      { fila: 13, texto: "RESERVA APORTE MS - DEVOLUCION LUQUE", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS13 = None · DT13 = None
      { fila: 14, texto: "RECUPERO APORTE BLANQUEO", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS14 = None · DT14 = None
      { fila: 15, texto: " TOTAL DISPONIBILIDADES", p: 35826624527, r: 35826624527, calcP: true, calcR: true, tolP: 0, tolR: 0 }, // DS15 = '=SUM(DS4:DS13)' · DT15 = '=SUM(DT4:DT13)'
      { fila: 17, texto: "INGRESOS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS17 = None · DT17 = None
      { fila: 18, texto: "Cobranza Contado", p: 56472974006, r: null, calcP: false, calcR: false, tolP: 1, tolR: 0 }, // DS18 = 564729740.062 · DT18 = None
      { fila: 19, texto: "Cobranza Cheque Diferido", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS19 = None · DT19 = None
      { fila: 20, texto: "Otras operaciones (MANTENOR JUJUY)", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS20 = None · DT20 = None
      { fila: 21, texto: "Otros Operaciones (GOLD SALTA)", p: 1700000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS21 = 17000000 · DT21 = None
      { fila: 22, texto: "Otro (Cobro IVA interempresa)", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS22 = None · DT22 = None
      { fila: 23, texto: "Resultado FCI", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS23 = None · DT23 = None
      { fila: 24, texto: "Préstamo MS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS24 = None · DT24 = None
      { fila: 25, texto: "Reserva pago IVA avianor", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS25 = None · DT25 = None
      { fila: 26, texto: "Venta HS Vuelos Avianor", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS26 = None · DT26 = None
      { fila: 27, texto: "Aporte MS - Devolucion Luque", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS27 = None · DT27 = None
      { fila: 28, texto: "Diferencia Expensas a Recuperar", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS28 = None · DT28 = None
      { fila: 29, texto: "Reserva SAC", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS29 = None · DT29 = None
      { fila: 30, texto: "Retroactivo IPSST", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS30 = None · DT30 = None
      { fila: 31, texto: "Otro (MSNT Av Papa F./Av Siria / Av Sarmiento)", p: 7600000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS31 = 76000000 · DT31 = None
      { fila: 32, texto: "TOTAL INGRESOS", p: 65772974006, r: 0, calcP: true, calcR: true, tolP: 1, tolR: 0 }, // DS32 = '=SUM(DS18:DS31)' · DT32 = '=SUM(DT18:DT31)'
      { fila: 33, texto: "DISPONIBLE ANTES DE GASTOS", p: 101599598533, r: 35826624527, calcP: true, calcR: true, tolP: 1, tolR: 0 }, // DS33 = '=DS15+DS32' · DT33 = '=DT15+DT32'
      { fila: 35, texto: "EGRESOS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS35 = None · DT35 = None
      { fila: 36, texto: "Cheques diferidos", p: 1861816038, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS36 = "=+'DETALLE Ago26'!C29" · DT36 = None
      { fila: 37, texto: "Sueldos", p: 29637468492, r: null, calcP: false, calcR: false, tolP: 1, tolR: 0 }, // DS37 = "=+'DETALLE Ago26'!C5" · DT37 = None
      { fila: 38, texto: "Prestamos y tarjetas", p: 781424163, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS38 = "=+'DETALLE Ago26'!C31" · DT38 = None
      { fila: 39, texto: "SAC", p: 2469789041, r: null, calcP: false, calcR: false, tolP: 1, tolR: 0 }, // DS39 = "=+'DETALLE Ago26'!C6" · DT39 = None
      { fila: 40, texto: "Adicionales y comisiones especiales", p: 4739000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS40 = "=+'DETALLE Ago26'!C36+'DETALLE Ago26'!C35" · DT40 = None
      { fila: 41, texto: "Impuestos", p: 9000000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS41 = "=+'DETALLE Ago26'!C32+'DETALLE Ago26'!C7" · DT41 = None
      { fila: 42, texto: "Expensas", p: 2331200000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS42 = "=+'DETALLE Ago26'!C37" · DT42 = None
      { fila: 43, texto: "Gastos Bancarios", p: 1500000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS43 = "=+'DETALLE Ago26'!C28" · DT43 = None
      { fila: 44, texto: "Proveedores", p: 8470000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS44 = "=+'DETALLE Ago26'!C9" · DT44 = None
      { fila: 45, texto: "Compra IVA", p: 2500000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS45 = "=+'DETALLE Ago26'!C30" · DT45 = None
      { fila: 46, texto: "Liquidaciones finales y juicios", p: 2000000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS46 = "=+'DETALLE Ago26'!C27" · DT46 = None
      { fila: 47, texto: "Gastos Gold Seguridad", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS47 = None · DT47 = None
      { fila: 48, texto: "TOTAL EGRESOS OPERATIVOS", p: 65290697734, r: 0, calcP: true, calcR: true, tolP: 2, tolR: 0 }, // DS48 = '=SUM(DS36:DS47)' · DT48 = '=SUM(DT36:DT47)'
      { fila: 49, texto: "Reembolsos de préstamos", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS49 = None · DT49 = None
      { fila: 50, texto: "Dividendos", p: 619367000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS50 = 6193670 · DT50 = None
      { fila: 51, texto: "Devolcion MS - Aporte Camioneta", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS51 = None · DT51 = None
      { fila: 52, texto: "Traspaso Saldo Prestamo MS - Brillante a Mantenor", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS52 = None · DT52 = None
      { fila: 53, texto: "Traspaso Saldo Inicial Brillante - Mantenor", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS53 = None · DT53 = None
      { fila: 54, texto: "Ajuste Caja -  A conciliar", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS54 = None · DT54 = None
      { fila: 55, texto: "Devolucion Luque - Aporte MS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS55 = None · DT55 = None
      { fila: 56, texto: "Aporte para blanqueo", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS56 = None · DT56 = None
      { fila: 57, texto: "Recupero Gastos", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS57 = None · DT57 = None
      { fila: 58, texto: "Inversiones", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS58 = None · DT58 = None
      { fila: 59, texto: "TOTAL EGRESOS", p: 65910064734, r: 0, calcP: true, calcR: true, tolP: 2, tolR: 0 }, // DS59 = '=SUM(DS48:DS58)' · DT59 = '=SUM(DT48:DT58)'
      { fila: 60, texto: "SALDO INICIAL + INGRESOS - TOTAL EGRESOS", p: 35689533799, r: 35826624527, calcP: true, calcR: true, tolP: 3, tolR: 0 }, // DS60 = '=DS33-DS59' · DT60 = '=DT33-DT59'
      { fila: 61, texto: "CAPITAL DE TRABAJO PROPUESTO (SUELDOS)", p: 35207257533, r: null, calcP: true, calcR: false, tolP: 2, tolR: 0 }, // DS61 = '=+DS37+DS39+31000000' · DT61 = None
      { fila: 62, texto: "DISPONIBLE SI - CAPITAL DE TRABAJO", p: 619366994, r: null, calcP: true, calcR: false, tolP: 2, tolR: 0 }, // DS62 = '=+DS15-DS61' · DT62 = None
    ],
    previos: [
    ],
  },
  "havanna": {
    archivo: "PF - HAVANNA - AGOSTO 2026.xlsx",
    celdaP: "DS",
    filas: [
      { fila: 4, texto: "DISPONIBILIDADES (principios de mes)", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS4 = None · DT4 = None
      { fila: 5, texto: "BANCO Y FCI", p: 18468433041, r: 18468433041, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS5 = 184684330.41 · DT5 = 184684330.41
      { fila: 6, texto: "EFECTIVO", p: 4502825061, r: 4502825061, calcP: false, calcR: false, tolP: 1, tolR: 1 }, // DS6 = 45028250.605627365 · DT6 = 45028250.605627365
      { fila: 7, texto: "DOLARES", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS7 = None · DT7 = None
      { fila: 8, texto: "RESERVA AGUINALDO", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS8 = None · DT8 = None
      { fila: 9, texto: "CHEQUES NEGOCIADOS PENDIENTES DE INGRESO", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS9 = None · DT9 = None
      { fila: 10, texto: "INGRESO BANCO MACRO", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS10 = None · DT10 = None
      { fila: 11, texto: " TOTAL DISPONIBILIDADES", p: 22971258102, r: 22971258102, calcP: true, calcR: true, tolP: 1, tolR: 1 }, // DS11 = '=SUM(DS5:DS10)' · DT11 = '=SUM(DT5:DT10)'
      { fila: 13, texto: "INGRESOS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS13 = None · DT13 = None
      { fila: 14, texto: "Cobranza Bancos Ingreso Neto", p: 49006739460, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS14 = "=+'DETALLE AGOSTO 2026'!K6" · DT14 = None
      { fila: 15, texto: "Cobranzas locales", p: 21002888340, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS15 = "=+'DETALLE AGOSTO 2026'!K5" · DT15 = None
      { fila: 16, texto: "Acreditacion Tarjetas pendientes", p: 4807128000, r: null, calcP: true, calcR: false, tolP: 0, tolR: 0 }, // DS16 = '=-DP21' · DT16 = None
      { fila: 17, texto: "Resultado FCI", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS17 = None · DT17 = None
      { fila: 18, texto: "Reserva Aguinaldo", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS18 = None · DT18 = None
      { fila: 19, texto: "Préstamo", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS19 = None · DT19 = None
      { fila: 20, texto: "Préstamo MS ", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS20 = None · DT20 = None
      { fila: 21, texto: "Otro tarjeta no ingresada", p: -9801347892, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS21 = "=+-'DETALLE AGOSTO 2026'!K7" · DT21 = None
      { fila: 22, texto: "Otros Ingresos", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS22 = None · DT22 = None
      { fila: 23, texto: "Recupero Gastos MS ", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS23 = None · DT23 = None
      { fila: 24, texto: "TOTAL INGRESOS", p: 65015407908, r: 0, calcP: true, calcR: true, tolP: 0, tolR: 0 }, // DS24 = '=SUM(DS14:DS23)' · DT24 = '=SUM(DT14:DT23)'
      { fila: 25, texto: "DISPONIBLE ANTES DE GASTOS", p: 87986666010, r: 22971258102, calcP: true, calcR: true, tolP: 1, tolR: 1 }, // DS25 = '=DS11+DS24' · DT25 = '=DT11+DT24'
      { fila: 27, texto: "EGRESOS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS27 = None · DT27 = None
      { fila: 28, texto: "Cheques diferidos", p: 311251120, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS28 = "=+'DETALLE AGOSTO 2026'!E93" · DT28 = None
      { fila: 29, texto: "Sueldos", p: 9077251407, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS29 = "=+'DETALLE AGOSTO 2026'!E59+'DETALLE AGOSTO 2026'!E60" · DT29 = None
      { fila: 30, texto: "SAC Y VACACIONES", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS30 = None · DT30 = None
      { fila: 31, texto: "Prestamos", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS31 = None · DT31 = None
      { fila: 32, texto: "Tarjetas y Comisiones", p: 750000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS32 = "=+'DETALLE AGOSTO 2026'!E77" · DT32 = None
      { fila: 33, texto: "Inversiones", p: 6000000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS33 = 60000000 · DT33 = None
      { fila: 34, texto: "Impuestos", p: 4619230769, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS34 = "=+'DETALLE AGOSTO 2026'!E62+'DETALLE AGOSTO 2026'!E82" · DT34 = None
      { fila: 35, texto: "Expensas", p: 2068000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS35 = "=+'DETALLE AGOSTO 2026'!E63" · DT35 = None
      { fila: 36, texto: "Impuesto al cheque", p: 1200000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS36 = "=+'DETALLE AGOSTO 2026'!E83" · DT36 = None
      { fila: 37, texto: "Compra IVA", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS37 = None · DT37 = None
      { fila: 38, texto: "Proveedores", p: 30100287976, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS38 = "=+'DETALLE AGOSTO 2026'!F38+'DETALLE AGOSTO 2026'!F55+'DETALLE AGOSTO 2026'!F66+'DETALLE AGOSTO 2026'!F95" · DT38 = None
      { fila: 39, texto: "Juicios", p: 400000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS39 = "=+'DETALLE AGOSTO 2026'!E64" · DT39 = None
      { fila: 40, texto: "Liq Final", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS40 = None · DT40 = None
      { fila: 41, texto: "TOTAL EGRESOS OPERATIVOS", p: 54526021272, r: 0, calcP: true, calcR: true, tolP: 0, tolR: 0 }, // DS41 = '=SUM(DS28:DS40)' · DT41 = '=SUM(DT28:DT40)'
      { fila: 42, texto: "Devolucion prestamo - Deuda expensas", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS42 = None · DT42 = None
      { fila: 43, texto: "Devolucion prestamo - Prestamo MS", p: 2300934701, r: null, calcP: true, calcR: false, tolP: 2, tolR: 0 }, // DS43 = '=+DS52' · DT43 = None
      { fila: 44, texto: "Dividendos", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS44 = None · DT44 = None
      { fila: 45, texto: "Cuenta Particular MS -  Aporte liquidacion Mundo Cell", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS45 = None · DT45 = None
      { fila: 46, texto: "Ajuste Caja - A conciliar", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS46 = None · DT46 = None
      { fila: 47, texto: "Pagos solicitados MS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS47 = None · DT47 = None
      { fila: 48, texto: "Retiros MS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DS48 = None · DT48 = None
      { fila: 49, texto: "TOTAL EGRESOS", p: 56826955973, r: 0, calcP: true, calcR: true, tolP: 2, tolR: 0 }, // DS49 = '=SUM(DS41:DS48)' · DT49 = '=SUM(DT41:DT48)'
      { fila: 50, texto: "SALDO INICIAL + INGRESOS - TOTAL EGRESOS", p: 31159710037, r: 22971258102, calcP: true, calcR: true, tolP: 3, tolR: 1 }, // DS50 = '=DS25-DS49' · DT50 = '=DT25-DT49'
      { fila: 51, texto: "CAPITAL DE TRABAJO PROPUESTO", p: 20670323401, r: null, calcP: true, calcR: false, tolP: 1, tolR: 0 }, // DS51 = '=+DS29+DS35+DS38/4+DS33/3' · DT51 = None
      { fila: 52, texto: "DISPONIBLE SI - CAPITAL DE TRABAJO", p: 2300934701, r: null, calcP: true, calcR: false, tolP: 2, tolR: 0 }, // DS52 = '=+DS11-DS51+DS19' · DT52 = None
    ],
    previos: [
      { celda: "DP21", fila: 21, texto: "Otro tarjeta no ingresada", columna: "R", mesesAtras: 1, valor: -4807128000 },
    ],
  },
  "radio": {
    archivo: "PF - RADIO - AGOSTO 2026.xlsx",
    celdaP: "DU",
    filas: [
      { fila: 4, texto: "DISPONIBILIDADES (principios de mes)", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU4 = None · DV4 = None
      { fila: 5, texto: "BANCO Y FCI", p: 5380348494, r: 5380348494, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU5 = 53803484.94 · DV5 = 53803484.94
      { fila: 6, texto: "EFECTIVO", p: 679751882, r: 679751882, calcP: false, calcR: false, tolP: 1, tolR: 1 }, // DU6 = 6797518.820938405 · DV6 = 6797518.820938405
      { fila: 7, texto: "CHEQUES EN CARTERA", p: 396552418, r: 396552418, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU7 = 3965524.1799999997 · DV7 = 3965524.1799999997
      { fila: 8, texto: "CHEQUES NEGOCIADOS PENDIENTES DE INGRESO", p: -764500000, r: -764500000, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU8 = -7645000 · DV8 = -7645000
      { fila: 9, texto: "COMISIONES ESPECIALES PENDIENTES", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU9 = None · DV9 = None
      { fila: 10, texto: "RESERVA AGUINALDO", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU10 = None · DV10 = None
      { fila: 11, texto: "CHEQUES EN CARTERA DESPUES DEL 15", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU11 = None · DV11 = None
      { fila: 12, texto: " TOTAL DISPONIBILIDADES", p: 5692152794, r: 5692152794, calcP: true, calcR: true, tolP: 1, tolR: 1 }, // DU12 = '=SUM(DU4:DU11)' · DV12 = '=SUM(DV4:DV11)'
      { fila: 14, texto: "INGRESOS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU14 = None · DV14 = None
      { fila: 15, texto: "Cobranza clientes", p: 9600000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU15 = 96000000 · DV15 = None
      { fila: 16, texto: "Otras operaciones", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU16 = None · DV16 = None
      { fila: 17, texto: "Resultado FCI", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU17 = None · DV17 = None
      { fila: 18, texto: "Reserva de aguinaldo", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU18 = None · DV18 = None
      { fila: 19, texto: "Cheques despues del 15", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU19 = None · DV19 = None
      { fila: 20, texto: "Ingreso - Cobro juicio Municipalidad", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU20 = None · DV20 = None
      { fila: 21, texto: "Devolucion embargo", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU21 = None · DV21 = None
      { fila: 22, texto: "Otro", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU22 = None · DV22 = None
      { fila: 23, texto: "TOTAL INGRESOS", p: 9600000000, r: 0, calcP: true, calcR: true, tolP: 0, tolR: 0 }, // DU23 = '=SUM(DU15:DU22)' · DV23 = '=SUM(DV15:DV22)'
      { fila: 24, texto: "DISPONIBLE ANTES DE GASTOS", p: 15292152794, r: 5692152794, calcP: true, calcR: true, tolP: 1, tolR: 1 }, // DU24 = '=+DU23+DU12' · DV24 = '=+DV23+DV12'
      { fila: 26, texto: "EGRESOS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU26 = None · DV26 = None
      { fila: 27, texto: "Cheques diferidos", p: 252336050, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU27 = 2523360.5 · DV27 = None
      { fila: 28, texto: "Sueldos", p: 3502934952, r: null, calcP: false, calcR: false, tolP: 1, tolR: 0 }, // DU28 = "=+'DETALLE GASTOS PRESUPUESTADOS'!D7" · DV28 = None
      { fila: 29, texto: "SAC", p: 0, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU29 = 0 · DV29 = None
      { fila: 30, texto: "Prestamos y tarjetas", p: 0, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU30 = 0 · DV30 = None
      { fila: 31, texto: "Comisiones Especiales", p: 714000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU31 = "=+'DETALLE GASTOS PRESUPUESTADOS'!D65" · DV31 = None
      { fila: 32, texto: "Impuestos", p: 973384615, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU32 = "=+'DETALLE GASTOS PRESUPUESTADOS'!D22" · DV32 = None
      { fila: 33, texto: "Expensas", p: 846000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU33 = "=+'DETALLE GASTOS PRESUPUESTADOS'!D67" · DV33 = None
      { fila: 34, texto: "Expensas - No socios", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU34 = None · DV34 = None
      { fila: 35, texto: "Impuesto al cheque (Gto Brio)", p: 200000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU35 = "=+'DETALLE GASTOS PRESUPUESTADOS'!D27" · DV35 = None
      { fila: 36, texto: "Costo IVA / Factura C / Efectivo", p: 200000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU36 = "=+'DETALLE GASTOS PRESUPUESTADOS'!D24" · DV36 = None
      { fila: 37, texto: "Proveedores", p: 2200097500, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU37 = "=+'DETALLE GASTOS PRESUPUESTADOS'!D62" · DV37 = None
      { fila: 38, texto: "Juicios", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU38 = None · DV38 = None
      { fila: 39, texto: "TOTAL EGRESOS OPERATIVOS", p: 8888753117, r: 0, calcP: true, calcR: true, tolP: 1, tolR: 0 }, // DU39 = '=SUM(DU27:DU38)' · DV39 = '=SUM(DV27:DV38)'
      { fila: 40, texto: "Reembolsos de préstamos", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU40 = None · DV40 = None
      { fila: 41, texto: "Dividendos", p: 2500000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU41 = 25000000 · DV41 = None
      { fila: 42, texto: "Ajuste caja - A conciliar", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU42 = None · DV42 = None
      { fila: 43, texto: "Otro", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DU43 = None · DV43 = None
      { fila: 44, texto: "TOTAL EGRESOS", p: 11388753117, r: 0, calcP: true, calcR: true, tolP: 1, tolR: 0 }, // DU44 = '=SUM(DU39:DU43)' · DV44 = '=SUM(DV39:DV43)'
      { fila: 45, texto: "SALDO INICIAL + INGRESOS - TOTAL EGRESOS", p: 3903399677, r: 5692152794, calcP: true, calcR: true, tolP: 2, tolR: 1 }, // DU45 = '=DU24-DU44' · DV45 = '=DV24-DV44'
      { fila: 46, texto: "CAPITAL DE TRABAJO PROPUESTO (15 DIAS)", p: 4444376559, r: null, calcP: true, calcR: false, tolP: 2, tolR: 0 }, // DU46 = '=+DU39/2' · DV46 = None
      { fila: 47, texto: "DISPONIBLE SI - CAPITAL DE TRABAJO", p: 1247776236, r: null, calcP: true, calcR: false, tolP: 3, tolR: 0 }, // DU47 = '=+DU12-DU46' · DV47 = None
    ],
    previos: [
    ],
  },
  "fredy-publicidad": {
    archivo: "PF - FREDY - AGOSTO 2026.xlsx",
    celdaP: "DQ",
    filas: [
      { fila: 3, texto: "Disponibilidades", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ3 = 'PRESUPUESTADO' · DR3 = 'REAL'
      { fila: 4, texto: "BANCOS + FCI", p: 10329828040, r: 10329828040, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ4 = 103298280.4 · DR4 = 103298280.4
      { fila: 5, texto: "EFECTIVO", p: 1275103635, r: 1275103635, calcP: false, calcR: false, tolP: 1, tolR: 1 }, // DQ5 = 12751036.3513764 · DR5 = 12751036.3513764
      { fila: 6, texto: "DÓLAR", p: 192071600, r: 192071600, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ6 = 1920716 · DR6 = 1920716
      { fila: 7, texto: "CHEQUES NEGOCIADOS PENDIENTES DE INGRESO", p: -4280790574, r: -4280790574, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ7 = -42807905.74 · DR7 = -42807905.74
      { fila: 8, texto: "RESERVA CAPITAL DE TRABAJO", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ8 = None · DR8 = None
      { fila: 9, texto: "RESERVA AGUINALDO", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ9 = None · DR9 = None
      { fila: 10, texto: "COMISIONES ESPECIALES PENDIENTES DE PAGO", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ10 = None · DR10 = None
      { fila: 11, texto: "DIVIDENDOS PENDIENTES", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ11 = None · DR11 = None
      { fila: 12, texto: "RECUPERO APORTE BLANQUEO", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ12 = None · DR12 = None
      { fila: 13, texto: "DISPONIBILIDADES INICIALES", p: 7516212701, r: 7516212701, calcP: true, calcR: true, tolP: 1, tolR: 1 }, // DQ13 = '=SUM(DQ4:DQ12)' · DR13 = '=SUM(DR4:DR12)'
      { fila: 15, texto: "INGRESOS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ15 = None · DR15 = None
      { fila: 16, texto: "Cobranza clientes", p: 15000000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ16 = 150000000 · DR16 = None
      { fila: 17, texto: "Otras operaciones (APORTES)", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ17 = None · DR17 = None
      { fila: 18, texto: "Resultado FCI", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ18 = None · DR18 = None
      { fila: 19, texto: "Reserva Aguinaldo", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ19 = None · DR19 = None
      { fila: 20, texto: "Reserva Capital de Trabajo", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ20 = None · DR20 = None
      { fila: 21, texto: "Aporte para blaqueo otras empresas", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ21 = None · DR21 = None
      { fila: 22, texto: "Prestamo MS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ22 = None · DR22 = None
      { fila: 23, texto: "Cheques negociados no ingresados IVA", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ23 = None · DR23 = None
      { fila: 24, texto: "Otro", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ24 = None · DR24 = None
      { fila: 25, texto: "TOTAL INGRESOS", p: 15000000000, r: 0, calcP: true, calcR: true, tolP: 0, tolR: 0 }, // DQ25 = '=SUM(DQ16:DQ24)' · DR25 = '=SUM(DR16:DR24)'
      { fila: 26, texto: "DISPONIBLE ANTES DE GASTOS", p: 22516212701, r: 7516212701, calcP: true, calcR: true, tolP: 1, tolR: 1 }, // DQ26 = '=DQ13+DQ25' · DR26 = '=DR13+DR25'
      { fila: 28, texto: "EGRESOS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ28 = None · DR28 = None
      { fila: 29, texto: "Cheques diferidos", p: 448634300, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ29 = 4486343 · DR29 = None
      { fila: 30, texto: "Sueldos", p: 1603920732, r: null, calcP: false, calcR: false, tolP: 1, tolR: 0 }, // DQ30 = "=+'PRESUP. AGOSTO 2026'!C11" · DR30 = None
      { fila: 31, texto: "SAC", p: 0, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ31 = 0 · DR31 = None
      { fila: 32, texto: "Comision Especial", p: 990000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ32 = "=+'PRESUP. AGOSTO 2026'!C21" · DR32 = None
      { fila: 33, texto: "Compra de IVA", p: 1100000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ33 = "=+'PRESUP. AGOSTO 2026'!C24" · DR33 = None
      { fila: 34, texto: "Pagos especiales", p: 405000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ34 = "=+'PRESUP. AGOSTO 2026'!C35" · DR34 = None
      { fila: 35, texto: "Impuestos", p: 2000000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ35 = "=+'PRESUP. AGOSTO 2026'!C46" · DR35 = None
      { fila: 36, texto: "Expensas", p: 1240800000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ36 = "=+'PRESUP. AGOSTO 2026'!C49" · DR36 = None
      { fila: 37, texto: "Expensas - No socios", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ37 = None · DR37 = None
      { fila: 38, texto: "Impuesto al cheque", p: 400000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ38 = "=+'PRESUP. AGOSTO 2026'!C53" · DR38 = None
      { fila: 39, texto: "Proveedores", p: 4476061791, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ39 = "=+'PRESUP. AGOSTO 2026'!C93+'PRESUP. AGOSTO 2026'!C105" · DR39 = None
      { fila: 40, texto: "Liq final", p: 280000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ40 = "=+'PRESUP. AGOSTO 2026'!C17" · DR40 = None
      { fila: 41, texto: "Otro", p: 300026500, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ41 = "=+'PRESUP. AGOSTO 2026'!C118" · DR41 = None
      { fila: 42, texto: "TOTAL EGRESOS OPERATIVOS", p: 13244443323, r: 0, calcP: true, calcR: true, tolP: 1, tolR: 0 }, // DQ42 = '=SUM(DQ29:DQ41)' · DR42 = '=SUM(DR29:DR41)'
      { fila: 43, texto: "Reembolsos de préstamos", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ43 = None · DR43 = None
      { fila: 44, texto: "Aporte para blanqueo con fondos propios", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ44 = None · DR44 = None
      { fila: 45, texto: "Aporte para blanqueo con fondos de terceros", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ45 = None · DR45 = None
      { fila: 46, texto: "Ajuste Caja - A conciliar", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ46 = None · DR46 = None
      { fila: 47, texto: "Dividendos", p: 3500000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ47 = 35000000 · DR47 = None
      { fila: 48, texto: "Inversiones", p: 2500000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ48 = 25000000 · DR48 = None
      { fila: 49, texto: "Pagos solicitados por MS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DQ49 = None · DR49 = None
      { fila: 50, texto: "TOTAL EGRESOS", p: 19244443323, r: 0, calcP: true, calcR: true, tolP: 1, tolR: 0 }, // DQ50 = '=SUM(DQ42:DQ49)' · DR50 = '=SUM(DR42:DR49)'
      { fila: 51, texto: "SALDO INICIAL + INGRESOS - TOTAL EGRESOS", p: 3271769379, r: 7516212701, calcP: true, calcR: true, tolP: 2, tolR: 1 }, // DQ51 = '=DQ26-DQ50' · DR51 = '=DR26-DR50'
      { fila: 52, texto: "CAPITAL DE TRABAJO PROPUESTO", p: 6622221661, r: null, calcP: true, calcR: false, tolP: 2, tolR: 0 }, // DQ52 = '=+DQ42/2' · DR52 = None
      { fila: 53, texto: "DISPONIBLE SI - CAPITAL DE TRABAJO", p: 893991040, r: null, calcP: true, calcR: false, tolP: 3, tolR: 0 }, // DQ53 = '=+DQ13-DQ52' · DR53 = None
    ],
    previos: [
    ],
  },
  "hwc": {
    archivo: "PF - HANDY - AGOSTO 2026.xlsx",
    celdaP: "DN",
    filas: [
      { fila: 3, texto: "Disponibilidades", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN3 = 'ESPERADO' · DO3 = 'REAL'
      { fila: 4, texto: "BANCOS Y FCI", p: 56143853395, r: 56143853395, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN4 = 561438533.95 · DO4 = 561438533.95
      { fila: 5, texto: "CAJA", p: 424553968, r: 424553968, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN5 = 4245539.680000011 · DO5 = 4245539.680000011
      { fila: 6, texto: "TRANSFERENCIA SAIFE PENDIENTE RETIRO", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN6 = None · DO6 = None
      { fila: 7, texto: "CHEQUES EN CARTERA", p: 5645843046, r: 5645843046, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN7 = 56458430.46 · DO7 = 56458430.46
      { fila: 8, texto: "CHEQUES PENDIENTES DE INGRESO", p: -503505017, r: -503505017, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN8 = -5035050.17 · DO8 = -5035050.17
      { fila: 9, texto: "DOLARES EN CAJA", p: 4147000, r: 4147000, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN9 = 41470 · DO9 = 41470
      { fila: 10, texto: "PREVISION SAC", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN10 = None · DO10 = None
      { fila: 11, texto: "PAGO LATAM PENDIENTE", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN11 = None · DO11 = None
      { fila: 12, texto: "DISPONIBILIDAD INICIAL", p: 61714892392, r: 61714892392, calcP: true, calcR: true, tolP: 0, tolR: 0 }, // DN12 = '=SUM(DN4:DN11)' · DO12 = '=SUM(DO4:DO11)'
      { fila: 14, texto: "INGRESOS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN14 = None · DO14 = None
      { fila: 15, texto: "CLIENTES PROPIOS", p: 12000000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN15 = 120000000 · DO15 = None
      { fila: 16, texto: "FACTURACION HANDY A LATAM", p: 47352800000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN16 = 473528000 · DO16 = None
      { fila: 17, texto: "RECAUDACION LATAM Y AVIANCA", p: 71250000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN17 = 712500000 · DO17 = None
      { fila: 18, texto: "RECAUDACION JETSMART", p: 15000000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN18 = 150000000 · DO18 = None
      { fila: 19, texto: "RESERVA SAC", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN19 = None · DO19 = None
      { fila: 20, texto: "RECUPERO EXPENSAS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN20 = None · DO20 = None
      { fila: 21, texto: "RECUPERO APORTE BLANQUEO", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN21 = None · DO21 = None
      { fila: 22, texto: "RESULTADO FCI", p: 900000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN22 = 9000000 · DO22 = None
      { fila: 23, texto: "TOTAL DE INGRESOS", p: 146502800000, r: 0, calcP: true, calcR: true, tolP: 0, tolR: 0 }, // DN23 = '=SUM(DN15:DN22)' · DO23 = '=SUM(DO15:DO22)'
      { fila: 24, texto: "DISPONIBLE ANTES DE GASTOS", p: 208217692392, r: 61714892392, calcP: true, calcR: true, tolP: 0, tolR: 0 }, // DN24 = '=DN12+DN23' · DO24 = '=DO12+DO23'
      { fila: 26, texto: "GASTOS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN26 = None · DO26 = None
      { fila: 27, texto: "IMPUESTO AL CHEQUE", p: 2500000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN27 = 25000000 · DO27 = None
      { fila: 28, texto: "CHEQUES DIFERIDOS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN28 = None · DO28 = None
      { fila: 29, texto: "IMPUESTOS", p: 13164491205, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN29 = "=-'DETALLE PRESUPUESTO'!B19" · DO29 = None
      { fila: 30, texto: "PRESTAMOS BANCARIOS Y TC", p: 2000000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN30 = 20000000 · DO30 = None
      { fila: 31, texto: "PROVEEDORES Y SERVICIOS", p: 16023941136, r: null, calcP: false, calcR: false, tolP: 1, tolR: 0 }, // DN31 = "=-'DETALLE PRESUPUESTO'!B106" · DO31 = None
      { fila: 32, texto: "SUELDOS", p: 25000000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN32 = 250000000 · DO32 = None
      { fila: 33, texto: "SAC", p: 0, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN33 = 0 · DO33 = None
      { fila: 34, texto: "EXPENSAS", p: 2318937100, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN34 = 23189371 · DO34 = None
      { fila: 35, texto: "COSTO OPERACIONES IVA", p: 4750000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN35 = 47500000 · DO35 = None
      { fila: 36, texto: "LIQUIDACIONES FINALES", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN36 = None · DO36 = None
      { fila: 37, texto: "COMISIONES ESPECIALES", p: 300000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN37 = 3000000 · DO37 = None
      { fila: 38, texto: "SUBTOTAL ESTRUCTURA DE GASTOS", p: 66057369441, r: 0, calcP: true, calcR: true, tolP: 1, tolR: 0 }, // DN38 = '=SUM(DN27:DN37)' · DO38 = '=SUM(DO27:DO37)'
      { fila: 39, texto: "PAGO GLOBE AIR CARGO", p: 7578988324, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN39 = 75789883.24 · DO39 = None
      { fila: 40, texto: "PAGO LATAM Y LAN ECUADOR", p: 44414976357, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN40 = '=395251226.77+6131770+42766766.8' · DO40 = None
      { fila: 41, texto: "PAGO AVIANCA", p: 13577515080, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN41 = 135775150.8 · DO41 = None
      { fila: 42, texto: "PAGO FLYBONDI", p: 874564820, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN42 = 8745648.2 · DO42 = None
      { fila: 43, texto: "PAGO GOL LINEAS AEREAS", p: 320833940, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN43 = 3208339.4 · DO43 = None
      { fila: 44, texto: "Dividendos Entregados", p: 0, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN44 = 0 · DO44 = None
      { fila: 45, texto: "Gastos Avion", p: 300000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN45 = 3000000 · DO45 = None
      { fila: 46, texto: "MS", p: 200000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN46 = 2000000 · DO46 = None
      { fila: 47, texto: "Ajuste Caja - A conciliar", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN47 = None · DO47 = None
      { fila: 48, texto: "Aporte Blanqueo", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN48 = None · DO48 = None
      { fila: 49, texto: "Dividendos Pendientes", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // DN49 = None · DO49 = None
      { fila: 50, texto: "TOTAL EN EFECTIVO PAGADO", p: 133324247962, r: 0, calcP: true, calcR: true, tolP: 1, tolR: 0 }, // DN50 = '=SUM(DN38:DN49)' · DO50 = '=SUM(DO38:DO49)'
      { fila: 51, texto: "POSICIÓN DE EFECTIVO (fin de mes)", p: 74893444430, r: 61714892392, calcP: true, calcR: true, tolP: 1, tolR: 0 }, // DN51 = '=DN24-DN50' · DO51 = '=DO24-DO50'
      { fila: 52, texto: "Capital de trabajo propuesto", p: 66057369441, r: null, calcP: true, calcR: false, tolP: 1, tolR: 0 }, // DN52 = '=+DN38' · DO52 = None
      { fila: 53, texto: "Excedente (+) / Faltante (-)", p: -4342477049, r: null, calcP: true, calcR: false, tolP: 1, tolR: 0 }, // DN53 = '=+DN12-DN52' · DO53 = None
    ],
    previos: [
    ],
  },
  "mantenor": {
    archivo: "PF - MANTENOR - AGOSTO 2026.xlsx",
    celdaP: "N",
    filas: [
      { fila: 4, texto: "BANCO Y FCI", p: 44950004136, r: 44950004136, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N4 = '=385425510.36+64074531' · O4 = '=385425510.36+64074531'
      { fila: 5, texto: "EFECTIVO", p: 1759799482, r: 1759799482, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N5 = '=153768033.38-78411842.93+6316335.37-64074531' · O5 = '=153768033.38-78411842.93+6316335.37-64074531'
      { fila: 6, texto: "DOLARES", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N6 = None · O6 = None
      { fila: 7, texto: "CHEQUES NEGOCIADOS PENDIENTES DE INGRESO", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N7 = None · O7 = None
      { fila: 8, texto: "EFECTIVO DISPONIBLE (principios de mes)", p: 46709803618, r: 46709803618, calcP: true, calcR: true, tolP: 0, tolR: 0 }, // N8 = '=SUM(N4:N7)' · O8 = '=SUM(O4:O7)'
      { fila: 10, texto: "INGRESOS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N10 = None · O10 = None
      { fila: 11, texto: "Cobranza Mantenor Jujuy", p: 6000000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N11 = 60000000 · O11 = None
      { fila: 12, texto: "Cobranza MSNT Av Papa F./Av Siria / Av Sarmiento", p: 49210000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N12 = 492100000 · O12 = None
      { fila: 13, texto: "Traspaso Saldo Inicial Brillante - Mantenor", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N13 = None · O13 = None
      { fila: 14, texto: "Traspaso Saldo Prestamo MS - Brillante a Mantenor", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N14 = None · O14 = None
      { fila: 15, texto: "Resultado FCI", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N15 = None · O15 = None
      { fila: 16, texto: "Préstamo MS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N16 = None · O16 = None
      { fila: 17, texto: "TOTAL INGRESOS", p: 55210000000, r: 0, calcP: true, calcR: true, tolP: 0, tolR: 0 }, // N17 = '=SUM(N11:N16)' · O17 = '=SUM(O11:O16)'
      { fila: 18, texto: "DISPONIBLE ANTES DE GASTOS", p: 101919803618, r: 46709803618, calcP: true, calcR: true, tolP: 0, tolR: 0 }, // N18 = '=N8+N17' · O18 = '=O8+O17'
      { fila: 20, texto: "GASTOS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N20 = None · O20 = None
      { fila: 21, texto: "Cheques diferidos", p: 440000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N21 = "=+'DETALLE Ago26'!C37" · O21 = None
      { fila: 22, texto: "Sueldos", p: 5400000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N22 = "=+'DETALLE Ago26'!C5" · O22 = None
      { fila: 23, texto: "SAC", p: 450000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N23 = "=+'DETALLE Ago26'!C6" · O23 = None
      { fila: 24, texto: "Tarjetas", p: 200000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N24 = "=+'DETALLE Ago26'!C39" · O24 = None
      { fila: 25, texto: "Adicionales y comisiones especiales", p: 1082620000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N25 = "=+'DETALLE Ago26'!C43" · O25 = None
      { fila: 26, texto: "Impuestos", p: 3805000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N26 = "=+'DETALLE Ago26'!C40+'DETALLE Ago26'!C7" · O26 = None
      { fila: 27, texto: "Expensas", p: 2218400000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N27 = "=+'DETALLE Ago26'!C44" · O27 = None
      { fila: 28, texto: "Gastos Bancarios", p: 1000000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N28 = "=+'DETALLE Ago26'!C36" · O28 = None
      { fila: 29, texto: "Compra IVA", p: 3700000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N29 = "=+'DETALLE Ago26'!C38" · O29 = None
      { fila: 30, texto: "Proveedores", p: 17958500000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N30 = "=+'DETALLE Ago26'!C9+'DETALLE Ago26'!C29" · O30 = None
      { fila: 31, texto: "Liquidaciones Finales y Juicios", p: 0, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N31 = "=+'DETALLE Ago26'!C35" · O31 = None
      { fila: 32, texto: "TOTAL GASTOS OPERATIVOS", p: 36254520000, r: 0, calcP: true, calcR: true, tolP: 0, tolR: 0 }, // N32 = '=SUM(N21:N31)' · O32 = '=SUM(O21:O31)'
      { fila: 33, texto: "Prestamos", p: 23589803618, r: null, calcP: true, calcR: false, tolP: 0, tolR: 0 }, // N33 = '=+N39' · O33 = None
      { fila: 34, texto: "Dividendos", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N34 = None · O34 = None
      { fila: 35, texto: "Inversiones", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N35 = None · O35 = None
      { fila: 36, texto: "TOTAL GASTOS", p: 59844323618, r: null, calcP: true, calcR: false, tolP: 0, tolR: 0 }, // N36 = '=SUM(N32:N35)' · O36 = None
      { fila: 37, texto: "POSICIÓN DE EFECTIVO (fin de mes)", p: 42075480000, r: null, calcP: true, calcR: false, tolP: 0, tolR: 0 }, // N37 = '=+N8+N17-N36' · O37 = None
      { fila: 38, texto: "CAPITAL DE TRABAJO PROPUESTO (SUELDOS)", p: 23120000000, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // N38 = 231200000 · O38 = None
      { fila: 39, texto: "DISPONIBLE SI - CAPITAL DE TRABAJO", p: 23589803618, r: null, calcP: true, calcR: false, tolP: 0, tolR: 0 }, // N39 = '=+N8-N38' · O39 = None
    ],
    previos: [
    ],
  },
  // Avianor: sin Capital de trabajo ni Disponible. Efectivo (W4) es un número tipeado: en la planilla es el
  // cierre del mes anterior (=T37), pero la plantilla no calcula el arrastre. Las filas con Real por
  // clasificación (Cobranza, Sueldos, Impuestos, Expensas, Proveedores) leen en la planilla la tabla
  // dinámica de la hoja AGOSTO; Tarjetas sale de la misma tabla pero la plantilla la deja manual.
  "avianor": {
    archivo: "PF - AVIANOR AGOSTO 2026.xlsx",
    celdaP: "W",
    filas: [
      { fila: 4, texto: "EFECTIVO DISPONIBLE (principios de mes)", p: -2474373039, r: -2474373039, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W4 = '=T37' · X4 = '=+W4'
      { fila: 6, texto: "INGRESOS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W6 = None · X6 = None
      { fila: 7, texto: "Cobranza clientes", p: 858603963, r: 858603963, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W7 = '=+AGOSTO!B40' · X7 = '=+AGOSTO!C40'
      { fila: 8, texto: "Otras operaciones", p: 0, r: 0, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W8 = 0 · X8 = 0
      { fila: 9, texto: "Venta de Propiedades y Equipos", p: 0, r: 0, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W9 = 0 · X9 = 0
      { fila: 10, texto: "Cobro de Capital de Préstamos", p: 0, r: 0, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W10 = 0 · X10 = 0
      { fila: 11, texto: "Préstamo", p: 0, r: 0, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W11 = 0 · X11 = 0
      { fila: 12, texto: "Aporte MS", p: 0, r: 0, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W12 = 0 · X12 = 0
      { fila: 13, texto: "Otro", p: 0, r: 0, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W13 = 0 · X13 = 0
      { fila: 14, texto: "TOTAL INGRESOS", p: 858603963, r: 858603963, calcP: true, calcR: true, tolP: 0, tolR: 0 }, // W14 = '=SUM(W7:W13)' · X14 = '=SUM(X7:X13)'
      { fila: 15, texto: "DISPONIBLE ANTES DE GASTOS", p: -1615769076, r: -1615769076, calcP: true, calcR: true, tolP: 1, tolR: 1 }, // W15 = '=W4+W14' · X15 = '=X4+X14'
      { fila: 17, texto: "EGRESOS", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W17 = None · X17 = None
      { fila: 18, texto: "Cheques diferidos", p: 0, r: 0, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W18 = 0 · X18 = 0
      { fila: 19, texto: "Sueldos", p: 360800000, r: 360800000, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W19 = '=-AGOSTO!B44' · X19 = '=-AGOSTO!C44'
      { fila: 20, texto: "SAC", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W20 = None · X20 = None
      { fila: 21, texto: "Comisiones", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W21 = None · X21 = None
      { fila: 22, texto: "Tarjetas", p: 691993168, r: 691993168, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W22 = '=-AGOSTO!B45' · X22 = '=-AGOSTO!C45'
      { fila: 23, texto: "Adicionales", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W23 = None · X23 = None
      { fila: 24, texto: "Impuestos", p: 114209122, r: 114209122, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W24 = '=-AGOSTO!B42' · X24 = '=-AGOSTO!C42'
      { fila: 25, texto: "Expensas", p: 309856659, r: 309856659, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W25 = '=-AGOSTO!B41' · X25 = '=-AGOSTO!C41'
      { fila: 26, texto: "Expensas - No socios", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W26 = None · X26 = None
      { fila: 27, texto: "Gastos Bancarios", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W27 = None · X27 = None
      { fila: 28, texto: "Proveedores", p: 1070788168, r: 1070788168, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W28 = '=-AGOSTO!B43' · X28 = '=-AGOSTO!C43'
      { fila: 29, texto: "Liquidacion Final", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W29 = None · X29 = None
      { fila: 30, texto: "Otro", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W30 = None · X30 = None
      { fila: 31, texto: "TOTAL EGRESOS OPERATIVOS", p: 2547647117, r: 2547647117, calcP: true, calcR: true, tolP: 1, tolR: 1 }, // W31 = '=SUM(W18:W30)' · X31 = '=SUM(X18:X30)'
      { fila: 32, texto: "Reembolsos de préstamos", p: 0, r: 0, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W32 = 0 · X32 = 0
      { fila: 33, texto: "Dividendos", p: 0, r: 0, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W33 = 0 · X33 = 0
      { fila: 34, texto: "Cuenta Particular", p: null, r: null, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W34 = None · X34 = None
      { fila: 35, texto: "Otro", p: 0, r: 0, calcP: false, calcR: false, tolP: 0, tolR: 0 }, // W35 = 0 · X35 = 0
      { fila: 36, texto: "TOTAL EGRESOS", p: 2547647117, r: 2547647117, calcP: true, calcR: true, tolP: 1, tolR: 1 }, // W36 = '=SUM(W31:W35)' · X36 = shared
      { fila: 37, texto: "SALDO INICIAL + INGRESOS - TOTAL EGRESOS", p: -4163416193, r: -4163416193, calcP: true, calcR: true, tolP: 2, tolR: 2 }, // W37 = '=W15-W36' · X37 = '=X15-X36'
    ],
    previos: [
    ],
  },
};
