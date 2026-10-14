# Reporte "Presupuesto Financiero": plan de la Etapa 2b (para aprobar)

Estado: **plan, sin implementar**. Fecha: 2026-10-13.
Antecedentes: `docs/reporte_diagnostico.md` (relevamiento de las 12 planillas) y `docs/reporte_etapa2a_plan.md` (Etapa 2a, ya commiteada: `c16d26a`, `67be7fd`, `dab0bf3`).
Fuente de este plan: los 7 `PF - <EMPRESA> - AGOSTO 2026.xlsx` de formato completo (Conexión, Brillante, Havanna, Radio, Fredy, Handy/HWC, Mantenor), leídos con openpyxl en solo lectura, **fórmulas y valores cacheados**, con un script fuera del repo. No se tocó ninguna base ni ningún archivo del repo salvo este documento.

Convenciones: **P** = columna PRESUPUESTADO (ESPERADO en Handy); **R** = REAL. "tip." = número tipeado; "SM" = suma tipeada a mano (`=a+b+c`); "ref." = referencia a otra hoja; "—" = vacía. Los importes van en pesos con dos decimales.

## 0. Reglas de siempre (válidas en toda la 2b)
- **Migración:** esta etapa sí la necesita (tabla `ValorManualReporte`, §7.1). Yo dejo el SQL escrito; **la aplicás vos**, con el comando que apruebes. Nada de `migrate dev`, `migrate reset`, `db push` ni `migrate diff` con shadow o `--from-migrations`. Nunca una base real como shadow DB.
- No mostrar URLs ni contraseñas de bases.
- No hacer commit ni push hasta que apruebes el diff.
- Si se levanta el dev server, al final verificar por PID que quedó cerrado.
- No crear sesiones, usuarios ni permisos en ninguna base sin preguntarte antes (la prueba con Playwright de §8.5 necesita tu autorización aparte).
- **Si un test contra el Excel de agosto no cierra, NO se ajusta la fixture ni la expectativa:** se frena y se muestra la diferencia.
- Frenar al terminar la etapa y esperar tu ok.

### Dos cambios respecto de la 2a (para que los apruebes explícitamente)
1. **Fórmulas que parecen errores.** La 2a decía "no se copian" (decisión 5). Hoy pediste **replicarlas igual y anotarlas**. Este plan sigue lo de hoy: §6 lista cada una.
2. **Capital de trabajo.** La 2a decía "sugerencia por defecto = egresos operativos ÷ 2" (decisión 4). Para que sea copia exacta, propongo que la regla por defecto sea **la fórmula de agosto de cada empresa** (§3.3), con un valor manual que la reemplaza cuando Macchi la cambia.

---

## 1. Hallazgo principal: cómo funciona el arrastre de un mes al siguiente

**Regla (verificada en los últimos 12 meses de las 7 empresas, sep-25 → ago-26):**

> **Total Disponibilidades (mes N) = Cierre REAL (mes N−1) + suma de los componentes "de ajuste" del mes N**

- "Cierre REAL" es la fila SALDO INICIAL + INGRESOS − TOTAL EGRESOS (o POSICIÓN DE EFECTIVO) en la columna R.
- **Ninguna planilla lo calcula con una fórmula** (en estas 7). Macchi tipea cada componente (Banco, Efectivo, Cheques…) todos los meses, y la suma le da igual al cierre anterior. La diferencia residual es de centavos: como mucho **$0,66** (HWC), porque tipea números redondeados.
- **Las únicas excepciones en 12 meses:**
  - Mantenor jul-26: primer mes. Su saldo inicial (254.780.389,88) entró como "Traspaso Saldo Inicial Brillante - Mantenor" en el egreso real de Brillante de julio.
  - Radio mar-26 aparece como excepción solo por un artefacto de lectura: febrero 2026 no tiene los encabezados PRESUPUESTADO/REAL. Verificado a mano: feb = cierre ene (14.799.796,23) y mar = cierre feb (56.448.541,86).
- **Agosto 2026, las 7:**

| Empresa | Cierre R jul | Ajustes ago | Total Disp. ago (Excel) | Diferencia |
|---|---|---|---|---|
| Conexión | 1.240.437.515,07 | −196.491.436,18 (Cheques después del 10) | 1.043.946.078,89 | 0,00 |
| Brillante | 358.266.245,11 | — | 358.266.245,27 | +0,16 |
| Havanna | 229.712.581,02 | — | 229.712.581,02 | 0,00 |
| Radio | 56.921.527,94 | — | 56.921.527,94 | 0,00 |
| Fredy | 75.162.127,01 | — | 75.162.127,01 | 0,00 |
| HWC | 617.148.923,99 | — | 617.148.923,92 | −0,07 |
| Mantenor | 467.098.036,18 | — | 467.098.036,18 | 0,00 |

**Componentes "de ajuste"** (no son plata del cierre anterior: se suman o restan aparte). La lista sale de los datos, no de una fórmula, y hay que confirmarla con Kike (K9):

| Empresa | Ajuste | Cuadre (el resto, suman el cierre anterior) |
|---|---|---|
| Conexión | Cobranza Tech Pack 02 y 09 · Cheques en cartera después del 10 · Adicionales pendientes · Recupero aporte blanqueo · Gastos Jet Parts a recuperar | Banco · Efectivo · Dólares · Cheques en cartera · Cheques negociados pend. · Reserva aguinaldo |
| Brillante | Reserva pago IVA Avianor · Cobranza Macro LI 03/01 · Adicionales / comisiones pendientes · Reserva aporte MS - Devolución Luque · Recupero aporte blanqueo | Banco y FCI · Efectivo · Dólares · Cheques en cartera · Cheques negociados pend. · Reserva aguinaldo |
| Havanna | Ingreso Banco Macro | Banco y FCI · Efectivo · Dólares · Reserva aguinaldo · Cheques negociados pend. |
| Radio | Cheques en cartera después del 15 | Banco y FCI · Efectivo · Cheques en cartera · Cheques negociados pend. · **Comisiones especiales pendientes** · Reserva aguinaldo |
| Fredy | Reserva capital de trabajo · Recupero aporte blanqueo | Bancos + FCI · Efectivo · Dólar · Cheques negociados pend. · Reserva aguinaldo · **Comisiones especiales pendientes de pago** · **Dividendos pendientes** |
| HWC | Transferencia SAIFE pendiente retiro · Pago LATAM pendiente · Previsión SAC (vacía en 12 meses: sin verificar) | Bancos y FCI · Caja · Cheques en cartera · Cheques pend. de ingreso · Dólares en caja |
| Mantenor | (ninguno con datos) | Banco y FCI · Efectivo · Dólares · Cheques negociados pend. |

- Ojo: "Comisiones pendientes" es **ajuste** en Conexión y Brillante pero **cuadre** en Radio y Fredy (en Radio sep-25 y ene-26, y en Fredy sep-25 y ene-26, la suma solo cierra si se las cuenta dentro). Es parte de K9.
- La **Reserva aguinaldo** es siempre cuadre: entra en la suma que da el cierre anterior.

**Otros hechos de Disponibilidades, iguales en las 7:**
- **P = R** en todos los componentes y meses: mismo número tipeado en las dos columnas. Única excepción: Mantenor jul-26, P vacío porque ese mes no tenía presupuesto.
- Las filas de Disponibilidades, Capital de trabajo y Disponible **no tienen** % AVANCE ni FALTA EJECUTAR. Sí los tienen "Disponible antes de gastos" y "Saldo inicial + ingresos − egresos".
- En agosto el R de ingresos y egresos todavía está vacío, así que el Saldo R de agosto = Total Disponibilidades de agosto.

---

## 2. Fila por fila: bloque de arriba (DISPONIBILIDADES)

Todos los componentes son **valores tipeados por Macchi** (a veces SM). Los nombres son los del diagnóstico §5.1. Lo que cambia por empresa es la lista de componentes. Valores de agosto (P = R):

| Empresa | Componentes con valor en ago-26 | Total (fórmula ago) |
|---|---|---|
| Conexión (filas 5–15) | Banco 330.368.601,91 · Efectivo 31.579.984,23 · Dólares 6.330.740,50 · Cheques en cartera 1.115.274.888,39 · Cheques negociados −243.116.699,96 · Cheques después del 10 −196.491.436,18 | `=SUM(5:15)` = 1.043.946.078,89 |
| Brillante (4–14) | Banco y FCI `=388561658.52-64074531` · Efectivo `=-136170039+78411842.93-6316335.37+64074531` (= −0,44) · Dólares 388.921 · Cheques en cartera 40.929.136,58 · Cheques negociados −7.538.939,39 | `=SUM(4:13)` ⚠ = 358.266.245,27 |
| Havanna (5–10) | Banco y FCI 184.684.330,41 · Efectivo 45.028.250,61 | `=SUM(5:10)` = 229.712.581,02 |
| Radio (5–11) | Banco y FCI 53.803.484,94 · Efectivo 6.797.518,82 · Cheques en cartera 3.965.524,18 · Cheques negociados −7.645.000 | `=SUM(4:11)` = 56.921.527,94 |
| Fredy (4–12) | Bancos + FCI 103.298.280,40 · Efectivo 12.751.036,35 · Dólar 1.920.716 · Cheques negociados −42.807.905,74 | `=SUM(4:12)` = 75.162.127,01 |
| HWC (4–11) | Bancos y FCI 561.438.533,95 · Caja 4.245.539,68 · Cheques en cartera 56.458.430,46 · Cheques pend. de ingreso −5.035.050,17 · Dólares en caja 41.470 | `=SUM(4:11)` = 617.148.923,92 |
| Mantenor (4–7) | Banco y FCI `=385425510.36+64074531` · Efectivo `=153768033.38-78411842.93+6316335.37-64074531` | `=SUM(4:7)` = 467.098.036,18 |

- **Es igual en todas:** componentes tipeados y total = suma.
- **Cambia por empresa:** la lista de componentes y el rango de la suma. Brillante agosto suma 4:13 y deja afuera la fila 14 (Recupero aporte blanqueo), en julio suma 4:14. HWC julio suma 4:9 y deja afuera Previsión SAC y Pago LATAM pendiente. Las dos filas excluidas están vacías: hoy no cambia el número (ver §6).
- **Efectivo parece un número de cuadre:** Havanna, Radio y Fredy lo tipean con muchos decimales (45.028.250,605627365), como si fuera el resultado de una cuenta pegada como valor. En Brillante y Mantenor, Banco y Efectivo llevan los traspasos entre las dos empresas (64.074.531, 78.411.842,93, 6.316.335,37). Va a K9.

## 3. Fila por fila: bloque de abajo (CIERRE)

### 3.1 Disponible antes de gastos y Saldo (igual en las 7)
| Fila | Fórmula (P y R) | Ago P (Excel) |
|---|---|---|
| DISPONIBLE ANTES DE GASTOS | `= Total Disponibilidades + Total Ingresos` | CX 3.574.638.046,16 · BR 1.015.995.985,33 · HV 879.866.660,10 · RA 152.921.527,94 · FR 225.162.127,01 · HW 2.082.176.923,92 · MN 1.019.198.036,18 |
| SALDO INICIAL + INGRESOS − TOTAL EGRESOS / POSICIÓN DE EFECTIVO | `= Disponible antes de gastos − Total egresos`. Mantenor P ago: `=N8+N17−N36` (da lo mismo) | CX 1.446.379.941,02 · BR 356.895.337,99 · HV 311.597.100,37 · RA 39.033.996,77 · FR 32.717.693,79 · HW 748.934.444,30 · MN 420.754.800,00 |

### 3.2 Total egresos (ya en la 2a)
Totales de ago P: CX 2.128.258.105,14 · BR 659.100.647,34 · HV 568.269.559,73 · RA 113.887.531,17 · FR 192.444.433,23 · HW 1.333.242.479,62 · MN 598.443.236,18.

### 3.3 Capital de trabajo propuesto (solo P) — **cambia por empresa**
| Empresa | Fórmula ago-26 | Ago P (Excel) | Historial 12 meses | Clase |
|---|---|---|---|---|
| Conexión | `=(TEO − Reserva Aguinaldo[ingreso])/2` | 1.064.129.052,57 | `TEO/2` en los meses sin reserva y `(TEO−Reserva)/2` con reserva. Es la misma regla: sin reserva, la resta da 0 | (a) |
| Radio | `=TEO/2` | 44.443.765,59 | siempre igual | (a) |
| Fredy | `=TEO/2` | 66.222.216,61 | siempre igual | (a) |
| HWC | `=SUBTOTAL ESTRUCTURA DE GASTOS` (1 mes) | 660.573.694,41 | siempre igual | (a) |
| Havanna | `=Sueldos + Expensas + Proveedores/4 + Inversiones/3` | 206.703.234,01 | alterna `S+E+P/4` y `S+E+P/4+Inversiones`; jul `…+Inversiones+76.500.000` | (a) con la fórmula de ago + valor manual que la reemplaza (b) + K11 |
| Brillante | `=Sueldos + SAC + 31.000.000` | 352.072.575,33 | `Sueldos`, `×1,15`, `×1,25`, `Sueldos+SAC`, tipeado 300M/400M/500M | (a) con la fórmula de ago + valor manual (b) + K11 |
| Mantenor | tipeado 231.200.000 | 231.200.000,00 | jul `=+K16` (la fila Préstamo MS, vacía) | (b) + K11 |

### 3.4 Disponible (solo P)
- Fórmula en 6 empresas: `= Total Disponibilidades − Capital de trabajo`. Ago P: CX −20.182.973,68 · BR 6.193.669,94 · RA 12.477.762,36 · FR 8.939.910,40 · HW −43.424.770,49 · MN 235.898.036,18.
- Havanna: `= Total Disponibilidades − Capital + Préstamo (fila 19)` = 23.009.347,01. La fila 19 está vacía en los 12 meses.
- Es siempre **sobre las Disponibilidades iniciales**, no sobre el Saldo.
- **Clase:** (a).

### 3.5 El Disponible se usa como presupuesto del bloque de abajo
| Empresa | Fila | Ago P | Historial |
|---|---|---|---|
| Havanna | Devolucion prestamo - Prestamo MS | `=+DS52` (= Disponible) = 23.009.347,01 | oct-25 también fórmula; jul tipeado 56.398.000 (Disponible = 56.397.999,88) |
| Mantenor | Prestamos | `=+N39` (= Disponible) = 235.898.036,18 | primer mes con presupuesto |
| Brillante | Dividendos | tipeado 6.193.670 (Disponible = 6.193.669,94) | Reembolsos de préstamos `=+Disponible` en ene, feb, abr y jul. **La fila de destino cambia mes a mes** |

- No es una referencia circular: el Capital depende de los egresos operativos, no del bloque de abajo.
- **Clase:** (a) en Havanna y Mantenor; (b) + K12 en Brillante.

---

## 4. Filas puntuales

### 4.1 Préstamo MS: entrada y devolución
| Empresa | Entrada (INGRESOS, positiva) | Devolución (positiva en egresos) |
|---|---|---|
| Conexión | "Prestamo MS Ciber" (fila 22): vacía en 12 meses | "Préstamo MS" (fila 48), **dentro de TOTAL EGRESOS OPERATIVOS**: vacía en 12 meses |
| Brillante | "Préstamo MS" (24): solo R tipeado: dic-25 266.171.301,60 · mar-26 125.849.000 · abr 178.244.250 · may 295.940.000 | "Reembolsos de préstamos" (49, abajo). P = Disponible (fórmula) en ene, feb, abr y jul. R tipeado: jul 6.103.500 |
| Havanna | "Préstamo MS " (20): jun-26 R 76.500.000 | "Devolucion prestamo - Prestamo MS" (43, abajo). P = Disponible o tipeado (jun `=16166*1450`, USD × TC). R tipeado: jul 56.340.000 |
| Fredy | "Prestamo MS" (22): mar-26 R 35.875.000 · abr 31.413.000 | "Reembolsos de préstamos" (43, abajo). P tipeado (abr P 35.875.000 = la entrada de marzo). R tipeado |
| Mantenor | "Préstamo MS" (16): vacía | "Prestamos" (33, abajo). P ago = Disponible |
| Radio | — | "Reembolsos de préstamos" (40): vacía |
| HWC | — | — |

- **Signo:**
  - La entrada se tipea **positiva en Ingresos** y nunca tiene P.
  - La devolución se tipea **positiva en una fila de egreso**. Está en el bloque de abajo, salvo en Conexión, donde está dentro de los egresos operativos y por eso mueve el Capital (TEO/2).
- **En la Ejecución de julio (consolidada):**
  - PRESTAMOS MS tiene solo **dos débitos**: Brillante −6.103.500 ("COMPRA SCARLATA USD 3.900 TC 1565") y Havanna −56.340.000 ("COMPRA USD 36.000 TC 1565 SCARLATA"). Son exactamente los R de devolución de julio.
  - En julio **no hubo entradas**, así que no pude verificar que una entrada se clasifique PRESTAMOS MS (pregunta K13).
- **Problema en la 2a:**
  - La fila de devolución toma el **neto** de PRESTAMOS MS con signo −1. Un mes con entrada (por ejemplo, Brillante mayo, 295,9M) aparecería como devolución negativa, en vez de ir en "Préstamo MS" de Ingresos.
  - **Propuesta 2b:** separar por sentido. Los créditos van a la fila de entrada y los débitos a la de devolución (§7.2).
- **Presupuesto:**
  - La categoría "Préstamo MS" existe como Ingreso y como Egreso con el **mismo valor guardado**, y `LineaPresupuesto` no guarda el tipo. Si un gerente presupuesta un Préstamo MS como ingreso, la app lo suma en la fila de devolución.
  - En el Excel la entrada nunca tiene P, así que hoy no pasa. Queda anotado como riesgo (no se corrige en 2b).

### 4.2 Filas de IVA
| Empresa · fila | P ago | R (12 meses) | Clase |
|---|---|---|---|
| Conexión · Proveedores IVA (45) | ref. `'DETALLE GASTOS PRESUPUESTADOS'!B21` (TOTAL COSTO IVA) = 87.500.000 | tipeado todos los meses (jul 74.914.259,75) | P (a) categoría IVA · R (b) + K3 |
| Radio · Costo IVA / Factura C / Efectivo (36) | ref. `…!D24` = 2.000.000 | tipeado (jul 1.963.987,52) | P (a) · R (b) + K3 |
| Fredy · Compra de IVA (33) | ref. `'PRESUP. AGOSTO 2026'!C24` = 11.000.000 | tipeado (jul 10.406.845,10) | P (a) · R (b) + K3 |
| HWC · COSTO OPERACIONES IVA (35) | tipeado 47.500.000 | tipeado (jul 5.740.941,11) | P (a) · R (b) + K3 |
| Brillante · Compra IVA (45) | ref. `'DETALLE Ago26'!C30` = 25.000.000 | tipeado; jul 639.772,15 = IVA exacto | (a) clasificación IVA (ya en 2a) |
| Mantenor · Compra IVA (29) | ref. `'DETALLE Ago26'!C38` = 37.000.000 | jul 1.500.000 = IVA exacto | (a) (ya en 2a) |
| Havanna · Compra IVA (37) | vacía (jun P 0) | vacía | (a) categoría; Real vacío |

**Igual en todas:** el R siempre es tipeado. **Cambia:** en Brillante y Mantenor coincide con la clasificación IVA; en las otras 4 no (K3 sigue abierta). Mientras tanto, propongo **carga manual del R**, que es literalmente lo que hace Macchi.

### 4.3 Resultado FCI
- **R:** suma tipeada de rendimientos (SM, por ejemplo `=321235.44+17755.22+219460.76+1270299.67`) en las 7, todos los meses. Es igual en todas. **Clase (b).**
- **P:**
  - Conexión lo tipea: jun 7M, jul 3M, ago 1.828.751,09, que es igual al R de julio. HWC tipea 9M por mes.
  - Las otras no presupuestan (Brillante solo oct a dic 2025).
  - **Clase (a):** se toma la categoría "Intereses FCI", como en la 2a. Ver decisión D4.

### 4.4 Reserva aguinaldo (componente de Disponibilidades y espejo en Ingresos)
- **Componente en Disponibilidades:** negativo, tipeado. Se acumula mes a mes y se libera en el mes de pago del SAC.
  - Conexión: sep-25 −35,2M, oct −57,4M, nov −79,0M, dic −96,7M; feb-26 −18,06M (igual al SAC P de ene), mar −38,0M … jul −121,2M.
  - Brillante: múltiplos de 25M. Havanna, Radio y Fredy: solo cerca del pago.
  - **Clase (b) + K10.**
- **Espejo en Ingresos** ("Reserva Aguinaldo" / "Reserva de aguinaldo" / "Reserva SAC"):
  - Solo en el mes de pago (dic-25, jul-26). P = −(reserva de Disponibilidades del mismo mes); R = `=+P`.
  - Conexión dic usa la fórmula `=-CL11`. En jul es tipeado y a veces redondeado: Conexión 121.221.860 contra 121.221.860,25.
  - **Clase:** P (b) con sugerencia −reserva; R (a) = P.
- **Jun-26 es inconsistente** (va a K10):
  - Conexión y Fredy restan la reserva en Disponibilidades sin espejo.
  - Brillante tiene P `=-DK11` pero R vacío.
  - Radio tiene R tipeado 3.000.000 y P vacío.
- Mismo patrón (vacías en 12 meses): Reserva pago IVA Avianor (Brillante), Reserva capital de trabajo (Fredy), Reserva SAC (HWC).

### 4.5 Cheques en cartera después del 10 (Conexión) / del 15 (Radio)
- **Componente de Disponibilidades:** negativo, tipeado. Es componente **de ajuste** (§1). **Clase (b).**
- **Espejo en Ingresos:**
  - P = −componente del mismo mes. Conexión may y jun tienen la fórmula `=-DF12`; ago está tipeado igual (196.491.436,18); jul está tipeado y redondeado (145.555.806 contra 145.555.806,16).
  - R = `=+P`. Radio sigue el mismo patrón (dic-24 y ene-25).
  - **Clase (a):** P = −componente y R = P.
- Con esto el arrastre cierra: los cheques se restan de la disponibilidad inicial del mes y entran como ingreso del mismo mes.

### 4.6 Havanna: tarjetas (otro arrastre)
- "Acreditacion Tarjetas pendientes" P ago = `=-DP21`, menos el **R de julio** de "Otro tarjeta no ingresada": 48.071.280. Jul P tipeado = −R de junio; R = `=+P`. **Clase (a).**
- "Otro tarjeta no ingresada":
  - P ago = `−'DETALLE AGOSTO 2026'!K7`, el 20 % de la cobranza bancaria proyectada. La proyección es tickets 49.100 × $ promedio (13.979 × 1,02) × 70 % bancos.
  - R = `−('DATOS ADICIONALES'!B32 + B38)`.
  - **Clase (b)** las dos: el P depende de K4.

---

## 5. Clasificación de todas las filas que toca la 2b

**(a) Se calcula sola con lo que ya tiene el sistema** (motor + plantilla):
- Total Disponibilidades; Disponible antes de gastos; Saldo / Posición; Disponible.
- Capital de trabajo de Conexión, Radio, Fredy y HWC; regla por defecto de Havanna y Brillante.
- Espejos con fórmula: Cheques después del 10/15 (P y R); R de Reserva aguinaldo / SAC / IVA Avianor / capital de trabajo (= P); Acreditación tarjetas pendientes de Havanna (P y R).
- P = Disponible: Devolución préstamo MS (Havanna), Prestamos (Mantenor).
- Préstamo MS por sentido: devolución = débitos de PRESTAMOS MS (verificado en jul). Entrada = créditos (propuesto, sin verificar: K13).
- P de las filas IVA y de Resultado FCI por categoría.
- Control de arrastre (nuevo, no es una fila del Excel).

**(b) Necesita carga manual** (como hoy la hace Kike):
- Todos los componentes de Disponibilidades de las 7 empresas: un valor por mes, se muestra en P y R.
- R de Resultado FCI (las 7).
- P de Reserva aguinaldo / SAC en Ingresos (con sugerencia).
- R de las filas IVA de Conexión, Radio, Fredy y HWC (mientras siga K3).
- Capital de trabajo de Mantenor, y reemplazo manual del Capital en cualquier empresa (Havanna y Brillante lo necesitan seguido).
- P de Dividendos / Reembolsos de Brillante cuando Macchi le pone el Disponible.
- Las filas que en la 2a quedaron como "carga manual – próximamente":
  - Conexión: Dividendos - Expensas Havanna Peru y Americanas; resto de Gastos MS.
  - Brillante: Otro (MSNT), Traspaso saldo inicial.
  - Mantenor: los dos traspasos.
  - Havanna: Otro tarjeta no ingresada, Tarjetas y Comisiones.
- **Propuesta:** las filas K8 (P sin categoría en la app: Otras operaciones, Gold Salta, MSNT, cobranzas de Mantenor, aerolíneas de HWC…) pasan a **P manual** hasta que Kike responda K8. Así el reporte de agosto se puede reproducir entero.

**(c) No se entiende: hay que preguntarle a Kike** (§9):
- K9: componentes de ajuste vs cuadre, y si Efectivo es un número de cuadre.
- K10: cálculo de la Reserva aguinaldo y el espejo de junio.
- K11: Capital de Brillante, Havanna y Mantenor.
- K12: a qué fila va el Disponible en Brillante.
- K13: Préstamo MS.
- K14: rangos de suma y Mantenor jul.
- K3 sigue abierta (IVA).

---

## 6. Fórmulas que parecen errores: se replican igual y se anotan
| # | Dónde | Qué hace | Cómo se replica | Pregunta |
|---|---|---|---|---|
| E1 | Brillante, Total Disponibilidades ago | `SUM(4:13)`: deja afuera "Recupero aporte blanqueo" (fila 14). Jul suma 4:14 y jun 4:13 | El total de la plantilla de Brillante **no suma** esa fila (como agosto). Si se carga un valor ahí, no entra al total y la fila muestra una marca (solo ADMIN/FINANZAS) | K14 |
| E2 | HWC, Total Disponibilidades jul | `SUM(4:9)`: deja afuera Previsión SAC y Pago LATAM pendiente. Ago suma 4:11 | Se replica la de **agosto** (4:11). La plantilla es una sola para todos los meses, y julio no se replica mes a mes | K14 |
| E3 | Conexión, Reserva aguinaldo y Cheques después del 10 (Ingresos) jul | P tipeado redondeado (121.221.860 y 145.555.806, contra ,25 y ,16) | Cheques después del 10: P = −componente, exacto. Diferencia contra el Excel de jul: 0,16 (visible en el test de jul, no se ajusta). Reserva: P manual, se carga lo que tipeó Macchi | — |
| E4 | Mantenor jul P | Posición `=K17−K36` (sin saldo inicial); Capital `=+K16` (la fila Préstamo MS) | Mes sin presupuesto: en la app jul se ve "sin presupuesto". No se replica la fórmula de un mes vacío | K14 |
| E5 | Mantenor ago R | TOTAL GASTOS y POSICIÓN sin fórmula en R | En la app el R de agosto se calcula como en todas | K14 |
| E6 | Havanna Capital jul | `…+Inversiones+76.500.000` (el Préstamo MS que entró en jun) | Se replica con el valor manual de Capital de ese mes | K11 |
| E7 | Havanna, "Liq Final" R = JUICIOS (ya anotado en la 2a) | — | Sin cambios en 2b | (2a) |

---

## 7. Diseño

### 7.1 Tabla de valores manuales (migración)
**`prisma/schema.prisma`** (nuevo, más una relación de vuelta en `Empresa` y en `Usuario`):
```prisma
enum ColumnaReporte {
  PRESUPUESTADO
  REAL
}

// Valores que en la planilla de Macchi se tipean a mano (Disponibilidades,
// Resultado FCI, reservas, Capital de trabajo cuando se reemplaza, etc.).
// filaClave = clave de la fila de la plantilla (lib/reporte/plantillas), p. ej.
// "cx.banco". Uno por empresa, período, fila y columna. Vacío = no hay fila.
model ValorManualReporte {
  id           String         @id @default(uuid())
  empresaId    String
  periodo      String         // "YYYY-MM"
  filaClave    String
  columna      ColumnaReporte
  importe      Decimal        @db.Decimal(18, 2)
  nota         String?        // la cuenta tal como se tipeó ("321235,44+17755,22") o una aclaración
  cargadoPorId String
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  empresa    Empresa @relation(fields: [empresaId], references: [id])
  cargadoPor Usuario @relation(fields: [cargadoPorId], references: [id])

  @@unique([empresaId, periodo, filaClave, columna])
}
```

**SQL exacto** (`prisma/migrations/20261013120000_agregar_valor_manual_reporte/migration.sql`, mismo formato que generan las migraciones existentes):
```sql
-- CreateEnum
CREATE TYPE "ColumnaReporte" AS ENUM ('PRESUPUESTADO', 'REAL');

-- CreateTable
CREATE TABLE "ValorManualReporte" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "filaClave" TEXT NOT NULL,
    "columna" "ColumnaReporte" NOT NULL,
    "importe" DECIMAL(18,2) NOT NULL,
    "nota" TEXT,
    "cargadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValorManualReporte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ValorManualReporte_empresaId_periodo_filaClave_columna_key" ON "ValorManualReporte"("empresaId", "periodo", "filaClave", "columna");

-- AddForeignKey
ALTER TABLE "ValorManualReporte" ADD CONSTRAINT "ValorManualReporte_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValorManualReporte" ADD CONSTRAINT "ValorManualReporte_cargadoPorId_fkey" FOREIGN KEY ("cargadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```
- Es una tabla y un tipo nuevos: no modifica ni borra nada existente.
- El índice único (empresa, período, …) sirve también para la consulta del reporte (empresa + lista de períodos), así que no hace falta otro índice.
- **Cómo verificar el SQL sin tocar ninguna base:** después de editar el schema, comparar contra `prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script`. Es el comando que ya aprobaste: **solo lee** la base, pero la lee. Si preferís no conectarte, el SQL queda escrito a mano como arriba.
- **Cómo aplicarlo:** lo aplicás vos, en cada base, con el comando que apruebes. `npx prisma generate` no toca la base.
- **Sin historial:** guarda solo el último valor, con quién lo cargó y cuándo. Si querés auditoría de cambios, es una tabla aparte; no la propongo ahora.

### 7.2 Motor (`lib/reporte/motor.ts`)
```ts
type Bloque = "DISPONIBILIDADES" | "INGRESOS" | "EGRESOS" | "ABAJO" | "CIERRE";

type FuenteReal =
  | { tipo: "clasificaciones"; clasificaciones: string[]; sentido?: "creditos" | "debitos" }  // sin sentido = neto (como hoy)
  | { tipo: "manual" }            // ValorManualReporte REAL (reemplaza manual2b)
  | { tipo: "igualPresupuesto" }  // R = P de la misma fila (=+P del Excel; reemplaza espejo2b)
  | { tipo: "ninguna" };

type FuentePresupuesto =
  | { tipo: "categorias"; categorias: string[] }
  | { tipo: "manual" }            // ValorManualReporte PRESUPUESTADO
  | { tipo: "igualReal" }         // componentes de Disponibilidades: P = R
  | { tipo: "espejo"; fila: string; columna: "presupuestado" | "real"; mes: "actual" | "anterior"; factor: 1 | -1 }
  | { tipo: "disponible" }        // = DISPONIBLE SI − CAPITAL DE TRABAJO del mismo mes
  | { tipo: "ninguna" };

// FilaLinea suma: arrastre?: "cuadre" | "ajuste" (solo en DISPONIBILIDADES).
// FilaTotal pasa a { suma: string[]; resta?: string[] } (Saldo = DispAntes − TotalEgresos).
type FilaCapital = { clave; bloque: "CIERRE"; tipo: "capital"; texto;
  regla: { terminos: { fila: string; factor: number }[]; fijo?: number } | { tipo: "manual" } };
  // CX: [{teo,½},{reservaAguinaldo,−½}] · RA/FR: [{teo,½}] · HW: [{subtotal,1}]
  // HV: [{sueldos,1},{expensas,1},{proveedores,¼},{inversiones,⅓}] · BR: [{sueldos,1},{sac,1}], fijo 31.000.000 · MN: manual
  // Siempre: si hay ValorManualReporte P para la fila en el mes, reemplaza la regla.
type FilaDisponible = { clave; bloque: "CIERRE"; tipo: "disponible"; texto; base: string; resta: string; suma?: string[] };  // HV suma hv.prestamo
```
- **`DatosMes`** suma:
  - `realCreditos` y `realDebitos` (Map por clasificación);
  - `manuales: { presupuesto: Map<filaClave, centavos>; real: Map<filaClave, centavos> }`.
- **`calcularRealPorClasificacion`** (`lib/reporte.ts`): la misma consulta, con `SUM(CASE WHEN importe > 0 …)` y `SUM(CASE WHEN importe < 0 …)` además del neto. Aplica igual al desglose por unidad (el importe del desglose lleva su signo).
- **Orden de cálculo:** por dependencias, no por el orden visual.
  - Ejemplo: Prestamos de Mantenor (bloque de abajo) depende del Disponible, que depende del Capital, que depende de los egresos operativos.
  - `validarPlantilla` detecta ciclos.
- **Redondeo:** todo en centavos enteros. El Capital con divisiones (½, ¼, ⅓) se redondea al centavo con `Math.round`.
- **% avance y falta ejecutar:**
  - Igual que el Excel: no se calculan en Disponibilidades, Capital ni Disponible. Sí en Disponible antes de gastos y en Saldo.
  - Capital y Disponible no tienen R.
- **Celdas vacías:** un componente sin cargar queda "—" (null). Si no hay ningún componente cargado, Total Disponibilidades es null y también Disponible antes de gastos, Saldo, Capital (si depende) y Disponible. **No se rellena con el cierre anterior:** taparía que falta cargar.
- **Control de arrastre** (`Reporte.arrastre[i]`): `{ cierreRealAnterior, ajustes, totalDisponibilidades, diferencia }`, con `diferencia = total − (cierreRealAnterior + ajustes)`.
  - Se considera que cuadra si |diferencia| < $1 (el máximo observado en el Excel es $0,66).
  - Para calcularlo en el primer mes visible, la página pide **un mes más** de contexto (`MESES_VISIBLES + 1`) y no lo muestra.
  - **Advertencia:** mientras sigan abiertos K1–K8, el cierre real de la app no va a coincidir con el del Excel, y el control va a mostrar diferencia aunque Kike cargue bien los componentes. Hay que leerlo con eso en mente.
- **`validarPlantilla`** suma estas reglas:
  - una clasificación puede estar en dos filas solo si los `sentido` son distintos;
  - cada `espejo` / capital / disponible apunta a claves que existen;
  - cada componente de Disponibilidades tiene `arrastre`;
  - no hay ciclos.

### 7.3 Plantillas
- **Cada plantilla suma, arriba:**
  - título DISPONIBILIDADES (Mantenor no tiene título, como el Excel);
  - componentes en el orden y con el texto exacto del Excel, `real: manual`, `presupuesto: igualReal`, `arrastre` según §1;
  - total con el texto exacto.
- **Y suma, abajo:** Disponible antes de gastos (después de Total ingresos, como en el Excel), Saldo, Capital y Disponible.
- **Las filas `manual2b` / `espejo2b` de la 2a** pasan a las fuentes nuevas de §5.
- **Préstamo MS:**
  - la entrada pasa a `clasif("PRESTAMOS MS")` con `sentido: "creditos"`;
  - la devolución, a `sentido: "debitos"`.
- **Pendientes nuevos:** `lib/reporte/pendientes.ts` suma K9–K14. Solo los ve ADMIN/FINANZAS, igual que K1–K8.
- **Claves de fila = clave de la tabla.** Cambiar una clave deja huérfanos sus valores cargados. Un test fija la lista de claves manuales de cada plantilla, para que un cambio se note en el diff.

### 7.4 Pantalla de carga (ADMIN y FINANZAS)
- **Ruta nueva:** `/[empresa]/[periodo]/reporte/carga`.
  - Desde el Reporte, un botón "Cargar valores del mes" visible solo para ADMIN/FINANZAS.
  - La página exige `requireAdminOFinanzas` y acceso a la empresa.
- **Contenido:** el mes de la URL, con todas las filas manuales de la plantilla agrupadas por bloque.
  - Una columna por cada columna que corresponda: los componentes de Disponibilidades tienen **un solo campo** (se guarda como REAL y se muestra en P y R).
  - Cada campo muestra el valor actual, quién lo cargó y cuándo.
- **Ayudas** (no se guardan solas):
  - arriba: "Cierre real del mes anterior", "Ajustes" y "Total que debería dar". Mientras se tipea, se ven la suma de los componentes y la diferencia (cuadra / no cuadra);
  - Reserva aguinaldo (Ingresos): botón "usar −reserva de Disponibilidades";
  - Capital: la regla de la plantilla con su resultado. El campo manual vacío = usar la regla.
- **Formato de importe:** el mismo que el resto de la app (coma decimal). Se acepta una cuenta con `+` y `−` ("321.235,44+17.755,22"), como las SM de Macchi: se guarda el resultado y la cuenta va a `nota`.
- **Server action `guardarValoresManuales`:**
  - valida que cada `filaClave` exista en la plantilla y sea manual para esa columna;
  - hace upsert por clave única; si el campo queda vacío, borra la fila;
  - todo en una transacción;
  - `revalidatePath` del reporte y de la carga.
- **Todos los roles ven** en el Reporte los valores manuales (son parte del reporte, como en el Excel). El control de arrastre, las marcas K9–K14 y el link de carga son solo para ADMIN/FINANZAS.
- **Martín Salas solo ve.**

### 7.5 Reporte (vista)
- `ReportePlantilla.tsx` muestra los bloques nuevos:
  - Capital y Disponible solo en la columna P;
  - Disponibilidades sin % ni falta;
  - una fila de control "Arrastre: diferencia con el cierre anterior" debajo del Total Disponibilidades, solo ADMIN/FINANZAS y no en el Excel. Va con un estilo distinto, para que no se confunda con una fila de la planilla.
- Desaparece la etiqueta "carga manual – próximamente".

---

## 8. Tests

**Decisión previa (D1): tolerancia por redondeo.** El Excel guarda floats con más de dos decimales (por ejemplo, Efectivo de Havanna 45.028.250,605627365; Impuestos P de Conexión 193.576.923,07692307); la app guarda centavos.
- Propuesta, fijada **antes** de correr nada:
  - cada dato de entrada de la fixture se redondea al centavo, como lo guardaría la base;
  - cada esperado es el valor cacheado del Excel redondeado al centavo;
  - la diferencia permitida es **1 centavo por cada sumando que en el Excel tiene más de 2 decimales**, contados en el script que genera la fixture y escritos en la fixture;
  - el test imprime la diferencia siempre.
- Cualquier diferencia mayor se frena y se muestra. Si preferís igualdad exacta al centavo, lo cambio antes de empezar.

1. **Motor, unitarios:**
   - fuentes nuevas;
   - `resta` en totales;
   - Capital con regla, redondeo y reemplazo manual;
   - Disponible (con `suma` extra de Havanna);
   - orden por dependencias (Mantenor Prestamos = Disponible);
   - espejo mes anterior (Havanna);
   - créditos / débitos de una misma clasificación en dos filas;
   - nulos (Disponibilidades sin cargar da "—" en todo el cierre);
   - control de arrastre (cuadra, no cuadra, sin mes anterior).
2. **Estructura de las 7 plantillas:**
   - las reglas nuevas de `validarPlantilla`;
   - los textos de Disponibilidades y Cierre iguales a los del Excel (se suman a `textosMacchi.ts`);
   - la lista fija de claves manuales.
3. **Agosto 2026, las 7 empresas** (el pedido central):
   - **Fixture por empresa:**
     - P de agosto por categoría: el valor de cada fila del Excel puesto en su categoría. Las filas que suman dos referencias (por ejemplo, Impuestos de Brillante `C32+C7`) van como la suma;
     - valores manuales de agosto: componentes, P de las filas K8, Capital de Mantenor y P de Dividendos de Brillante;
     - y, para Havanna, el R de julio de "Otro tarjeta no ingresada".
     - Cada número va comentado con su celda.
   - **Esperado:** cada fila con P y cada total igual al Excel. Se comparan Total Disponibilidades, Total ingresos, Disponible antes de gastos, TEO, Total egresos, Saldo, Capital y Disponible (valores en §2, §3), más los espejos (Cheques después del 10 de Conexión 196.491.436,18, Acreditación tarjetas de Havanna 48.071.280) y los P = Disponible (Havanna 23.009.347,01, Mantenor 235.898.036,18).
4. **Arrastre:**
   - **Con números del Excel:** fixture de los últimos 12 meses × 7 empresas, con cierre R anterior, componentes y ajustes. `controlArrastre` da |diferencia| < $1 en todos los meses. Única excepción documentada: Mantenor jul-26, primer mes. Radio feb-26 se carga a mano en la fixture: en el Excel no tiene los encabezados.
   - **Con el motor, Conexión y Fredy julio** (fixtures de la 2a más los manuales de julio):
     - Saldo R de julio contra el Excel (CX 1.240.437.515,07 · FR 75.162.127,01) y Total Disponibilidades de agosto = Saldo R julio + ajustes de agosto.
     - En Conexión **no va a cerrar** por las diferencias conocidas de la 2a (Proveedores 3.973.586,86 y las filas parciales y pendientes). Se hace con la conciliación de la 2a: Saldo del motor + Σ (valor Excel de las filas pendientes o parciales − valor del motor) = Saldo Excel. La diferencia queda a la vista; no se ajusta.
5. **Prueba manual con Playwright:** necesita una sesión ADMIN temporal en la base LOCAL, **que hoy no está autorizada**: te la pido aparte antes de la implementación. Además necesita la migración aplicada en la base local.
   - **Recorrido:** cargar los valores de agosto de Radio, ver el reporte con el cierre y el control, y verificar que un mes sin presupuesto no crea `PresupuestoMensual`.
   - **Al final:** borrar los valores de prueba y la sesión, confirmar y cerrar el dev server por PID.

## 9. Preguntas para Kike (tipo c)
- **K9, arrastre:**
  - ¿Efectivo (o Caja) es el número de cuadre que hace que Disponibilidades dé el cierre del mes anterior? Si es así, la app lo puede calcular sola.
  - ¿Está bien la lista de componentes "de ajuste" de §1? Ojo: "Comisiones pendientes" es ajuste en Conexión y Brillante pero cuadre en Radio y Fredy. ¿Qué son "Cheques después del 10 / del 15"?
- **K10, Reserva aguinaldo:**
  - ¿Cómo se calcula? Parece la suma de la provisión mensual de SAC desde el último pago.
  - ¿Por qué en jun-26 se resta en Disponibilidades sin espejo en Ingresos (Conexión, Fredy), o con espejo solo en P (Brillante) o solo en R (Radio)?
- **K11, Capital de trabajo:**
  - Brillante `Sueldos + SAC + 31.000.000`: ¿qué son los 31M?
  - Havanna: ¿Inversiones / 3 o Inversiones entera? ¿Y los 76,5M de julio, el préstamo MS de junio?
  - Mantenor: ¿de dónde sale el 231.200.000?
  - ¿Se fija una regla por empresa o se carga a mano?
- **K12, Disponible:** en Brillante va a Reembolsos en algunos meses y a Dividendos en otros. ¿Quién decide la fila? ¿Lo calcula la app o lo carga Kike?
- **K13, Préstamo MS:**
  - La entrada, ¿se clasifica PRESTAMOS MS en la Ejecución? En julio solo hubo devoluciones (compra de USD).
  - En Conexión la devolución está dentro de los egresos operativos (y mueve el Capital), y en las demás abajo: ¿es a propósito?
- **K14, rangos de suma:**
  - Brillante agosto no suma "Recupero aporte blanqueo"; HWC julio no suma "Previsión SAC" ni "Pago LATAM pendiente". ¿Errores o a propósito?
  - Mantenor julio (Posición sin saldo inicial, Capital = fila Préstamo MS) y agosto R sin fórmulas: ¿errores?
- **K3 (sigue abierta):** de dónde sale el R de Proveedores IVA, Costo IVA, Compra de IVA y Costo operaciones IVA.

## 10. Decisiones
**Estado: D1–D9 APROBADAS el 2026-10-13, tal como se recomendaron, junto con el SQL de §7.1.** El SQL se verificó sin tocar ninguna base: `prisma migrate diff` entre el schema de `HEAD` (copiado fuera del repo) y un schema temporal con el modelo nuevo da una salida idéntica al SQL de §7.1.

**Regla de bloqueo (lo cerrado no se modifica para atrás): APROBADA el 2026-10-13.** Un `ValorManualReporte` deja de poder editarse así:
- **P y Capital de trabajo manual:** bloqueados cuando el `PresupuestoMensual` de esa empresa y mes está VALIDADO. Sin presupuesto: editable (mirar el reporte no lo crea).
- **Disponibilidades** (campo único, P = R): bloqueadas cuando el mes ya pasó (anterior al mes actual) y la empresa tiene al menos una semana CERRADA en ese mes. No se bloquean por VALIDADO: el presupuesto se valida antes de que empiece el mes y el saldo inicial recién se conoce el día 1.
- **R manual de flujo** (Resultado FCI y demás filas manuales de ingresos y egresos): bloqueado cuando el mes ya pasó y la empresa no tiene ninguna semana ABIERTA.
- **Ajuste 2026-10-14 (primera carga):** "no se modifica para atrás" no alcanza a la primera carga. Si el período está bloqueado según las reglas de arriba, se puede **crear** un valor que no existe; lo que no se puede es **modificar ni borrar** un valor ya cargado. Vale para todos los tipos (Disponibilidades, P/Capital manual y R manual de flujo). Sin esto, las Disponibilidades vacías de un mes ya pasado (p. ej. Conexión 2026-09) no se podrían cargar nunca.
  - **Pantalla:** campo vacío en período bloqueado = editable con el aviso "Período cerrado: solo se puede cargar una vez". Campo con valor en período bloqueado = solo lectura con el motivo.
  - **Servidor:** `guardarValoresManuales` lee lo guardado y valida la regla dentro de la transacción (`motivoRechazoCambio` en `lib/reporte/bloqueo.ts`: rechaza solo si hay motivo de bloqueo y el valor ya existía).
- **Sin desbloqueo por ADMIN en esta etapa.** La corrección se carga en el período siguiente (regla de Vigo).
- No se usa "todas las semanas del mes cerradas": las semanas se crean a demanda, no hay un total esperado por mes y el Real suma extractos de otras empresas.
- **Pendiente de implementar** (la validación va en el servidor, en `guardarValoresManuales`, y la pantalla de carga muestra los campos bloqueados como solo lectura con el motivo).
- **D1.** Tolerancia de redondeo de los tests (§8). Propuesta: 1 centavo por sumando con más de 2 decimales.
- **D2.** Replicar las fórmulas raras (§6) en lugar de corregirlas. Cambia la decisión 5 de la 2a.
- **D3.** Capital por defecto = fórmula de agosto de cada empresa, más reemplazo manual. Cambia la decisión 4 de la 2a.
- **D4.** P de Resultado FCI desde la categoría "Intereses FCI" (como en la 2a), no manual.
- **D5.** Filas K8 con P manual hasta que Kike responda.
- **D6.** Préstamo MS separado por sentido (créditos a Ingresos, débitos a la devolución).
- **D7.** Carga en una pantalla aparte (`/reporte/carga`), no editando celdas dentro del reporte.
- **D8.** Disponibilidades sin cargar = "—". No se rellenan con el cierre anterior.
- **D9.** Control de arrastre visible solo para ADMIN/FINANZAS, con umbral de $1.

## 11. Archivos
**Nuevos:**
- `prisma/migrations/20261013120000_agregar_valor_manual_reporte/migration.sql` (lo aplicás vos).
- `app/[empresa]/[periodo]/reporte/carga/page.tsx`, `CargaValoresManuales.tsx` y `actions.ts`.
- `lib/reporte/valoresManuales.ts`: lectura por empresa y períodos, y parseo de "a+b−c".
- Tests: `lib/reporte/__tests__/agosto2026.test.ts`, `arrastre.test.ts`, y fixtures `agosto2026.ts` y `arrastre12meses.ts` (generadas con un script fuera del repo que lee el Excel en solo lectura).

**Modificados:**
- `prisma/schema.prisma`: modelo y enum nuevos, más las relaciones de vuelta.
- `lib/reporte/motor.ts`, `lib/reporte/plantillas/*.ts` (las 7 + `filas.ts`), `lib/reporte/pendientes.ts`.
- `lib/reporte.ts`: créditos y débitos en `calcularRealPorClasificacion`.
- `app/[empresa]/[periodo]/reporte/page.tsx`: un mes más de contexto, lectura de los manuales y link de carga.
- `ReportePlantilla.tsx`.
- `lib/reporte/__tests__/{motor,plantillas,julio2026}.test.ts` y `fixtures/textosMacchi.ts`.

**Sin cambios:** `clasificacionesPresupuesto.ts`, `lib/rubros.ts`. El resto de las tablas no se toca.

**Orden sugerido:**
1. Motor y tests unitarios.
2. Plantillas y test de agosto.
3. Test de arrastre.
4. Migración (la aplicás vos).
5. Lectura de manuales en el reporte.
6. Pantalla de carga.
7. Playwright, si lo autorizás.

Se frena después del paso 3 para mostrarte los tests contra el Excel antes de tocar la base.
