# Ejecución global (un solo módulo para todo el holding): plan para aprobar

Estado: **solo plan, sin implementar**. Fecha: 2026-10-17.
Origen: reunión con Kike y Flavia del 15/10. Ejecución deja de ser por empresa: se suben todos los extractos por cuenta bancaria, cada movimiento queda asignado a su unidad y no queda nada sin asignar. Presupuesto y Reporte siguen por empresa.

## 0. Decisiones tomadas (2026-10-17)

**Alcance para el lanzamiento del 1/11:** Fases 0, 1, 2, 3 y 4 (opción A). **Fases 5 (cierre provisorio) y 6 quedan para después** (se conservan abajo como referencia, sin implementar).

| Decisión | Resultado |
|---|---|
| D-1 | Sí: semanas por período, con la empresa de origen guardada. |
| D-2 | Renumerar (cerradas por fecha de cierre, abierta al final). |
| D-3 | Permiso de operar Ejecución: Kike (FINANZAS) y Flavia, más ADMIN. Lo cargás vos desde `/admin/usuarios`; ningún SQL lo da. |
| D-4 | Cierre definitivo: solo FINANZAS y ADMIN. Operar (subir, clasificar, asignar) lo hacen también quienes tienen el permiso. |
| D-5 | Sí: bloqueo de valores manuales por semanas del período (global). |
| D-6 | Sin clasificar **solo avisa**; sin unidad de empresa **bloquea** el cierre. |
| D-7 | Sin unidad GOLD: todo Gold va a BRILLANTE. |
| D-8 | Las cuentas de Gold pasan a Brillante. |
| D-9 | Sí: trazabilidad de Ignorar (quién y cuándo). |
| D-10 | Sacar "Quitar". |
| D-11 | Sí (ver visibilidad de saldo abajo, que lo reemplaza: solo quienes operan, ADMIN y FINANZAS). |
| D-12 | No aplica (sin cierre provisorio). |
| D-13 | Opción A: tardíos marcados, cuentan en la semana abierta en que aparecen; lo cerrado no se toca. La opción B no entra. |
| D-14 | Fase 1 antes que Fase 2. |

**Otras decisiones:**
- **Semana que cruza de mes:** se corta por mes. Cada período tiene sus propias semanas; la subida de un extracto que trae días de dos meses reparte sus filas en la semana abierta de **cada** mes según la fecha del movimiento (ver §3.4).
- **EXPENSAS:** unidad **y** empresa aparte, con presupuesto propio (Kike arma un presupuesto global de expensas). El reparto entre empresas es manual con prorrateo (K-G1 resuelta).
- **HWC y HANDYWAY son la misma unidad (confirmado por Kike):** la razón social HANDYWAY mapea a HWC y la unidad HANDYWAY deja de existir como propia. Entra en la Fase 1 (§4.3).
- **Visibilidad para gerentes** (usuarios sin permiso de operar), ADMIN y FINANZAS ven todo:
  - En Ejecución ven **solo los movimientos cuya unidad (o porción de prorrateo) es de su empresa**, vengan de la cuenta que vengan. Nunca movimientos de otras unidades ni saldos de cuentas bancarias.
  - En el Reporte **no ven los bloques Disponibilidades ni Cierre** (saldo, capital de trabajo, disponible): solo Ingresos y Egresos.
  - Esos datos **no se envían al navegador** (se filtran en el servidor, no se ocultan en pantalla). Detalle en §6.
- **Verificación del SQL (corrección):** nada de `migrate diff --from-schema-datasource` (se conecta a la base). Se usa `--from-schema-datamodel` contra el schema de HEAD guardado en un archivo temporal (ver reglas).

**Reglas de siempre** (de `docs/reporte_etapa2a_plan.md` y `docs/lector_bancos_plan.md`), válidas para toda la implementación:
- Nada de `migrate dev`, `migrate reset` ni `db push`; nunca una base real como shadow DB. Las migraciones y los SQL de datos de este plan **los aplicás vos**, con el comando que apruebes. Para controlar que el SQL coincide con el schema, **sin conectarse a ninguna base**: guardar el schema de HEAD en un archivo temporal (`git show HEAD:prisma/schema.prisma > <carpeta temporal>/schema_head.prisma`) y correr `prisma migrate diff --from-schema-datamodel <carpeta temporal>/schema_head.prisma --to-schema-datamodel prisma/schema.prisma --script`. Nunca `--from-schema-datasource`, nunca shadow DB.
- No mostrar URLs ni contraseñas de bases. No commit ni push hasta que apruebes el diff.
- Si se levanta el dev server, al final verificar por PID que quedó cerrado.
- No crear sesiones, usuarios ni permisos en ninguna base sin preguntar (la prueba E2E necesita tu ok aparte). Ningún SQL de este plan da permisos a nadie.
- Si un test contra datos reales no cierra, **no se ajusta la expectativa**: se frena y se muestra la diferencia.
- Frenar al terminar cada fase y esperar tu ok.

Fuente: lectura del código actual (`prisma/schema.prisma`, `app/[empresa]/[periodo]/ejecucion/*`, `lib/ejecucion.ts`, `lib/reporte.ts`, `lib/reporte/valoresManuales.ts`, `lib/auth.ts`, `lib/unidadesNegocio.ts`, `app/admin/cuentas-bancarias/*`). **No consulté ninguna base**: las cantidades reales (semanas, duplicados, dependencias de Gold) salen de los SELECT de diagnóstico de §2, que corrés vos.

---

## 1. Cómo funciona hoy (lo que cambia)

| Pieza | Hoy | Problema con el pedido de Kike |
|---|---|---|
| Semana | `EjecucionSemanal` cuelga de `PresupuestoMensual` (empresa + período). `@@unique([presupuestoId, numeroSemana])`. Una semana abierta por empresa y período. No tiene rango de fechas: es "lo que se cargó entre dos cierres". | Un banco que mezcla unidades (LI, CREAR) se sube en UNA empresa; Flavia tendría que separarlo por fuera. |
| Subida | Se entra eligiendo empresa; el selector muestra solo las cuentas de esa empresa. Reconocimiento de lo ya cargado: por presupuesto (empresa + período). Lock por presupuesto. Flujo extra de "cuentas compartidas" con otras empresas. | Con un módulo global, el reconocimiento y el lock tienen que ser globales; el flujo de cuentas compartidas deja de tener sentido. |
| `CuentaBancaria` | `empresaId` obligatorio, `@@unique([empresaId, nombre])` (la misma cuenta puede estar en dos empresas). | La cuenta pasa a ser del holding; la empresa queda como titular, opcional. |
| Permiso de operar | `UsuarioEmpresa.puedeOperarEjecucion`, por empresa. | Hace falta un permiso global. |
| Real del Reporte | Ya suma por unidad, desde los extractos de **todas** las empresas, solo semanas CERRADAS, por **período de la semana** (`pm.periodo`), no por fecha del movimiento. | No cambia la lógica; solo cambia de dónde sale el período (columna propia de la semana). |
| Bloqueo de valores manuales del Reporte | `semanasDeEmpresa`: semanas abiertas y cerradas de **la empresa**. | Pasa a ser semanas del período (globales). |
| Cierre | Sin chequeos obligatorios; avisa (no bloquea) si hay movimientos con unidad sin empresa. | Kike quiere que no quede nada sin asignar: el aviso pasa a ser bloqueo. |
| Ignorar / Quitar | Menú por fila: "Ignorar" (ya es reversible: el botón pasa a "Reactivar") y "Quitar" (borra la fila; puede reaparecer al volver a subir el extracto, porque el reconocimiento cuenta las filas que hay). | Ver §5. |
| Saldo | Se guarda, pero **la tabla no tiene columna de saldo**. | Ver §6. |

---

## 2. Fase 0 — Diagnóstico (solo lectura, lo corrés vos en cada base) · Tamaño: S

Antes de cualquier migración. Son todos `SELECT`; ninguno escribe. **Las consultas completas, listas para pegar en el SQL Editor de Neon, están en `docs/ejecucion_global_diagnostico.sql`** (mismo contenido que D1–D6 de abajo).

**D1. Semanas existentes por período y empresa** (para ver cómo quedan numeradas las de Kike):
```sql
SELECT pm.periodo, e.nombre AS empresa, es."numeroSemana", es.estado, es."fechaCierre",
       COUNT(mb.id)::int AS movimientos
FROM "EjecucionSemanal" es
JOIN "PresupuestoMensual" pm ON pm.id = es."presupuestoId"
JOIN "Empresa" e ON e.id = pm."empresaId"
LEFT JOIN "MovimientoBancario" mb ON mb."ejecucionId" = es.id
GROUP BY pm.periodo, e.nombre, es."numeroSemana", es.estado, es."fechaCierre"
ORDER BY pm.periodo, (es.estado = 'ABIERTA'), es."fechaCierre" NULLS LAST, e.nombre, es."numeroSemana";
```

**D2. El mismo movimiento cargado en dos empresas en el mismo período** (al juntar todo en un módulo quedarían duplicados; hoy, si están en semanas cerradas, ya se suman dos veces en el Real):
```sql
SELECT pm.periodo, upper(btrim(mb."bancoYCuenta")) AS cuenta, mb.fecha::date AS fecha, mb.importe,
       mb.concepto, COUNT(*)::int AS filas, COUNT(DISTINCT pm."empresaId")::int AS empresas,
       array_agg(DISTINCT es.estado::text) AS estados
FROM "MovimientoBancario" mb
JOIN "EjecucionSemanal" es ON es.id = mb."ejecucionId"
JOIN "PresupuestoMensual" pm ON pm.id = es."presupuestoId"
GROUP BY pm.periodo, upper(btrim(mb."bancoYCuenta")), mb.fecha::date, mb.importe, mb.concepto
HAVING COUNT(DISTINCT pm."empresaId") > 1
ORDER BY pm.periodo, cuenta, fecha;
```

**D3. Cuentas bancarias con el mismo nombre en más de una empresa** (bloquean la restricción única global de §3.2):
```sql
SELECT c.nombre, COUNT(*)::int AS veces, array_agg(e.nombre || CASE WHEN c.activa THEN '' ELSE ' (inactiva)' END) AS empresas
FROM "CuentaBancaria" c JOIN "Empresa" e ON e.id = c."empresaId"
GROUP BY c.nombre HAVING COUNT(*) > 1;
```

**D4. Qué cuelga de Gold Seguridad, y si EXPENSAS ya tiene empresa:**
```sql
SELECT e.nombre, e.activo, e."unidadesNegocio",
  (SELECT COUNT(*) FROM "PresupuestoMensual" p WHERE p."empresaId" = e.id)::int AS presupuestos,
  (SELECT COUNT(*) FROM "LineaPresupuesto" l JOIN "PresupuestoMensual" p ON p.id = l."presupuestoId" WHERE p."empresaId" = e.id)::int AS lineas,
  (SELECT COUNT(*) FROM "EjecucionSemanal" s JOIN "PresupuestoMensual" p ON p.id = s."presupuestoId" WHERE p."empresaId" = e.id)::int AS semanas,
  (SELECT COUNT(*) FROM "MovimientoBancario" m JOIN "EjecucionSemanal" s ON s.id = m."ejecucionId" JOIN "PresupuestoMensual" p ON p.id = s."presupuestoId" WHERE p."empresaId" = e.id)::int AS movimientos,
  (SELECT COUNT(*) FROM "CuentaBancaria" c WHERE c."empresaId" = e.id)::int AS cuentas,
  (SELECT COUNT(*) FROM "UsuarioEmpresa" u WHERE u."empresaId" = e.id)::int AS usuarios,
  (SELECT COUNT(*) FROM "ValorManualReporte" v WHERE v."empresaId" = e.id)::int AS valores_manuales
FROM "Empresa" e
WHERE e.nombre ILIKE '%gold%' OR e.nombre ILIKE '%expensa%' OR 'EXPENSAS' = ANY(e."unidadesNegocio");
```

**D5. Unidades guardadas que no son de ninguna empresa** (lo que hoy quedaría "sin asignar" y bloquearía el cierre de §3.5):
```sql
SELECT upper(btrim(mb."unidadNegocio")) AS unidad, es.estado, COUNT(*)::int AS movimientos
FROM "MovimientoBancario" mb JOIN "EjecucionSemanal" es ON es.id = mb."ejecucionId"
WHERE NOT mb.ignorado
  AND NOT EXISTS (SELECT 1 FROM "Empresa" e WHERE upper(btrim(mb."unidadNegocio")) = ANY(e."unidadesNegocio"))
GROUP BY 1, 2 ORDER BY 3 DESC;
```

**D6. Cuántos movimientos tienen hoy la unidad HANDYWAY** (por estado de semana; más el desglose y las empresas que la tienen asignada). Alimenta §4.3:
```sql
SELECT 'movimientos' AS donde, es.estado::text AS estado, COUNT(*)::int AS cantidad,
       COUNT(*) FILTER (WHERE mb.ignorado)::int AS ignorados
FROM "MovimientoBancario" mb JOIN "EjecucionSemanal" es ON es.id = mb."ejecucionId"
WHERE upper(btrim(mb."unidadNegocio")) = 'HANDYWAY'
GROUP BY es.estado
UNION ALL
SELECT 'prorrateo (porciones)', es.estado::text, COUNT(*)::int, 0
FROM "MovimientoBancarioDesglose" d
JOIN "MovimientoBancario" mb ON mb.id = d."movimientoId"
JOIN "EjecucionSemanal" es ON es.id = mb."ejecucionId"
WHERE upper(btrim(d."unidadNegocio")) = 'HANDYWAY'
GROUP BY es.estado
UNION ALL
SELECT 'empresa con HANDYWAY: ' || e.nombre, '-', 1, 0
FROM "Empresa" e WHERE 'HANDYWAY' = ANY(e."unidadesNegocio")
UNION ALL
SELECT 'empresa con HWC: ' || e.nombre, '-', 1, 0
FROM "Empresa" e WHERE 'HWC' = ANY(e."unidadesNegocio")
ORDER BY 1, 2;
```

Con D1–D6 en la mano se confirma el SQL de las Fases 1 y 2 antes de escribir código. **Si D2 trae filas en semanas ABIERTAS, se resuelven antes de la migración** (ignorar o quitar la copia sobrante); si las trae en semanas cerradas, no se tocan (regla de Vigo) y se listan para Kike.

---

## 3. Fase 2 — Ejecución global (imprescindible) · Tamaño: L

> Numeración: la Fase 1 (unidades, §4) va antes porque el cierre "sin nada sin asignar" necesita que EXPENSAS tenga empresa. Si Kike tarda en responder, la Fase 2 puede ir primero con el cierre en modo aviso (ver §3.5).

### 3.1 Semanas globales por período (recomendado)

**Propuesta:** la semana deja de colgar de la empresa y pasa a colgar del **período**:
- `EjecucionSemanal.periodo` (nuevo, `"AAAA-MM"`, obligatorio).
- `@@unique([periodo, numeroSemana])` reemplaza a `@@unique([presupuestoId, numeroSemana])`.
- `presupuestoId` pasa a ser **opcional** y queda solo como **origen histórico** de las semanas cargadas antes del cambio ("Semana 1 · cargada en Correo/SPP"). Las semanas nuevas lo tienen en `NULL`.
- Sigue habiendo **una sola semana abierta por período** (lo controla el código, con lock por período).
- La semana sigue sin rango de fechas (contenedor de lo cargado entre cierres), igual que hoy. Ver duda K-G4.

Alternativa descartada: semanas globales en una tabla nueva y las viejas por empresa en paralelo. Duplica consultas del Reporte y del bloqueo, y deja dos maneras de ver lo mismo.

### 3.2 Cuentas bancarias del holding

- `CuentaBancaria.empresaId` pasa a ser **opcional** y significa **empresa titular** (solo se usa para el aviso de CUIT del archivo). La unidad de cada movimiento sigue saliendo del mapa por cuenta, no de la titular.
- `nombre` pasa a ser **único global** (`@@unique([nombre])`), porque al subir ya no se elige empresa: el selector muestra todas las cuentas activas. Requiere que D3 venga vacío (si no, desactivar o renombrar la repetida a mano antes).
- `/admin/cuentas-bancarias`: el listado deja de agrupar por empresa (columna "Titular"), el alta permite titular vacío, y la validación de nombre repetido pasa a ser global.

### 3.3 Permiso global para operar

- `Usuario.operaEjecucion` (nuevo, default `false`). ADMIN opera siempre (mismo bypass que hoy).
- Lo edita ADMIN en `/admin/usuarios`. **La migración no le da el permiso a nadie** (ni copia `UsuarioEmpresa.puedeOperarEjecucion`, que queda sin uso pero no se borra). D-3: Kike (FINANZAS) y Flavia, más ADMIN; lo cargás vos desde la pantalla.
- `requireOperadorEjecucion(empresaId)` se reemplaza por `requireOperadorEjecucionGlobal()` (operar) y `requireCierreEjecucion()` (cierre definitivo: **solo FINANZAS y ADMIN**, D-4; Flavia opera pero no cierra).

### 3.4 Pantallas y flujo

- **Módulo nuevo** `/ejecucion/[periodo]/[numeroSemana]` (fuera de `[empresa]`), con entrada desde la página de inicio para quien opera o es ADMIN/FINANZAS. `/ejecucion/[periodo]` resuelve o crea la semana abierta del período (solo para quien opera, igual que hoy).
- **Subir extracto:** se elige la cuenta (todas las activas) y el resto del lector queda igual. Cambios en `subirExtracto`:
  - lock por período (`hashtext('ejecucion:' || periodo)`) en vez de por presupuesto;
  - reconocimiento de lo ya cargado **por cuenta, en todos los períodos**, acotado al rango de fechas del archivo (hoy es por empresa y período: un extracto acumulativo que trae días del mes anterior los volvería a cargar). Esto además resuelve la mitad de §7;
  - el control "una cuenta por un solo camino por período" pasa a ser global;
  - se elimina el flujo de "cuentas compartidas" (`buscarCuentasCompartidas`): ya no hay otra empresa contra la cual comparar;
  - CUIT del archivo vs. CUIT de la titular de la cuenta (si tiene titular).
- **Semana que cruza de mes (decidido):** un extracto que trae días de dos meses reparte sus filas por la **fecha del movimiento**: cada fila va a la semana abierta de **su** mes (se crea si no existe). La vista previa muestra el reparto ("septiembre: N filas; octubre: M filas"). Excepción: un movimiento cuya fecha cae en un mes con todas las semanas cerradas entra como **tardío** en la semana abierta del mes **actual** (Fase 4), nunca en la cerrada.
- **Pestaña "Ejecución financiera" de cada empresa:** queda como **vista de solo lectura filtrada** (decidido): solo los movimientos del período (semanas cerradas y la abierta, marcadas) cuya unidad, o porción de prorrateo, pertenece a la empresa, vengan de la cuenta que vengan. **Sin saldo, sin movimientos de otras unidades y sin datos de cuentas de otras unidades** (§6). Lo filtra la consulta del servidor. Para quien opera (o ADMIN/FINANZAS), un enlace "Operar en Ejecución global".
- **Reporte, bloques por rol (decidido):** quien no es ADMIN ni FINANZAS **no recibe** los bloques Disponibilidades ni Cierre (saldo, capital de trabajo, disponible): el motor no los calcula ni los serializa para ese usuario, solo Ingresos y Egresos. Hoy ese corte es solo de pantalla en parte (las marcas K ya se limitan por rol); acá se hace en el servidor y con test. La pantalla de carga de valores manuales de Disponibilidades queda también para ADMIN/FINANZAS.
- **Reporte:** las consultas de `lib/reporte.ts` (`clasificacionesDeRubros`, `calcularRealPorRubro`, `calcularRealPorClasificacion`, `contarSemanasCerradasPorPeriodo`) pasan de `JOIN PresupuestoMensual … pm.periodo` a `es.periodo`. **El resultado del Real no cambia** (ya suma todas las empresas). `calcularNoAsignadoDelExtracto` deja de ser "de los extractos de esta empresa" y pasa a ser el no asignado del período, visible solo a ADMIN/FINANZAS (con el cierre bloqueante debería quedar vacío salvo semanas viejas).
- **Bloqueo de valores manuales** (`semanasDeEmpresa`, `esMesCerrado`): pasa a contar las semanas **del período**. Cambio de significado a confirmar (D-5): hoy un mes de Radio queda "cerrado" cuando Radio no tiene semanas abiertas; después, cuando el período no tiene ninguna semana abierta.

### 3.5 Cierre semanal

Lo cierra **solo FINANZAS o ADMIN** (D-4). Antes de cerrar, en el servidor:
1. **Bloquea** si hay movimientos no ignorados cuya unidad no pertenece a ninguna empresa (`SIN ASIGNAR`, valores viejos, HANDYWAY si no se migra), contando las porciones de prorrateo. Muestra la lista con un enlace al filtro que las trae (§5).
2. **Solo avisa** (D-6) si quedan `SIN CLASIFICAR` o sugerencias de unidad/clasificación sin confirmar: pide confirmación con la cantidad.
3. Guarda quién y cuándo (ya existe).

Como la Fase 1 va antes (D-14), EXPENSAS ya tiene empresa cuando se activa el bloqueo.

### 3.6 Migración de los datos existentes (no se pierde ninguna semana cerrada)

Qué hace, por período:
- Las semanas **CERRADAS** de cada empresa (las de Kike: SPP y Radio de septiembre en testing) **quedan tal cual**: mismos movimientos, misma clasificación, unidad, prorrateo, ignorados, adjuntos, `fechaCierre` y `cerradoPorId`. Solo cambia su número dentro del período (orden por fecha de cierre) y conservan `presupuestoId` como origen. Ejemplo: si en septiembre SPP cerró primero, queda "Semana 1 (cargada en Correo/SPP)" y Radio "Semana 2 (cargada en Radio)".
- Las semanas **ABIERTAS** de todas las empresas del período se **juntan en una sola semana global abierta** (se mueven los movimientos, con todo lo que tienen). Como están abiertas, se pueden juntar sin violar la regla de Vigo. Las abiertas vacías se borran.
- La semana global abierta queda con el número siguiente a las cerradas.
- El Real del Reporte no cambia (suma por período y unidad, sin mirar la semana). Lo que sí cambia es el bloqueo de §3.4 (D-5).

**Cambios en `prisma/schema.prisma`:**
```prisma
model Usuario {
  // …
  // Permiso GLOBAL de operar Ejecución (subir, clasificar, asignar, cerrar). ADMIN opera siempre.
  operaEjecucion Boolean @default(false)
}

model PresupuestoMensual {
  // …
  semanas   EjecucionSemanal[]   // solo semanas viejas (origen histórico)
}

model EjecucionSemanal {
  id             String          @id @default(uuid())
  periodo        String          // "AAAA-MM": la semana es del período, de todo el holding
  // Origen histórico: empresa en la que se cargó la semana antes de Ejecución global.
  // NULL en las semanas globales.
  presupuestoId  String?
  numeroSemana   Int
  estado         EstadoEjecucion @default(ABIERTA)
  fechaCierre    DateTime?
  cerradoPorId   String?
  createdAt      DateTime        @default(now())

  // onDelete explícito: en una relación opcional Prisma asume SetNull y el diff
  // querría recrear la FK.
  presupuesto PresupuestoMensual? @relation(fields: [presupuestoId], references: [id], onDelete: Restrict)
  movimientos MovimientoBancario[]

  @@unique([periodo, numeroSemana])
}

model CuentaBancaria {
  id          String   @id @default(uuid())
  empresaId   String?  // empresa TITULAR (opcional): solo para el aviso de CUIT
  nombre      String   @unique
  // … resto igual
  empresa Empresa? @relation(fields: [empresaId], references: [id], onDelete: Restrict)
}
```

**`prisma/migrations/20261020120000_ejecucion_global/migration.sql`** (orden importa; correr D1–D3 antes):
```sql
-- 1. Permiso global (no se le da a nadie)
ALTER TABLE "Usuario" ADD COLUMN "operaEjecucion" BOOLEAN NOT NULL DEFAULT false;

-- 2. Semanas: período propio, presupuesto opcional
ALTER TABLE "EjecucionSemanal" ADD COLUMN "periodo" TEXT;
UPDATE "EjecucionSemanal" es SET "periodo" = pm.periodo
FROM "PresupuestoMensual" pm WHERE pm.id = es."presupuestoId";
ALTER TABLE "EjecucionSemanal" ALTER COLUMN "periodo" SET NOT NULL;
ALTER TABLE "EjecucionSemanal" ALTER COLUMN "presupuestoId" DROP NOT NULL;
DROP INDEX "EjecucionSemanal_presupuestoId_numeroSemana_key";

-- 3. Una semana global ABIERTA por período que hoy tenga semanas abiertas con movimientos
INSERT INTO "EjecucionSemanal" ("id", "periodo", "presupuestoId", "numeroSemana", "estado", "createdAt")
SELECT gen_random_uuid()::text, es."periodo", NULL, 100000, 'ABIERTA', CURRENT_TIMESTAMP
FROM "EjecucionSemanal" es
WHERE es."estado" = 'ABIERTA' AND es."presupuestoId" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "MovimientoBancario" mb WHERE mb."ejecucionId" = es.id)
GROUP BY es."periodo";

-- 4. Mover los movimientos de las abiertas por empresa a la abierta global de su período
UPDATE "MovimientoBancario" mb SET "ejecucionId" = g.id
FROM "EjecucionSemanal" vieja, "EjecucionSemanal" g
WHERE mb."ejecucionId" = vieja.id
  AND vieja."estado" = 'ABIERTA' AND vieja."presupuestoId" IS NOT NULL
  AND g."periodo" = vieja."periodo" AND g."estado" = 'ABIERTA' AND g."presupuestoId" IS NULL;

-- 5. Borrar las abiertas por empresa (ya vacías). Las CERRADAS no se tocan.
DELETE FROM "EjecucionSemanal" es
WHERE es."estado" = 'ABIERTA' AND es."presupuestoId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "MovimientoBancario" mb WHERE mb."ejecucionId" = es.id);

-- 6. Renumerar por período: cerradas por fecha de cierre, la abierta al final
WITH orden AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "periodo"
    ORDER BY ("estado" = 'ABIERTA'), "fechaCierre" NULLS LAST, "createdAt", id
  ) AS n
  FROM "EjecucionSemanal"
)
UPDATE "EjecucionSemanal" es SET "numeroSemana" = orden.n FROM orden WHERE orden.id = es.id;

CREATE UNIQUE INDEX "EjecucionSemanal_periodo_numeroSemana_key" ON "EjecucionSemanal"("periodo", "numeroSemana");

-- 7. Cuentas del holding: titular opcional, nombre único global (requiere D3 vacío)
ALTER TABLE "CuentaBancaria" ALTER COLUMN "empresaId" DROP NOT NULL;
DROP INDEX "CuentaBancaria_empresaId_nombre_key";
CREATE UNIQUE INDEX "CuentaBancaria_nombre_key" ON "CuentaBancaria"("nombre");
```
Notas:
- La FK `EjecucionSemanal_presupuestoId_fkey` (ON DELETE RESTRICT) y la de `CuentaBancaria` no se tocan; el `onDelete: Restrict` del schema es para que el diff no quiera recrearlas.
- Si lo aplicás a mano (no con `migrate deploy`), envolvelo en `BEGIN; … COMMIT;` para que sea todo o nada. Con `migrate deploy`, sin `BEGIN/COMMIT`.
- Control después de aplicar (solo lectura): `SELECT periodo, COUNT(*) FILTER (WHERE estado='ABIERTA') AS abiertas FROM "EjecucionSemanal" GROUP BY periodo HAVING COUNT(*) FILTER (WHERE estado='ABIERTA') > 1;` tiene que venir vacío, y la cantidad total de `MovimientoBancario` tiene que ser la misma que antes.
- Orden de aplicación: local → testing (donde están las semanas de Kike) → producción, con D1–D3 en cada una.

### 3.7 Tests
- Funciones puras nuevas (numeración, reconocimiento global por cuenta, chequeo de cierre) con test.
- Test de caracterización del Reporte: mismo Real antes y después del cambio de consulta, con las fixtures de julio/agosto.
- E2E (con tu ok para la sesión, según la regla): subir un extracto de una cuenta mixta, asignar dos unidades, cerrar, ver el Real en los dos reportes.

---

## 4. Fase 1 — EXPENSAS como unidad y empresa, Gold dentro de Brillante, HANDYWAY = HWC · Tamaño: S–M

### 4.1 EXPENSAS
Hoy `EXPENSAS` es unidad de la lista pero no pertenece a ninguna empresa: no entra en ningún Real y aparece como "No asignado". Propuesta: **crear la empresa "Expensas"** con la unidad `EXPENSAS`. Así tiene Presupuesto y Reporte propios (Reporte genérico de Fase 1, sin plantilla PF, hasta que Kike pase el formato) y deja de bloquear el cierre.

SQL de datos (lo aplicás vos; correr D4 antes: ninguna empresa tiene que tener ya `EXPENSAS`):
```sql
INSERT INTO "Empresa" ("id", "nombre", "activo", "unidadesNegocio", "createdAt")
SELECT gen_random_uuid()::text, 'Expensas', true, ARRAY['EXPENSAS']::text[], CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Empresa" WHERE "nombre" = 'Expensas')
  AND NOT EXISTS (SELECT 1 FROM "Empresa" WHERE 'EXPENSAS' = ANY("unidadesNegocio"));
```
El acceso de usuarios a "Expensas" lo das vos desde `/admin/usuarios` (no se crea ningún permiso por SQL).

**Decidido:** Expensas es unidad y empresa aparte, con presupuesto propio (Kike arma un presupuesto global de expensas). El reparto entre empresas (K2 de julio: Conexión 55,2M, Brillante 33,2M, …) es **manual con prorrateo** por movimiento: no se automatiza.

### 4.2 Gold Seguridad → Brillante
- El mapa por razón social ya manda `GOLD SEGURIDAD` → `BRILLANTE`, y la plantilla de Brillante ya dice que la unidad incluye Gold.
- Si D4 muestra que Gold no tiene presupuestos, semanas, movimientos ni valores manuales: **desactivarla** (deja de aparecer en el inicio y su URL da "no encontrada"; los datos quedan):
  ```sql
  UPDATE "Empresa" SET "activo" = false
  WHERE "nombre" = 'Gold Seguridad' AND cardinality("unidadesNegocio") = 0;
  ```
  **Decidido (D-8):** las cuentas de Gold pasan a Brillante (correr **antes** del `UPDATE` de desactivar): `UPDATE "CuentaBancaria" SET "empresaId" = (SELECT id FROM "Empresa" WHERE "nombre" = 'Brillante') WHERE "empresaId" = (SELECT id FROM "Empresa" WHERE "nombre" = 'Gold Seguridad');` (D-8).
  Si tiene presupuestos o movimientos, **no se mueve nada por SQL**: se frena y se decide (choca con el único empresa + período de Brillante).
- **Decidido (D-7): sin unidad `GOLD`.** Todo Gold va a BRILLANTE (el mapa de razón social ya lo hace). Las filas "Otros Operaciones (GOLD SALTA)" y "Gastos Gold Seguridad" de la plantilla de Brillante siguen como hoy (`SIN_REAL`, presupuesto manual). No hay cambio en el motor del Reporte.

### 4.3 HWC y HANDYWAY son la misma unidad (confirmado por Kike)
Cambios de código (no de base):
- `UNIDAD_POR_RAZON_SOCIAL`: `"HANDYWAY"` → `"HWC"` (hoy → `HANDYWAY`).
- `UNIDADES_NEGOCIO`: se saca `HANDYWAY` de la lista cerrada (el selector y la validación de `actualizarMovimiento` / `guardarDesgloseMovimiento` dejan de ofrecerla). Un valor viejo `HANDYWAY` no rompe la fila (el selector lo muestra como opción extra, como ya pasa con `CREAR`).
- `UNIDAD_POR_CUENTA`: ninguna cuenta apunta a HANDYWAY (ya están `BNA 241`, `SANT 099`, `FRANCES 525`, `MACRO 833`, `MACRO 918` → HWC). Se verifica con test.
- `/admin/unidades-negocio`: HANDYWAY deja de poder asignarse a una empresa.
- Los tests de `lib/__tests__/unidadesNegocio.test.ts` que mencionen HANDYWAY se actualizan (cambio de regla confirmado por Kike, no un ajuste para que cierre).

**Datos ya cargados con HANDYWAY:** D6 en testing dio **0 movimientos y 0 porciones** con HANDYWAY, y HANDYWAY no está en ninguna empresa. **No hay SQL de datos para esto** (ni alias de lectura, ni D-15): es solo cambio de código. Si en producción D6 diera filas, se reabre este punto (lo cerrado no se toca).

### 4.4 Resultados del diagnóstico en TESTING (2026-10-17) y Fase 1 implementada
- D1: cerradas Conexión Logística/SPP sem 1 (2698 mov., 22/9) y Radio sem 1 (263, 23/9). Abiertas con movimientos: Fredy sem 1 (37), Gold sem 1 (6), HWC sem 1 (176): prueba fallida de Flavia con extractos crudos anteriores al lector. Nada en 2026-10.
- D2 y D3: vacías. D4: solo Gold (activo, sin unidades, 1 presupuesto sin líneas, 1 semana, 6 movimientos, 0 cuentas, 2 usuarios, 0 valores manuales); no existe la empresa Expensas. D5: SIN ASIGNAR 200 en abiertas y 18 en cerradas (las 18 cerradas no se tocan: el bloqueo del cierre mira solo la semana que se cierra). D6: sin HANDYWAY.
- **Decisión:** se borran los movimientos de esas 3 semanas abiertas (prueba, confirmado); lo cerrado no se toca. SQL en `docs/ejecucion_global_limpieza_testing.sql` (vista previa 37/6/176, borrado protegido que frena si algún conteo no coincide o hay adjuntos; las semanas y presupuestos no se borran).
- **SQL de la Fase 1:** `docs/ejecucion_global_fase1.sql` (Expensas con la unidad EXPENSAS, usuarios de Gold con acceso a Brillante sin permisos de operar/revisar, cuentas de Gold a Brillante, Gold desactivada). Sin migración de schema.
- **Código de la Fase 1 (hecho, sin commit):** HANDYWAY sale de `UNIDADES_NEGOCIO` y la razón social HANDYWAY mapea a HWC (`lib/unidadesNegocio.ts`), tests actualizados, y `Expensas` agregada al seed. Un valor viejo HANDYWAY seguiría viéndose como opción extra.
- **Orden en testing:** limpieza → SQL de la Fase 1. La unidad EXPENSAS ya queda asignada a la empresa por el INSERT (no hace falta pasar por `/admin/unidades-negocio`).
- Pendiente de tu lado tras el SQL: dar acceso a la empresa Expensas a quien arme su presupuesto (K-G10) desde `/admin/usuarios`.
- Nota: las plantillas de las 5 empresas con fila "Expensas" siguen con Real sin calcular (`SIN_REAL`); el reparto manual por prorrateo de EXPENSAS a cada empresa no aparece en esas filas hasta que se defina (el pendiente K2 sigue visible a ADMIN/FINANZAS).

---

## 5. Fase 3 — Tabla: filtros, Ignorar, Quitar · Tamaño: M

### 5.1 Filtros
En la URL (como el `?filtro=sin_clasificar` que ya existe), aplicados **en la consulta** (no sobre la página): totales, cantidad y paginación se recalculan sobre lo filtrado.
- Clasificación (varias), unidad (varias, incluida "sin asignar a empresa"), cuenta (varias), fecha desde/hasta, importe desde/hasta (sobre el valor con signo; atajo "solo débitos / solo créditos"), texto en concepto.
- Estado: ignorados, sugeridos sin confirmar, prorrateados, tardíos (§7).
- **Asignar unidad a todos los filtrados** (con confirmación y cantidad): es lo que hace práctico separar LI y CREAR sin ir fila por fila. Solo en la semana abierta.

### 5.2 Ignorar (reversible)
Ya es reversible en la semana abierta ("Reactivar"). Se agrega:
- filtro "ver solo ignorados" y contador en el encabezado;
- trazabilidad (D-9, aprobada): `ignoradoPorId` y `ignoradoEn`, para ver quién y cuándo;
- en semanas cerradas no se puede reactivar (regla de Vigo); se explica en la pantalla.

### 5.3 Quitar
Hoy borra la fila y, si se vuelve a subir el extracto, la fila vuelve (el reconocimiento cuenta las filas que hay). Se presta a confusión con Ignorar.
**Decidido (D-10): se elimina "Quitar"** del menú y se saca `eliminarMovimiento` de la interfaz. Como la Fase 6 (Deshacer carga) queda para después, el borrado real, si hiciera falta (archivo subido en la cuenta equivocada), lo resolvés vos con SQL puntual y fila por fila, nunca desde la pantalla. La Server Action se deja restringida a ADMIN y solo en semana abierta, o se borra del código (se define al implementar).

SQL de la trazabilidad (aprobada), `20261022120000_ignorado_trazabilidad`:
```sql
ALTER TABLE "MovimientoBancario" ADD COLUMN "ignoradoPorId" TEXT;
ALTER TABLE "MovimientoBancario" ADD COLUMN "ignoradoEn" TIMESTAMP(3);
```

---

## 6. Visibilidad por rol: saldo, otras unidades, Disponibilidades · Tamaño: S–M (va con la Fase 3)

Quién ve qué (D-11 y decisión de visibilidad):

| Dato | ADMIN / FINANZAS / con `operaEjecucion` | Gerente (sin permiso de operar) |
|---|---|---|
| Columna Saldo y cuentas bancarias | Sí | **No**: ni la columna ni el saldo en los datos |
| Movimientos | Todos | Solo los de **su empresa por unidad** (o porción de prorrateo), vengan de la cuenta que vengan |
| Banco/cuenta de cada movimiento | Sí | Se envía el banco **solo si** hace falta para su fila; nunca saldos ni totales de la cuenta |
| Reporte: Ingresos y Egresos | Sí | Sí |
| Reporte: Disponibilidades y Cierre (saldo, capital de trabajo, disponible) | Sí | **No** |

Reglas de implementación (todas en el servidor, con test):
- `mapearMovimiento` recibe un flag `verSaldo`; si es falso, el campo `saldo` **no existe** en el objeto que viaja al cliente (no `null`, no oculto por CSS).
- La consulta del gerente filtra por unidad (movimientos no prorrateados) o por porción de prorrateo (movimientos prorrateados, mostrando **solo su porción**, no las de otras unidades ni el importe total). Totales y paginación se calculan sobre lo filtrado.
- Los avisos de continuidad de saldo, "sin unidad asignada", panel de sugerencias y las cuentas del selector son solo del módulo global (operadores).
- Reporte: ver §3.4. El Real de Ingresos y Egresos sigue idéntico para todos.
- BBVA no trae saldo por fila: celda vacía para quienes lo ven.

---

## 7. Fase 4 — Movimientos tardíos del Macro · Tamaño: S–M

Qué pasa hoy: el Macro publica algunos gastos días después, con la fecha original. En la subida siguiente esas filas no están cargadas, así que entran **en la semana abierta** con su fecha real (que cae en una semana ya cerrada). El Real las cuenta en el **período de la semana donde entran**, no en el de su fecha. Eso ya respeta la regla de Vigo, pero no se ve.

**Decidido (D-13): opción A.** Entra en la semana abierta, marcado TARDÍO, y cuenta en el período donde entra. Lo cerrado no se toca. Al subir, una fila nueva cuya fecha es igual o anterior al último día de esa cuenta ya cargado en una semana cerrada (o cuyo mes ya no tiene semana abierta) se marca `tardio = true`. La vista previa avisa "N movimientos con fecha de semanas ya cerradas ($X)", hay filtro "tardíos" y la columna fecha lo señala. Con el corte por mes (§3.4), un tardío de septiembre subido en octubre va a la semana abierta de **octubre**.
- Fuera de alcance: B (línea informativa en el Reporte) y C (esperar al definitivo; depende del cierre provisorio, Fase 5).
- Descartadas: reabrir la semana cerrada, o imputar por fecha al mes cerrado (cambia números cerrados).

Necesario para A, aunque se elija otra: el reconocimiento global por cuenta de §3.4. Hoy, con el reconocimiento por empresa y período, un extracto acumulativo de octubre que repite días de septiembre ya cargados los volvería a cargar.

SQL (opción A), `20261024120000_movimiento_tardio`:
```sql
ALTER TABLE "MovimientoBancario" ADD COLUMN "tardio" BOOLEAN NOT NULL DEFAULT false;
```
(Se guarda al cargar, no se recalcula: el corte de la cuenta cambia con cada cierre.)

---

## 8. Fase 5 — Cierre provisorio · Tamaño: M · **DIFERIDA: no entra en el lanzamiento del 1/11** (D-12 no aplica)

Se conserva el diseño como referencia, sin implementar. Estados: **ABIERTA → PROVISORIA → CERRADA**.
- **Provisorio** (lo hace quien opera): la semana deja de recibir subidas (las nuevas van a una semana abierta nueva) pero **se pueden corregir** clasificación, unidad, prorrateo e ignorados. El Reporte la muestra como "provisorio" (D-12: si suma en el Real marcado como provisorio, o no suma hasta el definitivo).
- **Definitivo** (D-4: quien opera, o solo ADMIN/FINANZAS): mismo chequeo de §3.5. Después, nada se toca.
- Puede haber a la vez una semana provisoria y una abierta en el mismo período; nunca dos abiertas.
- Para el bloqueo de valores manuales del Reporte, provisoria cuenta como abierta.

SQL, `20261027120000_cierre_provisorio`:
```sql
ALTER TYPE "EstadoEjecucion" ADD VALUE 'PROVISORIA' BEFORE 'CERRADA';
ALTER TABLE "EjecucionSemanal" ADD COLUMN "fechaCierreProvisorio" TIMESTAMP(3);
ALTER TABLE "EjecucionSemanal" ADD COLUMN "cerradoProvisorioPorId" TEXT;
```
(`ADD VALUE` no puede usarse en la misma transacción que lo agrega: esta migración no escribe datos, así que no hay problema.)

---

## 9. Fase 6 — Deseable · Tamaño: M–L · **DIFERIDA: no entra en el lanzamiento del 1/11**

1. **Deshacer carga por archivo:** tabla `CargaExtracto` (cuenta, nombre de archivo, hash, quién, cuándo, filas) y `MovimientoBancario.cargaId`. Permite borrar una carga entera mientras su semana está abierta, y reemplaza a "Quitar".
2. **Mapa cuenta → unidad en la base**, editable en `/admin/cuentas-bancarias` (hoy `UNIDAD_POR_CUENTA` está en el código y cada cambio de Flavia es un commit).
3. **Reglas concepto → unidad** para cuentas mixtas (ej. un proveedor que siempre es de MANTENOR en una cuenta de CREAR), como sugerencia que se confirma en lote.
4. (Unidad `GOLD`: descartada, D-7.)

---

## 10. Orden y tamaños

| Fase | Qué | Alcance 1/11 | Tamaño | Migración |
|---|---|---|---|---|
| 0 | Diagnóstico D1–D6 | **Sí** | S | no (solo SELECT) |
| 1 | EXPENSAS empresa, Gold → Brillante, HANDYWAY = HWC | **Sí** | S–M | SQL de datos |
| 2 | Ejecución global, permisos, cierre (solo FINANZAS/ADMIN), corte por mes, visibilidad de gerentes y Reporte sin Disponibilidades/Cierre para ellos | **Sí** | L | sí (§3.6) |
| 3 | Filtros, asignar en lote, Ignorar con trazabilidad, sacar Quitar, saldo por rol | **Sí** | M | sí, chica (§5.3) |
| 4 | Tardíos (opción A) | **Sí** | S | sí, chica |
| 5 | Cierre provisorio | Después | M | sí, chica |
| 6 | Deshacer carga, mapa en la base, reglas | Después | M–L | sí |

S ≈ medio día, M ≈ 1–2 días, L ≈ 3–5 días de trabajo, sin contar pruebas E2E con tu ok. Orden: 0 → 1 → 2 → 3 → 4, frenando al terminar cada fase. **Riesgo de calendario:** la Fase 2 es la más grande y toca el Reporte; si el 1/11 aprieta, lo último que se puede sacar sin romper nada es la Fase 4 (los tardíos entrarían igual en la semana abierta, solo que sin marca).

## 11. Decisiones

Todas las D-1 a D-14 están resueltas en §0. Una nueva, condicionada a D6:
- **D-15** (solo si D6 muestra HANDYWAY en semanas cerradas y sin empresa): ¿se dejan como están (cerrado no se toca) o se corrigen en el período siguiente?

## 12. Dudas para Kike

Resueltas: K-G1 (expensas: empresa aparte, reparto manual), K-G2 (Gold dentro de Brillante), K-G4 (corte por mes), K-G5 (tardíos cuentan donde aparecen), K-G6 (gerentes ven solo su unidad), K-G7 (sin unidad bloquea, sin clasificar avisa), K-G8 (HWC = HANDYWAY).

Siguen abiertas:
- **K-G3.** ¿Cuántos días suele tardar el Macro en mostrar los gastos atrasados? (solo informativo; sin cierre provisorio en el lanzamiento).
- **K-G9.** Un gerente que tiene varias empresas (ej. Brillante y Mantenor), ¿ve en Ejecución las unidades de todas sus empresas juntas o una por una? (el plan asume una por una, según la pestaña de cada empresa).
- **K-G10.** Expensas: ¿quién carga y valida el presupuesto global de Expensas y qué usuarios lo ven?
