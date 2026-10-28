-- Plate Silver: alta como empresa nueva y baja lógica de JPS. SOLO TESTING (ep-shy-cell).
-- NO se ejecuta desde el repo: lo corrés vos en el SQL Editor de Neon, después de mirar el PASO 0.
-- Idempotente: se puede correr dos veces sin efecto extra. No hay migración ni cambio de schema.
-- Mismo criterio que docs/ejecucion_global_fase1.sql (PASO 1: alta con gen_random_uuid()::text;
-- PASO 4: desactivar solo si no queda nada colgado).
--
-- QUÉ PASA CON JPS: queda INACTIVA (activo = false), no se borra nada. Conserva sus 3 accesos
-- (UsuarioEmpresa: Vigo, Flavia, Ricci), su presupuesto 2026-09 (ABIERTO, sin líneas) y su unidad
-- "JPS" en unidadesNegocio. Dejó de aparecer en "Mis empresas", en /admin/usuarios, en
-- /admin/unidades-negocio y en /admin/cuentas-bancarias, y la URL /jps/... da 404. Se revierte con
-- UPDATE "Empresa" SET "activo" = true WHERE "nombre" = 'JPS'.
-- QUÉ PASA CON PLATE SILVER: nace activa, sin unidades de negocio y SIN filas de UsuarioEmpresa
-- (los accesos se deciden después). Solo la ve un ADMIN hasta que se le den accesos.
-- JPS y Plate Silver son negocios distintos: la clasificación "JPS" y la unidad JPS no se tocan.

-- ============================================================
-- PASO 0. Vista previa (solo SELECT)
-- ============================================================
-- 0.a Estado actual de las dos empresas (esperado la primera vez: JPS activa, Plate Silver sin fila).
SELECT nombre, activo, "unidadesNegocio" FROM "Empresa"
WHERE nombre IN ('JPS', 'Plate Silver') ORDER BY nombre;

-- 0.b Lo que cuelga de JPS (esperado en testing: todo 0, accesos 3, presupuestos 1).
SELECT
  (SELECT COUNT(*) FROM "MovimientoBancario" m JOIN "EjecucionSemanal" s ON s.id = m."ejecucionId"
     JOIN "PresupuestoMensual" p ON p.id = s."presupuestoId" JOIN "Empresa" e ON e.id = p."empresaId"
     WHERE e.nombre = 'JPS')::int AS movimientos,
  (SELECT COUNT(*) FROM "LineaPresupuesto" l JOIN "PresupuestoMensual" p ON p.id = l."presupuestoId"
     JOIN "Empresa" e ON e.id = p."empresaId" WHERE e.nombre = 'JPS')::int AS lineas,
  (SELECT COUNT(*) FROM "ValorManualReporte" v JOIN "Empresa" e ON e.id = v."empresaId"
     WHERE e.nombre = 'JPS')::int AS valores_manuales,
  (SELECT COUNT(*) FROM "MovimientoBancario" WHERE upper(btrim("unidadNegocio")) = 'JPS')::int AS movimientos_unidad_jps,
  (SELECT COUNT(*) FROM "PresupuestoMensual" p JOIN "Empresa" e ON e.id = p."empresaId"
     WHERE e.nombre = 'JPS')::int AS presupuestos,
  (SELECT COUNT(*) FROM "UsuarioEmpresa" ue JOIN "Empresa" e ON e.id = ue."empresaId"
     WHERE e.nombre = 'JPS')::int AS accesos;

-- ============================================================
-- PASO 1. Plate Silver como empresa nueva (sin unidades, sin accesos)
-- ============================================================
INSERT INTO "Empresa" ("id", "nombre", "activo", "unidadesNegocio", "createdAt")
SELECT gen_random_uuid()::text, 'Plate Silver', true, ARRAY[]::text[], CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Empresa" WHERE "nombre" = 'Plate Silver');

-- ============================================================
-- PASO 2. Desactivar JPS (los datos quedan; solo deja de aparecer y de resolverse por URL)
-- Misma guarda que Gold, pero sin exigir unidades vacías: JPS conserva su unidad "JPS".
-- La condición NO mira los 3 accesos ni el presupuesto vacío: se conservan a propósito.
-- Si la guarda falla (hay movimientos, líneas o valores manuales), NO cambia nada: el UPDATE
-- afecta 0 filas y el aviso del PASO 3 lo dice.
-- ============================================================
UPDATE "Empresa" e SET "activo" = false
WHERE e."nombre" = 'JPS' AND e."activo" = true
  AND NOT EXISTS (SELECT 1 FROM "MovimientoBancario" m JOIN "EjecucionSemanal" s ON s.id = m."ejecucionId"
                  JOIN "PresupuestoMensual" p ON p.id = s."presupuestoId" WHERE p."empresaId" = e.id)
  AND NOT EXISTS (SELECT 1 FROM "MovimientoBancario" m WHERE upper(btrim(m."unidadNegocio")) = 'JPS')
  AND NOT EXISTS (SELECT 1 FROM "LineaPresupuesto" l JOIN "PresupuestoMensual" p ON p.id = l."presupuestoId"
                  WHERE p."empresaId" = e.id)
  AND NOT EXISTS (SELECT 1 FROM "ValorManualReporte" v WHERE v."empresaId" = e.id);

-- ============================================================
-- PASO 3. Verificación (solo SELECT)
-- ============================================================
SELECT nombre, activo, "unidadesNegocio",
       (SELECT COUNT(*) FROM "UsuarioEmpresa" ue WHERE ue."empresaId" = e.id)::int AS accesos,
       (SELECT COUNT(*) FROM "PresupuestoMensual" p WHERE p."empresaId" = e.id)::int AS presupuestos
FROM "Empresa" e
WHERE nombre IN ('JPS', 'Plate Silver') ORDER BY nombre;
-- esperado: JPS activo = false, {JPS}, accesos 3, presupuestos 1;
--           Plate Silver activo = true, {}, accesos 0, presupuestos 0.

-- Aviso: si JPS sigue activa, la guarda falló (hay datos colgados): mirar el PASO 0.b.
SELECT CASE
         WHEN NOT EXISTS (SELECT 1 FROM "Empresa" WHERE nombre = 'JPS') THEN 'JPS no existe en esta base.'
         WHEN EXISTS (SELECT 1 FROM "Empresa" WHERE nombre = 'JPS' AND activo) THEN 'ATENCIÓN: JPS sigue ACTIVA, la guarda falló y no se cambió nada. Revisar el PASO 0.b.'
         ELSE 'OK: JPS inactiva.'
       END AS estado_jps;
