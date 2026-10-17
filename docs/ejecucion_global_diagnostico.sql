-- Ejecución global, Fase 0: diagnóstico. SOLO SELECT, ninguna escribe.
-- Correr UNA consulta por vez en el SQL Editor de Neon, en cada base (local, testing, producción).
-- Plan: docs/ejecucion_global_plan.md (§2).

-- ============================================================
-- D1. Semanas existentes por período y empresa
-- ============================================================
SELECT pm.periodo, e.nombre AS empresa, es."numeroSemana", es.estado, es."fechaCierre",
       COUNT(mb.id)::int AS movimientos
FROM "EjecucionSemanal" es
JOIN "PresupuestoMensual" pm ON pm.id = es."presupuestoId"
JOIN "Empresa" e ON e.id = pm."empresaId"
LEFT JOIN "MovimientoBancario" mb ON mb."ejecucionId" = es.id
GROUP BY pm.periodo, e.nombre, es."numeroSemana", es.estado, es."fechaCierre"
ORDER BY pm.periodo, (es.estado = 'ABIERTA'), es."fechaCierre" NULLS LAST, e.nombre, es."numeroSemana";

-- ============================================================
-- D2. Mismo movimiento cargado en más de una empresa en el mismo período
-- ============================================================
SELECT pm.periodo, upper(btrim(mb."bancoYCuenta")) AS cuenta, mb.fecha::date AS fecha, mb.importe,
       mb.concepto, COUNT(*)::int AS filas, COUNT(DISTINCT pm."empresaId")::int AS empresas,
       array_agg(DISTINCT es.estado::text) AS estados
FROM "MovimientoBancario" mb
JOIN "EjecucionSemanal" es ON es.id = mb."ejecucionId"
JOIN "PresupuestoMensual" pm ON pm.id = es."presupuestoId"
GROUP BY pm.periodo, upper(btrim(mb."bancoYCuenta")), mb.fecha::date, mb.importe, mb.concepto
HAVING COUNT(DISTINCT pm."empresaId") > 1
ORDER BY pm.periodo, cuenta, fecha;

-- ============================================================
-- D3. Cuentas bancarias con el mismo nombre en más de una empresa
-- ============================================================
SELECT c.nombre, COUNT(*)::int AS veces,
       array_agg(e.nombre || CASE WHEN c.activa THEN '' ELSE ' (inactiva)' END) AS empresas
FROM "CuentaBancaria" c JOIN "Empresa" e ON e.id = c."empresaId"
GROUP BY c.nombre HAVING COUNT(*) > 1;

-- ============================================================
-- D4. Qué cuelga de Gold Seguridad y si EXPENSAS ya tiene empresa
-- ============================================================
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

-- ============================================================
-- D5. Movimientos cuya unidad no es de ninguna empresa (bloquearían el cierre)
-- ============================================================
SELECT upper(btrim(mb."unidadNegocio")) AS unidad, es.estado, COUNT(*)::int AS movimientos
FROM "MovimientoBancario" mb JOIN "EjecucionSemanal" es ON es.id = mb."ejecucionId"
WHERE NOT mb.ignorado
  AND NOT EXISTS (SELECT 1 FROM "Empresa" e WHERE upper(btrim(mb."unidadNegocio")) = ANY(e."unidadesNegocio"))
GROUP BY 1, 2 ORDER BY 3 DESC;

-- ============================================================
-- D6. Cuántos movimientos tienen hoy la unidad HANDYWAY
--     (por estado de semana; más prorrateos y empresas que tienen HANDYWAY / HWC)
-- ============================================================
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
