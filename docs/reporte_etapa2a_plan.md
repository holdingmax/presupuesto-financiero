# Reporte "Presupuesto Financiero": plan de la Etapa 2a (aprobado)

Estado: aprobado el 2026-10-07, con los ajustes incluidos abajo. La implementación arranca en una conversación nueva.
Antecedente: `docs/reporte_diagnostico.md` tiene el relevamiento de las 12 planillas PF de Macchi (filas, fórmulas, origen de cada número y mapeo a clasificaciones y categorías).

## 0. Decisiones tomadas

1. **Alcance v1:** las 7 empresas de formato COMPLETO: Conexión Logística, Brillante, Havanna, Radio, Fredy Publicidad, HWC (Handy) y Mantenor.
   - Avianor y Havanna Perú (formato simple) y Bradenton y Plate Silver (en dólares) quedan para después. En esas empresas el Reporte sigue como hoy (Fase 1, sin cambios).
2. **Plantillas:** una por empresa, en código y tipadas, con un test que reproduce julio 2026. Un único motor. El Real reutiliza `lib/reporte.ts`.
3. **Tabla de valores manuales (`ValorManualReporte`):** aprobada como idea para la **Etapa 2b**. No se crea en 2a.
4. **Capital de trabajo (2b):** valor editable, con sugerencia por defecto = egresos operativos ÷ 2. Disponible = Disponibilidades − Capital de trabajo.
5. **Fórmulas de las planillas que parecen errores:** NO se copian; quedan como preguntas (ver diagnóstico, §0 punto 8).
6. **Signo explícito en lugar de `Math.abs`:**
   - El signo se usa solo para calcular.
   - En la UI los egresos se muestran **positivos**, igual que la planilla que ve Salas.
   - Si un neto da al revés de lo esperado (por ejemplo, más devoluciones que gastos), se muestra **con signo negativo** para que se note.
7. **Marcas de pendientes:** las etiquetas K1–K8, su tooltip y la lista "Pendiente de confirmar con Kike" se muestran **solo a usuarios con rol ADMIN o FINANZAS**.
   - Cualquier otro rol ve el reporte limpio: "—" donde falta el dato y ninguna referencia a Kike.
   - Las etiquetas "parcial", "carga manual — próximamente" y el asterisco de "total incompleto" tampoco mencionan a Kike. Si se muestran a todos o solo a ADMIN/FINANZAS se define al implementar; por defecto, solo a ADMIN/FINANZAS, y los demás ven solo "—".
8. **Playwright:** autorizada **una** sesión ADMIN temporal, **solo en la base LOCAL**.
   - Antes de crearla, verificar que el host sea `ep-still-darkness-ayjqbmem-pooler`.
   - Al terminar, borrarla y confirmar el borrado.

### Reglas de siempre (válidas en toda la implementación)
- Nada de migraciones: este plan no las necesita. Si aparece la necesidad, frenar y avisar.
- Nunca usar una base real como shadow DB. Nada de `migrate dev`, `migrate reset` ni `db push`.
- No mostrar URLs ni contraseñas de bases.
- No hacer commit ni push hasta que se apruebe el diff.
- Si se levanta el dev server, al final verificar por PID que quedó cerrado.
- **Si algún número de los tests de julio de Conexión o Fredy no cierra contra el Excel, NO se ajusta para que pase:** se frena y se muestra la diferencia.

---

## 1. Preguntas para Kike

### 1.1 Bloquean la Etapa 2a (enviadas o por enviar por WhatsApp)
Cada código K es el que se muestra en la pantalla (solo ADMIN/FINANZAS). Entre paréntesis, el número de pregunta del diagnóstico.

- **K1, repartos sin unidad (10, 11, 16).**
  - Los sueldos, el SAC, el F931 y las tarjetas que salen sin unidad de negocio, ¿los repartimos en la Ejecución con el prorrateo por unidad?
  - ¿Los % del F931 (SPP, LI, CREAR) son fijos o cambian todos los meses?
- **K2, expensas (12).** ¿Cómo repartís la unidad EXPENSAS entre las empresas?
  - En julio fue Conexión 55,2M, Brillante 33,2M, Mantenor 31,6M, Havanna 29,5M, Fredy 17,7M y Radio 12,1M.
  - ¿Tenés esa planilla?
- **K3, IVA (15).** ¿De qué clasificación salen estas filas? No cierran contra IVA ni contra CH DIFERIDOS IVA.
  - "Proveedores IVA" (Conexión)
  - "Costo IVA" (Radio)
  - "Compra de IVA" (Fredy)
  - "Costo operaciones IVA" (Handy)
- **K4, cobranzas (14, parte de 23).** ¿Alcanza con tomar lo clasificado COBRANZAS de la unidad?
  - En Conexión da 5,8M de diferencia.
  - En Havanna se separan bancos y locales, y en Mantenor Jujuy y MSNT. ¿Con qué criterio?
- **K5, Fredy (18).** ¿Qué extractos o razones sociales entran? En la Ejecución, la unidad FREDY tiene 43M de cobranza y 10M de sueldos; en el reporte de Macchi figuran 210M y 15,8M.
- **K6, Handy (19).** ¿El extracto de HWC se carga en la app? Los sueldos (243M) y las recaudaciones y pagos a aerolíneas (LATAM, Avianca, JetSmart), ¿de dónde salen?
- **K7, Brillante / Gold (21).** La fila "GOLD SALTA" son las cobranzas de Gold Seguridad. ¿Se le crea una unidad propia "GOLD" para separarla?
- **K8, categorías de presupuesto (25).** Hay filas presupuestadas que no tienen categoría en la app: "Otras operaciones", los pagos a aerolíneas de Handy y el préstamo como ingreso. ¿Se agregan esas categorías o se cargan a mano?

### 1.2 Pueden esperar
- **Ya resueltas por las decisiones de §0:** 1, 28, 29 y 31.
- **Etapa 2b (Disponibilidades y Cierre):** 6, 7, 8, 9 y 30.
- **Formato y pantalla:** 3 (cuántos meses), 4 (ESPERADO vs PRESUPUESTADO en Handy) y 5 (ocultar filas vacías).
- **Filas que en 2a quedan como "parcial" o "carga manual" (sin bloquear):** 13, 17, 20, 22, 23 (lo que se paga en efectivo en los locales de Havanna; Juicios en la fila Liq. Final), 24, 26 (se asume Impuesto al cheque = Gastos bancarios) y 27.
- **Empresas fuera de la v1:** 2, y lo que queda de la 20 (Avianor).

---

## 2. Alcance de la Etapa 2a

- **Bloques que entran:** INGRESOS, EGRESOS OPERATIVOS y el bloque de abajo (Recupero gastos, Dividendos, Reembolsos, Inversiones, etc.). Con sus totales: Total ingresos, Total egresos operativos y Total egresos.
- **Bloques que quedan para 2b:**
  - DISPONIBILIDADES.
  - "Disponible antes de gastos" y "Saldo inicial + ingresos − total egresos": dependen de las Disponibilidades.
  - Capital de trabajo y Disponible.
- **Columnas:** varios meses lado a lado. Cada mes muestra Presupuestado · Real · % Avance · Falta ejecutar.
- **Base de datos:** sin migración. Sin tablas nuevas.

## 3. Diseño

### 3.1 Motor puro: `lib/reporte/motor.ts`
- **Sin Prisma.** Recibe la plantilla, los períodos, el Real por período y clasificación (centavos con signo de banco) y el Presupuesto por período y categoría (centavos).
- **Devuelve la grilla:** filas × meses × {presupuestado, real, avance, faltaEjecutar}, con el estado de cada celda.
- **Testeable sin base.**

### 3.2 Fila de plantilla
```ts
type Bloque = "INGRESOS" | "EGRESOS" | "ABAJO";   // 2b agrega DISPONIBILIDADES y CIERRE
type FuenteReal =
  | { tipo: "clasificaciones"; clasificaciones: string[] }   // valores crudos de Ejecución; se comparan con normalizarTexto + alias de lib/rubros.ts
  | { tipo: "manual2b" }                                      // Resultado FCI, MS sin clasificar, etc.
  | { tipo: "espejo2b" }                                      // Reserva aguinaldo, cheques después del 10/15
  | { tipo: "ninguna" };
type FuentePresupuesto = { tipo: "categorias"; categorias: string[] } | { tipo: "ninguna" };  // valorPersistido de clasificacionesPresupuesto.ts
type Fila =
  | { clave: string; bloque: Bloque; tipo: "titulo"; texto: string }
  | { clave: string; bloque: Bloque; tipo: "linea"; texto: string; signo: 1 | -1;
      real: FuenteReal; presupuesto: FuentePresupuesto;
      pendiente?: "K1" | "K2" | "K3" | "K4" | "K5" | "K6" | "K7" | "K8";
      parcial?: boolean;      // lo calculado es solo una parte (ej. Sueldos sin el reparto de nómina)
      nota?: string }         // de dónde sale en la planilla de Macchi
  | { clave: string; bloque: Bloque; tipo: "total"; texto: string; suma: string[] /* claves */ };
```
- `texto` es el texto exacto de la planilla de Macchi (ver diagnóstico §2).

### 3.3 Signo
- **Valor interno:** `valor = signo × real`, donde `real` es el neto con signo de banco. Ingresos llevan `signo = +1`; egresos, `signo = −1`.
- **Resultado:** un egreso normal queda positivo. Si un egreso neto tiene más devoluciones que gastos, el valor queda negativo y se muestra con "−".
- **Sin `Math.abs`.**

### 3.4 Totales
- Se suman solo las filas con valor.
- Si el bloque tiene alguna fila sin fuente (pendiente o manual 2b), el total se marca como incompleto.

### 3.5 Varios meses
- **Meses que se muestran:** por defecto, los 3 que terminan en el período de la URL (en una constante; la pregunta 3 queda abierta).
- **Presupuesto de los otros meses:** se lee con `findUnique`, **no** con `obtenerOCrearPresupuesto`. Mirar el reporte no debe crear presupuestos. Si un mes no tiene presupuesto, se muestra "sin presupuesto".
- **Real:** una sola consulta para todos los períodos.

### 3.6 Pantalla
- **Para ADMIN y FINANZAS:**
  - Etiqueta terracota `Kn` junto al nombre de la fila, con tooltip del texto corto de la pregunta.
  - Debajo de la tabla, la lista "Pendiente de confirmar con Kike".
  - Fila sin fuente: "—" en la celda, nunca $0.
  - Fila parcial: valor en gris con la marca "parcial".
  - Fila manual 2b: etiqueta gris "carga manual — próximamente" y "—" en la celda.
  - Total incompleto: asterisco con "incluye filas sin dato".
- **Para los demás roles:** "—" donde falta el dato, sin etiquetas K, sin lista y sin referencias a Kike.
- **Bloque "No asignado a ninguna empresa":** se mantiene debajo, como en la Fase 1.
- **Empresas sin plantilla:** se ven con la Fase 1 sin cambios.

### 3.7 Cómo queda cada concepto en 2a
| Concepto | Real | Presupuestado |
|---|---|---|
| Cheques diferidos, Comisiones especiales, Proveedores, Liq. finales, Juicios, Pagos especiales, Otros, Inversiones, Dividendos, Devolución préstamo MS, Gastos bancarios / Imp. al cheque | automático por clasificación | categoría de la app |
| Sueldos, SAC, Impuestos, Préstamos y tarjetas | automático; marcado K1 + parcial hasta que se haga el prorrateo en Ejecución | categoría |
| Expensas | K2 | EXPENSAS |
| Filas de IVA | K3 | IVA |
| Cobranzas | automático (CX, RA, BR); K4 donde se separa (HV, MN) | COBRANZAS |
| Fredy | K5 en Cobranza y Sueldos/SAC; el resto automático | |
| Handy | K6 en Sueldos, recaudaciones y aerolíneas; automático en Impuestos, Proveedores, SAC y Comisiones | |
| Brillante "GOLD SALTA" | K7 | |
| Filas sin categoría de presupuesto | | K8 |
| Gastos Campo (CX), Gastos Avion a recuperar (CX) | parcial: CAMPO / AVION | ninguna (solo real) |
| Resultado FCI, espejos, MS sin clasificar | manual 2b | |

## 4. Archivos

**Nuevos**
- `lib/reporte/motor.ts`: tipos, `armarReporte()`, totales, % avance y falta ejecutar.
- `lib/reporte/pendientes.ts`: catálogo K1…K8 con el texto corto de cada pregunta.
- `lib/reporte/plantillas/{conexion,brillante,havanna,radio,fredy,hwc,mantenor}.ts` + `index.ts`:
  - mapa de slug a plantilla, por slug y no por id, porque los uuid cambian entre las bases;
  - verificar los slugs reales con `lib/slug.ts` contra los nombres de las empresas.
- `app/[empresa]/[periodo]/reporte/ReportePlantilla.tsx`:
  - tabla multi-mes con la primera columna fija, títulos de bloque y totales;
  - etiquetas K y lista de pendientes, condicionadas al rol;
  - bloque "No asignado" debajo.
- `lib/reporte/__tests__/*.test.ts`.

**Modificados**
- `lib/reporte.ts`: se agrega `calcularRealPorClasificacion(periodos: string[], unidades: string[], clasificaciones: string[])`, que devuelve un Map por período y clasificación cruda en centavos.
  - Es la misma consulta de `calcularRealPorRubro`, con `pm.periodo = ANY()` y `GROUP BY periodo, clasificacion`.
  - `calcularRealPorRubro` queda para la Fase 1.
- `app/[empresa]/[periodo]/reporte/page.tsx`:
  - si hay plantilla para el slug, toma el camino nuevo; si no, la Fase 1 tal cual;
  - pasa al componente si el usuario es ADMIN o FINANZAS (`lib/auth.ts`).
- `package.json`: script `"test": "tsx --test lib/**/*.test.ts"`. No hay dependencias nuevas: tsx ya está instalado y Node es 25.

**Sin cambios:** `lib/rubros.ts` (se reutiliza para los alias), `clasificacionesPresupuesto.ts` (salvo que la respuesta a K8 pida agregar categorías), `prisma/`.

## 5. Casos de prueba

1. **Motor, unitarios:**
   - % avance da null si P es 0.
   - Falta ejecutar = P − R.
   - El signo se aplica por fila: un egreso normal queda positivo y uno neto al revés queda negativo.
   - Una fila sin fuente da null, no 0, y marca el total como incompleto.
   - Un mes sin presupuesto se muestra como "sin presupuesto".
2. **Estructura de las 7 plantillas:**
   - claves únicas;
   - cada categoría existe en `clasificacionesPresupuesto.ts`;
   - una misma clasificación no aparece en dos filas de la misma plantilla (para no contarla dos veces);
   - los totales apuntan a claves existentes;
   - cada `pendiente` existe en el catálogo;
   - los textos coinciden con los de la planilla de Macchi.
3. **Conexión, julio 2026:**
   - **Fixture:** sumas por clasificación de julio de la unidad SPP + LOGISTICA, y presupuesto de julio por categoría. Cada número va comentado con su celda de origen (por ejemplo `DO33 = -'DETALLE GASTOS REALES'!E26`).
   - **Igualdad exacta en las filas automáticas:** Cheques diferidos 81.362.325,52 · Comisiones especiales 62.569.791,61 · Impuesto al cheque 35.700.613,10 · Liq. finales 47.113.310 · Juicios 100.000. Estos números se verificaron el 2026-10-07 contra el pivot de `EJECUCION FINANCIERA 31.07.xlsx` por unidad SPP+LOGISTICA y cierran exacto.
   - **⚠ Diferencia conocida en Proveedores, que NO se ajusta:**
     - PROV Y SERV de SPP+LOGISTICA en la Ejecución = **1.252.430.518,24**.
     - El Excel muestra **1.248.456.931,38** (`DETALLE GASTOS REALES`!E686, una hoja armada a mano).
     - Diferencia: **3.973.586,86**. Hay que identificar qué movimientos sacó Macchi de la hoja, y la regla sale de la pregunta 22 del diagnóstico.
     - El test tiene que mostrar esta diferencia de forma explícita: por ejemplo, la fila esperada en 1.252.430.518,24 y una aserción documentada de "dif. vs Excel = 3.973.586,86". No se toca la fixture para que cierre.
   - **Filas parciales:** se verifica la parte calculada. Sueldos 124.394.412; SAC 56.281.193.
   - **Conciliación:** Total egresos operativos del motor + la suma, según el Excel, de las filas pendientes o con el faltante parcial = Total egresos operativos del Excel (2.168.720.681).
4. **Fredy, julio 2026:**
   - **Fixture:** hoja `EJECUCION FINANCIERA JULIO`, columna CLASIF 2.
   - **Igualdad exacta:** Cheques diferidos 8.273.783,50 · Comisión especial 9.930.308 · Pagos especiales 1.900.000 · Impuestos 9.941.120,92 · Proveedores 53.409.579,07 · Otro 4.229.939,97 · Dividendos 40.000.000.
   - **Conciliación:** misma lógica que en Conexión, contra Total egresos operativos 146.029.677.
   - **Ojo:** este test prueba la plantilla, no los datos de la app. En la app, el Real de Fredy depende de K5. Por ejemplo, PROV Y SERV de la unidad FREDY en la Ejecución consolidada es 24.034.994,81, contra los 53.409.579,07 de la hoja propia de Fredy.
5. **Si algún número de los puntos 3 o 4 no cierra contra el Excel:** NO se ajusta. Se frena y se muestra la diferencia.
6. **Fixtures:**
   - se generan con un script **fuera del repo** que lee los Excel en modo solo lectura;
   - quedan en el repo como números fijos, comentados con la celda de origen.
7. **Prueba manual con Playwright (base local, sesión ADMIN temporal autorizada; ver §0 punto 8):**
   - una empresa con plantilla (Radio), con 3 meses;
   - el mismo reporte con un usuario sin rol ADMIN/FINANZAS no muestra etiquetas K ni menciones a Kike;
   - una empresa sin plantilla (Avianor) se ve igual que hoy;
   - un mes sin presupuesto no crea ningún `PresupuestoMensual`;
   - al final: borrar la sesión, confirmar el borrado y verificar por PID que el dev server quedó cerrado.
   - **Ojo:** el caso del usuario sin rol ADMIN/FINANZAS no entra en la autorización actual, que es una sola sesión ADMIN. Para probarlo hay que pedir autorización aparte o probar ese condicional de rol de otra forma.
