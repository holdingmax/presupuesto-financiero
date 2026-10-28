// Bradenton (USD, importes en centavos de dólar), de `PF - BRADENTON - AGOSTO 2026.xlsx`, hoja PRESUPUESTO MES A MES, leída en
// solo lectura con un script FUERA del repo. NO se edita a mano: si algo no cierra, se frena y se muestra la diferencia.
//
// MARZO_2026_BRADENTON: el mes más completo del año (columnas H = PRESUPUESTADO e I = REAL; en el Real tiene 15 filas de
// entrada, incluida Inversion Food Truck). Sirve para probar las fórmulas de P y R que en agosto no se pueden probar porque
// el Real casi no está cargado.
//   calc : true si la celda es una fórmula entre celdas de la hoja (total, posición, excedente).
//   tolP/tolR: 1 centavo por cada sumando de entrada con más de 2 decimales en el Excel.
export type FilaMarzo = { fila: number; texto: string; p: number | null; r: number | null; calc: boolean; tolP: number; tolR: number };
export const MARZO_2026_BRADENTON: FilaMarzo[] = [
  { fila: 4, texto: "DISPONIBILIDADES (principios de mes)", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // H4 = None · I4 = None
  { fila: 5, texto: "BANCO", p: 5401628, r: 5401628, calc: false, tolP: 0, tolR: 0 }, // H5 = 54016.27999999998 · I5 = '=+H5'
  { fila: 6, texto: "EFECTIVO", p: 2654392, r: 2654392, calc: false, tolP: 0, tolR: 0 }, // H6 = 26543.920000000013 · I6 = '=+H6'
  { fila: 7, texto: " TOTAL DISPONIBILIDADES", p: 8056020, r: 8056020, calc: true, tolP: 0, tolR: 0 }, // H7 = '=SUM(H5:H6)' · I7 = '=SUM(I5:I6)'
  { fila: 9, texto: "INGRESOS", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // H9 = None · I9 = None
  { fila: 10, texto: "Cobranza clientes", p: 9000000, r: 9761647, calc: false, tolP: 0, tolR: 0 }, // H10 = 90000 · I10 = 97616.47
  { fila: 11, texto: "Otras operaciones", p: 750000, r: 402058, calc: false, tolP: 0, tolR: 0 }, // H11 = 7500 · I11 = 4020.58
  { fila: 12, texto: "Venta de Propiedades y Equipos", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // H12 = None · I12 = None
  { fila: 13, texto: "Cobro de Capital de Préstamos", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // H13 = None · I13 = None
  { fila: 14, texto: "Préstamo", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // H14 = None · I14 = None
  { fila: 15, texto: "Otro (TC mes anterior)", p: 2000000, r: 3877101, calc: false, tolP: 0, tolR: 0 }, // H15 = 20000 · I15 = 38771.01
  { fila: 16, texto: "Otro", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // H16 = None · I16 = None
  { fila: 17, texto: "TOTAL INGRESOS", p: 11750000, r: 14040806, calc: true, tolP: 0, tolR: 0 }, // H17 = '=SUM(H10:H16)' · I17 = shared
  { fila: 18, texto: "DISPONIBLE ANTES DE GASTOS", p: 19806020, r: 22096826, calc: true, tolP: 0, tolR: 0 }, // H18 = '=H7+H17' · I18 = shared
  { fila: 20, texto: "GASTOS", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // H20 = None · I20 = None
  { fila: 21, texto: "Cheques diferidos", p: 700000, r: 882394, calc: false, tolP: 0, tolR: 0 }, // H21 = 7000 · I21 = 8823.939999999999
  { fila: 22, texto: "Sueldos", p: 1100000, r: 1032790, calc: false, tolP: 0, tolR: 0 }, // H22 = 11000 · I22 = 10327.900000000001
  { fila: 23, texto: "Prestamos y tarjetas", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // H23 = None · I23 = None
  { fila: 24, texto: "Adicionales: ", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // H24 = None · I24 = None
  { fila: 25, texto: "Impuestos", p: 470000, r: 430996, calc: false, tolP: 0, tolR: 0 }, // H25 = 4700 · I25 = 4309.96
  { fila: 26, texto: "Impuesto inmobiliario (Manatee)", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // H26 = None · I26 = None
  { fila: 27, texto: "Expensas", p: 205000, r: 212500, calc: false, tolP: 0, tolR: 0 }, // H27 = 2050 · I27 = 2125
  { fila: 28, texto: "Gastos Bancarios", p: 40000, r: 49520, calc: false, tolP: 0, tolR: 0 }, // H28 = 400 · I28 = 495.2
  { fila: 29, texto: "Proveedoresv(Mercs + Servicios+Mant+ Honorarios)", p: 6038000, r: 485300, calc: false, tolP: 0, tolR: 0 }, // H29 = 60380 · I29 = 4853
  { fila: 30, texto: "Proveedores IVA", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // H30 = None · I30 = None
  { fila: 31, texto: "Liquidaciones Finales", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // H31 = None · I31 = None
  { fila: 32, texto: "Juicios", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // H32 = None · I32 = None
  { fila: 33, texto: "Otro: Lottery", p: 1500000, r: 1728376, calc: false, tolP: 0, tolR: 0 }, // H33 = 15000 · I33 = 17283.76
  { fila: 34, texto: "TOTAL GASTOS OPERATIVOS", p: 10053000, r: 4821876, calc: true, tolP: 0, tolR: 0 }, // H34 = '=SUM(H21:H33)' · I34 = shared
  { fila: 35, texto: "Reembolsos de préstamos", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // H35 = None · I35 = None
  { fila: 36, texto: "Dividendos", p: 1000000, r: 1000000, calc: false, tolP: 0, tolR: 0 }, // H36 = 10000 · I36 = 10000
  { fila: 37, texto: "Inversion Food Truck", p: null, r: 1018400, calc: false, tolP: 0, tolR: 0 }, // H37 = None · I37 = 10184
  { fila: 38, texto: "Otro", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // H38 = None · I38 = None
  { fila: 39, texto: "TOTAL GASTOS", p: 11053000, r: 6840276, calc: true, tolP: 0, tolR: 0 }, // H39 = '=SUM(H34:H38)' · I39 = shared
  { fila: 40, texto: "POSICIÓN DE EFECTIVO (fin de mes)", p: 8753020, r: 15256550, calc: true, tolP: 0, tolR: 0 }, // H40 = '=H18-H39' · I40 = '=I18-I39'
  { fila: 41, texto: "Capital de trabajo propuesto", p: 3000000, r: 3000000, calc: false, tolP: 0, tolR: 0 }, // H41 = 30000 · I41 = 30000
  { fila: 42, texto: "Excedente / Faltante", p: 5056020, r: 5056020, calc: true, tolP: 0, tolR: 0 }, // H42 = '=+H7-H41' · I42 = '=+I7-I41'
];

// ARRASTRE_EXCEL_BRADENTON: documentación, no una regla. Total Disponibilidades REAL de cada mes contra la Posición de efectivo
// REAL del mes anterior (la celda de control del Excel es W44 = U40 − W7, solo en agosto). El Banco sale del extracto Chase,
// no de la Posición anterior, así que de febrero a julio NO cuadra; agosto sí porque su Banco viene de la hoja `Presup 08-2026`,
// armada con el cierre de julio. Por eso la plantilla no tiene control de arrastre.
export type MesArrastreBradenton = { periodo: string; totalDisponibilidadesReal: number; posicionRealMesAnterior: number; celdas: string };
export const ARRASTRE_EXCEL_BRADENTON: MesArrastreBradenton[] = [
  { periodo: "2026-02", totalDisponibilidadesReal: 5149632, posicionRealMesAnterior: 8688290, celdas: "F7 − C40" },
  { periodo: "2026-03", totalDisponibilidadesReal: 8056020, posicionRealMesAnterior: 9388623, celdas: "I7 − F40" },
  { periodo: "2026-04", totalDisponibilidadesReal: 5454416, posicionRealMesAnterior: 15256550, celdas: "L7 − I40" },
  { periodo: "2026-05", totalDisponibilidadesReal: 2629441, posicionRealMesAnterior: 10566053, celdas: "O7 − L40" },
  { periodo: "2026-06", totalDisponibilidadesReal: 9245798, posicionRealMesAnterior: 6164547, celdas: "R7 − O40" },
  { periodo: "2026-07", totalDisponibilidadesReal: 5454416, posicionRealMesAnterior: 10800837, celdas: "U7 − R40" },
  { periodo: "2026-08", totalDisponibilidadesReal: 2629441, posicionRealMesAnterior: 2629441, celdas: "X7 − U40" },
];
