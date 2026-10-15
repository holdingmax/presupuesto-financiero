# Ejecución: lector de extractos crudos de cada banco (plan para aprobar)

Estado: **solo plan, sin implementar**. Fecha: 2026-10-15.
Reglas de siempre (de `docs/reporte_etapa2a_plan.md`), válidas para toda la implementación:
- Nada de `migrate dev`, `migrate reset` ni `db push`; nunca una base real como shadow DB. La migración (§4) la aplicás vos, con el comando que apruebes.
- No mostrar URLs ni contraseñas de bases. No commit ni push hasta que apruebes el diff.
- Si se levanta el dev server, al final verificar por PID que quedó cerrado.
- No crear sesiones, usuarios ni permisos en ninguna base sin preguntar (la prueba E2E necesita tu ok aparte).
- Si un test contra un extracto real no cierra, **no se ajusta la expectativa**: se frena y se muestra la diferencia.

Fuente de este plan: los 6 extractos reales que bajó Flavia, leídos **solo en lectura** con un script fuera del repo (Python: xlrd, openpyxl y lectura de texto). **No se copiaron al repo.** Más el archivo madre (`EJECUCION FINANCIERA 31.07.xlsx`) y el código de `subirExtracto`.

> **Ruta:** los extractos no están en `EnriqueMacchi\extractos_crudos\` (esa carpeta no existe). Están en `Desktop\flavia-bancos\` (6 archivos, mismos nombres que describiste). Los tests "contra reales" deben leer de una carpeta configurable (variable de entorno), no de una ruta fija.

> **Datos reales:** §6 lista cantidades y totales de esos archivos. Son cifras bancarias reales (sin nombres de terceros): no compartir este documento fuera del equipo.

**Decisiones aprobadas el 2026-10-15:**
1. **Macro sí trae `Saldo`** (columna 11, posterior al movimiento, más nuevo a más viejo; 17 de 17 enlaces cierran). Corrección mía: la primera lectura del archivo cortaba en 10 columnas. Solo **BBVA** queda sin saldo por fila.
2. El control de saldo funciona **en cualquier orden** (§5.1), con test del orden del madre.
3. `BNA 241` y `SANTANDER 099` son de HWC; HWC y HANDYWAY probablemente son la misma unidad: **pendiente de confirmar con Kike, sin cambios todavía.**
4. Aprobados: SheetJS 0.20.x (versión y hash fijos), vista previa con totales y confirmación, 2 decimales en la tabla, **bloqueo** si la cuenta del archivo no coincide con la elegida, una cuenta por un solo camino por período.
5. Los SQL de §4 los aplicás vos; no se ejecutan desde acá.

---

## 1. Diagnóstico: por qué falla hoy cada síntoma

`subirExtracto` (`app/[empresa]/[periodo]/ejecucion/actions.ts`) asume el formato madre: `.xlsx`, encabezados en la fila 1, columnas `Fecha / Concepto / Importe / Saldo / BANCO Y CTA …`.

| Síntoma | Causa (verificada en el código y en los archivos) |
|---|---|
| Importes en $0 | Galicia (`Débitos`/`Créditos`), BBVA (`Crédito`/`Débito`) y Santiago del Estero (`Monto`) no tienen columna `Importe`: `extraerImporte(null)` devuelve 0 y la fila entra igual. Nación trae el importe como texto (`$ -36.000.000,00`): no es número ni fórmula, la fila se descarta. |
| Fechas mal | Las fechas de texto se leen con `new Date("01/10/2026")`, que JavaScript interpreta como **mes/día** (10 de enero). Vale para Nación, Santander, Santiago y BBVA (`01-10-2026`). **El "1905" no lo pude reproducir** con estos 6 archivos; lo más probable es una celda numérica leída como fecha (un serial o un código en una columna corrida). La lectura nueva rechaza fechas fuera de rango en vez de adivinar. |
| Todo "(sin banco)" | Ningún extracto crudo trae la columna `BANCO Y CTA`: el banco y la cuenta están en el nombre del archivo o en el encabezado del propio extracto. |
| Sin unidad sugerida | Consecuencia del anterior: `proponerUnidadPorCuenta("(sin banco)")` no encuentra nada. |
| No lee `.xls` | El código exige `.endsWith(".xlsx")` y ExcelJS **no lee BIFF** (`.xls` binario). Además, dos de los "`.xls`" ni siquiera son Excel: Santander es texto tabulado en latin-1 y Santiago es un `.csv`. |
| "No toma los decimales" | **Es solo visual, no se pierden.** `MovimientoBancario.importe` es `Decimal(18,2)` y el guardado pasa por centavos exactos (`centavosDeNumero` / `decimalTextoDeCentavos`). Lo que Flavia ve es `formatearImporte` (`ejecucion/formato.ts`: `maximumFractionDigits: 0`, usado en `TablaMovimientos.tsx:259`), que muestra pesos enteros. Galicia además marca sus celdas con formato `0`, que oculta decimales en Excel pero no los borra (la celda `779.71` los conserva). Verifiqué solo la pantalla de Ejecución; el Reporte no lo revisé. Propuesta: mostrar 2 decimales en la tabla de Ejecución (cambio chico, sin riesgo). |

Hallazgo extra (no pedido): `verificarContinuidadSaldo` asume que el archivo viene **de la fila más vieja a la más nueva**. El archivo madre de julio viene **de la más nueva a la más vieja**, y replicando la fórmula en Python cada cuenta daría ruptura en casi todas las filas (MACRO 599: 659 de 659; GALICIA 731: 187 de 187), mientras que al invertir el orden da 1 y 0. No lo ejecuté en la app. **Aprobado incluirlo en este trabajo (§5.1):** el control debe funcionar en cualquier orden.

## 2. Qué trae cada banco (relevado)

| Banco | Contenedor real | Encabezado | Fecha | Importe | Saldo | Orden | N.° de cuenta en el archivo |
|---|---|---|---|---|---|---|---|
| **Macro** `.xls` | BIFF (OLE2). 11 columnas con celdas combinadas: los datos no están en columnas contiguas | Fila 8 (índice 7): `Fecha · (vacía) · (vacía) · Nro. de Referencia · Causal · Concepto · Importe · (vacías) · Saldo` (el `Saldo` está en la columna 11). Arriba, 7 filas de preámbulo; abajo, 3 de pie (`Fecha de descarga`, `Empresa: CUIT - razón`, `Operador`) | Celda de fecha real (serial) | Número con signo | **Sí**, número, **después** del movimiento (17 de 17 enlaces cierran; 1.ª fila = 244.999.561,24) | **Del más nuevo al más viejo** | `Número` = `315909409281599` (termina en 599). CUIT en el pie |
| **Galicia** `.xlsx` | ZIP/OOXML, 16 columnas | Fila 1: `Fecha · Descripción · Origen · Débitos · Créditos · Grupo de Conceptos · Concepto · … · Número de Comprobante · Leyendas 1–4 · Tipo de Movimiento · Saldo` | Fecha real, con formato visible `mm-dd-yy` | `Débitos` y `Créditos` **ambos positivos**: importe = créditos − débitos | **Sí** (después del movimiento) | Del más viejo al más nuevo (6 de 6 enlaces cierran) | **No trae** |
| **BBVA** `.xls` | BIFF | Preámbulo `Empresa:`, `Cuenta:`, `Sucursal:`, `Saldo:`, `Movimientos de:`; encabezado en la fila 7: `Fecha · Fecha Valor · Concepto · Codigo · Número Documento · Oficina · Crédito · Débito · Detalle · (vacío)` | **Texto** `dd-mm-aaaa`. `Fecha Valor` puede diferir (hay filas con 30-09 en un archivo del 01-10) | `Débito` ya viene **negativo**, `Crédito` positivo; la celda vacía es texto `""` | **No por fila.** `Saldo:` del encabezado y `Saldo Disponible:` (solo en la 1.ª fila) **no cuadran** con la suma de movimientos | — | `Cuenta: 223-008789/1(CC $)` (termina en 891). CUIT entre paréntesis en `Empresa:` |
| **Nación** `.xls` | BIFF, 1 hoja `Hoja1 - Table 1` | Fila 6: `Fecha · Comprobante · Concepto · Monto · Saldo`; arriba `Banco Nación [BNA + Empresas]` y `Últimos movimientos` | Texto `dd/mm/aaaa` | **Texto** `$ -36.000.000,00` | Texto `$ 36.221.007,73`. **Es el saldo ANTES del movimiento** (6 de 6 enlaces cierran así; el archivo madre confirma lo mismo para BNA 497) | Del más nuevo al más viejo | **No trae** |
| **Santander** `.xls` | **Texto tabulado en latin-1** (no es Excel). Líneas vacías al principio | Línea 7: `Fecha⇥Suc. Origen⇥Desc. Sucursal⇥Cod. Operativo⇥Referencia⇥Concepto⇥Importe⇥Saldo`. Preámbulo con `Cuenta corriente en Pesos Nro. 069-008609/9`. Pie: una línea con fecha y hora de descarga | Texto `dd/mm/aaaa` | Texto argentino; **negativos entre paréntesis** `(74.223,22)`, miles con punto | Sí, después del movimiento (24 de 24 enlaces cierran) | **Del más nuevo al más viejo** | `069-008609/9` (sin puntuación: `0690086099`, termina en 099). Sin CUIT |
| **Santiago del Estero** `.csv` | Texto latin-1, separador `;`, fin de línea CRLF, campos con relleno de espacios | Fila 1: `Cuenta;CUIT Cuenta;Fecha;Monto;Nº de Comprobante;Descripción;Saldo` | Texto `dd/mm/aaaa` | Texto con **coma decimal y sin miles**: `-4280727,00` | Sí, después del movimiento (5 de 5 enlaces cierran) | Del más viejo al más nuevo | Columna `Cuenta` = `E.P.J. $ 2700000000002560` (termina en 560) y `CUIT Cuenta` |

**Lo que comparten todos:** una sola moneda (pesos), ningún archivo trae la unidad de negocio, la clasificación ni el nombre canónico de la cuenta (`MACRO 599`, etc.). **Lo que cambia:** contenedor, posición del encabezado, signo, formato de números y fechas, si hay saldo y en qué orden vienen las filas.

## 3. Propuesta

### 3.1 Capas (todo puro y testeable, en `lib/extractos/`)

1. **`contenedor.ts` — leer bytes a una grilla de celdas.** Detecta por **contenido** (los primeros bytes), no por extensión:
   - `PK\x03\x04` → OOXML (`.xlsx`): ExcelJS, como hoy.
   - `D0 CF 11 E0 A1 B1 1A E1` → BIFF (`.xls` binario): librería nueva (§3.5).
   - Otra cosa → texto. Decodificar como UTF-8 **estricto**; si falla, `windows-1252` (cubre latin-1: Santander y Santiago). Quitar BOM. Detectar separador contando `⇥`, `;` y `,` en las primeras líneas. Aceptar saltos CRLF/LF.
   - Un `.xls` que en realidad es HTML (`<table`) se trata como error claro "formato no soportado", no se adivina.
   - Salida: lista de hojas, cada una con filas de celdas ya tipadas (`number | string | Date | null`). Las fechas de celda se normalizan con componentes UTC; los serial usan el modo 1900/1904 del libro.
2. **`detectar.ts` — qué banco es.** Firmas por contenido, en este orden (la primera que coincide gana; si ninguna, error "no reconozco este formato", sin cargar nada):
   1. **Madre:** fila 1 con `Concepto` e `Importe` y (`BANCO Y CTA` o `UNIDAD DE NEG`). Sigue por el camino actual, sin cambios (§3.3).
   2. **Galicia:** fila 1 con `Débitos` y `Créditos`.
   3. **BBVA:** una fila con `Crédito`, `Débito` y `Fecha Valor`.
   4. **Macro:** una fila con `Nro. de Referencia`, `Causal`, `Concepto`, `Importe` `Saldo` y el preámbulo `CUENTA CORRIENTE BANCARIA`.
   5. **Nación:** una fila con `Fecha`, `Comprobante`, `Concepto`, `Monto`, `Saldo` y `Banco Nación`.
   6. **Santander:** fila con `Fecha`, `Suc. Origen`, `Cod. Operativo`, `Importe`, `Saldo`.
   7. **Santiago:** fila con `Cuenta`, `CUIT Cuenta`, `Monto`, `Descripción`.
3. **Un lector por banco (`bancos/macro.ts`, `galicia.ts`, `bbva.ts`, `nacion.ts`, `santander.ts`, `santiago.ts`)**, todos con la misma salida:

```ts
type FilaExtracto = {
  numeroFila: number;          // fila real del archivo (para mensajes de error)
  fecha: Date;                 // medianoche UTC del día, igual que hoy
  concepto: string;
  importeCentavos: number;     // con signo, exacto
  saldoCentavos: number | null; // SIEMPRE "después del movimiento"; null si el banco no lo da
  referencia: string | null;   // texto, conserva ceros a la izquierda
  causal: string | null;
  detalle: string | null;
};
type LecturaExtracto = {
  banco: "MACRO" | "GALICIA" | "FRANCES" | "BNA" | "SANTANDER" | "BSE";
  filas: FilaExtracto[];       // en orden CRONOLÓGICO (se invierte si el archivo viene al revés)
  cuentaEnArchivo: string | null; // solo dígitos, p. ej. "315909409281599"
  cuitEnArchivo: string | null;
  avisos: string[];
};
```

   - **Encabezado:** se busca **por texto**, no por número de fila: la primera fila de las primeras ~40 que contenga todas las columnas obligatorias del banco (comparación sin tildes, mayúsculas ni espacios, como `normalizarEncabezado`). Las columnas se ubican por el texto de su celda de encabezado, así los huecos de Macro (celdas combinadas) no importan.
   - **Filas de datos:** desde el encabezado hasta la primera fila **sin fecha válida** (corta el pie de Macro y la línea de descarga de Santander). Una fila con fecha válida pero importe ilegible **frena la carga** con el número de fila; no se descarta en silencio.
   - **Fechas:** formato fijo por banco, nunca `new Date(texto)`:
     - Texto `dd/mm/aaaa` (Nación, Santander, Santiago) y `dd-mm-aaaa` (BBVA): se parte por separadores, se valida mes 1–12 y día ≤ días del mes.
     - Celda de fecha (Macro, Galicia): se usa el valor, ignorando el formato visible (`mm-dd-yy` de Galicia es solo cómo se muestra).
     - Se rechaza cualquier fecha fuera de 2000–2100, y se **avisa** si el rango del archivo está a más de ~400 días de hoy.
     - Con un solo formato posible por banco, "día/mes vs mes/día" no es una adivinanza.
   - **Números argentinos** (`numero.ts`, función pura, devuelve centavos **sin pasar por float**): sacar `$`, espacios y espacios duros; `(1.234,56)` y `-1.234,56` y `1.234,56-` son negativos; con `,` y `.` el último es el decimal; en los bancos de texto, un `.` solo es miles y una `,` sola es decimal (Santiago: `-4280727,00`). Más de 2 decimales significativos → aviso. Las celdas numéricas se convierten con `centavosDeNumero`, que ya existe.
   - **Signo por banco:** Macro, Nación, Santander y Santiago: importe tal cual. Galicia: `créditos − débitos`. BBVA: `|crédito| − |débito|` (como el débito ya viene negativo, `abs` evita invertirlo si algún día viene positivo).
   - **Concepto:** Macro `Concepto`; Galicia `Descripción`; BBVA `Concepto` + ` ` + `Detalle` si no está vacío; Nación `Concepto`; Santander `Concepto`; Santiago `Descripción`. Se hace `trim`. Coinciden con el texto que usa el madre (verifiqué MACRO 599, GALICIA 731 y BSE 560 contra el madre de julio), lo que ayuda a que el reconocimiento de lo ya cargado funcione.
   - **Saldo y orden:** se guarda siempre el saldo **posterior** al movimiento. Nación trae el saldo **previo**, así que se convierte (`saldo + importe`). Si el archivo viene del más nuevo al más viejo (Macro, Nación, Santander) se invierte la lista para dejarla cronológica. Solo BBVA queda con saldo `null`.
   - **Referencia:** Macro `Nro. de Referencia`, Galicia `Número de Comprobante`, BBVA `Número Documento`, Nación `Comprobante`, Santander `Referencia`, Santiago `Nº de Comprobante`. Siempre como texto, sin tocar ceros.

### 3.2 Selector de banco y cuenta al subir

- **Datos:** una lista de cuentas por empresa (tabla nueva, §4). Los nombres siguen el formato de `UNIDAD_POR_CUENTA`: **`MACRO 599`, `GALICIA 731`, `FRANCES 891`** (BBVA se llama `FRANCES` en el mapa y en el madre: renombrarlo rompería la unidad sugerida), **`BSE 560`** (Santiago del Estero), **`BNA 241`**, **`SANTANDER 099`**. La app muestra una etiqueta amigable ("Macro 599 · BBVA Francés 891…"), pero lo que se guarda en `MovimientoBancario.bancoYCuenta` es el nombre canónico. Así `proponerUnidadPorCuenta` funciona sin cambios.
- **Pantalla (`PanelImputacion`):** un `<select>` "Cuenta del extracto" antes del botón de subir, con las cuentas de la empresa de la URL y una primera opción "Archivo madre (trae varias cuentas)". Si el archivo es crudo y no se eligió cuenta, la subida **propone** la que coincide con el número del archivo (si lo trae) y pide confirmarla.
- **Validaciones en el servidor** (el cliente no decide nada):
  1. Archivo madre + cuenta elegida → rechazo ("el archivo madre trae sus propias cuentas; dejá el selector en 'Archivo madre'").
  2. Archivo crudo sin cuenta elegida → pide elegir.
  3. **Banco detectado ≠ banco de la cuenta elegida** → rechazo (ej.: subió un Galicia eligiendo `MACRO 599`).
  4. **Número de cuenta del archivo ≠ cuenta elegida** → rechazo, comparando los dígitos del archivo con la terminación de la cuenta (`…315909409281599` termina en `599`; `069-008609/9` → `0690086099` termina en `099`). **Bloquea**, porque cargar un extracto en la cuenta equivocada es el error más caro y silencioso. Galicia y Nación no traen número: se **avisa** "no se pudo verificar la cuenta".
  5. CUIT del archivo (Macro, BBVA, Santiago) ≠ `Empresa.cuit` de la empresa de la URL → **aviso**, no bloqueo: las cuentas compartidas son legítimas (hoy el aviso de "cuentas compartidas con otra empresa" ya existe y se conserva).
- **Vista previa antes de cargar** (aprobado): la subida primero devuelve un resumen sin escribir nada —banco y cuenta detectados, N filas, rango de fechas, total créditos, total débitos, neto— para que Flavia lo compare con la pantalla del banco y confirme. Reutiliza el mismo patrón de reenvío que ya existe (selector de hoja, cuentas compartidas). Es la mejor defensa para BBVA, que no trae saldo.

### 3.3 El formato madre sigue funcionando

- **Paso 0, antes de tocar nada:** mover el parseo madre actual (lo que hoy está dentro de `subirExtracto`, líneas ~1025–1173) a `lib/extractos/madre.ts` **sin cambiar su comportamiento**, con un test de caracterización que lo fije (fixture sintética de 10–15 filas con las variantes que ya maneja: `Descripcion`/`Desc` de HWC, `CLASIF 2`, `EMPRESA`, fórmulas con `result`, varias hojas). Recién con eso verde se agrega la detección. Hoy ese código no tiene tests y vive en un archivo de 1.653 líneas.
- La detección elige el camino madre solo si la firma coincide; cualquier `.xlsx` que hoy se carga bien sigue entrando por el mismo código. Se acepta además `.xls`/`.csv` en el control de extensión, pero la decisión es por contenido.
- **Una cuenta y período = un solo camino.** Si Kike carga una cuenta por el madre y Flavia la misma cuenta cruda, la clave de reconocimiento (§5) puede no coincidir fila a fila y se duplicarían. La red de seguridad ya existe (`casiDuplicados`: misma cuenta + fecha + importe, avisa) y se reutiliza; la regla de uso la definen Kike y Flavia (K-1).

### 3.4 Lo que se carga y lo que no

Del extracto crudo salen: fecha, concepto, importe, saldo, referencia, causal (Macro `Causal`, Santander `Cod. Operativo`), detalle (BBVA). **No** vienen clasificación ni unidad: la clasificación sigue el motor de leyendas existente (`proponerClasificacionAutomatica`) y si no matchea queda `SIN CLASIFICAR`; la unidad sale de `proponerUnidadPorCuenta(cuenta elegida)`. Faltan en el mapa **`BNA 241`** y **`SANTANDER 099`** (el resto —`MACRO 599`→SPP, `GALICIA 731`→MANTENOR, `FRANCES 891`→LOGISTICA, `BSE 560`→SPP— ya está). Ambas son de **HWC** (lo dicen los nombres de archivo y el CUIT 30711164932 del titular), así que se agregan al mapa como `BNA 241`→HWC y `SANTANDER 099`→HWC. **Pendiente de confirmar con Kike (K-2): ese CUIT es de Handyway Cargo, así que HWC y HANDYWAY probablemente sean la misma unidad. No se cambia nada de eso todavía** (ni `UNIDADES_NEGOCIO`, ni `UNIDAD_POR_RAZON_SOCIAL`, ni `Empresa.unidadesNegocio`).

### 3.5 Dependencia nueva para `.xls` binario (necesita tu aprobación)

ExcelJS no lee BIFF. La opción práctica es **SheetJS (`xlsx`)**, usada **solo** para Macro, BBVA y Nación. Riesgos y condiciones:
- La versión de npm (0.18.5) está abandonada y tiene avisos de seguridad conocidos (prototype pollution, ReDoS). Habría que instalar la versión 0.20.x **desde el tarball oficial de cdn.sheetjs.com, fijada por versión exacta y con hash de integridad**, no desde el registro.
- Se usa con `raw: true`/`cellDates: true` y leyendo `cell.v`, **nunca** el texto formateado (`cell.w`): si no, el redondeo visual del formato de celda sí perdería decimales.
- Solo se invoca si el contenido es OLE2, con límite de tamaño de archivo y de filas.
- Alternativa sin dependencia: pedirle a Flavia que guarde esos 3 como `.xlsx` desde Excel. Es más frágil (un paso manual más) y no cumple "tal cual se descarga".

## 4. Migración (la aplicás vos)

Se necesita una tabla para la lista de cuentas por empresa (hoy no existe en ningún lado). No se agrega columna a `MovimientoBancario`: `bancoYCuenta` sigue siendo el nombre canónico.

Cambio en `prisma/schema.prisma`:

```prisma
model CuentaBancaria {
  id          String   @id @default(uuid())
  empresaId   String
  nombre      String   // canónico, el mismo que bancoYCuenta: "MACRO 599"
  banco       String   // MACRO | GALICIA | FRANCES | BNA | SANTANDER | BSE
  terminacion String   // dígitos finales con los que se valida el número del archivo: "599"
  activa      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  empresa Empresa @relation(fields: [empresaId], references: [id])

  @@unique([empresaId, nombre])
}
```
(y en `Empresa`: `cuentasBancarias CuentaBancaria[]`.)

**`prisma/migrations/20261015120000_agregar_cuenta_bancaria/migration.sql`** (mismo estilo que `20261013120000_agregar_valor_manual_reporte`):

```sql
-- CreateTable
CREATE TABLE "CuentaBancaria" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "terminacion" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuentaBancaria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CuentaBancaria_empresaId_nombre_key" ON "CuentaBancaria"("empresaId", "nombre");

-- AddForeignKey
ALTER TABLE "CuentaBancaria" ADD CONSTRAINT "CuentaBancaria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

**SQL 1 aprobado el 2026-10-15** (el archivo `migration.sql` ya está escrito en el repo; **no se aplicó**, la aplicás vos).

**No hay carga inicial por SQL (decisión 2026-10-15).** Se descartó sembrar las cuentas desde los movimientos ya cargados: la empresa donde se subió un extracto no es necesariamente la dueña de la cuenta (un madre subido en una empresa trae cuentas de otras). La lista inicial la carga ADMIN/FINANZAS a mano desde la pantalla de abajo, con la lista que pase Flavia.

### 4.1 Pantalla `/admin/cuentas-bancarias` (nueva)

Mismo estilo y mismo molde que `/admin/unidades-negocio` (`page.tsx` + formulario cliente + `actions.ts`).
- **Permiso:** solo ADMIN y FINANZAS (`requireAdminOFinanzas`, en la página y en cada Server Action; la página muestra el aviso de permiso denegado igual que la de unidades de negocio).
- **Listado:** agrupado por empresa; por cada cuenta: nombre canónico, banco, terminación y estado (activa / inactiva). Las inactivas se muestran atenuadas, al final.
- **Alta:** empresa (select), **nombre canónico** (ej. `MACRO 599`), **banco** (select cerrado: `MACRO`, `GALICIA`, `FRANCES` —es BBVA—, `BNA`, `SANTANDER`, `BSE`) y **terminación** (solo dígitos).
- **Edición:** nombre, banco y terminación de una cuenta existente. Cambiar el nombre **no reescribe** `MovimientoBancario.bancoYCuenta` de lo ya cargado (son textos guardados): la pantalla lo avisa antes de confirmar.
- **Desactivar / reactivar; no se borra.** Una cuenta inactiva deja de aparecer en el selector de subida, pero sigue existiendo para el historial. No hay acción de borrar.
- **Validaciones (en el servidor, el cliente solo ayuda):**
  1. Nombre normalizado (`normalizarCuenta`: sin tildes, mayúsculas, espacios colapsados) **no repetido dentro de la misma empresa**, contando también las inactivas (si existe una inactiva con ese nombre, se ofrece reactivarla en vez de crear otra). La restricción única de la base (`empresaId, nombre`) es la última red; el nombre se guarda ya normalizado, así que `macro 599` y `MACRO  599` chocan.
  2. Nombre con forma `BANCO NÚMERO` (una palabra, un espacio, dígitos).
  3. El banco del nombre coincide con el banco elegido, y la terminación son los **últimos dígitos del número** del nombre (`MACRO 599` → `599`; `MACRO 8037` → `8037`).
  4. Terminación solo con dígitos, de 3 a 6.
  5. La empresa existe y está activa.
- **Misma cuenta en varias empresas:** se permite (hay cuentas compartidas legítimas; la restricción es por empresa, no global). Si el nombre ya existe en **otra** empresa, la pantalla lo avisa pero no lo bloquea.
- **Mapa de unidades:** la pantalla no toca `UNIDAD_POR_CUENTA` (sigue siendo código). Si se da de alta una cuenta cuyo nombre no está en ese mapa, avisa "esta cuenta no tiene unidad sugerida" (hoy: `BNA 241` y `SANTANDER 099`, a la espera de K-2).
- **Se usa desde el selector de subida** (§3.2): solo cuentas **activas** de la empresa de la URL.
- **Tests:** las reglas de validación van en una función pura (`lib/cuentasBancarias.ts`) con test: nombre repetido (también con distinto uso de mayúsculas, tildes y espacios), forma inválida, banco que no coincide, terminación que no coincide, y desactivar sin borrar.

## 5. Control de saldo y reconocimiento de lo ya cargado con estos formatos

**Control de saldo (`verificarContinuidadSaldo`):**
- Hoy compara cada fila con la anterior **en el orden del archivo** y asume que va del más viejo al más nuevo. Con el lector nuevo las filas llegan **ya en orden cronológico** y con el saldo **posterior** para todos los bancos, así que la misma fórmula (`saldo anterior + importe = saldo`) sirve sin cambios para Galicia, Santander, Santiago y Nación. Se verificó que los 4 archivos reales cierran en cadena con esa convención (§6).
- **Macro sí tiene control** (trae `Saldo` posterior, 17 de 17 enlaces). **Solo BBVA no trae saldo por fila**: el control no es posible y hoy lo trata como "no sé" (no marca ruptura). Para BBVA se usa la **vista previa con totales** (§3.2) y se **avisa en pantalla** "este banco no trae saldo, no se verificó continuidad" para que nadie lo lea como "todo bien".
- Para el madre, el orden se detecta solo (§5.1). Ver el hallazgo de §1.
- Nota: si un extracto crudo se sube **de a tramos** (un día por vez), el control solo mira dentro de cada archivo; el primer saldo de cada archivo no se compara con el último del anterior. Es una limitación que ya existe hoy.

### 5.1 Control de continuidad en cualquier orden (aprobado)

- `verificarContinuidadSaldo` deja de depender del orden del archivo. Pasa a `lib/extractos/continuidad.ts` (pura, testeable) y, por cada cuenta, prueba **cuatro candidatos**: orden del archivo o invertido, y saldo posterior o previo al movimiento. Se queda con el que **menos rupturas** da (empate: orden del archivo y saldo posterior) y reporta qué detectó.
- Con los lectores nuevos el orden y la convención ya vienen normalizados (cronológico, saldo posterior), así que la detección no tiene nada que decidir. Con el madre (sin metadatos) sí decide: el madre de julio da 659/659 rupturas en orden de archivo y 1/659 invertido para MACRO 599 (GALICIA 731: 187/187 y 0/187).
- Si el mejor candidato es `saldo previo` (caso `BNA 497` del madre), no se marca como ruptura: se informa "esta cuenta trae el saldo antes del movimiento". Si ningún candidato cierra, se marcan las rupturas del mejor.
- La cantidad de enlaces (no solo "hay/no hay") queda en el resultado, para distinguir "0 rupturas de 659" de "no verificable".
- **Test pedido:** un caso con el **orden del madre** (más nuevo a más viejo, saldo posterior): cero rupturas y orientación detectada `invertido`; más otro con un saldo roto a propósito (exactamente 1 ruptura), el orden cronológico, y un caso con saldo previo.

**Reconocimiento de lo ya cargado (`claveMovimiento` = fecha + importe + cuenta + concepto + referencia + saldo):**
- Con el lector nuevo la clave es **estable** para un mismo banco: fecha en UTC, importe en centavos exactos, cuenta canónica elegida, concepto con `trim` (la clave ya lo normaliza), referencia como texto, saldo posterior. Resubir el mismo archivo, o el acumulado, no duplica.
- BBVA tiene `saldo = null` en la clave, que es "un valor más" y funciona, pero **discrimina menos** (el madre medía 1 repetida en 16.521 filas con saldo y 142 sin él). Los empates reales (movimientos idénticos el mismo día) los sigue resolviendo el conteo N − M. Para BBVA el riesgo es subir un archivo que se superpone con otro y que filas realmente distintas e idénticas en todo queden contadas de menos: improbable, pero hay que decirlo.
- **Cruce madre ↔ crudo:** los textos coinciden para las cuentas que revisé (Macro, Galicia, Santiago), pero no está garantizado fila por fila (referencias vacías en el madre, saldos de BBVA que Kike calcula y el crudo no tiene, y BNA con saldo previo en el madre). Por eso: una cuenta y período por un solo camino, y el aviso de casi-duplicados como red.
- **Cambio de convención de Nación:** si ya hay filas de una cuenta BNA cargadas por el madre con saldo "previo", las del lector nuevo (saldo "posterior") **no** coincidirán por clave. Hoy solo `BNA 497` está en el madre (7 filas de julio), de otra empresa/cuenta que la 241. Anotado en K-4.

## 6. Tests

**Fixtures sintéticas** (datos inventados, 5–8 filas cada una, en `lib/extractos/__tests__/fixtures/`), una por formato, replicando la estructura real: preámbulo y pie de Macro con celdas combinadas, Débitos/Créditos de Galicia, Crédito/Débito + `Fecha Valor` de BBVA, importes en texto de Nación, latin-1 con paréntesis de Santander, `;` y coma decimal de Santiago. Los binarios `.xls` se generan con un script de desarrollo (`scripts/generar-fixtures-extractos.ts`, usando la misma librería BIFF) y se commitean; el texto latin-1 se escribe con `Buffer.from(…, "latin1")`.

**Tests unitarios (por banco):**
- Detección: cada fixture se reconoce como su banco, y un archivo madre sigue siendo madre.
- Un caso por banco con totales exactos: cantidad de filas, suma de créditos, suma de débitos y saldo final.
- Fechas: `01/10/2026` → 1 de octubre (no 10 de enero); `dd-mm-aaaa` de BBVA; fecha inválida (`31/02`) y fuera de rango → error con número de fila.
- Números: `(74.223,22)`, `$ -36.000.000,00`, `-4280727,00`, `1.234.567,89`, `0,05`, número con 3 decimales (aviso), y un valor tipo `1.005` que no pierda el centavo.
- Orden y saldo: Nación (saldo previo → posterior, lista invertida) y Santander (invertida) terminan en orden cronológico y `verificarContinuidadSaldo` da cero rupturas; romper un saldo a propósito da exactamente una.
- Codificación: archivo latin-1 con `Ú`, `ó`, `º` se lee bien; el mismo texto en UTF-8 también.
- Selector: cuenta que no coincide con el banco, número de archivo distinto de la terminación, archivo madre con cuenta elegida.
- **Madre:** el test de caracterización del paso 0, antes y después del refactor.

**Chequeo contra los archivos reales** (`lib/extractos/__tests__/reales.test.ts`): se **omite** si no está definida la variable `EXTRACTOS_REALES_DIR`; si está, lee los 6 desde esa carpeta (solo lectura, nada se copia) y verifica lo siguiente. **Estos números salen de una lectura independiente en Python, no del lector futuro**; al implementar, el test en TypeScript los reconfirma y, si difieren, se frena y se muestra la diferencia (regla de siempre).

| Archivo | Filas | Créditos | Débitos | Neto | Fechas | Control de saldo |
|---|---:|---:|---:|---:|---|---|
| Macro 599 | 18 | 249.394.579,78 | −97.147.507,82 | 152.247.071,96 | 01/10/2026 | 17 de 17 (más nuevo a más viejo); saldo final 244.999.561,24, inicial implícito 92.752.489,28 |
| Galicia 731 | 7 | 0,00 | −130.731,71 | −130.731,71 | 01/10/2026 | 6 de 6; saldo inicial implícito 15.850.150,10 y final 15.719.418,39 |
| BBVA 891 | 8 | 0,00 | −7.818.630,19 | −7.818.630,19 | 01/10/2026 (Fecha Valor 30/09 en 6 filas) | sin saldo |
| Nación 241 | 7 | 36.196.259,67 | −36.763.379,13 | −567.119,46 | 01–02/10/2026 | 6 de 6 con saldo previo |
| Santander 099 | 25 | 162.352.007,64 | −168.608.301,76 | −6.256.294,12 | 01/10/2026 | 24 de 24 (archivo de más nuevo a más viejo) |
| Santiago 560 | 6 | 4.000.000,00 | −4.306.630,47 | −306.630,47 | 01–02/10/2026 | 5 de 5 |

Además: ninguna fila en $0 (salvo que el archivo la traiga así) y la cantidad de filas del lector igual a la cantidad de filas de datos del archivo.

## 7. Orden de trabajo propuesto

1. **Fase A — lectores puros y control de continuidad en cualquier orden** (`lib/extractos/*`, incluido `continuidad.ts` con el test del orden del madre) + fixtures + tests unitarios + chequeo contra reales. No toca `subirExtracto` ni la base.
2. **Fase B — madre a su módulo** con test de caracterización (cambio sin efecto visible).
3. **Fase C — pantalla de cuentas y luego integración:** primero `/admin/cuentas-bancarias` (§4.1) para que el selector tenga datos; después detección en `subirExtracto`, vista previa, selector en `PanelImputacion`, validaciones de cuenta, extensiones permitidas. Requiere la migración (§4) aplicada por vos y la dependencia (§3.5) aprobada.
4. **Fase D — mapa de unidades (`BNA 241`→HWC, `SANTANDER 099`→HWC), 2 decimales en la tabla**.
5. E2E con Playwright (una sesión temporal, solo si la autorizás), subiendo los fixtures sintéticos, no los reales.

Frenar al terminar cada fase y esperar tu ok.

## 8. Dudas abiertas

**Para Kike**
- **K-1.** (Decidido: una cuenta por un solo camino por período, madre o crudo.) Falta avisarle a Kike y a Flavia.
- **K-2.** `BNA 241` y `SANTANDER 099` son de HWC. El CUIT 30711164932 es de Handyway Cargo: ¿HWC y HANDYWAY son la misma unidad? (Sin cambios hasta que confirme.)
- **K-3.** (Resuelta por el control en cualquier orden, §5.1.) De todos modos: ¿los archivos semanales vienen del más viejo al más nuevo o al revés?
- **K-4.** `BNA 497` en el madre tiene el saldo **antes** del movimiento. ¿Es a propósito? El lector nuevo guardaría el saldo **después** para todos los bancos.
- **K-5.** (Decidido: se bloquea.)

**Para Flavia**
- **F-1.** ¿Qué archivo mostró "1905"? Con estos 6 no lo pude reproducir, y quiero asegurar ese caso.
- **F-2.** Nación: la columna **Saldo**, ¿es el saldo antes o después del movimiento según la pantalla del banco? (Por los números sería "antes".)
- **F-3.** BBVA: ¿hay una descarga con saldo por fila? La que subió no lo trae, y `Saldo:`/`Saldo Disponible:` no cuadran con los movimientos. Sin eso, BBVA queda sin control de continuidad.
- **F-4.** BBVA: ¿alguna vez un débito viene con signo positivo, o un crédito en la columna de débitos (contra-asientos)? El lector asume lo que se ve en el archivo de hoy.
- **F-5.** ¿Descarga siempre un día por archivo o rangos? Cambia qué tan útil es el control de saldo entre archivos.

**Para vos**
- **D-1, D-2, D-3: aprobadas el 2026-10-15** (SheetJS 0.20.x con versión y hash fijos; vista previa con totales y confirmación; 2 decimales en la tabla).
