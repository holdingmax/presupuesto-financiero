// Enero 2026 de Plate Silver (USD, importes en centavos de dólar): el único mes del año con P y R cargados en
// todas las filas. Sirve para probar las fórmulas de la columna REAL (Capital de trabajo, Excedente, Posición),
// que en agosto no se pueden probar porque el Real casi no está cargado. Generada con un script FUERA del repo que
// lee `PF - PLATE SILVER - AGOSTO 2026.xlsx` en solo lectura (columnas B = PRESUPUESTADO y C = REAL). NO se edita a
// mano: si algo no cierra, se frena y se muestra la diferencia.
//   calc : true si la celda es una fórmula entre celdas de la hoja (total, posición, capital, excedente).
//   tolP/tolR: 1 centavo por cada sumando de entrada con más de 2 decimales en el Excel.
export type FilaEnero = { fila: number; texto: string; p: number | null; r: number | null; calc: boolean; tolP: number; tolR: number };
export const ENERO_2026_PLATE_SILVER: FilaEnero[] = [
  { fila: 4, texto: "DISPONIBILIDADES (principios de mes)", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // B4 = None · C4 = None
  { fila: 5, texto: "BANCO", p: 8348319, r: 8348319, calc: false, tolP: 0, tolR: 0 }, // B5 = 83483.1943433851 · C5 = '=+B5'
  { fila: 6, texto: "EFECTIVO", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // B6 = None · C6 = None
  { fila: 7, texto: "CHEQUES EN CARTERA", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // B7 = None · C7 = None
  { fila: 8, texto: " TOTAL DISPONIBILIDADES", p: 8348319, r: 8348319, calc: true, tolP: 1, tolR: 1 }, // B8 = '=+SUM(B4:B7)' · C8 = '=+SUM(C4:C7)'
  { fila: 10, texto: "INGRESOS", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // B10 = None · C10 = None
  { fila: 11, texto: "Cobranza clientes", p: 9500000, r: 10612900, calc: false, tolP: 0, tolR: 0 }, // B11 = '=+'[2]DETALLE D GTOS PRESUPUESTADO_01'!I7' · C11 = 106129
  { fila: 12, texto: "Otras operaciones", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // B12 = None · C12 = None
  { fila: 13, texto: "Venta de Propiedades y Equipos", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // B13 = None · C13 = None
  { fila: 14, texto: "Cobro de Capital de Préstamos", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // B14 = None · C14 = None
  { fila: 15, texto: "Préstamo", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // B15 = None · C15 = None
  { fila: 16, texto: "Otro (retencio UI + Collet)", p: -1000000, r: -2178903, calc: false, tolP: 0, tolR: 0 }, // B16 = -10000 · C16 = -21789.030000000002
  { fila: 17, texto: "Otro", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // B17 = None · C17 = None
  { fila: 18, texto: "TOTAL INGRESOS", p: 8500000, r: 8433997, calc: true, tolP: 0, tolR: 0 }, // B18 = '=SUM(B11:B17)' · C18 = '=SUM(C11:C17)'
  { fila: 19, texto: "DISPONIBLE ANTES DE GASTOS", p: 16848319, r: 16782316, calc: true, tolP: 1, tolR: 1 }, // B19 = '=B8+B18' · C19 = '=C8+C18'
  { fila: 21, texto: "GASTOS", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // B21 = None · C21 = None
  { fila: 22, texto: "Cheques diferidos", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // B22 = None · C22 = None
  { fila: 23, texto: "Sueldos", p: 622232, r: 634579, calc: false, tolP: 0, tolR: 0 }, // B23 = 6222.315607171964 · C23 = 6345.792207792208
  { fila: 24, texto: "Impuestos", p: 1053749, r: 957078, calc: false, tolP: 0, tolR: 0 }, // B24 = 10537.486232422327 · C24 = 9570.77922077922
  { fila: 25, texto: "Prestamos y tarjetas", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // B25 = None · C25 = None
  { fila: 26, texto: "Adicionales", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // B26 = None · C26 = None
  { fila: 27, texto: "Expensas", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // B27 = None · C27 = None
  { fila: 28, texto: "Gastos Bancarios", p: 9225, r: 1710, calc: false, tolP: 0, tolR: 0 }, // B28 = 92.24833790118082 · C28 = 17.102857142857143
  { fila: 29, texto: "Proveedores", p: 5448855, r: 5279583, calc: false, tolP: 0, tolR: 0 }, // B29 = 54488.55337286442 · C29 = 52795.82805194805
  { fila: 30, texto: "Proveedores IVA", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // B30 = None · C30 = None
  { fila: 31, texto: "Liquidaciones Finales", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // B31 = None · C31 = None
  { fila: 32, texto: "Diferencia de cambio - Otros gastos banco", p: null, r: -267, calc: false, tolP: 0, tolR: 0 }, // B32 = None · C32 = -2.67
  { fila: 33, texto: "Otro (reposición de fondo fijo)", p: 87479, r: 0, calc: false, tolP: 0, tolR: 0 }, // B33 = 874.7946005481417 · C33 = 0
  { fila: 34, texto: "TOTAL GASTOS OPERATIVOS", p: 7221540, r: 6872683, calc: true, tolP: 5, tolR: 4 }, // B34 = '=SUM(B22:B33)' · C34 = '=SUM(C22:C33)'
  { fila: 35, texto: "Reembolsos de préstamos", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // B35 = None · C35 = None
  { fila: 36, texto: "Dividendos", p: 1500000, r: 0, calc: false, tolP: 0, tolR: 0 }, // B36 = 15000 · C36 = 0
  { fila: 37, texto: "Otro", p: null, r: null, calc: false, tolP: 0, tolR: 0 }, // B37 = None · C37 = None
  { fila: 38, texto: "TOTAL GASTOS", p: 8721540, r: 6872683, calc: true, tolP: 5, tolR: 4 }, // B38 = '=SUM(B34:B37)' · C38 = '=SUM(C34:C37)'
  { fila: 39, texto: "POSICIÓN DE EFECTIVO (fin de mes)", p: 8126780, r: 9909633, calc: true, tolP: 6, tolR: 5 }, // B39 = '=B19-B38' · C39 = '=C19-C38'
  { fila: 40, texto: "Capital de trabajo propuesto", p: 7221540, r: 6872683, calc: true, tolP: 5, tolR: 4 }, // B40 = '=+B34' · C40 = '=+C34'
  { fila: 41, texto: "Excedente(+) / Faltante (-)", p: 1126780, r: 1475636, calc: true, tolP: 6, tolR: 5 }, // B41 = '=+B8-B40' · C41 = '=+C8-C40'
];
