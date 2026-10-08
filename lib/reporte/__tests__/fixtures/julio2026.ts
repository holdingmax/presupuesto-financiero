// Fixtures de julio 2026 para los tests del Reporte por plantilla. Generadas el
// 2026-10-07 con un script FUERA del repo que lee los Excel de Macchi en modo
// solo lectura. Todo en centavos (importe x 100, redondeado al centavo). NO se
// editan a mano para que un test cierre: si algo no cierra, se muestra la
// diferencia (docs/reporte_etapa2a_plan.md §5).

// Conexión — REAL: `EJECUCION FINANCIERA 31.07.xlsx`, hoja Hoja1, suma de la
// columna E (Importe) por la columna J (CLASIFICACION), filas con la columna L
// (UNIDAD DE NEG) = SPP o LOGISTICA. Signo de banco.
export const REAL_CONEXION_JULIO = new Map<string, number>([
  ["AJUSTE", -70435761], // 1 fila
  ["AVION", -7543389619], // 44 filas
  ["CAMPO", -5029717], // 1 fila
  ["CH DIFERIDOS IVA", -12034151631], // 7 filas
  ["CHEQUES DIFERIDOS", -8136232552], // 24 filas
  ["COBRANZAS", 231718278635], // 250 filas
  ["COM Y GTOS BRIOS", -3570061310], // 1219 filas
  ["COMISIONES ESPECIALES", -6256979161], // 2 filas
  ["DEP CH 3°", 11935363546], // 133 filas
  ["FCI", 14235386966], // 6 filas
  ["IMP Y PREVISIONALES", -9640264971], // 28 filas
  ["IVA", 13403185095], // 68 filas
  ["JPS", 0], // 3 filas
  ["JUICIOS", -10000000], // 1 fila
  ["LIQ FINAL", -4711331000], // 12 filas
  ["MAL REGISTRADO", 0], // 4 filas
  ["MS", -991991885], // 22 filas
  ["PREST BRIOS Y TC", -962860649], // 4 filas
  ["PRESTAMOS", 0], // 12 filas
  ["PROV Y SERV", -125243051824], // 601 filas
  ["SAC", -5628119300], // 21 filas
  ["SUELDOS", -12439441200], // 28 filas
  ["TRANSF ENTRE BCOS", 7750000000], // 59 filas
  ["VENTA ME", 0], // 8 filas
]);

// Conexión — EXCEL: `PF - CONEXION LOGISTICA - AGOSTO 2026.xlsx`, hoja PRESUPUESTO Y
// REAL MES A MES, julio 2026 = columnas DN (PRESUPUESTADO) y DO (REAL). Clave = texto
// exacto de la columna A. Solo las filas con algún valor en julio.
export const EXCEL_CONEXION_JULIO: Record<string, { presupuestado: number | null; real: number | null }> = {
  "Cobranza Contado": { presupuestado: 229700128284, real: 231134236372 }, // DN19 = 2297001282.8409 · DO19 = 2311342363.72
  "Resultado FCI": { presupuestado: 300000000, real: 182875109 }, // DN23 = 3000000 · DO23 = =321235.44+17755.22+219460.76+1270299.67
  "Reserva Aguinaldo": { presupuestado: 12122186000, real: 12122186000 }, // DN24 = 121221860 · DO24 = =+DN24
  "Cheques en cartera despues del 10": { presupuestado: 14555580600, real: 14555580600 }, // DN27 = 145555806 · DO27 = =+DN27
  "TOTAL INGRESOS": { presupuestado: 256677894884, real: 257994878081 }, // DN29 = =SUM(DN19:DN28) · DO29 = =SUM(DO19:DO28)
  "DISPONIBLE ANTES DE GASTOS": { presupuestado: 354645947290, real: 355962930487 }, // DN30 = =+DN16+DN29 · DO30 = =+DO16+DO29
  "Cheques diferidos": { presupuestado: 10761883800, real: 8136232552 }, // DN33 = 107618838 · DO33 = =-'DETALLE GASTOS REALES'!E26
  "Sueldos": { presupuestado: 26371581432, real: 26557833500 }, // DN34 = 263715814.32 · DO34 = =124394412+141183923
  "SAC": { presupuestado: 14319817811, real: 12509029700 }, // DN35 = 143198178.11 · DO35 = =56281193+68809104
  "Prestamos y tarjetas": { presupuestado: 1033308270, real: 1410655225 }, // DN36 = 10333082.7 · DO36 = 14106552.250000002
  "Adicionales y comisiones especiales": { presupuestado: 6234292900, real: 6256979161 }, // DN37 = 62342929 · DO37 = =-'DETALLE GASTOS REALES'!E31
  "Impuestos": { presupuestado: 19410000000, real: 15856313106 }, // DN38 = 194100000 · DO38 = =-'DETALLE GASTOS REALES'!E64
  "Expensas": { presupuestado: 4761711700, real: 5516513414 }, // DN39 = 47617117 · DO39 = 55165134.14237068
  "Impuesto al cheque (Gto Brio)": { presupuestado: 3068642427, real: 3570061310 }, // DN41 = 30686424.27 · DO41 = 35700613.1
  "Proveedores": { presupuestado: 116398874119, real: 124845693138 }, // DN42 = 1163988741.1862044 · DO42 = =-'DETALLE GASTOS REALES'!E686
  "Proveedores IVA": { presupuestado: 7250000000, real: 7491425975 }, // DN45 = 72500000 · DO45 = 74914259.75
  "Liquidaciones Finales": { presupuestado: 4164987616, real: 4711331000 }, // DN46 = 41649876.16 · DO46 = =-'DETALLE GASTOS REALES'!E82
  "Juicios y requerimientos AFIP": { presupuestado: 1419250000, real: 10000000 }, // DN47 = 14192500 · DO47 = =-'DETALLE GASTOS REALES'!E67
  "TOTAL EGRESOS OPERATIVOS": { presupuestado: 215194350075, real: 216872068081 }, // DN49 = =SUM(DN33:DN48) · DO49 = =SUM(DO33:DO48)
  "Gastos Campo": { presupuestado: null, real: 29294017 }, // DN51 = None · DO51 = =50297.17+92643+150000
  "Gastos MS": { presupuestado: null, real: 2339384860 }, // DN53 = None · DO53 = =9919918.85+13473929.75
  "Dividendos - Expensas Havanna Peru y Americanas": { presupuestado: null, real: 2899000000 }, // DN59 = None · DO59 = 28990000
  "Dividendos en efectivo": { presupuestado: 0, real: null }, // DN60 = 0 · DO60 = None
  "Gastos Avion a recuperar": { presupuestado: null, real: 9779432022 }, // DN63 = None · DO63 = =75433896.19+18745433.93+3614990.1
  "TOTAL DE EGRESOS": { presupuestado: 215194350075, real: 231919178980 }, // DN64 = =SUM(DN49:DN63) · DO64 = =SUM(DO49:DO63)
};

// Conexión — PRESUPUESTO de julio por categoría de la app: el PRESUPUESTADO de julio
// de la planilla (columna DN) en la categoría de su fila.
export const PRESUPUESTO_CONEXION_JULIO = new Map<string, number>([
  ["COBRANZAS", 229700128284], // DN19 (Cobranza Contado)
  ["Intereses FCI", 300000000], // DN23 (Resultado FCI)
  ["CHEQUES DIFERIDOS", 10761883800], // DN33 (Cheques diferidos)
  ["SUELDOS", 26371581432], // DN34 (Sueldos)
  ["SAC", 14319817811], // DN35 (SAC)
  ["Prestamos y tarjetas", 1033308270], // DN36 (Prestamos y tarjetas)
  ["COMISIONES ESPECIALES", 6234292900], // DN37 (Adicionales y comisiones especiales)
  ["IMP Y PREVISIONALES", 19410000000], // DN38 (Impuestos)
  ["EXPENSAS", 4761711700], // DN39 (Expensas)
  ["Gastos bancarios", 3068642427], // DN41 (Impuesto al cheque (Gto Brio))
  ["PROV Y SERV", 116398874119], // DN42 (Proveedores)
  ["IVA", 7250000000], // DN45 (Proveedores IVA)
  ["Liquidación final", 4164987616], // DN46 (Liquidaciones Finales)
  ["Juicios", 1419250000], // DN47 (Juicios y requerimientos AFIP)
  ["Dividendos", 0], // DN60 (Dividendos en efectivo)
]);

// Fredy — REAL: `EJECUCION FINANCIERA 31.07 FREDY.xlsx`, hoja FREDY (todas las filas
// son de julio 2026), suma de la columna E (Importe) por la columna J (CLASIF 2). Es el
// extracto que copia la hoja EJECUCION FINANCIERA JULIO del PF de Fredy: esa hoja solo
// trae las clasificaciones que el PF toma por fórmula (le faltan DIVIDENDOS, SUELDOS,
// SAC, COM Y GTOS BRIOS y COBRANZAS, que el PF tipea). Donde están las dos, coinciden
// al centavo.
export const REAL_FREDY_JULIO = new Map<string, number>([
  ["CH DIFERIDOS IVA", -3310218894], // 7 filas (filas 26 a 427)
  ["CHEQUES DIFERIDOS", -827378350], // 4 filas (filas 275 a 316)
  ["COBRANZAS", 20978458894], // 49 filas (filas 4 a 409)
  ["COM Y GTOS BRIOS", -460978191], // 185 filas (filas 2 a 338)
  ["COMISIONES ESPECIALES", -993030800], // 3 filas (filas 344 a 351)
  ["DIVIDENDOS", -4000000000], // 2 filas (filas 413 a 414)
  ["IMP Y PREVISIONALES", -994112092], // 28 filas (filas 16 a 370)
  ["IVA", 3129520809], // 50 filas (filas 5 a 453)
  ["LIQ FINAL", -280387500], // 1 fila (fila 181)
  ["MS", -31868814], // 1 fila (fila 213)
  ["OTROS", -422993997], // 21 filas (filas 349 a 448)
  ["PAGOS ESPECIALES", -190000000], // 5 filas (filas 22 a 389)
  ["PRESTAMOS", 0], // 10 filas (filas 14 a 322)
  ["PROV Y SERV", -5340957907], // 57 filas (filas 66 a 454)
  ["SAC", -701087000], // 4 filas (filas 189 a 342)
  ["SUELDOS", -1583930700], // 4 filas (filas 191 a 343)
  ["TRANSF ENTRE BCOS", 0], // 22 filas (filas 57 a 315)
]);

// Fredy — EXCEL: `PF - FREDY - AGOSTO 2026.xlsx`, hoja PRESUPUESTO MES A MES, julio
// 2026 = columnas DM (PRESUPUESTADO) y DN (REAL). Clave = texto exacto de la columna A.
// Solo las filas con algún valor en julio.
export const EXCEL_FREDY_JULIO: Record<string, { presupuestado: number | null; real: number | null }> = {
  "Cobranza clientes": { presupuestado: 15600000000, real: 20978458894 }, // DM16 = 156000000 · DN16 = 209784588.94
  "Reserva Aguinaldo": { presupuestado: 650000000, real: 650000000 }, // DM19 = 6500000 · DN19 = =+DM19
  "TOTAL INGRESOS": { presupuestado: 16250000000, real: 21628458894 }, // DM25 = =SUM(DM16:DM24) · DN25 = =SUM(DN16:DN24)
  "DISPONIBLE ANTES DE GASTOS": { presupuestado: 20772590296, real: 26151049190 }, // DM26 = =+DM13+DM25 · DN26 = =+DN13+DN25
  "Cheques diferidos": { presupuestado: 556161100, real: 827378350 }, // DM29 = 5561611 · DN29 = =-'EJECUCION FINANCIERA JULIO'!E6
  "Sueldos": { presupuestado: 1603920732, real: 1583930700 }, // DM30 = 16039207.31517973 · DN30 = 15839307
  "SAC": { presupuestado: 801960366, real: 701087000 }, // DM31 = 8019603.657589865 · DN31 = 7010870
  "Comision Especial": { presupuestado: 980000000, real: 993030800 }, // DM32 = 9800000 · DN32 = =-'EJECUCION FINANCIERA JULIO'!E12
  "Compra de IVA": { presupuestado: 680000000, real: 1040684510 }, // DM33 = 6800000 · DN33 = 10406845.1
  "Pagos especiales": { presupuestado: 400000000, real: 190000000 }, // DM34 = 4000000 · DN34 = =-'EJECUCION FINANCIERA JULIO'!E81
  "Impuestos": { presupuestado: 1560000000, real: 994112092 }, // DM35 = 15600000 · DN35 = =-'EJECUCION FINANCIERA JULIO'!E43
  "Expensas": { presupuestado: 1525600000, real: 1767426628 }, // DM36 = 15256000 · DN36 = 17674266.278623614
  "Impuesto al cheque": { presupuestado: 360000000, real: 460978191 }, // DM38 = 3600000 · DN38 = 4609781.91
  "Proveedores": { presupuestado: 4938081500, real: 5340957907 }, // DM39 = 49380815 · DN39 = =-'EJECUCION FINANCIERA JULIO'!E141
  "Liq final": { presupuestado: 270000000, real: 280387500 }, // DM40 = 2700000 · DN40 = =-'EJECUCION FINANCIERA JULIO'!E46
  "Otro": { presupuestado: 232500000, real: 422993997 }, // DM41 = 2325000 · DN41 = =-'EJECUCION FINANCIERA JULIO'!E73
  "TOTAL EGRESOS OPERATIVOS": { presupuestado: 13908223697, real: 14602967675 }, // DM42 = =SUM(DM29:DM41) · DN42 = =SUM(DN29:DN41)
  "Dividendos": { presupuestado: 4000000000, real: 4000000000 }, // DM47 = 40000000 · DN47 = 40000000
  "Pagos solicitados por MS": { presupuestado: null, real: 31868814 }, // DM49 = None · DN49 = =-'EJECUCION FINANCIERA JULIO'!E49
  "TOTAL EGRESOS": { presupuestado: 17908223697, real: 18634836489 }, // DM50 = =SUM(DM42:DM49) · DN50 = =SUM(DN42:DN49)
};

