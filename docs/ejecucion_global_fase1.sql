-- Ejecución global, FASE 1 (datos): EXPENSAS como empresa, Gold Seguridad dentro de Brillante.
-- NO se ejecuta desde el repo: lo corrés vos en el SQL Editor de Neon. Orden probado para TESTING
-- (resultados de D1–D6 del 2026-10-17); en otra base, correr antes D4 y mirar los PASO 0.
-- Cada sentencia es idempotente (se puede repetir sin duplicar). No hay migración de schema en la Fase 1.
-- HANDYWAY→HWC no lleva SQL: D6 dio 0 movimientos y 0 porciones; es solo cambio de código (mapa y lista).
-- Los permisos de los usuarios de Gold se copian SIN operar Ejecución ni revisar Presupuesto
-- (quedan en false: el que los dé, vos, desde /admin/usuarios).

-- ============================================================
-- PASO 0. Vista previa (solo SELECT)
-- ============================================================
-- 0.a Las dos empresas existen y no hay ya una "Expensas".
SELECT nombre, activo, "unidadesNegocio" FROM "Empresa"
WHERE nombre IN ('Gold Seguridad', 'Brillante', 'Expensas') OR 'EXPENSAS' = ANY("unidadesNegocio")
ORDER BY nombre;

-- 0.b Usuarios de Gold y si ya tienen Brillante (esperado: 2 usuarios de Gold).
SELECT u.nombre, u.email, u.rol, u.activo,
       ue."puedeOperarEjecucion" AS gold_opera, ue."puedeRevisarPresupuesto" AS gold_revisa,
       EXISTS (SELECT 1 FROM "UsuarioEmpresa" x JOIN "Empresa" b ON b.id = x."empresaId"
               WHERE x."usuarioId" = u.id AND b.nombre = 'Brillante') AS ya_tiene_brillante
FROM "UsuarioEmpresa" ue
JOIN "Empresa" g ON g.id = ue."empresaId" AND g.nombre = 'Gold Seguridad'
JOIN "Usuario" u ON u.id = ue."usuarioId"
ORDER BY u.nombre;

-- 0.c Gold: lo que queda colgado (movimientos tienen que ser 0 → correr antes la limpieza de testing).
SELECT
  (SELECT COUNT(*) FROM "MovimientoBancario" m JOIN "EjecucionSemanal" s ON s.id = m."ejecucionId"
     JOIN "PresupuestoMensual" p ON p.id = s."presupuestoId" JOIN "Empresa" e ON e.id = p."empresaId"
     WHERE e.nombre = 'Gold Seguridad')::int AS movimientos,
  (SELECT COUNT(*) FROM "LineaPresupuesto" l JOIN "PresupuestoMensual" p ON p.id = l."presupuestoId"
     JOIN "Empresa" e ON e.id = p."empresaId" WHERE e.nombre = 'Gold Seguridad')::int AS lineas,
  (SELECT COUNT(*) FROM "ValorManualReporte" v JOIN "Empresa" e ON e.id = v."empresaId"
     WHERE e.nombre = 'Gold Seguridad')::int AS valores_manuales,
  (SELECT COUNT(*) FROM "CuentaBancaria" c JOIN "Empresa" e ON e.id = c."empresaId"
     WHERE e.nombre = 'Gold Seguridad')::int AS cuentas;

-- ============================================================
-- PASO 1. EXPENSAS como empresa nueva, con la unidad EXPENSAS
-- ============================================================
INSERT INTO "Empresa" ("id", "nombre", "activo", "unidadesNegocio", "createdAt")
SELECT gen_random_uuid()::text, 'Expensas', true, ARRAY['EXPENSAS']::text[], CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Empresa" WHERE "nombre" = 'Expensas')
  AND NOT EXISTS (SELECT 1 FROM "Empresa" WHERE 'EXPENSAS' = ANY("unidadesNegocio"));

-- ============================================================
-- PASO 2. Usuarios de Gold → acceso a Brillante (solo acceso; sin operar ni revisar)
-- ============================================================
INSERT INTO "UsuarioEmpresa" ("usuarioId", "empresaId", "puedeOperarEjecucion", "puedeRevisarPresupuesto")
SELECT ue."usuarioId", b.id, false, false
FROM "UsuarioEmpresa" ue
JOIN "Empresa" g ON g.id = ue."empresaId" AND g.nombre = 'Gold Seguridad'
CROSS JOIN (SELECT id FROM "Empresa" WHERE nombre = 'Brillante') b
ON CONFLICT ("usuarioId", "empresaId") DO NOTHING;

-- ============================================================
-- PASO 3. Cuentas bancarias de Gold → Brillante (en testing son 0; en otra base puede haber)
-- ============================================================
UPDATE "CuentaBancaria"
SET "empresaId" = (SELECT id FROM "Empresa" WHERE nombre = 'Brillante')
WHERE "empresaId" = (SELECT id FROM "Empresa" WHERE nombre = 'Gold Seguridad');
-- Si Brillante ya tuviera una cuenta con el mismo nombre, la restricción única (empresa, nombre) frena esto con error.

-- ============================================================
-- PASO 4. Desactivar Gold Seguridad (los datos quedan; solo deja de aparecer y de resolverse por URL)
-- Solo si no tiene unidades, ni movimientos, ni líneas de presupuesto, ni valores manuales.
-- ============================================================
UPDATE "Empresa" e SET "activo" = false
WHERE e."nombre" = 'Gold Seguridad' AND cardinality(e."unidadesNegocio") = 0
  AND NOT EXISTS (SELECT 1 FROM "MovimientoBancario" m JOIN "EjecucionSemanal" s ON s.id = m."ejecucionId"
                  JOIN "PresupuestoMensual" p ON p.id = s."presupuestoId" WHERE p."empresaId" = e.id)
  AND NOT EXISTS (SELECT 1 FROM "LineaPresupuesto" l JOIN "PresupuestoMensual" p ON p.id = l."presupuestoId"
                  WHERE p."empresaId" = e.id)
  AND NOT EXISTS (SELECT 1 FROM "ValorManualReporte" v WHERE v."empresaId" = e.id);

-- ============================================================
-- PASO 5. Verificación (solo SELECT)
-- ============================================================
SELECT nombre, activo, "unidadesNegocio" FROM "Empresa"
WHERE nombre IN ('Gold Seguridad', 'Brillante', 'Expensas') ORDER BY nombre;
-- esperado: Brillante activo; Expensas activo con {EXPENSAS}; Gold Seguridad activo = false.

SELECT u.nombre, u.email, array_agg(e.nombre ORDER BY e.nombre) AS empresas
FROM "Usuario" u
JOIN "UsuarioEmpresa" ue ON ue."usuarioId" = u.id
JOIN "Empresa" e ON e.id = ue."empresaId"
WHERE u.id IN (SELECT ue2."usuarioId" FROM "UsuarioEmpresa" ue2 JOIN "Empresa" g ON g.id = ue2."empresaId" AND g.nombre = 'Gold Seguridad')
GROUP BY u.nombre, u.email ORDER BY u.nombre;
-- esperado: cada usuario de Gold lista también Brillante.
