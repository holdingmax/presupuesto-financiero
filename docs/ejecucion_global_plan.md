# Ejecución global (un solo módulo para todo el holding): plan para aprobar

Estado: **solo plan, sin implementar**. Fecha: 2026-10-17.
Actualización 2026-10-22: **§13 — Pantalla de control diario (pedido de Flavia)**, plan aprobado con el orden de entregas 1a → 1a-bis → 1b → empresa en el desplegable → Detalle → Detalle 2.
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

---

## 13. Pantalla de control diario (pedido de Flavia, 19–22/10) · Plan aprobado 2026-10-22

Estado: **aprobado, sin implementar**. Reemplaza, para la tabla de Ejecución global, lo que §5.1 decía de los filtros (acá están acotados a lo que pidió Flavia). Lo demás de §5 (Ignorar con trazabilidad, sacar Quitar) sigue como estaba.

Marcas: **[C]** confirmado en el código (archivo:línea a la fecha del plan), **[P]** parcial, **[PEND]** pendiente. Las líneas pueden correrse cuando se edite: buscar por el nombre de la función.

### 13.0 Reglas para quien implemente

- Una entrega por vez, en este orden: **1a → 1a-bis → 1b → empresa en el desplegable → Detalle → Detalle 2**. Cada una es un commit aparte y se frena a esperar el ok del diff. **Sin commit ni push sin ok.**
- No tocar ninguna base (ni local, ni testing, ni producción). No crear sesiones ni usuarios. No correr `prisma migrate` ni `db push`. Ninguna entrega necesita migración.
- Next 16: antes de usar una API de Next, leer `node_modules/next/dist/docs/` (ver `AGENTS.md`).
- No tocar `prisma/scripts/medicion-*.ts` ni `prisma/scripts/verificar-detalle-bbva.ts`: son de la medición y se reusan después de 1a-bis.
- Verificación por entrega: `npm test` y `npx tsc --noEmit`. El build completo y el E2E los decide la usuaria.
- No mostrar nunca URLs ni contraseñas de bases.

### 13.1 Contexto y medición (2026-10-22)

Lo que pidió Flavia: ver en cada fila fecha, banco y cuenta, concepto tal como figura en el extracto, importe, clasificación, unidad de negocio y prorrateo. Sobre todo, ver **concepto, importe y clasificación completos y juntos**: hoy se cortan, por ejemplo "COM Y GTOS BR" y "TRANSF ZOSSI,PAB 2016686…". Además pidió una columna Detalle de texto libre, filtros y el orden del extracto (el orden por saldo ya está hecho, commit 8e35a61).

Volumen: ~1.800 movimientos por día en todo el holding; Panini hasta ~900 un lunes y ~2.800 por semana. La semana de la pantalla global es de todo el holding, así que puede tener ~9.000 filas **[C]** (las semanas son del período, no de la empresa: `prisma/schema.prisma:180-198`).

Medición local (rama Neon `medicion-2099`, semana sintética de 3.000 filas, páginas de 200; los tiempos incluyen la latencia PC→Neon):
- Página: ~1,6 MB de HTML y ~19.000 elementos, igual en la primera y en la última; ~5–6 s.
- Edición de una fila: la respuesta pesa ~332 KB y trae "MED2099" 1.453 veces, es decir, casi toda la pantalla recalculada; ~5,7 s.
- Memoria del servidor: pico de 202 MB (una persona, 3 páginas, 3 ediciones; tope probado 400 MB).
- **[PEND]** La medición con volumen real se hace en **testing con Render**, leyendo métricas y mirando la pantalla. Los scripts de medición no se corren contra testing.

Por qué una edición devuelve todo **[C]**: `actualizarMovimiento` termina con `revalidarSemana` (`app/ejecucion/actions.ts:1205`), que llama a `revalidatePath` (`app/ejecucion/actions.ts:84-87`). En Next 16, una Server Function que revalida la ruta abierta *"Updates the UI immediately"* (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md:19`). Eso vuelve a correr:
- el orden por saldo sobre la semana entera (`lib/ejecucionVista.ts:22-39`);
- los totales y los paneles (`app/ejecucion/actions.ts:181-210`);
- los chequeos (`app/ejecucion/[periodo]/[numeroSemana]/page.tsx:79`).

Por qué la página pesa tanto **[P]**: cada fila trae dos `<select>` con todas sus opciones. Clasificación: ~22 sugeridas más las que haya en la base (`lib/clasificaciones.ts:153-164`). Unidad: 12 (`lib/unidadesNegocio.ts:25-38`). Son ~95 elementos por fila; estimo que la mitad o dos tercios son opciones. No está medido.

### 13.2 Entrega 1a — Vista de control · Tamaño: M

Objetivo: que Flavia vea, sin cortes, concepto, importe y clasificación juntos, con la tabla arriba y a todo el ancho.

**Qué cambia**

1. **Ancho completo.** El contenedor de `PanelImputacion` hoy es `max-w-7xl`/`max-w-5xl` (`app/ejecucion/PanelImputacion.tsx:413`) **[C]**. La sección de la tabla pasa a ocupar todo el ancho con margen chico (por ejemplo `max-w-none px-4`). El encabezado y el bloque de subida pueden quedar como están. Lo mismo en la rama de solo lectura de `app/ejecucion/[periodo]/[numeroSemana]/page.tsx` (contenedores con `max-w-7xl`/`max-w-5xl`) y en el selector de semanas de esa página.
2. **Orden de columnas** (pedido de Flavia): Fecha · Banco y cuenta · Concepto · Importe · Saldo (solo si `mostrarSaldo`) · Clasificación · Unidad de negocio · Prorrateo · ⋯ (menú, solo editable). Hoy el orden es Fecha · Concepto · Banco · Importe · Saldo · Clasificación · Unidad · ⋯ (`app/ejecucion/TablaMovimientos.tsx:236-254`) **[C]**.
3. **Prorrateo como columna propia.** El tilde "Prorratea" sale de la celda de Unidad (`app/ejecucion/TablaMovimientos.tsx:370-388`) **[C]** y pasa a su propia columna, con la misma lógica (`alTildarProrrateo`). El resumen "HAVANNA 60% · RADIO 40%" (`ResumenProrrateo`) sigue reemplazando al select de Unidad, como hoy. En solo lectura, la columna Prorrateo se muestra vacía o con "sí". `totalColumnas` (`app/ejecucion/TablaMovimientos.tsx:207`) se ajusta a la columna nueva, porque lo usa la fila del panel de prorrateo (`:402-414`).
4. **Concepto sin cortar.** Hoy `truncate` con `max-w-[12rem]`/`max-w-xs` y el texto completo en el tooltip (`app/ejecucion/TablaMovimientos.tsx:270-272`) **[C]**. Pasa a ajustarse en varias líneas (`whitespace-normal break-words`, ancho mínimo ~18rem) y se saca el `title`. Fecha, Banco, Importe y Saldo quedan en una sola línea.
5. **Clasificación sin cortar.** Se saca el ancho fijo `w-36`/`w-40` del select (`app/ejecucion/TablaMovimientos.tsx:296`) **[C]**: un `<select>` nativo sin ancho toma el de su opción más larga, así que todos quedan iguales y completos. No se usa tooltip.
6. **Filas compactas.** Celdas `py-2` → `py-1`, selects `py-1` → `py-0.5`, letra ~13 px. Que el foco de los controles siga visible.
7. **Encabezado fijo.** La caja de la tabla hoy es `overflow-x-auto` (`app/ejecucion/PanelImputacion.tsx:775`) **[C]**: dentro de una caja así, `sticky` no se pega al borde de la ventana. La caja pasa a `overflow-auto` con alto máximo (por ejemplo `max-h-[calc(100vh-12rem)]`). El `thead` queda `sticky top-0` con fondo sólido y `z-index` por encima de los selects. Lo mismo en la rama de solo lectura (`page.tsx`, caja `border-t … overflow-x-auto`).
8. **Paneles plegables, con la tabla arriba.** Hoy, encima de la tabla están `PanelSugerenciasPendientes`, `PanelUnidadesSugeridas` y `PanelChequeos` (`app/ejecucion/PanelImputacion.tsx:751-767`) **[C]**. Se agrupan en **una barra** cerrada por defecto, con contadores; por ejemplo: "Sugerencias de clasificación (N) · Unidades sugeridas (N cuentas) · Chequeos (N no dan $0)". Cada contador abre su panel, que funciona igual que hoy. El aviso de movimientos sin unidad de empresa (bloquea el cierre) sigue visible como una línea. `AlertaContinuidadSaldo` sigue apareciendo después de subir un extracto.
9. **Paginación arriba y abajo** de la tabla (`app/ejecucion/Paginacion.tsx`, sin cambiar su lógica).

**Qué NO cambia en 1a:** el orden de las filas (`idsEnOrdenDeVista`, `lib/ejecucionVista.ts:22-39`), `FILAS_POR_PAGINA = 200` (`lib/ejecucionVista.ts:10`), las Server Actions, los datos que viajan y los filtros.

**Archivos:** `app/ejecucion/TablaMovimientos.tsx`, `app/ejecucion/PanelImputacion.tsx`, `app/ejecucion/[periodo]/[numeroSemana]/page.tsx`. También revisar la vista de solo lectura de cada empresa, que usa la misma tabla (`app/[empresa]/[periodo]/ejecucion/[numeroSemana]/page.tsx:160`) **[C]**, y su contenedor.

**Riesgos:**
- El menú ⋯ de las últimas filas puede quedar recortado por la caja con scroll. Abrirlo hacia arriba en esas filas.
- Concepto en dos líneas: las filas pasan a tener alto variable. No cambia el orden.
- **[PEND]** En monitores angostos con Saldo puede haber scroll horizontal dentro de la caja.

**Verificación:**
- `npm test`: `lib/__tests__/ordenSaldo.test.ts` y `lib/__tests__/ejecucionVista.test.ts` tienen que pasar sin cambios. Además `npx tsc --noEmit`.
- **En pantalla:** columnas en el orden pedido; "COM Y GTOS BRIOS" y "TRANSF ZOSSI,PAB…" completos; el encabezado queda fijo al bajar; la barra de paneles cerrada; al abrir cada panel funciona igual, incluido "Confirmar las N"; un día de una cuenta en el mismo orden que antes; la página 2 sigue funcionando.
- **En testing:** lo mismo con una semana real.

**Fuera de 1a:** selects livianos (crear el `<select>` recién al hacer foco, para bajar el peso de la página **[P]**): se evalúa **después del 1/11**, según lo que muestre testing.

### 13.3 Entrega 1a-bis — Corregir una fila sin recalcular la pantalla · Tamaño: S–M · commit propio

1. **Servidor.** En `actualizarMovimiento` (`app/ejecucion/actions.ts:1151-1206`) no llamar a `revalidarSemana` cuando se edita clasificación o unidad (después también detalle y detalle 2). Se mantiene para `ignorado`. La acción devuelve `{ ok: true } | { ok: false, error }`.
   - **[P]** Las páginas son dinámicas porque leen la sesión con `cookies()` (`lib/auth.ts:51`), así que la próxima carga trae lo nuevo. Se confirma repitiendo la medición: las apariciones de "MED2099" en la respuesta de la edición tienen que bajar a ~0.
2. **Pantalla.** `guardarCampo` hoy usa `startTransition` y no espera la respuesta (`app/ejecucion/PanelImputacion.tsx:341-345`) **[C]**. Pasa a esperar el resultado y, si falla, marca la celda y vuelve al valor anterior. Esto es obligatorio: sin el recálculo, un error de guardado quedaría escondido.
3. **Paneles.** Botón "Actualizar paneles" en la barra de 1a (hace `router.refresh()`), y un aviso "hay cambios sin reflejar en los paneles" después de la primera edición. El botón queda deshabilitado mientras haya guardados pendientes, por la carrera con el `useEffect` que vuelve a cargar las filas (`app/ejecucion/PanelImputacion.tsx:120-121`) **[P]**.

**Qué queda desactualizado hasta "Actualizar"** **[C]**:
- contadores de sugerencias de clasificación (`actions.ts:1202`);
- unidades sugeridas (`actions.ts:1195`);
- chequeos suma-cero (`actions.ts:415-420`);
- aviso "sin unidad de empresa" (`actions.ts:198-201`).

El Total no cambia con estas ediciones. El cierre no pierde seguridad: vuelve a contar todo en el servidor (`actions.ts:1497`) **[C]**.

**Verificación:**
- Repetir `prisma/scripts/medicion-navegador-2099.ts` en `medicion-2099`: tienen que bajar mucho los KB y las apariciones.
- **En pantalla:** editar, recargar y ver el valor guardado.
- Error a propósito: con la semana cerrada desde otra pestaña, la celda tiene que marcar el error.

**Por qué antes del 1/11:** es chico, es la mejora más grande que mostró la medición, y Detalle y Detalle 2 (texto escrito a mano) multiplicarían el costo de cada edición.

### 13.4 Entrega 1b — Filtros: clasificación, fecha, unidad y "solo sugeridas" · Tamaño: M

- **En la URL** (como `?filtro=sin_clasificar`, que se mantiene): `clasif` (una o varias), `fecha` (AAAA-MM-DD), `unidad` y `sugeridas=1`. Se aplican **en la consulta**: el total, la cantidad y la paginación se calculan sobre lo filtrado.
- **`idsEnOrdenDeVista`** (`lib/ejecucionVista.ts:22-39`) hoy filtra **después** de ordenar, solo para "sin clasificar" **[C]**. Pasa a recibir un objeto de filtros y sigue filtrando después de ordenar la semana entera, para no cortar la cadena de saldo. Hay que sumar `sugeridaPorSistema`, `unidadNegocio` y los prorrateos a lo que lee (`:26`).
- **Totales:** los dos `aggregate` (`app/ejecucion/actions.ts:181-188`) con el mismo filtro.
- **Unidad con prorrateo:** incluir el movimiento si su unidad propia (cuando no tiene prorrateo) o alguna porción es de esa unidad, como `filtroDeUnidades` (`lib/ejecucionVista.ts:105-114`) **[C]**. **[PEND]** Falta decidir si el Total filtrado suma solo la porción (`sumarImporteDeUnidades`, `:117`) o el importe completo.
- **Paginación:** `Paginacion.tsx` hoy conserva solo `filtro` **[C]**; tiene que conservar todos los parámetros. El enlace `href="?filtro=sin_clasificar"` (`app/ejecucion/PanelImputacion.tsx:741`) pisa los demás parámetros **[C]**.
- **Paneles:** siguen calculándose sobre la semana entera (`actions.ts:191-195`). Decirlo en la pantalla.
- **Tests:** `idsEnOrdenDeVista` con cada filtro, sin cortar la cadena de un día.
- **Si hay atraso:** se cae primero el filtro de unidad y después "solo sugeridas".

### 13.5 Empresa en el desplegable de cuenta · Tamaño: S · decidido, sin preguntas

- **Etiqueta:** `"<cuenta> · <titular>"` si la cuenta tiene `empresaId`. Si no, `"<cuenta> · <unidad madre>"` con `proponerUnidadPorCuenta` (`lib/unidadesNegocio.ts:145-147`; por ejemplo `MACRO 689` → `RADIO`, `:90`). Si no tiene ninguna de las dos, solo el nombre. El **valor** de la opción sigue siendo el nombre de la cuenta: la subida no cambia.
- **Archivos:** consulta de cuentas en `obtenerDatosSemana` (`app/ejecucion/actions.ts:235-239`, sumar `empresa: { select: { nombre: true } }`) y opciones en `app/ejecucion/PanelImputacion.tsx:502-504` **[C]**.
- **[C]** El script de carga dejó `empresaId` siempre vacío (`prisma/scripts/cargar-cuentas-bancarias.ts:3`, `:133`). **[PEND]** Cuántas tienen titular hoy: ver la consulta Q1 en §13.8.

### 13.6 Entrega Detalle · Tamaño: S–M

- **Qué es:** texto libre que escribe Flavia. Para PROV Y SERV, el proveedor; para impuestos, el nombre del impuesto; etc. Columna junto a Clasificación.
- **Se edita** con el mismo patrón que Clasificación y Unidad, con las mismas reglas: solo semana abierta y solo quien opera.
  - Celda propia con borrador local: se guarda al salir del campo o con Enter; Escape vuelve al valor anterior. Tope de 200 caracteres; si queda vacío, se guarda null.
  - Aviso "completar" si está vacío en las 7 clasificaciones de Flavia. **[PEND]** Faltan los nombres exactos de dos (Q2).
- **Archivos:**
  - `actualizarMovimiento`: sumar `detalle` y copiar **solo los campos permitidos**; hoy guarda con `data: { ...datos }` (`app/ejecucion/actions.ts:1194`) **[C]**.
  - `mapearMovimiento` (ya manda `detalle`, `lib/ejecucionVista.ts:91`).
  - Tipos en `TablaMovimientos.tsx:153-175` y `PanelImputacion.tsx:43-58`.
  - Función pura de normalización con tests.
- **Hechos:**
  - **[C]** No hace falta migración (`prisma/schema.prisma:242`).
  - **[C]** No lo leen el Reporte, el cierre, el motor de sugerencias ni la clave de reconocimiento de filas.
  - **[C]** Volver a subir un extracto no lo pisa: solo se insertan filas nuevas (`app/ejecucion/actions.ts:1093-1117`).
- **BBVA:**
  - **[C]** El lector guarda el DETALLE del banco en `detalle` y lo agrega al final del concepto (`lib/extractos/bancos/bbva.ts:46-56`).
  - **[P]** Con el extracto real hubo 8 filas, 4 con detalle y 0 con el detalle fuera del final del concepto: una muestra chica.
  - **Se mantiene como está:** las filas de BBVA van a aparecer con ese texto ya cargado en Detalle.
- **Riesgos:** si una fila se Quita y vuelve con una nueva subida, vuelve sin detalle. Si hay filas del madre en semanas abiertas, se ven con su DETALLE (`lib/extractos/madre.ts:38-43`).

### 13.7 Entrega Detalle 2 · Tamaño: S (encima de Detalle) · se cae primero si hay atraso

- **Qué es:** Detalle = proveedor; Detalle 2 = descripción del pago. Mismo patrón y mismas reglas que Detalle.
- **[C]** Hoy `detalle2` no llega a la pantalla (`lib/ejecucionVista.ts:47-100`). Lo escribe solo el madre (`lib/extractos/madre.ts:43`, `:253`; `app/ejecucion/actions.ts:1112`). En los extractos crudos queda vacío (`actions.ts:880`).
- No hace falta migración (`prisma/schema.prisma:243`).
- **[PEND]** De dónde sale el dato (pregunta para Flavia).

### 13.8 Consultas de solo lectura (las corre la usuaria)

```sql
-- Q1a. Cuentas activas con y sin empresa titular.
SELECT COUNT(*) FILTER (WHERE "empresaId" IS NOT NULL) AS con_titular,
       COUNT(*) FILTER (WHERE "empresaId" IS NULL)     AS sin_titular,
       COUNT(*)                                        AS total
FROM "CuentaBancaria"
WHERE activa;

-- Q1b. Detalle por cuenta (titular vacío = se mostrará la unidad madre del código).
SELECT cb.nombre AS cuenta, e.nombre AS titular
FROM "CuentaBancaria" cb
LEFT JOIN "Empresa" e ON e.id = cb."empresaId"
WHERE cb.activa
ORDER BY cb.nombre;

-- Q2. Nombres exactos de las clasificaciones de Detalle (préstamos, tarjetas y las otras 5),
--     en movimientos y en presupuesto, con cantidad de filas.
SELECT 'movimientos' AS origen, clasificacion, COUNT(*) AS filas
FROM "MovimientoBancario"
WHERE clasificacion ILIKE ANY (ARRAY['%PREST%', '%TARJ%', '%TC%', '%CRED%', '%FCI%', '%TRANSF%', '%PROV%', '%IMP%', '%CHEQ%', '%CH %'])
GROUP BY clasificacion
UNION ALL
SELECT 'presupuesto', clasificacion, COUNT(*)
FROM "LineaPresupuesto"
WHERE clasificacion ILIKE ANY (ARRAY['%PREST%', '%TARJ%', '%TC%', '%CRED%', '%FCI%', '%TRANSF%', '%PROV%', '%IMP%', '%CHEQ%', '%CH %'])
GROUP BY clasificacion
ORDER BY 2, 1;
```

### 13.9 Orden de recorte si hay atraso

1. Detalle 2
2. Filtro de unidad
3. Filtro "solo sugeridas"
4. Selects livianos (ya fuera del 1/11)

No se recortan: 1a, 1a-bis, filtros de clasificación y fecha, Detalle y empresa en el desplegable.

### 13.10 Preguntas abiertas

**Flavia:**
1. ¿CHEQUES lleva Detalle (beneficiario)?
2. Detalle 2: ¿de dónde sale el dato? ¿Lo escribe a mano?
3. ¿Le sirve "Actualizar paneles" (1a-bis)?
4. ¿Qué monitor y resolución usa?
5. ¿"MACRO 599" le alcanza como banco y número de cuenta?
6. ¿Dónde quiere Detalle y Detalle 2: junto a Clasificación o al final?

**Kike:**
1. Filtro de unidad con prorrateos: ¿el Total filtrado suma solo la porción o el importe completo?
2. **[C]** Las sugerencias sin confirmar no bloquean el cierre, solo generan un aviso (`lib/cierreEjecucion.ts:64-66`), y al cerrar el Reporte las cuenta igual que las confirmadas (`lib/reporte.ts:65`). ¿Se mantiene así? Fuera de este plan.
3. ¿Los gerentes ven Detalle y Detalle 2 en la vista de su empresa?
4. **[PEND]** Tope de 1.000 filas por archivo (`lib/extractos/limites.ts:12`): ¿algún extracto de una sola cuenta lo supera?

**Pendiente de la medición:** volumen real en testing con Render. La rama `medicion-2099` y los scripts `prisma/scripts/medicion-*.ts` / `verificar-detalle-bbva.ts` **se conservan** para repetir la medición después de 1a-bis. Al final se borran la semana 2099-01, los scripts y Playwright (`npm uninstall playwright --no-save`).
