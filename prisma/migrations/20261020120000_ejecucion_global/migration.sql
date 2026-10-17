-- Ejecución global (docs/ejecucion_global_plan.md §3.6). Se aplica con migrate deploy (sin BEGIN/COMMIT).
-- Antes de aplicar, en cada base: D1–D3 de docs/ejecucion_global_diagnostico.sql (D3 vacío).

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
