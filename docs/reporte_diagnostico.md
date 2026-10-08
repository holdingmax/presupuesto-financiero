# Diagnóstico — Reporte "Presupuesto Financiero" de Macchi (réplica en la app)

Fecha: 2026-10-07 · Solo lectura: no se modificó ningún archivo del repo ni de EnriqueMacchi, no se tocó ninguna base.
Fuente: `C:\Users\Usuario\Desktop\EnriqueMacchi\PF - *.xlsx` (leídos con openpyxl, fórmulas + valores cacheados) y, como apoyo para reconciliar, `EJECUCION FINANCIERA 31.07.xlsx`.
Convención en las tablas: **P** = celda PRESUPUESTADO de **agosto 2026**; **R** = celda REAL de **julio 2026** (agosto todavía no tiene real). "tip." = número tipeado. "SM" = suma manual tipo `=a+b`. "—" = vacía en jul/ago (la fila existe igual).

---

## 0. Resumen ejecutivo (lo que cambia respecto de lo que ya sabíamos)

1. **Son 11 empresas, no 12.** El archivo nº 12 es `PF - BRILLANTE - 31 DE JULIO 2026 - CONSOLIDADO.xlsx`: mismas 62 filas que Brillante agosto, pero con Brillante + Mantenor juntos (p. ej. Real Sueldos = `=9516500+14541399+285425478.15`). Es la foto previa a separar Mantenor (Mantenor arranca en jul-26). No es otro formato.
2. **La estructura que conocías se confirma, pero con 3 "familias" de planilla:**
   - **Familia A, la "completa"** (Conexión, Brillante, Havanna, Radio, Fredy, Handy, Mantenor): Disponibilidades por componente → Ingresos → Egresos operativos → bloque de abajo → Cierre con Capital de trabajo + Disponible. Columnas por mes: PRESUPUESTADO · REAL · % AVANCE · FALTA EJECUTAR (Handy dice **ESPERADO** y **% EJECUCION**; Mantenor no tiene FALTA EJECUTAR). Hay 32 meses lado a lado (ene-2024 → ago-2026) sin corte de año.
   - **Familia B, la "simple"** (Avianor, Havanna Perú): **una sola fila** "EFECTIVO DISPONIBLE (principios de mes)" en vez de componentes. Avianor no tiene Capital de trabajo ni Disponible. Havanna Perú está en **soles**.
   - **Familia C, la "USD"** (Bradenton, Plate Silver): año calendario (ene–dic + TOTALES ANUALES), 3 columnas por mes (sin FALTA EJECUTAR), en **dólares**. Banco propio (Chase / Uruguay), no pasan por la Ejecución argentina.
3. **El bloque de abajo nunca tiene título.** Va entre "TOTAL EGRESOS OPERATIVOS" y "TOTAL (DE) EGRESOS". En Conexión casi todo es solo-real. En Fredy, Brillante, Radio, Havanna y Mantenor tiene presupuesto en Dividendos, Inversiones, Préstamos y Devolución de préstamo.
4. **Regla de Disponibilidades.** El REAL del mes es el cierre REAL del mes anterior. Verificado en todos los meses de Fredy, Havanna, Radio, Handy y Avianor (salvo un par de meses viejos).
   - **Pero solo Avianor y Plate Silver lo tienen por fórmula.** En el resto los componentes se tipean, y P y R tienen el mismo número.
   - **Excepción importante, Conexión:** el total de Disponibilidades = cierre anterior − "CHEQUES EN CARTERA DESPUES DEL 10". Ese importe se vuelve a sumar como ingreso ("Cheques en cartera despues del 10"). Pasa lo mismo con RESERVA AGUINALDO: negativa en Disponibilidades y espejada en Ingresos (Conexión, Fredy, Brillante, Havanna, Radio).
5. **El Real ya se arma por unidad de negocio y clasificación, igual que `lib/reporte.ts`.** En la Ejecución, EMPRESA es la razón social (SPP, LI, CREAR, PANINI, WEB MASTER…). Cada PF suma por UNIDAD DE NEG. Ejemplos exactos:
   - Conexión = UN **SPP + LOGISTICA**. Cheques diferidos 81.362.326 = SPP 30,5M + LOGISTICA 50,9M.
   - Liq. Final 47.113.310 = 44.437.610 + 2.675.700.
   - Impuesto al cheque 35.700.613 = COM Y GTOS BRIOS de las dos UN.
6. **Los "valores tipeados" del Real casi siempre son una clasificación más un reparto hecho fuera del extracto.** Hay tres repartos:
   - **Sueldos / SAC:** la nómina sin UN (`(vacía)` en Ejecución: 422,8M sueldos y 211,8M SAC en julio) se reparte por UN en las hojas DETALLE SUELDOS / SAC. Por eso Sueldos de Conexión es `=124394412+141183923` (UN + reparto).
   - **Impuestos:** el F931/SP se prorratea por UN con % en la hoja PRORRATEO IMPUESTOS (Conexión −67,5M, Brillante −80,7M, Mantenor −11,4M, Expensas −15,8M).
   - **Expensas:** importes con decimales (55.165.134,14…): sale de repartir la UN **EXPENSAS** por %. La planilla de ese reparto **no está** en estos archivos.

   Hoy la app soporta prorrateo/desglose por UN en Ejecución para todas las clasificaciones (desde 2026-10-06). Si esos movimientos se desglosan, el Real sale solo.
7. **Capital de trabajo no tiene una fórmula única.** Cambia por empresa y a veces mes a mes (detalle en §5). "Disponible" es siempre `Total Disponibilidades (iniciales) − Capital de trabajo`, solo en columna P (salvo Bradenton, Plate y H. Perú, que también lo calculan en R). Havanna además suma "Préstamo".
8. **Errores o inconsistencias de la planilla a no replicar** (o a confirmar con Kike):
   - Avianor: Real de agosto ya apunta a la hoja `'JUNIO 26'`.
   - Brillante: Total Disponibilidades de agosto suma 4:13 en lugar de 4:14.
   - Mantenor: Total gastos operativos P de julio excluye "Cheques diferidos".
   - Havanna Perú: Expensas P apunta a `'PRESUPUESTO NOVIEMBRE'!AJ52` (vacío) y Capital de julio a un libro externo `[2]`.
   - Havanna: el Real de "Juicios" va en la fila "Liq Final".

---

## 1. Archivos y hoja del reporte

| # | Archivo | Hoja del reporte | Col. etiqueta | Moneda | Familia | Fuente del Real |
|---|---|---|---|---|---|---|
| 1 | PF - AVIANOR AGOSTO 2026 | `PRESUPUESTO MES A MES` | A | ARS | B | hoja mensual propia (`JULIO 2026`) → GETPIVOTDATA por CLASIFICACION |
| 2 | PF - BRADENTON - AGOSTO 2026 | `PRESUPUESTO MES A MES` | A | USD | C | `Ejecutado 07-2026` ← hoja `CHASE` |
| 3 | PF - BRILLANTE - 31 DE JULIO 2026 - CONSOLIDADO | `PRESUPUESTO MES A MES` | B | ARS | A | igual a #4 (Brillante+Mantenor) |
| 4 | PF - BRILLANTE - AGOSTO 2026 | `PRESUPUESTO MES A MES` | B | ARS | A | `DETALLE GASTOS REALES` (copia filtrada de Ejecución) + tipeados |
| 5 | PF - CONEXION LOGISTICA - AGOSTO 2026 | `PRESUPUESTO Y REAL MES A MES` | A | ARS | A | `DETALLE GASTOS REALES` + tipeados |
| 6 | PF - FREDY - AGOSTO 2026 | `PRESUPUESTO MES A MES` | A | ARS | A | `EJECUCION FINANCIERA JULIO` (clasif. en col. CLASIF 2) |
| 7 | PF - HANDY - AGOSTO 2026 (= HWC) | `PRESUPUESTO MES A MES` | A | ARS | A | `EJECUCION JULIO` (extracto propio HWC) |
| 8 | PF - HAVANNA - AGOSTO 2026 | `PRESUPUESTO MES A MES` | B | ARS | A | `DETALLE GASTOS REALES` + `DATOS ADICIONALES` |
| 9 | PF - HAVANNA PERU - AGOSTO 2026 | `PRESUPUESTO MES A MES` | A | PEN (soles) | B | `RESUMEN GASTOS REALES` ← `MOVIMIENTOS <mes>` |
| 10 | PF - MANTENOR - AGOSTO 2026 | `PRESUPUESTO MES A MES` | A | ARS | A (sin título Disponib.) | `DETALLE GASTOS REALES` + tipeados |
| 11 | PF - PLATE SILVER - AGOSTO 2026 | `PRESUPUESTO Y REAL MES A MES` (la hoja `Hoja1` es una copia vieja del año fiscal 2025) | A | USD | C | `DETALLE DE GASTOS REALES_07` |
| 12 | PF - RADIO - AGOSTO 2026 | `PRESUPUESTO MES A MES` | A | ARS | A | `DETALLE GASTOS REALES` + tipeados |

`DETALLE GASTOS REALES` (Conexión, Brillante, Havanna, Radio, Mantenor) tiene las mismas columnas que la Ejecución (Fecha, Nro. Ref., Causal, Concepto, Importe, EMPRESA, BANCO Y CTA, Detalle, CLASIFICACION, CLASIF 2, UNIDAD DE NEG). Está ordenada en bloques por CLASIFICACION, con una fila `=SUM()` por bloque. A veces agrega filas sin clasificación (PRORRATEO IMPUESTOS, GASTOS TARJETAS, GASTOS VS BARES) o filas movidas de otra UN.

---

## 2. Filas por empresa (orden exacto, fórmulas P agosto / R julio)

### 2.1 CONEXIÓN LOGÍSTICA — UN: SPP + LOGISTICA
| Fila | Bloque | Texto exacto | P (ago) | R (jul) | Origen del Real |
|---|---|---|---|---|---|
| 4 | DISP | `DISPONIBILIDADES ` (título) | | | |
| 5 | DISP | BANCO | tip. = R | tip. | manual (saldo bancos) |
| 6 | DISP | EFECTIVO | tip. | tip. (a veces SM) | manual |
| 7 | DISP | DOLARES | tip. | tip. (a veces SM) | manual |
| 8 | DISP | CHEQUES EN CARTERA  | tip. | tip. | manual |
| 9 | DISP | CHEQUES NEGOCIADOS PENDIENTES DE INGRESO | tip. (−) | tip. (−) | manual |
| 10 | DISP | COBRANZA TECH PACK 02 Y 09 | — | — | manual |
| 11 | DISP | RESERVA AGUINALDO | — | tip. (−121,2M) | manual |
| 12 | DISP | CHEQUES EN CARTERA DESPUES DEL 10 | tip. (−) | tip. (−) | manual |
| 13 | DISP | ADICIONALES PENDIENTES | — | — | manual |
| 14 | DISP | RECUPERO APORTE BLANQUEO | — | — | manual |
| 15 | DISP | GASTOS JET PARTS SOLUTIONS A RECUPERAR | — | — | manual |
| 16 | DISP | ` TOTAL DISPONIBILIDADES` | `=SUM(5:15)` | `=SUM(5:15)` | cálculo |
| 18 | ING | `INGRESOS` (título) | | | |
| 19 | ING | Cobranza Contado | tip. | tip. 2.311.342.364 | ≈ COBRANZAS SPP+LOG (2.317,2M; dif. 5,8M) |
| 20 | ING | Cobranza Cheque Diferido | — | — | |
| 21 | ING | Otras operaciones (VENTA MOTO) | — | — | |
| 22 | ING | Prestamo MS Ciber | — | — | |
| 23 | ING | Resultado FCI | tip. | SM `=321235.44+17755.22+219460.76+1270299.67` | manual (rendimientos FCI) |
| 24 | ING | Reserva Aguinaldo | tip. (jul) | `=+P` | espejo de fila 11 |
| 25 | ING | Préstamo | — | — | |
| 26 | ING | Gastos MS a recuperar | — | — | |
| 27 | ING | Cheques en cartera despues del 10 | tip. | `=+P` | espejo de fila 12 |
| 28 | ING | Gastos avion a recuperar | — | — | |
| 29 | ING | TOTAL INGRESOS | `=SUM(19:28)` | idem | |
| 30 | ING | DISPONIBLE ANTES DE GASTOS | `=16+29` | idem | |
| 32 | EGR | `EGRESOS` (título) | | | |
| 33 | EGR | Cheques diferidos | `'DETALLE GASTOS PRESUPUESTADOS'!B2` (CHEQUES DIFERIDOS) | `=-'DETALLE GASTOS REALES'!E26` | CHEQUES DIFERIDOS ✓exacto |
| 34 | EGR | Sueldos | `…!B3` (SUELDOS) | SM `=124394412+141183923` | SUELDOS SPP+LOG ✓ + reparto nómina (DETALLE SUELDOS: SPP) |
| 35 | EGR | SAC | `…!B4` (SAC) | SM `=56281193+68809104` | SAC SPP+LOG ✓ + reparto SAC |
| 36 | EGR | Prestamos y tarjetas | `…!B5` | tip. 14.106.552 | PREST BRIOS Y TC (9,6M) + reparto TARJETAS Y PRESTAMOS |
| 37 | EGR | Adicionales y comisiones especiales | `…!B6` (COMISIONES ESPECIALES) | `=-…!E31` | COMISIONES ESPECIALES ✓ |
| 38 | EGR | Impuestos | `…!B15` (TOTAL A PAGAR IMPUESTOS) | `=-…!E64` | IMP Y PREVISIONALES (96,4M) + PRORRATEO IMPUESTOS (−67,5M) + "IMPUESTOS JUNIO EXPENSAS A FAVOR" (+5,3M) |
| 39 | EGR | Expensas | `…!B16` | tip. 55.165.134,14 | reparto UN EXPENSAS (planilla no disponible) |
| 40 | EGR | Expensas - No socios | — | — | |
| 41 | EGR | Impuesto al cheque (Gto Brio) | `…!B17` | tip. 35.700.613,10 | COM Y GTOS BRIOS SPP+LOG ✓exacto |
| 42 | EGR | Proveedores | `…!B24` (=`'DETALLE PROVEEDORES'!E87`) | `=-…!E686` | PROV Y SERV ✓ |
| 43 | EGR | Peru | — | — | |
| 44 | EGR | Bolivia | — | — | |
| 45 | EGR | Proveedores IVA | `…!B21` (TOTAL COSTO IVA) | tip. 74.914.260 | **no reconcilia** con IVA ni CH DIFERIDOS IVA |
| 46 | EGR | Liquidaciones Finales | `…!B22` | `=-…!E82` | LIQ FINAL ✓exacto |
| 47 | EGR | Juicios y requerimientos AFIP | `…!B23` | `=-…!E67` | JUICIOS ✓ |
| 48 | EGR | Préstamo MS | — | — | |
| 49 | EGR | TOTAL EGRESOS OPERATIVOS | `=SUM(33:48)` | idem | |
| 50 | ABAJO | Recupero Gastos | — | — | |
| 51 | ABAJO | Gastos Campo | — | SM `=50297.17+92643+150000` | CAMPO + SAC UN CAMPO + Sueldos UN CAMPO |
| 52 | ABAJO | Gastos Jet Parts Solutions a recuperar | — | — | |
| 53 | ABAJO | Gastos MS | — | SM `=9919918.85+13473929.75` | MS SPP+LOG (9.919.918,85 ✓) + 13,47M sin identificar |
| 54 | ABAJO | Aporte para blanqueo | — | — | |
| 55 | ABAJO | Expensas Havanna peru a recuperar | — | — | |
| 56 | ABAJO | Expensas Empresas Americanas a recuperar | — | — | |
| 57 | ABAJO | Ajuste Caja - A conciliar | — | — | |
| 58 | ABAJO | Reintegro expensas grupo  | — | — | |
| 59 | ABAJO | Dividendos - Expensas Havanna Peru y Americanas | — | tip. 28.990.000 | manual |
| 60 | ABAJO | Dividendos en efectivo | 0 | — | |
| 61 | ABAJO | Dividendos - Recupero expensas y prestamos grupo | — | — | |
| 62 | ABAJO | Dividendos - Recupero de gastos | — | — | |
| 63 | ABAJO | Gastos Avion a recuperar | — | SM `=75433896.19+18745433.93+3614990.1` | AVION SPP ✓ + Expensas Avianor + Tarjetas Avianor (pagados por Conexión) |
| 64 | TOT | TOTAL DE EGRESOS | `=SUM(49:63)` | idem | |
| 65 | CIERRE | SALDO INICIAL + INGRESOS - TOTAL EGRESOS | `=30-64` | idem | |
| 66 | CIERRE | CAPITAL DE TRABAJO PROPUESTO (15 DIAS) | `=(49-24)/2` | — | ver §5 |
| 67 | CIERRE | DISPONIBLE SI - CAPITAL DE TRABAJO | `=16-66` | — | |

### 2.2 FREDY PUBLICIDAD — UN: FREDY (Real desde hoja `EJECUCION FINANCIERA JULIO`, que copia `EJECUCION FINANCIERA 31.07 FREDY.xlsx`)
| Fila | Bloque | Texto exacto | P (ago) | R (jul) | Origen Real |
|---|---|---|---|---|---|
| 3 | DISP | `Disponibilidades` (título en la fila de encabezados) | | | |
| 4 | DISP | BANCOS + FCI | tip. | tip. | manual |
| 5 | DISP | EFECTIVO | tip. | tip. | manual |
| 6 | DISP | DÓLAR | tip. | tip. | manual |
| 7 | DISP | CHEQUES NEGOCIADOS PENDIENTES DE INGRESO | tip. (−) | tip. | manual |
| 8 | DISP | RESERVA CAPITAL DE TRABAJO | — | — | manual |
| 9 | DISP | RESERVA AGUINALDO | — | tip. (−6,5M) | manual |
| 10 | DISP | COMISIONES ESPECIALES PENDIENTES DE PAGO | — | — | manual |
| 11 | DISP | DIVIDENDOS PENDIENTES | — | — | manual |
| 12 | DISP | RECUPERO APORTE BLANQUEO | — | — | manual |
| 13 | DISP | DISPONIBILIDADES INICIALES | `=SUM(4:12)` | idem | |
| 15 | ING | INGRESOS | | | |
| 16 | ING | Cobranza clientes | tip. | tip. 209.784.589 | **no reconcilia** con COBRANZAS UN FREDY (43,2M); incluye operaciones IVA de las razones sociales Quinteros/Sierra/etc. |
| 17 | ING | Otras operaciones (APORTES) | — | — | |
| 18 | ING | Resultado FCI | — | — | |
| 19 | ING | Reserva Aguinaldo | — | `=+P` | espejo |
| 20 | ING | Reserva Capital de Trabajo | — | — | |
| 21 | ING | Aporte para blaqueo otras empresas | — | — | |
| 22 | ING | Prestamo MS | — | — | |
| 23 | ING | Cheques negociados no ingresados IVA | — | — | |
| 24 | ING | Otro | — | — | |
| 25 | ING | TOTAL INGRESOS | SUM(16:24) | idem | |
| 26 | ING | DISPONIBLE ANTES DE GASTOS | `=13+25` | idem | |
| 28 | EGR | EGRESOS | | | |
| 29 | EGR | Cheques diferidos | tip. | `=-'EJECUCION FINANCIERA JULIO'!E6` | CHEQUES DIFERIDOS ✓ |
| 30 | EGR | Sueldos | `'PRESUP. AGOSTO 2026'!C11` (=SUM(C5:C10)+200000) | tip. 15.839.307 | SUELDOS UN FREDY (10,2M) + reparto |
| 31 | EGR | SAC | 0 | tip. 7.010.870 | SAC (5,05M) + reparto |
| 32 | EGR | Comision Especial | `…!C21` | `=-…!E12` | COMISIONES ESPECIALES ✓ |
| 33 | EGR | Compra de IVA | `…!C24` | tip. 10.406.845 | IVA (no reconcilia directo) |
| 34 | EGR | Pagos especiales | `…!C35` | `=-…!E81` | PAGOS ESPECIALES ✓ |
| 35 | EGR | Impuestos | `…!C46` | `=-…!E43` | IMP Y PREVISIONALES ✓ |
| 36 | EGR | Expensas | `…!C49` | tip. 17.674.266,28 | reparto UN EXPENSAS |
| 37 | EGR | Expensas - No socios | — | — | |
| 38 | EGR | Impuesto al cheque | `…!C53` | tip. 4.609.782 | COM Y GTOS BRIOS (+?) |
| 39 | EGR | Proveedores | `…!C93 + …!C105` (TOTAL ALQUILERES + TOTAL PROVEEDORES) | `=-…!E141` | PROV Y SERV ✓ |
| 40 | EGR | Liq final | `…!C17` | `=-…!E46` (fila suelta 2.803.875) | LIQ FINAL |
| 41 | EGR | Otro | `…!C118` | `=-…!E73` | OTROS ✓ |
| 42 | EGR | TOTAL EGRESOS OPERATIVOS | SUM(29:41) | idem | |
| 43 | ABAJO | Reembolsos de préstamos | — | — | |
| 44 | ABAJO | Aporte para blanqueo con fondos propios | — | — | |
| 45 | ABAJO | Aporte para blanqueo con fondos de terceros | — | — | |
| 46 | ABAJO | Ajuste Caja - A conciliar | — | — | |
| 47 | ABAJO | Dividendos | tip. 35M | tip. 40M | DIVIDENDOS ✓ |
| 48 | ABAJO | Inversiones | tip. 25M | — | |
| 49 | ABAJO | Pagos solicitados por MS | — | `=-…!E49` (fila suelta) | MS |
| 50 | TOT | TOTAL EGRESOS | SUM(42:49) | idem | |
| 51 | CIERRE | SALDO INICIAL + INGRESOS - TOTAL EGRESOS | `=26-50` | idem | |
| 52 | CIERRE | CAPITAL DE TRABAJO PROPUESTO | `=42/2` | — | |
| 53 | CIERRE | DISPONIBLE SI - CAPITAL DE TRABAJO | `=13-52` | — | |

### 2.3 BRILLANTE — UN: BRILLANTE (incluye razón social GOLD SEGURIDAD)
| Fila | Bloque | Texto exacto | P (ago) | R (jul) | Origen Real |
|---|---|---|---|---|---|
| 3 | DISP | `Disponibilidades` | | | |
| 4 | DISP | BANCO Y FCI | SM `=388561658.52-64074531` | idem | manual (con traspaso a Mantenor) |
| 5 | DISP | EFECTIVO | SM `=-136170039+78411842.93-6316335.37+64074531` | idem | manual (ajustes Brillante↔Mantenor) |
| 6 | DISP | DOLARES | tip. | tip. | manual |
| 7 | DISP | RESERVA PAGO IVA AVIANOR | — | — | |
| 8 | DISP | CHEQUES EN CARTERA | tip. | tip. | |
| 9 | DISP | CHEQUES NEGOCIADOS PENDIENTES DE INGRESO | tip. (−) | tip. | |
| 10 | DISP | COBRANZA MACRO LI 03/01 | — | — | |
| 11 | DISP | RESERVA AGUINALDO | — | tip. (−160M) | |
| 12 | DISP | ADICIONALES / COMISIONES PENDIENTES | — | — | |
| 13 | DISP | RESERVA APORTE MS - DEVOLUCION LUQUE | — | — | |
| 14 | DISP | RECUPERO APORTE BLANQUEO | — | — | |
| 15 | DISP | ` TOTAL DISPONIBILIDADES` | `=SUM(4:13)` ⚠ (jul 4:14) | idem | |
| 17 | ING | INGRESOS | | | |
| 18 | ING | Cobranza Contado | tip. | tip. 538.260.781 | COBRANZAS UN BRILLANTE − cobranzas de GOLD ✓exacto |
| 19 | ING | Cobranza Cheque Diferido | — | — | |
| 20 | ING | Otras operaciones (MANTENOR JUJUY) | — (jul 50M) | — | |
| 21 | ING | Otros Operaciones (GOLD SALTA) | tip. | tip. 13.848.690 | COBRANZAS razón social GOLD SEGURIDAD ✓ |
| 22 | ING | Otro (Cobro IVA interempresa) | — | — | |
| 23 | ING | Resultado FCI | — | SM | manual |
| 24 | ING | Préstamo MS | — | — | |
| 25 | ING | Reserva pago IVA avianor | — | — | |
| 26 | ING | Venta HS Vuelos Avianor | — | — | |
| 27 | ING | Aporte MS - Devolucion Luque | — | — | |
| 28 | ING | Diferencia Expensas a Recuperar | — | — | |
| 29 | ING | Reserva SAC | — | `=+P` | espejo de fila 11 |
| 30 | ING | Retroactivo IPSST | — | — | |
| 31 | ING | Otro (MSNT Av Papa F./Av Siria / Av Sarmiento) | tip. | tip. 78.411.843 | manual (cobro que entró por Mantenor) |
| 32 | ING | TOTAL INGRESOS | SUM(18:31) | idem | |
| 33 | ING | DISPONIBLE ANTES DE GASTOS | `=15+32` | idem | |
| 35 | EGR | EGRESOS | | | |
| 36 | EGR | Cheques diferidos | `'DETALLE Ago26'!C29` | `=-'DETALLE GASTOS REALES'!E26` | CHEQUES DIFERIDOS ✓ |
| 37 | EGR | Sueldos | `…!C5` | SM `=96050003.15+189375475` | SUELDOS UN ✓ + reparto nómina |
| 38 | EGR | Prestamos y tarjetas | `…!C31` | tip. 7.814.242 | PREST BRIOS Y TC (3,9M) + reparto tarjetas |
| 39 | EGR | SAC | `…!C6` (=Sueldos/2/6) | SM `=26388121+98291076` | SAC UN ✓ + reparto |
| 40 | EGR | Adicionales y comisiones especiales | `…!C36 + …!C35` (COMISION MACRO + COMISIONES MSP) | `=-…!E32` | COMISIONES ESPECIALES (36,7M UN + 6,3M movidos desde Mantenor) |
| 41 | EGR | Impuestos | `…!C32 + …!C7` (IVA-IIBB-OTROS + Cargas sociales 931) | `=-…!E57` | IMP Y PREVISIONALES (9,9M) + PRORRATEO IMPUESTOS (80,7M) |
| 42 | EGR | Expensas | `…!C37` | tip. 33.206.197,25 | reparto UN EXPENSAS |
| 43 | EGR | Gastos Bancarios | `…!C28` | tip. 13.100.212 | COM Y GTOS BRIOS ✓exacto |
| 44 | EGR | Proveedores | `…!C9` | `=-…!E164` | PROV Y SERV ✓ |
| 45 | EGR | Compra IVA | `…!C30` | tip. 639.772,15 | IVA ✓exacto |
| 46 | EGR | Liquidaciones finales y juicios | `…!C27` | `=-…!E71` | LIQ FINAL + JUICIOS ✓ |
| 47 | EGR | Gastos Gold Seguridad | — | — | |
| 48 | EGR | TOTAL EGRESOS OPERATIVOS | SUM(36:47) | idem | |
| 49 | ABAJO | Reembolsos de préstamos | — (jul `=+DO62` = el Disponible) | tip. 6.103.500 | PRESTAMOS MS ✓ |
| 50 | ABAJO | Dividendos | tip. 6.193.670 (= Disponible fila 62) | — | |
| 51 | ABAJO | Devolcion MS - Aporte Camioneta | — | — | |
| 52 | ABAJO | Traspaso Saldo Prestamo MS - Brillante a Mantenor | — | — | |
| 53 | ABAJO | Traspaso Saldo Inicial Brillante - Mantenor | — | tip. 254.780.390 | manual |
| 54 | ABAJO | Ajuste Caja -  A conciliar | — | — | |
| 55 | ABAJO | Devolucion Luque - Aporte MS | — | — | |
| 56 | ABAJO | Aporte para blanqueo | — | — | |
| 57 | ABAJO | Recupero Gastos | — | — | |
| 58 | ABAJO | Inversiones | — | — | |
| 59 | TOT | TOTAL EGRESOS | SUM(48:58) | idem | |
| 60 | CIERRE | SALDO INICIAL + INGRESOS - TOTAL EGRESOS | `=33-59` | idem | |
| 61 | CIERRE | CAPITAL DE TRABAJO PROPUESTO (SUELDOS) | `=37+39+31000000` (jul tip. 500M) | — | |
| 62 | CIERRE | DISPONIBLE SI - CAPITAL DE TRABAJO | `=15-61` | — | |

### 2.4 HAVANNA — UN: HAVANNA (razones sociales PANINI + TUCSON)
| Fila | Bloque | Texto exacto | P (ago) | R (jul) | Origen Real |
|---|---|---|---|---|---|
| 4 | DISP | DISPONIBILIDADES (principios de mes) | | | |
| 5 | DISP | BANCO Y FCI | tip. | tip. | manual |
| 6 | DISP | EFECTIVO | tip. | tip. | manual |
| 7 | DISP | DOLARES | — | — | |
| 8 | DISP | RESERVA AGUINALDO | — | tip. (−32,5M) | |
| 9 | DISP | CHEQUES NEGOCIADOS PENDIENTES DE INGRESO | — | — | |
| 10 | DISP | INGRESO BANCO MACRO | — | — | |
| 11 | DISP | ` TOTAL DISPONIBILIDADES` | SUM(5:10) | idem | |
| 13 | ING | INGRESOS | | | |
| 14 | ING | Cobranza Bancos Ingreso Neto | `'DETALLE AGOSTO 2026'!K6` (= ventas × 0,7) | `=344516382.22 + DATOS ADIC.!D5 + !B32 + !B38` | manual: cobranza bancaria + comisiones TC + tarjetas a cobrar |
| 15 | ING | Cobranzas locales | `…!K5` (= ventas × 0,3) | `=145264900 + DATOS ADIC.!M13 + !M15` | manual: efectivo de locales + sueldos y gastos pagados en locales |
| 16 | ING | Acreditacion Tarjetas pendientes | `=-(R jul fila 21)` | `=+P` | espejo |
| 17 | ING | Resultado FCI | — | SM | manual |
| 18 | ING | Reserva Aguinaldo | — | `=+P` | espejo |
| 19 | ING | Préstamo | — | — | (entra en el Disponible) |
| 20 | ING | Préstamo MS  | — | — | |
| 21 | ING | Otro tarjeta no ingresada | `=-'DETALLE AGOSTO 2026'!K7` (20% de K6) | `=-DATOS ADIC.!B32-!B38` | manual |
| 22 | ING | Otros Ingresos | — | tip. 29.885 | IVA ✓ |
| 23 | ING | Recupero Gastos MS  | — | — | |
| 24 | ING | TOTAL INGRESOS | SUM(14:23) | idem | |
| 25 | ING | DISPONIBLE ANTES DE GASTOS | `=11+24` | idem | |
| 27 | EGR | EGRESOS | | | |
| 28 | EGR | Cheques diferidos | `'DETALLE AGOSTO 2026'!E93` | `=-'DETALLE GASTOS REALES'!E2` | CHEQUES DIFERIDOS ✓ |
| 29 | EGR | Sueldos | `…!E59 + …!E60` (Sueldos + Jornales) | `=23038042 + DATOS ADIC.!M13` | SUELDOS UN ✓ + sueldos pagados en efectivo en locales (66,7M) |
| 30 | EGR | SAC Y VACACIONES | — | tip. 33.544.911 | SAC ✓exacto |
| 31 | EGR | Prestamos | — | — | |
| 32 | EGR | Tarjetas y Comisiones | `…!E77` | `=DATOS ADIC.!D5` | manual (liquidación tarjetas PANINI+TUCSON) |
| 33 | EGR | Inversiones | tip. 60M | `=-…!E55` | INVERSIONES ✓ |
| 34 | EGR | Impuestos | `…!E62 + …!E82` | `=-…!E25` | IMP Y PREVISIONALES ✓ |
| 35 | EGR | Expensas | `…!E63` | tip. 29.457.110,46 | reparto UN EXPENSAS |
| 36 | EGR | Impuesto al cheque | `…!E83` | SM `=16859046.4+32620.56` | COM Y GTOS BRIOS ✓ + 32.620 |
| 37 | EGR | Compra IVA | — | — | |
| 38 | EGR | Proveedores | `…!F38+F55+F66+F95` | `=-…!E233` | PROV Y SERV (446,2M) + GASTOS TARJETAS (3,6M = PREST BRIOS Y TC) + GASTOS VS BARES (25,6M manual) |
| 39 | EGR | Juicios | `…!E64` | — ⚠ | |
| 40 | EGR | Liq Final | — | `=-…!E67` | **JUICIOS** (8,76M) ⚠ cruzado |
| 41 | EGR | TOTAL EGRESOS OPERATIVOS | SUM(28:40) | idem | |
| 42 | ABAJO | Devolucion prestamo - Deuda expensas | — | — | |
| 43 | ABAJO | Devolucion prestamo - Prestamo MS | `=+DS52` (= el Disponible) | tip. 56.340.000 | PRESTAMOS MS ✓ |
| 44 | ABAJO | Dividendos | — | — | |
| 45 | ABAJO | Cuenta Particular MS -  Aporte liquidacion Mundo Cell | — | — | |
| 46 | ABAJO | Ajuste Caja - A conciliar | — | — | |
| 47 | ABAJO | Pagos solicitados MS | — | — | |
| 48 | ABAJO | Retiros MS | — | — | |
| 49 | TOT | TOTAL EGRESOS | SUM(41:48) | idem | |
| 50 | CIERRE | SALDO INICIAL + INGRESOS - TOTAL EGRESOS | `=25-49` | idem | |
| 51 | CIERRE | CAPITAL DE TRABAJO PROPUESTO | `=29+35+38/4+33/3` | — | |
| 52 | CIERRE | DISPONIBLE SI - CAPITAL DE TRABAJO | `=11-51+19` | — | |

### 2.5 RADIO — UN: RADIO (razones sociales RADIO, INFO, INFO SAT)
| Fila | Bloque | Texto exacto | P (ago) | R (jul) | Origen Real |
|---|---|---|---|---|---|
| 4 | DISP | DISPONIBILIDADES (principios de mes) | | | |
| 5 | DISP | BANCO Y FCI | tip. | tip. | manual |
| 6 | DISP | EFECTIVO | tip. | tip. | manual |
| 7 | DISP | CHEQUES EN CARTERA | tip. | tip. | manual |
| 8 | DISP | CHEQUES NEGOCIADOS PENDIENTES DE INGRESO | tip. (−) | — | manual |
| 9 | DISP | COMISIONES ESPECIALES PENDIENTES | — | — | |
| 10 | DISP | RESERVA AGUINALDO | — | tip. (−6M) | |
| 11 | DISP | CHEQUES EN CARTERA DESPUES DEL 15 | — | — | |
| 12 | DISP | ` TOTAL DISPONIBILIDADES` | SUM | idem | |
| 14 | ING | INGRESOS | | | |
| 15 | ING | Cobranza clientes | tip. | tip. 105.404.852,67 | COBRANZAS ✓exacto |
| 16 | ING | Otras operaciones | — | — | |
| 17 | ING | Resultado FCI | — | SM | manual |
| 18 | ING | Reserva de aguinaldo | — | `=+P` | espejo |
| 19 | ING | Cheques despues del 15 | — | — | espejo de fila 11 |
| 20 | ING | Ingreso - Cobro juicio Municipalidad | — | — | |
| 21 | ING | Devolucion embargo | — | — | |
| 22 | ING | Otro | — | — | |
| 23 | ING | TOTAL INGRESOS | SUM(15:22) | idem | |
| 24 | ING | DISPONIBLE ANTES DE GASTOS | `=23+12` | idem | |
| 26 | EGR | EGRESOS | | | |
| 27 | EGR | Cheques diferidos | tip. | — | |
| 28 | EGR | Sueldos | `'DETALLE GASTOS PRESUPUESTADOS'!D7` | tip. 34.294.077 | SUELDOS ✓exacto |
| 29 | EGR | SAC | 0 | tip. 5.954.379 | SAC ✓exacto |
| 30 | EGR | Prestamos y tarjetas | 0 | — | |
| 31 | EGR | Comisiones Especiales | `…!D65` | `=-'DETALLE GASTOS REALES'!E9` | COMISIONES ESPECIALES ✓ |
| 32 | EGR | Impuestos | `…!D22` | `=-…!E34` | IMP Y PREVISIONALES ✓ |
| 33 | EGR | Expensas | `…!D67` | tip. 12.050.636,10 | reparto UN EXPENSAS |
| 34 | EGR | Expensas - No socios | — | — | |
| 35 | EGR | Impuesto al cheque (Gto Brio) | `…!D27` | tip. 1.472.404 | ≈ COM Y GTOS BRIOS (1.607.849; dif. 135k) |
| 36 | EGR | Costo IVA / Factura C / Efectivo | `…!D24` | tip. 1.963.988 | manual (IVA neto UN = +5,7M, no coincide) |
| 37 | EGR | Proveedores | `…!D62` | `=-…!E79` | PROV Y SERV + GASTOS TARJETAS (330.409) |
| 38 | EGR | Juicios | — | — | |
| 39 | EGR | TOTAL EGRESOS OPERATIVOS | SUM(27:38) | idem | |
| 40 | ABAJO | Reembolsos de préstamos | — | — | |
| 41 | ABAJO | Dividendos | tip. 25M | tip. 28.013.500 | DIVIDENDOS ✓ |
| 42 | ABAJO | Ajuste caja - A conciliar | — | — | |
| 43 | ABAJO | Otro | — | — | |
| 44 | TOT | TOTAL EGRESOS | SUM(39:43) | idem | |
| 45 | CIERRE | SALDO INICIAL + INGRESOS - TOTAL EGRESOS | `=24-44` | idem | |
| 46 | CIERRE | CAPITAL DE TRABAJO PROPUESTO (15 DIAS) | `=39/2` | — | |
| 47 | CIERRE | DISPONIBLE SI - CAPITAL DE TRABAJO | `=12-46` | — | |

### 2.6 MANTENOR — UN: MANTENOR (solo 5 bloques: ene/feb/mar viejos vacíos + jul y ago 2026)
| Fila | Bloque | Texto exacto | P (ago) | R (jul) | Origen Real |
|---|---|---|---|---|---|
| 4 | DISP (sin título) | BANCO Y FCI | SM `=385425510.36+64074531` | tip. | manual |
| 5 | DISP | EFECTIVO | SM `=153768033.38-78411842.93+6316335.37-64074531` | — | manual |
| 6 | DISP | DOLARES | — | tip. | manual |
| 7 | DISP | CHEQUES NEGOCIADOS PENDIENTES DE INGRESO | — | — | |
| 8 | DISP | EFECTIVO DISPONIBLE (principios de mes) | SUM(4:7) | idem | |
| 10 | ING | INGRESOS | | | |
| 11 | ING | Cobranza Mantenor Jujuy | tip. | tip. | manual (parte de COBRANZAS) |
| 12 | ING | Cobranza MSNT Av Papa F./Av Siria / Av Sarmiento | tip. | SM `=395695689.58-78411842.93` | manual |
| 13 | ING | Traspaso Saldo Inicial Brillante - Mantenor | — | — | |
| 14 | ING | Traspaso Saldo Prestamo MS - Brillante a Mantenor | — | — | |
| 15 | ING | Resultado FCI | — | SM | manual |
| 16 | ING | Préstamo MS | — | — | |
| 17 | ING | TOTAL INGRESOS | SUM(11:16) | idem | |
| 18 | ING | DISPONIBLE ANTES DE GASTOS | `=8+17` | idem | |
| 20 | EGR | GASTOS | | | |
| 21 | EGR | Cheques diferidos | `'DETALLE Ago26'!C37` | `=-'DETALLE GASTOS REALES'!E13` | CHEQUES DIFERIDOS ✓ |
| 22 | EGR | Sueldos | `…!C5` | SM `=9516500+14541399` | SUELDOS UN ✓ + reparto |
| 23 | EGR | SAC | `…!C6` | SM `=3815500+5935510` | SAC UN ✓ + reparto |
| 24 | EGR | Tarjetas | `…!C39` (PRESTAMOS Y TARJETAS) | — | |
| 25 | EGR | Adicionales y comisiones especiales | `…!C43` | `=-…!E20` | COMISIONES ESPECIALES (183k; el resto 6,3M se movió a Brillante) |
| 26 | EGR | Impuestos | `…!C40 + …!C7` | `=-…!E43` | IMP Y PREVISIONALES + PRORRATEO (11,4M) |
| 27 | EGR | Expensas | `…!C44` | tip. 31.599.445,77 | reparto UN EXPENSAS |
| 28 | EGR | Gastos Bancarios | `…!C36` | tip. 9.473.206,01 | COM Y GTOS BRIOS ✓exacto |
| 29 | EGR | Compra IVA | `…!C38` | tip. 1.500.000 | IVA ✓exacto |
| 30 | EGR | Proveedores | `…!C9 + …!C29` (Pintura vial + Mantenor Jujuy) | `=-…!E114` | PROV Y SERV (28,3M en la hoja vs 26,3M en la UN: filas movidas a mano) |
| 31 | EGR | Liquidaciones Finales y Juicios | `…!C35` | `=-…!E53` | LIQ FINAL ✓ |
| 32 | EGR | TOTAL GASTOS OPERATIVOS | SUM(21:31) (jul P suma 22:31 ⚠) | idem | |
| 33 | ABAJO | Prestamos | `=+N39` (= Disponible) | — | |
| 34 | ABAJO | Dividendos | — | — | |
| 35 | ABAJO | Inversiones | — | — | |
| 36 | TOT | TOTAL GASTOS | SUM(32:35) | idem | |
| 37 | CIERRE | POSICIÓN DE EFECTIVO (fin de mes) | `=8+17-36` | `=18-36` | |
| 38 | CIERRE | CAPITAL DE TRABAJO PROPUESTO (SUELDOS) | tip. 231.200.000 | — | |
| 39 | CIERRE | DISPONIBLE SI - CAPITAL DE TRABAJO | `=8-38` | — | |

### 2.7 HANDY (HWC) — extracto propio (hoja `EJECUCION JULIO`, col. Clasificacion)
| Fila | Bloque | Texto exacto | P (ago) | R (jul) | Origen Real |
|---|---|---|---|---|---|
| 3 | DISP | `Disponibilidades` | | | |
| 4 | DISP | BANCOS Y FCI | tip. | tip. | manual |
| 5 | DISP | CAJA | tip. | tip. | manual |
| 6 | DISP | TRANSFERENCIA SAIFE PENDIENTE RETIRO | — | — | |
| 7 | DISP | CHEQUES EN CARTERA | tip. | tip. | |
| 8 | DISP | CHEQUES PENDIENTES DE INGRESO | tip. (−) | tip. | |
| 9 | DISP | DOLARES EN CAJA | tip. | tip. | |
| 10 | DISP | PREVISION SAC | — | — | |
| 11 | DISP | PAGO LATAM PENDIENTE | — | — | |
| 12 | DISP | DISPONIBILIDAD INICIAL | SUM(4:11) | idem | |
| 14 | ING | INGRESOS | | | |
| 15 | ING | CLIENTES PROPIOS | tip. | tip. | manual |
| 16 | ING | FACTURACION HANDY A LATAM | tip. | tip. | manual |
| 17 | ING | RECAUDACION LATAM Y AVIANCA | tip. | SM `=13935674.76+815414074.74-116893800` | manual |
| 18 | ING | RECAUDACION JETSMART | tip. | SM | manual |
| 19 | ING | RESERVA SAC | — | — | |
| 20 | ING | RECUPERO EXPENSAS | — | — | |
| 21 | ING | RECUPERO APORTE BLANQUEO | — | — | |
| 22 | ING | RESULTADO FCI | tip. | tip. | manual |
| 23 | ING | TOTAL DE INGRESOS | SUM(15:22) | idem | |
| 24 | ING | DISPONIBLE ANTES DE GASTOS | `=12+23` | idem | |
| 26 | EGR | GASTOS | | | |
| 27 | EGR | IMPUESTO AL CHEQUE | tip. | tip. | COM Y GTOS BRIOS (extracto HWC) |
| 28 | EGR | CHEQUES DIFERIDOS | — | — | |
| 29 | EGR | IMPUESTOS | `=-'DETALLE PRESUPUESTO'!B19` | `=-'EJECUCION JULIO'!E16` | IMP Y PREVISIONALES ✓ |
| 30 | EGR | PRESTAMOS BANCARIOS Y TC | tip. | tip. | |
| 31 | EGR | PROVEEDORES Y SERVICIOS | `=-'DETALLE PRESUPUESTO'!B106` | `=-'EJECUCION JULIO'!E96` | PROV Y SERV ✓ |
| 32 | EGR | SUELDOS | tip. | tip. 243.294.732 | manual (UN HWC en Ejecución consolidada solo 39,3M) |
| 33 | EGR | SAC | tip. | tip. 15.476.447 | SAC HWC ✓ |
| 34 | EGR | EXPENSAS | tip. | tip. | |
| 35 | EGR | COSTO OPERACIONES IVA | tip. | tip. | |
| 36 | EGR | LIQUIDACIONES FINALES | — | — | |
| 37 | EGR | COMISIONES ESPECIALES | tip. | tip. 3.672.000 | COMISIONES ESPECIALES HWC ✓ |
| 38 | EGR | SUBTOTAL ESTRUCTURA DE GASTOS | SUM(27:37) | idem | |
| 39 | ABAJO | PAGO GLOBE AIR CARGO | tip. | tip. | manual |
| 40 | ABAJO | PAGO LATAM Y LAN ECUADOR | SM `=395251226.77+6131770+42766766.8` | tip. | manual |
| 41 | ABAJO | PAGO AVIANCA | tip. | tip. | |
| 42 | ABAJO | PAGO FLYBONDI | tip. | tip. | |
| 43 | ABAJO | PAGO GOL LINEAS AEREAS | tip. | — | |
| 44 | ABAJO | Dividendos Entregados | 0 | tip. 142M | |
| 45 | ABAJO | Gastos Avion | tip. | tip. | |
| 46 | ABAJO | MS | tip. | tip. | |
| 47 | ABAJO | Ajuste Caja - A conciliar | — | — | |
| 48 | ABAJO | Aporte Blanqueo | — | — | |
| 49 | ABAJO | Dividendos Pendientes | — | — | |
| 50 | TOT | TOTAL EN EFECTIVO PAGADO | SUM(38:49) | idem | |
| 51 | CIERRE | POSICIÓN DE EFECTIVO (fin de mes) | `=24-50` | idem | |
| 52 | CIERRE | Capital de trabajo propuesto | `=+38` (1 mes de estructura) | — | |
| 53 | CIERRE | Excedente (+) / Faltante (-) | `=12-52` | — | |

### 2.8 AVIANOR — hoja mensual propia (`JULIO 2026`, tabla dinámica en B50)
| Fila | Bloque | Texto exacto | P (ago) | R (jul) | Origen Real |
|---|---|---|---|---|---|
| 4 | DISP | EFECTIVO DISPONIBLE (principios de mes) | `=+CO37` (cierre R jul) | `=+CL37` (cierre R jun) | **fórmula** = cierre real anterior |
| 6 | ING | INGRESOS | | | |
| 7 | ING | Cobranza clientes | — | `GETPIVOTDATA(…"CLASIFICACION","COBRANZAS")` | COBRANZAS |
| 8–13 | ING | Otras operaciones · Venta de Propiedades y Equipos · Cobro de Capital de Préstamos · Préstamo · Aporte MS · Otro | — | — | |
| 14 | ING | TOTAL INGRESOS | SUM(7:13) | idem | |
| 15 | ING | DISPONIBLE ANTES DE GASTOS | `=4+14` | idem | |
| 17 | EGR | EGRESOS | | | |
| 18 | EGR | Cheques diferidos | — | — | |
| 19 | EGR | Sueldos | tip. | `-GETPIVOTDATA(…"SUELDOS")` | SUELDOS |
| 20 | EGR | SAC | — | GPD "SAC" | SAC |
| 21 | EGR | Comisiones | — | GPD "COMISIONES" | COMISIONES (nombre distinto a COMISIONES ESPECIALES) |
| 22 | EGR | Tarjetas | — | GPD "TARJETAS" | TARJETAS |
| 23 | EGR | Adicionales | — | — | |
| 24 | EGR | Impuestos | tip. | — | |
| 25 | EGR | Expensas | tip. | GPD "EXPENSAS" | EXPENSAS |
| 26 | EGR | Expensas - No socios | — | — | |
| 27 | EGR | Gastos Bancarios | — | — | |
| 28 | EGR | Proveedores | tip. 35M (jul SM `=20000000+8000*1530`) | GPD "PROV Y SERV" | PROV Y SERV |
| 29 | EGR | Liquidacion Final | — | — | |
| 30 | EGR | Otro | — | — | |
| 31 | EGR | TOTAL EGRESOS OPERATIVOS | SUM(18:30) | idem | |
| 32–35 | ABAJO | Reembolsos de préstamos · Dividendos · Cuenta Particular · Otro | — | — | |
| 36 | TOT | TOTAL EGRESOS | SUM(31:35) | idem | |
| 37 | CIERRE | SALDO INICIAL + INGRESOS - TOTAL EGRESOS | `=15-36` | idem | |
| — | | (no tiene Capital de trabajo ni Disponible) | | | |

Ojo: el Real de agosto ya tiene fórmulas `='JUNIO 26'!J35…`, un error de copia. Avianor viene negativo y acumula: el cierre de julio es −752M. Esos gastos los paga Conexión (ver Conexión fila 63).

### 2.9 HAVANNA PERÚ — soles; hojas `MOVIMIENTOS <mes>` → `RESUMEN GASTOS REALES`
| Fila | Bloque | Texto exacto | P (ago) | R (jul) | Origen Real |
|---|---|---|---|---|---|
| 4 | DISP | EFECTIVO DISPONIBLE (principios de mes) | `=+BW35` (cierre R jul) | `='MOVIMIENTOS JULIO 26'!G1556` | saldo del extracto |
| 6 | ING | INGRESOS | | | |
| 7 | ING | Cobranza clientes | tip. | `'RESUMEN GASTOS REALES'!C299` | COBRANZAS (pivot propio) |
| 8 | ING | Otras operaciones (APORTES) | `RESUMEN!Z193` | — | |
| 9–13 | ING | Venta de Propiedades y Equipos · Cobro de Capital de Préstamos · Préstamo · DEVOLUCION PERCEPCION IGV · Otro | 0 | — | |
| 14 | ING | TOTAL INGRESOS | SUM | idem | |
| 15 | ING | DISPONIBLE ANTES DE GASTOS | `=4+14` | idem | |
| 17 | EGR | GASTOS | | | |
| 18 | EGR | Gratificaciones | 0 | `RESUMEN!C300` | |
| 19 | EGR | Sueldos | tip. | `RESUMEN!C297` | |
| 20 | EGR | Prestamos | `=+BR20` (= P junio) | `RESUMEN!C293` | |
| 21 | EGR | Tarjetas | `=+BR21` | `RESUMEN!C301` | |
| 22 | EGR | Adicionales | — | — | |
| 23 | EGR | Impuestos | `'PRESUPUESTO AGOSTO 26'!D10` | `RESUMEN!C292` | |
| 24 | EGR | Expensas | `'PRESUPUESTO NOVIEMBRE'!AJ52` ⚠ vacío | — | |
| 25 | EGR | Gastos Bancarios | `=+BR25` | `RESUMEN!C291 + C298` | |
| 26 | EGR | Proveedores | `'PRESUPUESTO AGOSTO 26'!D42` | `RESUMEN!C294` | |
| 27 | EGR | Regalias | `'PRESUPUESTO AGOSTO 26'!G26` (× TC) | 0 | |
| 28 | EGR | Otro | 0 | — | |
| 29 | EGR | TOTAL GASTOS OPERATIVOS | SUM(18:28) | idem | |
| 30 | ABAJO | Importacion Havanna | — | `RESUMEN!C296` | |
| 31 | ABAJO | Soles a Dolares | — | `RESUMEN!C295` | |
| 32 | ABAJO | Dividendos | 0 | — | |
| 33 | ABAJO | Implementacion nuevos locales | 0 | — | |
| 34 | TOT | TOTAL GASTOS | SUM(29:33) | idem | |
| 35 | CIERRE | POSICIÓN DE EFECTIVO (fin de mes) | `=15-34` | idem | |
| 36 | CIERRE | Capital de trabajo propuesto | `=80000*'PRESUPUESTO AGOSTO 26'!E2` (USD 80.000 × TC) | — | |
| 37 | CIERRE | Excedente (+) / Faltante (-) | `=4-36` | `=4-36` | |
| 40 | (control) | CONTROL SF | | `=BW35-'MOVIMIENTOS JULIO 26'!G1563` | control cierre vs extracto |

### 2.10 BRADENTON — USD; banco Chase (hoja `CHASE` → `Ejecutado 07-2026` / `Presup 08-2026`)
| Fila | Bloque | Texto exacto | P (ago) | R (jul) | Origen Real |
|---|---|---|---|---|---|
| 4 | DISP | DISPONIBILIDADES (principios de mes) | | | |
| 5 | DISP | BANCO | `'Presup 08-2026'!B2` (=CHASE!F216, saldo) | `=+P` | saldo extracto |
| 6 | DISP | EFECTIVO | `…!B3` tip. ("Caja Central Inicio") | `=+P` | manual |
| 7 | DISP | ` TOTAL DISPONIBILIDADES` | SUM(5:6) | idem | |
| 9 | ING | INGRESOS | | | |
| 10 | ING | Cobranza clientes | `…!C7` | `Ejecutado!F7+F8` (COBRANZAS + DEP EFECTIVO) | |
| 11 | ING | Otras operaciones | `…!C10` | `F9+F10+F11` (FOOD TRUCK + ICE MACHINE + REBATE) | |
| 12–14 | ING | Venta de Propiedades y Equipos · Cobro de Capital de Préstamos · Préstamo | — | — | |
| 15 | ING | Otro (TC mes anterior) | — (jul 20.000) | — | |
| 16 | ING | Otro | — | — | |
| 17 | ING | TOTAL INGRESOS | SUM(10:16) | idem | |
| 18 | ING | DISPONIBLE ANTES DE GASTOS | `=7+17` | idem | |
| 20 | EGR | GASTOS | | | |
| 21 | EGR | Cheques diferidos | `=-…!B13` | `=-F13` (CHEQ EMITIDOS) | |
| 22 | EGR | Sueldos | `=-…!B23` | `=-F23` | |
| 23 | EGR | Prestamos y tarjetas | — | — | |
| 24 | EGR | `Adicionales: ` | — | — | |
| 25 | EGR | Impuestos | `=-…!B17` | `=-F17` (TAX) | |
| 26 | EGR | Impuesto inmobiliario (Manatee) | — | `=-F27` | |
| 27 | EGR | Expensas | `=-…!B24` | `=-F24` | |
| 28 | EGR | Gastos Bancarios | `=-…!B14` | `=-F14` (COM Y GTOS BRIOS) | |
| 29 | EGR | Proveedoresv(Mercs + Servicios+Mant+ Honorarios) | `=-(B16+B19+B20+B21+B22)` | `=-(F16+F19+F20+F21+F22)` | |
| 30–32 | EGR | Proveedores IVA · Liquidaciones Finales · Juicios | — | — | |
| 33 | EGR | Otro: Lottery | `=-…!B18` | `=-F18` (LOTTERY) | |
| 34 | EGR | TOTAL GASTOS OPERATIVOS | SUM(21:33) | idem | |
| 35 | ABAJO | Reembolsos de préstamos | — | — | |
| 36 | ABAJO | Dividendos | 0 | `=-'Ejecutado'!O15` | |
| 37 | ABAJO | Inversion Food Truck | — | — | |
| 38 | ABAJO | Otro | — | — | |
| 39 | TOT | TOTAL GASTOS | SUM(34:38) | idem | |
| 40 | CIERRE | POSICIÓN DE EFECTIVO (fin de mes) | `=18-39` | idem | |
| 41 | CIERRE | Capital de trabajo propuesto | tip. 30.000 | tip. 30.000/30.001 | |
| 42 | CIERRE | Excedente / Faltante | `=7-41` | `=7-41` | |
| 44 | (control) | — | `=+U40-W7` (cierre jul − disp ago) | | control |

### 2.11 PLATE SILVER — USD (Uruguay); hojas `DETALLE DE GASTOS REALES_07` / `DETALLE DE GASTOS PRESUPUEST_08`
| Fila | Bloque | Texto exacto | P (ago) | R (jul) | Origen Real |
|---|---|---|---|---|---|
| 4 | DISP | DISPONIBILIDADES (principios de mes) | | | |
| 5 | DISP | BANCO | `=+U39` (cierre R jul) | `=+P` | **fórmula** |
| 6 | DISP | EFECTIVO | — | — | |
| 7 | DISP | CHEQUES EN CARTERA | — | — | |
| 8 | DISP | ` TOTAL DISPONIBILIDADES` | `=SUM(4:7)` | idem | |
| 10 | ING | INGRESOS | | | |
| 11 | ING | Cobranza clientes | `'…PRESUPUEST_08'!I7` | `'…REALES_07'!D3` | |
| 12–15 | ING | Otras operaciones · Venta de Propiedades y Equipos · Cobro de Capital de Préstamos · Préstamo | — | — | |
| 16 | ING | Otro (retencio UI + Collet) | `=+U16` (R mes ant.) | `…!D4` (percepción IVA UI, −) | |
| 17 | ING | Otro | — | `…!D11` (ingreso por error del cliente) | |
| 18 | ING | TOTAL INGRESOS | SUM(11:17) | idem | |
| 19 | ING | DISPONIBLE ANTES DE GASTOS | `=8+18` | idem | |
| 21 | EGR | GASTOS | | | |
| 22 | EGR | Cheques diferidos | — | — | |
| 23 | EGR | Sueldos | `…!H52` | `=-…!D53` | |
| 24 | EGR | Impuestos | `=-…!I20` | `=-…!D20` | |
| 25–27 | EGR | Prestamos y tarjetas · Adicionales · Expensas | — | — | |
| 28 | EGR | Gastos Bancarios | tip. 100 | `=-…!D5` | |
| 29 | EGR | Proveedores | `…!I40` | `=-…!D40` | |
| 30–31 | EGR | Proveedores IVA · Liquidaciones Finales | — | — | |
| 32 | EGR | Diferencia de cambio - Otros gastos banco | `=+U17-1.7-1.7` (devuelve el ingreso por error) | tip. 0,43 | |
| 33 | EGR | Otro (reposición de fondo fijo) | 0 | 0 | |
| 34 | EGR | TOTAL GASTOS OPERATIVOS | SUM(22:33) | idem | |
| 35 | ABAJO | Reembolsos de préstamos | — | — | |
| 36 | ABAJO | Dividendos | tip. 30.000 | `=-…!D6` | |
| 37 | ABAJO | Otro | — | — | |
| 38 | TOT | TOTAL GASTOS | SUM(34:37) | idem | |
| 39 | CIERRE | POSICIÓN DE EFECTIVO (fin de mes) | `=19-38` | idem | |
| 40 | CIERRE | Capital de trabajo propuesto | `=+34` (1 mes de gastos operativos) | `=+34` | |
| 41 | CIERRE | Excedente(+) / Faltante (-) | `=8-40` | `=8-40` | |
| 43 | (nota) | Nota: las cifras están expresadas en dólares americanos. | | | |

---

## 3. Cuadro comparativo de filas

Leyenda de empresas: **CX** Conexión · **BR** Brillante · **HV** Havanna · **RA** Radio · **FR** Fredy · **MN** Mantenor · **HW** Handy/HWC · **AV** Avianor · **HP** Havanna Perú · **BD** Bradenton · **PS** Plate Silver.

### 3.1 Conceptos comunes (mismo concepto; se listan los nombres distintos)
| Concepto canónico | Bloque | Nombres usados (empresa) |
|---|---|---|
| Banco | DISP | BANCO (CX, BD, PS) · BANCO Y FCI (BR, HV, RA, MN) · BANCOS + FCI (FR) · BANCOS Y FCI (HW) |
| Efectivo | DISP | EFECTIVO (CX, BR, HV, RA, FR, MN, BD, PS) · CAJA (HW) |
| Dólares | DISP | DOLARES (CX, BR, HV, MN) · DÓLAR (FR) · DOLARES EN CAJA (HW) |
| Cheques en cartera | DISP | CHEQUES EN CARTERA (CX, BR, RA, HW, PS) |
| Cheques negociados pendientes | DISP | CHEQUES NEGOCIADOS PENDIENTES DE INGRESO (CX, BR, HV, RA, FR, MN) · CHEQUES PENDIENTES DE INGRESO (HW) |
| Reserva aguinaldo (−) | DISP | RESERVA AGUINALDO (CX, BR, HV, RA, FR) · PREVISION SAC (HW) |
| Cheques posteriores (−) | DISP | CHEQUES EN CARTERA DESPUES DEL 10 (CX) · CHEQUES EN CARTERA DESPUES DEL 15 (RA) |
| Total disponibilidades | DISP | ` TOTAL DISPONIBILIDADES` (CX, BR, HV, RA, BD, PS) · DISPONIBILIDADES INICIALES (FR) · DISPONIBILIDAD INICIAL (HW) · EFECTIVO DISPONIBLE (principios de mes) (MN, AV, HP, donde es fila única) |
| Cobranza | ING | Cobranza Contado (CX, BR) · Cobranza clientes (RA, FR, AV, HP, BD, PS) · Cobranza Bancos Ingreso Neto + Cobranzas locales (HV) · CLIENTES PROPIOS / FACTURACION… / RECAUDACION… (HW) · Cobranza Mantenor Jujuy / Cobranza MSNT… (MN) |
| Cobranza cheque diferido | ING | Cobranza Cheque Diferido (CX, BR) |
| Otras operaciones | ING | Otras operaciones (RA, AV, HP, BD) · Otras operaciones (VENTA MOTO) (CX) · Otras operaciones (APORTES) (FR, HP) · Otras operaciones (MANTENOR JUJUY) / Otros Operaciones (GOLD SALTA) (BR) |
| Resultado FCI | ING | Resultado FCI (CX, BR, HV, RA, FR, MN) · RESULTADO FCI (HW) |
| Reserva aguinaldo (espejo) | ING | Reserva Aguinaldo (CX, HV, FR) · Reserva de aguinaldo (RA) · Reserva SAC (BR) · RESERVA SAC (HW) |
| Cheques posteriores (espejo) | ING | Cheques en cartera despues del 10 (CX) · Cheques despues del 15 (RA) |
| Préstamo | ING | Préstamo (CX, HV, AV, HP, BD) |
| Préstamo MS (ingreso) | ING | Prestamo MS Ciber (CX) · Préstamo MS (BR, MN) · Préstamo MS  (HV) · Prestamo MS (FR) · Aporte MS (AV) |
| Otro ingreso | ING | Otro (RA, FR, AV, HP, BD, PS) · Otros Ingresos (HV) · Otro (Cobro IVA interempresa) / Otro (MSNT…) (BR) |
| Total ingresos / Disponible antes de gastos | ING | TOTAL INGRESOS / TOTAL DE INGRESOS (HW) · DISPONIBLE ANTES DE GASTOS (todas) |
| Título egresos | EGR | EGRESOS (CX, BR, HV, RA, FR, AV) · GASTOS (MN, HW, HP, BD, PS) |
| Cheques diferidos | EGR | Cheques diferidos (todas salvo HW: CHEQUES DIFERIDOS) |
| Sueldos | EGR | Sueldos / SUELDOS (todas) |
| SAC | EGR | SAC (CX, BR, RA, FR, MN, HW, AV) · SAC Y VACACIONES (HV) · Gratificaciones (HP) |
| Préstamos y tarjetas | EGR | Prestamos y tarjetas (CX, BR, RA, BD, PS) · PRESTAMOS BANCARIOS Y TC (HW) · Tarjetas (MN, AV, HP) · Tarjetas y Comisiones (HV) · Prestamos (HV, HP) |
| Comisiones especiales | EGR | Adicionales y comisiones especiales (CX, BR, MN) · Comisiones Especiales (RA) · Comision Especial (FR) · COMISIONES ESPECIALES (HW) · Comisiones (AV) · Adicionales (AV, HP, PS) |
| Impuestos | EGR | Impuestos / IMPUESTOS (todas) |
| Expensas | EGR | Expensas / EXPENSAS (todas salvo BD/PS vacías) |
| Expensas no socios | EGR | Expensas - No socios (CX, RA, FR, AV) |
| Impuesto al cheque / gastos bancarios | EGR | Impuesto al cheque (Gto Brio) (CX, RA) · Impuesto al cheque (HV, FR) · IMPUESTO AL CHEQUE (HW) · Gastos Bancarios (BR, MN, AV, HP, BD, PS) |
| Proveedores | EGR | Proveedores (todas) · PROVEEDORES Y SERVICIOS (HW) · Proveedoresv(Mercs + Servicios+Mant+ Honorarios) (BD) |
| IVA | EGR | Proveedores IVA (CX, BD, PS) · Compra IVA (BR, HV, MN) · Compra de IVA (FR) · Costo IVA / Factura C / Efectivo (RA) · COSTO OPERACIONES IVA (HW) |
| Liquidaciones finales | EGR | Liquidaciones Finales (CX, BD, PS) · LIQUIDACIONES FINALES (HW) · Liq final (FR) · Liq Final (HV) · Liquidacion Final (AV) · Liquidaciones finales y juicios (BR) · Liquidaciones Finales y Juicios (MN) |
| Juicios | EGR | Juicios y requerimientos AFIP (CX) · Juicios (HV, RA, BD) |
| Otro egreso | EGR | Otro (FR, AV, HP) · Otro (reposición de fondo fijo) (PS) · Otro: Lottery (BD) |
| Total egresos operativos | EGR | TOTAL EGRESOS OPERATIVOS (CX, BR, HV, RA, FR, AV) · TOTAL GASTOS OPERATIVOS (MN, HP, BD, PS) · SUBTOTAL ESTRUCTURA DE GASTOS (HW) |
| Reembolsos/devolución de préstamos | ABAJO | Reembolsos de préstamos (BR, RA, FR, AV, BD, PS) · Devolucion prestamo - Prestamo MS / - Deuda expensas (HV) · Prestamos (MN) |
| Dividendos | ABAJO | Dividendos (BR, HV, RA, FR, MN, AV, HP, BD, PS) · Dividendos en efectivo (CX) · Dividendos Entregados (HW) |
| Inversiones | ABAJO/EGR | Inversiones (BR, FR, MN abajo; **HV dentro de egresos operativos**) |
| Ajuste caja | ABAJO | Ajuste Caja - A conciliar (CX, FR, HV, HW) · Ajuste Caja -  A conciliar (BR) · Ajuste caja - A conciliar (RA) |
| Aporte blanqueo | ABAJO | Aporte para blanqueo (CX, BR) · Aporte para blanqueo con fondos propios / de terceros (FR) · Aporte Blanqueo (HW) |
| Pagos MS | ABAJO | Gastos MS (CX) · Pagos solicitados por MS (FR) · Pagos solicitados MS / Retiros MS (HV) · MS (HW) · Cuenta Particular (AV) |
| Total egresos | TOT | TOTAL DE EGRESOS (CX) · TOTAL EGRESOS (BR, HV, RA, FR, AV) · TOTAL GASTOS (MN, HP, BD, PS) · TOTAL EN EFECTIVO PAGADO (HW) |
| Cierre | CIERRE | SALDO INICIAL + INGRESOS - TOTAL EGRESOS (CX, BR, HV, RA, FR, AV) · POSICIÓN DE EFECTIVO (fin de mes) (MN, HW, HP, BD, PS) |
| Capital de trabajo | CIERRE | CAPITAL DE TRABAJO PROPUESTO (15 DIAS) (CX, RA) · CAPITAL DE TRABAJO PROPUESTO (FR, HV) · CAPITAL DE TRABAJO PROPUESTO (SUELDOS) (BR, MN) · Capital de trabajo propuesto (HW, HP, BD, PS) |
| Disponible | CIERRE | DISPONIBLE SI - CAPITAL DE TRABAJO (CX, BR, HV, RA, FR, MN) · Excedente (+) / Faltante (-) (HW, HP) · Excedente / Faltante (BD) · Excedente(+) / Faltante (-) (PS) |

### 3.2 Filas propias de una sola empresa
- **CX:** COBRANZA TECH PACK 02 Y 09 · ADICIONALES PENDIENTES · GASTOS JET PARTS SOLUTIONS A RECUPERAR (disp. e ingreso/egreso) · Gastos MS a recuperar · Gastos avion a recuperar / Gastos Avion a recuperar · Peru · Bolivia · Recupero Gastos · Gastos Campo · Expensas Havanna peru a recuperar · Expensas Empresas Americanas a recuperar · Reintegro expensas grupo · Dividendos - Expensas Havanna Peru y Americanas · Dividendos - Recupero expensas y prestamos grupo · Dividendos - Recupero de gastos · Préstamo MS (egreso).
- **BR:** RESERVA PAGO IVA AVIANOR (disp. e ingreso) · COBRANZA MACRO LI 03/01 · ADICIONALES / COMISIONES PENDIENTES · RESERVA APORTE MS - DEVOLUCION LUQUE · Venta HS Vuelos Avianor · Aporte MS - Devolucion Luque · Diferencia Expensas a Recuperar · Retroactivo IPSST · Gastos Gold Seguridad · Devolcion MS - Aporte Camioneta · Traspaso Saldo Prestamo MS - Brillante a Mantenor · Traspaso Saldo Inicial Brillante - Mantenor · Devolucion Luque - Aporte MS · Recupero Gastos.
- **HV:** INGRESO BANCO MACRO · Acreditacion Tarjetas pendientes · Otro tarjeta no ingresada · Recupero Gastos MS · Cuenta Particular MS - Aporte liquidacion Mundo Cell · Devolucion prestamo - Deuda expensas.
- **RA:** COMISIONES ESPECIALES PENDIENTES · Ingreso - Cobro juicio Municipalidad · Devolucion embargo.
- **FR:** RESERVA CAPITAL DE TRABAJO (disp. e ingreso) · COMISIONES ESPECIALES PENDIENTES DE PAGO · DIVIDENDOS PENDIENTES · Aporte para blaqueo otras empresas · Cheques negociados no ingresados IVA · Pagos especiales.
- **MN:** Traspaso Saldo Inicial / Traspaso Saldo Prestamo MS (como ingreso, contrapartida de BR).
- **HW:** TRANSFERENCIA SAIFE PENDIENTE RETIRO · PAGO LATAM PENDIENTE · RECUPERO EXPENSAS · PAGO GLOBE AIR CARGO · PAGO LATAM Y LAN ECUADOR · PAGO AVIANCA · PAGO FLYBONDI · PAGO GOL LINEAS AEREAS · Gastos Avion · Dividendos Pendientes.
- **AV:** Venta de Propiedades y Equipos · Cobro de Capital de Préstamos (también en HP, BD, PS: es la plantilla "vieja" en inglés traducida).
- **HP:** DEVOLUCION PERCEPCION IGV · Regalias · Importacion Havanna · Soles a Dolares · Implementacion nuevos locales.
- **BD:** Otro (TC mes anterior) · Impuesto inmobiliario (Manatee) · Inversion Food Truck.
- **PS:** Otro (retencio UI + Collet) · Diferencia de cambio - Otros gastos banco.
- **RECUPERO APORTE BLANQUEO** (DISP) aparece en CX, BR, FR; en HW aparece como ingreso.

---

## 4. Mapeo de filas a clasificaciones (Real) y categorías de la app (Presupuesto)

Clasificaciones de Ejecución usadas en los datos reales: COBRANZAS, COM Y GTOS BRIOS, PROV Y SERV, SUELDOS, SAC, IMP Y PREVISIONALES, IVA, CH DIFERIDOS IVA, CHEQUES DIFERIDOS, COMISIONES ESPECIALES, LIQ FINAL, JUICIOS, PREST BRIOS Y TC, PRESTAMOS, PRESTAMOS MS, DIVIDENDOS, INVERSIONES, FCI, AVION, CAMPO, JPS, MS, OTROS, PAGOS ESPECIALES, DEP CH 3°, TRANSF ENTRE BCOS, TUCUNEWS, VENTA ME, ALQ MENDOZA, DIFERENCIA TC, COMPRA INTERNA, AJUSTE, MAL REGISTRADO.
Categorías de Presupuesto de la app (`clasificacionesPresupuesto.ts`):
- **Ingreso:** COBRANZAS, Intereses FCI, Préstamo Cocos, Préstamo MS.
- **Egreso:** CHEQUES DIFERIDOS, COMISIONES ESPECIALES, Dividendos, EXPENSAS, Gastos bancarios, IMP Y PREVISIONALES, INVERSIONES, IVA, Juicios, Liquidación final, OTROS, PAGOS ESPECIALES, Prestamos y tarjetas, Préstamo Cocos, Préstamo MS, PROV Y SERV, SAC, SUELDOS.

| Concepto (fila) | REAL: clasificación(es) Ejecución | Exactitud observada (jul-26) | PRESUPUESTO: categoría app |
|---|---|---|---|
| Cobranza | COBRANZAS | exacto RA; BR exacto si se separa GOLD; CX ≈ (−0,25%); FR/HV/MN/HW manual | COBRANZAS |
| Resultado FCI | **manual** (rendimientos; la clasif. FCI neta suscripciones y rescates) | — | Intereses FCI |
| Reserva aguinaldo / cheques posteriores (ingreso) | **espejo** del componente de Disponibilidades | = P | (no es categoría; valor manual) |
| Otras operaciones / Otro / Préstamo (ingreso) | manual | — | Préstamo MS / Préstamo Cocos / sin categoría |
| Cheques diferidos | CHEQUES DIFERIDOS | exacto (CX, BR, HV, MN, FR) | CHEQUES DIFERIDOS |
| Sueldos | SUELDOS **+ reparto de nómina sin UN** | parte UN exacta; resto = hoja DETALLE SUELDOS | SUELDOS |
| SAC | SAC **+ reparto** | idem | SAC |
| Préstamos y tarjetas | PREST BRIOS Y TC (alias de "Prestamos y tarjetas") **+ reparto tarjetas** | parcial | Prestamos y tarjetas |
| Comisiones especiales | COMISIONES ESPECIALES | exacto (CX, RA, FR, HW) | COMISIONES ESPECIALES |
| Impuestos | IMP Y PREVISIONALES **+ prorrateo F931/SP** | exacto en HV, RA, FR, HW; con prorrateo en CX, BR, MN | IMP Y PREVISIONALES |
| Expensas | **reparto de UN EXPENSAS** (no hay clasificación en la UN de la empresa) | manual hoy | EXPENSAS |
| Impuesto al cheque / Gastos bancarios | COM Y GTOS BRIOS (alias de "Gastos bancarios") | exacto CX, BR, MN, HV | Gastos bancarios |
| Proveedores | PROV Y SERV (+ "GASTOS TARJETAS"/"GASTOS VS BARES" en HV y RA) | exacto CX, BR, FR, HW | PROV Y SERV |
| IVA (Compra/Proveedores/Costo) | IVA | exacto BR, MN; CX/RA/FR no reconcilian | IVA |
| Liquidaciones finales | LIQ FINAL (alias de "Liquidación final") | exacto | Liquidación final |
| Juicios | JUICIOS | exacto (en HV va en la fila "Liq Final") | Juicios |
| Pagos especiales | PAGOS ESPECIALES | exacto FR | PAGOS ESPECIALES |
| Otro (FR) | OTROS | exacto | OTROS |
| Inversiones | INVERSIONES | exacto HV | INVERSIONES |
| Dividendos | DIVIDENDOS (no está en CLASIFICACIONES_SUGERIDAS) | exacto FR, RA | Dividendos |
| Reembolsos / Devolución préstamo MS | PRESTAMOS MS | exacto BR, HV | Préstamo MS (egreso) |
| Gastos MS / Pagos solicitados MS | MS | parcial CX | — (no hay categoría) |
| Gastos Campo | CAMPO + Sueldos/SAC de UN CAMPO | exacto | — |
| Gastos Avion a recuperar | AVION + gastos de Avianor pagados | parcial | — |
| Proveedores IVA de CX / Costo IVA de RA | ? | no reconcilia | IVA |
| Filas de Handy (aerolíneas), H. Perú, Bradenton, Plate | extractos propios fuera de la Ejecución ARS | — | — |

**Categorías de presupuesto que faltan** para replicar las filas con P: Impuesto al cheque (se puede tomar "Gastos bancarios"), Reserva aguinaldo, Cheques en cartera posteriores, Otras operaciones, Regalías, Gratificaciones, pagos a aerolíneas (HW), Importación, Inversiones como *ingreso*, Dividendos por subtipo (CX).

---

## 5. Disponibilidades y Cierre

### 5.1 Componentes de Disponibilidades por empresa
| Empresa | Componentes (en orden) | Cómo se llenan hoy |
|---|---|---|
| CX | Banco · Efectivo · Dólares · Cheques en cartera · Cheques negociados pend. (−) · Cobranza Tech Pack · Reserva aguinaldo (−) · Cheques en cartera después del 10 (−) · Adicionales pendientes · Recupero aporte blanqueo · Gastos Jet Parts a recuperar | todo tipeado (algunos SM) |
| BR | Banco y FCI · Efectivo · Dólares · Reserva pago IVA Avianor · Cheques en cartera · Cheques negociados (−) · Cobranza Macro LI · Reserva aguinaldo (−) · Adicionales/comisiones pendientes · Reserva aporte MS-Luque · Recupero aporte blanqueo | tipeado / SM con traspasos Brillante↔Mantenor |
| HV | Banco y FCI · Efectivo · Dólares · Reserva aguinaldo (−) · Cheques negociados · Ingreso Banco Macro | tipeado |
| RA | Banco y FCI · Efectivo · Cheques en cartera · Cheques negociados (−) · Comisiones especiales pendientes · Reserva aguinaldo (−) · Cheques en cartera después del 15 | tipeado |
| FR | Bancos + FCI · Efectivo · Dólar · Cheques negociados (−) · Reserva capital de trabajo · Reserva aguinaldo (−) · Comisiones especiales pend. · Dividendos pendientes · Recupero aporte blanqueo | tipeado |
| MN | Banco y FCI · Efectivo · Dólares · Cheques negociados | tipeado / SM |
| HW | Bancos y FCI · Caja · Transferencia SAIFE pend. · Cheques en cartera · Cheques pend. de ingreso (−) · Dólares en caja · Previsión SAC · Pago LATAM pendiente | tipeado |
| AV | (fila única) Efectivo disponible | **fórmula** = cierre real anterior |
| HP | (fila única) Efectivo disponible | R = saldo final del extracto; P = cierre real anterior |
| BD | Banco · Efectivo | Banco = saldo del extracto Chase (fórmula); Efectivo tipeado |
| PS | Banco · Efectivo · Cheques en cartera | **fórmula** = cierre real anterior |

**¿Qué podría salir solo de los extractos?**
- Banco, en teoría: `MovimientoBancario.saldo` del último movimiento del mes por cuenta.
- **Pero hoy no sirve directo**, por tres razones:
  1. Las cuentas son de razones sociales (LI, SPP, CREAR…) y varias razones sociales alimentan varias UN. Por ejemplo, LI alimenta BRILLANTE y LOGISTICA. Un saldo por cuenta no se reparte solo por UN. Solo funcionaría para las cuentas que `UNIDAD_POR_CUENTA` asigna 1 a 1.
  2. Macchi incluye FCI dentro de "Banco y FCI", y el FCI no está en el extracto.
  3. La app no guarda saldos de apertura ni de cierre (README pendiente "U-39").

Efectivo, Dólares, Cheques en cartera, Cheques negociados, Reservas y "pendientes" **no salen de ningún extracto**: hoy son manuales, y lo seguirán siendo. La forma natural de cargarlos: un valor por componente y por mes. **P = R** (mismo número), y con control "Total Disponibilidades vs cierre real del mes anterior". Ese control ya lo hacen a mano Bradenton (fila 44) y H. Perú ("CONTROL SF").

### 5.2 Cierre
- **Saldo inicial + ingresos − egresos** = `Disponible antes de gastos − Total egresos`, con `Disponible antes de gastos = Total disponibilidades + Total ingresos`. Esto vale en todas, para P y para R. (MN P ago usa `=Disp + Ingresos − Gastos`, que da lo mismo.)
- **Capital de trabajo propuesto.** Solo en la columna P, salvo BD, PS y HP. Cálculo exacto en ago-26 e historial:
  | Empresa | Fórmula ago-26 | Historial |
  |---|---|---|
  | CX | `(Total egresos operativos − Reserva aguinaldo[ingreso]) / 2` | `TEO/2` en meses sin reserva; `(TEO−Reserva)/2` en dic, feb, abr, jun, jul, ago (cuando hay aguinaldo) |
  | RA | `TEO / 2` | siempre igual |
  | FR | `TEO / 2` | siempre igual |
  | HV | `Sueldos + Expensas + Proveedores/4 + Inversiones/3` | alterna `S+E+P/4` y `S+E+P/4+Inversiones`; jul-26 `…+Inversiones+76.500.000` |
  | BR | `Sueldos + SAC + 31.000.000` | muy variable: `Sueldos`, `Sueldos+SAC`, `Sueldos×1,15`, `×1,25`, tipeado 300M/400M/500M |
  | MN | tipeado 231.200.000 | jul `=+K16` |
  | HW | `= SUBTOTAL ESTRUCTURA DE GASTOS` (1 mes) | siempre igual |
  | PS | `= TOTAL GASTOS OPERATIVOS` (1 mes; también en R) | siempre igual |
  | BD | tipeado 30.000 (P y R) | siempre igual |
  | HP | `80.000 × TC` (USD 80k en soles) | idem (TC 3,757 tipeado en meses viejos) |
  | AV | no existe | — |
- **Disponible** ("DISPONIBLE SI - CAPITAL DE TRABAJO" o "Excedente/Faltante") = **Total Disponibilidades iniciales − Capital de trabajo**, no el cierre. Solo en P en CX, BR, HV, RA, FR, MN y HW; en P y R en BD, PS y HP. Excepción: HV suma "Préstamo" (fila 19): `=Disp − Cap + Préstamo`.
- **Uso del Disponible:** en BR, HV y MN el Disponible se usa como presupuesto del bloque de abajo. BR: Dividendos ago = Disponible, Reembolsos jul = Disponible. HV: Devolución préstamo MS = Disponible. MN: Préstamos = Disponible. Es una referencia circular "de diseño": el excedente se presupuesta como distribución.

---

## 6. Propuesta de diseño

### 6.1 Idea general
**Un motor único** (`lib/reporte/`), que toma la plantilla de la empresa y una lista de períodos y devuelve una grilla `filas × meses × {P, R, %, falta}`.

**Una plantilla por empresa:** una lista ordenada de filas. El motor no sabe nada de empresas: solo interpreta la plantilla.

### 6.2 Forma de la plantilla
```ts
type Bloque = "DISPONIBILIDADES" | "INGRESOS" | "EGRESOS" | "ABAJO" | "CIERRE";

type FuenteReal =
  | { tipo: "clasificaciones"; clasificaciones: string[]; unidades?: string[] }   // usa lib/reporte.ts; unidades por defecto = Empresa.unidadesNegocio
  | { tipo: "manual" }                                                            // ValorManualReporte (R)
  | { tipo: "espejoPresupuesto" }                                                 // R = P (Reserva aguinaldo, cheques después del 10)
  | { tipo: "espejoFila"; fila: string; signo: -1 | 1 }                           // ingreso que revierte un componente de disponibilidades
  | { tipo: "ninguna" };                                                          // fila solo-presupuesto o fila vacía

type FuentePresupuesto =
  | { tipo: "categorias"; categorias: string[] }                                  // valorPersistido de clasificacionesPresupuesto.ts
  | { tipo: "manual" }
  | { tipo: "igualReal" }                                                         // Disponibilidades: P = R
  | { tipo: "ninguna" };                                                          // fila solo-real (Conexión, bloque de abajo)

type Fila =
  | { clave: string; bloque: Bloque; tipo: "titulo"; texto: string }
  | { clave: string; bloque: Bloque; tipo: "linea"; texto: string;
      real: FuenteReal; presupuesto: FuentePresupuesto; signo?: 1 | -1 }
  | { clave: string; bloque: Bloque; tipo: "total"; texto: string;
      suma: { bloques?: Bloque[]; filas?: string[]; resta?: string[] } }          // TOTAL DISPONIBILIDADES, TOTAL INGRESOS, DISPONIBLE ANTES DE GASTOS, TEO, TOTAL EGRESOS, CIERRE
  | { clave: string; bloque: "CIERRE"; tipo: "capitalTrabajo"; texto: string;
      regla: ReglaCapital; tambienEnReal?: boolean }
  | { clave: string; bloque: "CIERRE"; tipo: "disponible"; texto: string;
      suma?: string[]; tambienEnReal?: boolean };                                 // = Total Disp − Capital (+ filas extra, p. ej. Préstamo en Havanna)

type ReglaCapital =
  | { tipo: "fraccion"; base: string[]; restar?: string[]; divisor: number }      // CX, RA, FR, HW (divisor 1), PS
  | { tipo: "combinacion"; terminos: { fila: string; factor: number }[]; fijo?: number }  // HV, BR
  | { tipo: "fijo"; importe: number }                                             // BD, MN
  | { tipo: "fijoMonedaExtranjera"; usd: number };                                // HP (× TC del mes)
// En todos los casos: override manual por mes (ValorManualReporte), porque Macchi lo cambia.
```
Ejemplo de tres filas de Conexión:
```ts
{ clave: "cx.banco", bloque: "DISPONIBILIDADES", tipo: "linea", texto: "BANCO", real: {tipo:"manual"}, presupuesto: {tipo:"igualReal"} },
{ clave: "cx.impCheque", bloque: "EGRESOS", tipo: "linea", texto: "Impuesto al cheque (Gto Brio)",
  real: {tipo:"clasificaciones", clasificaciones:["COM Y GTOS BRIOS"]}, presupuesto: {tipo:"categorias", categorias:["Gastos bancarios"]} },
{ clave: "cx.gastosCampo", bloque: "ABAJO", tipo: "linea", texto: "Gastos Campo",
  real: {tipo:"clasificaciones", clasificaciones:["CAMPO"], unidades:["SPP","LOGISTICA","CAMPO"]}, presupuesto: {tipo:"ninguna"} },
```

### 6.3 Dónde vive la plantilla
**Recomiendo código** (`lib/reporte/plantillas/<empresa>.ts`, una por empresa, tipadas):
- Son 11, cambian poco (una fila nueva cada tanto) y hay que validarlas fila por fila con Kike: un archivo en git tiene diff y revisión.
- El compilador valida que cada `categorias` exista en `clasificacionesPresupuesto.ts`.
- Se evita construir ahora una pantalla de administración de plantillas.
- **Conviene un test por plantilla:** que reproduzca los totales de jul-26 de la planilla con datos de prueba.
- Si más adelante Kike quiere agregar filas solo, se migra a una tabla `PlantillaReporteFila`. La forma del tipo ya está pensada para serializarse a JSON.
- La plantilla se asocia a la empresa por `Empresa.id`, con un mapa en código; no por nombre ni slug.

### 6.4 Valores manuales
Nueva tabla (requiere migración; **no** la creé, la propongo):
```prisma
model ValorManualReporte {
  id          String   @id @default(uuid())
  empresaId   String
  periodo     String   // "YYYY-MM"
  filaClave   String   // clave de la fila de la plantilla (cx.banco, cx.capitalTrabajo…)
  columna     ColumnaReporte // PRESUPUESTADO | REAL
  importe     Decimal  @db.Decimal(18,2)
  nota        String?  // p. ej. "=50297.17+92643+150000" o explicación
  cargadoPorId String
  updatedAt   DateTime @updatedAt
  @@unique([empresaId, periodo, filaClave, columna])
}
```
- **Quién carga:** rol FINANZAS/ADMIN, desde la misma pestaña Reporte, con celdas editables solo en filas `manual`. Martín Salas solo ve.
- **Disponibilidades.** La carga se hace una vez por mes, al principio. El motor:
  - propone como sugerencia el cierre real del mes anterior;
  - muestra el control "Total Disponibilidades − cierre real anterior". En Conexión, la diferencia esperada es la fila "Cheques después del 10".
- **Ajustes que hoy son "fila sin clasificar" dentro del detalle** (PRORRATEO IMPUESTOS, GASTOS TARJETAS, GASTOS VS BARES, filas movidas entre UN): la recomendación es **no** cargarlos como manuales. Que se resuelvan en Ejecución con el desglose por UN que ya existe (`MovimientoBancarioDesglose`), para que el Real salga solo por clasificación. Lo que no venga de un movimiento bancario (sueldos pagados en efectivo en los locales de Havanna, tarjetas a cobrar) queda como manual con nota.

### 6.5 Reutilización de lo existente
- **`lib/reporte.ts`:** `calcularRealPorRubro(periodo, unidades, rubros)` ya hace el Real por UN, con semanas cerradas, desglose e ignorados.
  - Se generaliza a `calcularRealPorClasificacion(periodo, unidades, clasificaciones)`, que devuelve un Map por clasificación cruda.
  - El motor agrupa por fila de la plantilla. `rubroDe`/`ALIAS_POR_RUBRO` (lib/rubros.ts) siguen sirviendo para los alias (COM Y GTOS BRIOS ↔ Gastos bancarios, LIQ FINAL ↔ Liquidación final, PREST BRIOS Y TC ↔ Prestamos y tarjetas, PRESTAMOS MS ↔ Préstamo MS).
  - Para varios meses: una sola consulta con `periodo IN (…)` agrupada por período, en vez de N llamadas.
- **Fase 1 (`reporte/page.tsx` + `ReportePresupuestoMesAMes.tsx`):**
  - Se conservan las columnas (Presupuestado, Real, % Avance, Falta ejecutar), el cálculo de P vía `lineaPresupuesto.groupBy` + `rubroDe`, y el bloque "No asignado a ninguna empresa" como control al pie.
  - Lo que cambia: en lugar de `RUBROS_EGRESOS` fijo, las filas salen de la plantilla. Se agregan Disponibilidades, Ingresos, Abajo y Cierre, y N meses lado a lado.
- **Signos:** P se guarda positivo y el Real viene con signo de banco. El motor normaliza por bloque: Ingresos +, Egresos `abs` o `−importe`. Hay que definirlo por fila para los casos raros: IVA (con signo inconsistente según Fase 1) y Plate "Otro (retención)", que es ingreso negativo.

### 6.6 Orden sugerido de implementación
1. Plantillas de **RA** y **FR** primero: son las más limpias, con Real casi todo por clasificación y Capital = TEO/2.
2. Tabla de valores manuales + Disponibilidades + Cierre.
3. **CX, BR, MN:** necesitan el desglose de nómina, F931 y expensas en Ejecución.
4. **HV:** tiene muchos manuales por los locales.
5. **HW / AV**, si sus extractos están en la app.
6. **HP / BD / PS:** solo si entran al alcance (monedas distintas, ver preguntas).

---

## 7. Preguntas para Kike

**Alcance y formato**
1. ¿Havanna Perú (soles), Bradenton y Plate Silver (USD) entran en la app? Hoy no figuran como empresas en el seed ni en la consolidación (la lista es Avianor, Bradenton, Brillante, Conexión Logística, Fredy, Gold Seguridad, Havanna, HWC, JPS, Mantenor y Radio; no lo verifiqué contra la base). Si entran, ¿el reporte se muestra en su moneda o convertido? ¿Con qué TC?
2. ¿Gold Seguridad y JPS necesitan reporte propio? No hay PF para ellas: Gold va adentro de Brillante.
3. ¿Cuántos meses lado a lado quiere ver Martín: todo el histórico (hoy son 32 meses), el año en curso, o los últimos N? En BD y PS es año calendario con TOTALES ANUALES: ¿se replica esa columna?
4. Handy usa "ESPERADO" y "% EJECUCION" en lugar de "PRESUPUESTADO" y "% AVANCE". ¿Se mantiene el texto por empresa o se unifica?
5. ¿Se muestran las filas siempre vacías? Por ejemplo Peru, Bolivia, Cobranza Tech Pack o "Cobro de Capital de Préstamos". ¿Se pueden ocultar si están en 0 en todos los meses visibles?

**Disponibilidades**

6. ¿De dónde sale cada componente? Banco y FCI (¿saldo de qué cuentas?), Efectivo, Dólares (¿a qué TC?), Cheques en cartera y Cheques negociados (¿de qué sistema?). ¿Quién lo carga y cuándo?
7. "Cheques en cartera después del 10" (CX) y "después del 15" (RA): ¿cuál es la regla? ¿Siempre se resta en Disponibilidades y se suma en Ingresos el mismo importe?
8. Reserva aguinaldo / Previsión SAC: ¿cómo se calcula el importe y en qué meses va?
9. ¿Está bien tomar P = R en Disponibilidades? Hoy es así en todas.

**Real (Ejecución)**

10. Sueldos/SAC sin UN: ¿confirma que se reparte según DETALLE SUELDOS / SAC? ¿Podemos hacerlo con el desglose por UN en Ejecución? Incluye la UN CAMPO, que va a "Gastos Campo" de Conexión.
11. PRORRATEO IMPUESTOS: ¿los % de asignación (SPP 87/1/11, LI 7/0/7/86, CREAR 0/61/12/27) son fijos o se recalculan cada mes? ¿Con qué base?
12. **Expensas:** ¿cómo se reparte la UN EXPENSAS entre empresas (CX 55,2M, BR 33,2M, MN 31,6M, HV 29,5M, AV 18,7M, FR 17,7M, RA 12,1M en julio)? ¿Dónde está esa planilla?
13. "Expensas - No socios": ¿qué es? Está siempre vacía.
14. Cobranza Contado de Conexión: el real tipeado (2.311,3M) no coincide con COBRANZAS SPP+LOGISTICA (2.317,2M). ¿Qué se excluye?
15. Proveedores IVA (CX 74,9M), Costo IVA (RA 1,96M) y Compra de IVA (FR 10,4M): ¿con qué clasificación o regla se calculan? No reconcilian con IVA ni con CH DIFERIDOS IVA.
16. Préstamos y tarjetas: ¿se reparte la hoja TARJETAS Y PRESTAMOS por titular de tarjeta? ¿Queremos eso en la app?
17. Resultado FCI: ¿de dónde salen los rendimientos? En Ejecución, FCI neta suscripciones y rescates. ¿Se carga manual?
18. Fredy: la Cobranza real (209,8M) y los Sueldos (15,8M) no salen de la UN FREDY de la Ejecución consolidada. ¿Qué extractos o razones sociales entran (Quinteros, Sierra, Wheeler, González, Estévez, Fredy…)? ¿Las operaciones de IVA de esas razones sociales cuentan como cobranza?
19. Handy: ¿el extracto de HWC se carga en la app? Los Sueldos (243M) y las recaudaciones de aerolíneas, ¿de dónde salen?
20. Avianor: el Real usa una clasificación "COMISIONES" y otra "TARJETAS". ¿Son COMISIONES ESPECIALES y PREST BRIOS Y TC? ¿Los gastos de Avianor que paga Conexión van en "Gastos Avion a recuperar" de Conexión y también en el Real de Avianor? Hoy están en las dos.
21. Brillante: ¿"Otros Operaciones (GOLD SALTA)" = cobranzas de la razón social GOLD SEGURIDAD? La app no guarda la razón social del movimiento: ¿alcanza con una UN "GOLD" aparte?
22. Movimientos que Macchi mueve a mano entre empresas (comisiones Mantenor → Brillante 6,3M, cobro MSNT 78,4M, traspasos Brillante↔Mantenor): ¿se van a corregir en la UN del movimiento en Ejecución?
23. Havanna: los sueldos y gastos pagados en efectivo en los locales (DATOS ADICIONALES) y las tarjetas a cobrar (Prisma, Naranja, Mercado Pago), ¿se cargan como valor manual mensual? ¿Por qué "Juicios" va en la fila "Liq Final"?
24. Conexión "Gastos MS" = MS (9,9M) + 13,47M: ¿qué son esos 13,47M?

**Presupuesto**

25. Faltan categorías para filas con presupuesto: Reserva aguinaldo (ingreso), Otras operaciones, Dividendos por subtipo (CX), Inversiones, Regalías, aerolíneas (HW). ¿Se agregan a `clasificacionesPresupuesto.ts` o esas filas se presupuestan como valor manual?
26. "Impuesto al cheque" y "Gastos bancarios": ¿se presupuestan con la misma categoría (Gastos bancarios)?
27. Brillante y Mantenor separan Impuestos en "IVA-IIBB-Otros" y "Cargas sociales 931". Havanna separa "Previsionales" y "Otros impuestos". ¿Alcanza con IMP Y PREVISIONALES + desglose?

**Cierre**

28. Capital de trabajo: ¿se acuerda una regla fija por empresa? Havanna cambia la fórmula según el mes, y Brillante y Mantenor la tipean. ¿O dejamos regla + override manual mensual?
29. ¿El Disponible se calcula sobre las Disponibilidades iniciales (como hoy) y no sobre el cierre proyectado? Es intencional, ¿no?
30. ¿El Disponible se presupuesta automáticamente como Dividendos / Devolución de préstamo, como hoy en BR, HV y MN? ¿O lo carga una persona?
31. Las inconsistencias detectadas (§0 punto 8), ¿son errores de la planilla o hay que replicarlas?
