-- Renombres de empresas y alta de Havanna Perú. NO se ejecuta desde el repo: lo corrés vos en el SQL Editor
-- de la base que corresponda (testing o producción), después de mirar el PASO 0 y de confirmar los nombres.
-- Idempotente: se puede correr dos veces sin efecto extra. No hay migración ni cambio de schema.
-- Mismo criterio que docs/plate_silver_alta_testing.sql (alta con gen_random_uuid()::text).
--
-- QUÉ HACE
--  1. "HWC" pasa a llamarse "Handyway Cargo". El slug sigue siendo `hwc`: lo fija SLUG_FIJO_POR_NOMBRE en
--     lib/slug.ts (slugDeEmpresa). La unidad de negocio "HWC" (Empresa.unidadesNegocio y MovimientoBancario)
--     NO se toca: es un dato, no el nombre de la empresa.
--  2. La fila de Conexión pasa a llamarse "Conexión Logística" (slug `conexion-logistica`). Se renombra la fila
--     que ya existe (mismo id: presupuestos, accesos, movimientos y valores manuales quedan colgados de ella);
--     nunca se inserta una nueva. En testing el slug viejo `conexion-logistica-spp` deja de resolver.
--  3. "Havanna Perú" nace activa, sin unidades de negocio y SIN filas de UsuarioEmpresa (los accesos se deciden
--     después). Slug `havanna-peru`. Solo la ve un ADMIN hasta que se le den accesos.
--
-- Los UPDATE son por id (resuelto en el mismo statement) y se frenan solos si el estado no es el esperado:
-- si hay dos filas candidatas, o ya existe una empresa con el nombre nuevo, afectan 0 filas y el PASO 4 lo
-- muestra. En ese caso NO forzar: mirar el PASO 0 y decidir a mano (unificar dos filas implica mover datos).

-- ============================================================
-- PASO 0. Vista previa (solo SELECT)
-- ============================================================
-- 0.a Empresas candidatas y lo que cuelga de cada fila.
SELECT
  e.id,
  e.nombre,
  e.activo,
  e."unidadesNegocio",
  (SELECT COUNT(*) FROM "PresupuestoMensual" p WHERE p."empresaId" = e.id)::int AS presupuestos,
  (SELECT COUNT(*) FROM "MovimientoBancario" m
     JOIN "EjecucionSemanal" s ON s.id = m."ejecucionId"
     JOIN "PresupuestoMensual" p ON p.id = s."presupuestoId"
     WHERE p."empresaId" = e.id)::int AS movimientos,
  (SELECT COUNT(*) FROM "UsuarioEmpresa" ue WHERE ue."empresaId" = e.id)::int AS accesos,
  (SELECT COUNT(*) FROM "ValorManualReporte" v WHERE v."empresaId" = e.id)::int AS valores_manuales
FROM "Empresa" e
WHERE e.nombre ILIKE '%HWC%'
   OR e.nombre ILIKE '%Handyway%'
   OR e.nombre ILIKE '%Conexi%'
   OR e.nombre ILIKE '%Correo%'
   OR e.nombre ILIKE '%Havanna%'
ORDER BY e.nombre;
-- Esperado la primera vez: una fila "HWC", una fila de Conexión ("Conexión Logística/SPP" en testing,
-- "Conexión Logística" o "Correo / SPP" en otra base), "Havanna" y ninguna "Havanna Perú".
-- Si Conexión aparece DOS veces (ej. "Conexión Logística" y "Conexión Logística/SPP"), son dos filas: frená acá.

-- ============================================================
-- PASO 1. HWC -> Handyway Cargo (solo si hay exactamente una "HWC" y todavía no existe "Handyway Cargo")
-- ============================================================
UPDATE "Empresa" SET "nombre" = 'Handyway Cargo'
WHERE "id" = (SELECT "id" FROM "Empresa" WHERE "nombre" = 'HWC')
  AND (SELECT COUNT(*) FROM "Empresa" WHERE "nombre" = 'HWC') = 1
  AND NOT EXISTS (SELECT 1 FROM "Empresa" WHERE "nombre" = 'Handyway Cargo');

-- ============================================================
-- PASO 2. Conexión -> "Conexión Logística" (solo si hay exactamente una fila candidata y todavía no existe
-- una con el nombre nuevo). Candidatas: "Conexión Logística/SPP" (testing) y "Correo / SPP" (nombre original).
-- ============================================================
UPDATE "Empresa" SET "nombre" = 'Conexión Logística'
WHERE "id" = (SELECT "id" FROM "Empresa" WHERE "nombre" IN ('Conexión Logística/SPP', 'Correo / SPP'))
  AND (SELECT COUNT(*) FROM "Empresa" WHERE "nombre" IN ('Conexión Logística/SPP', 'Correo / SPP')) = 1
  AND NOT EXISTS (SELECT 1 FROM "Empresa" WHERE "nombre" = 'Conexión Logística');

-- ============================================================
-- PASO 3. Havanna Perú como empresa nueva (sin unidades, sin accesos). Idempotente.
-- ============================================================
INSERT INTO "Empresa" ("id", "nombre", "activo", "unidadesNegocio", "createdAt")
SELECT gen_random_uuid()::text, 'Havanna Perú', true, ARRAY[]::text[], CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Empresa" WHERE "nombre" = 'Havanna Perú');

-- ============================================================
-- PASO 4. Verificación (solo SELECT)
-- ============================================================
-- Esperado: "Handyway Cargo", "Conexión Logística" y "Havanna Perú" una vez cada una; sin "HWC", sin
-- "Conexión Logística/SPP" ni "Correo / SPP". Si alguna sigue con el nombre viejo, el PASO 1 o 2 se frenó
-- por su guarda: volvé al PASO 0.
SELECT id, nombre, activo, "unidadesNegocio" FROM "Empresa"
WHERE nombre IN ('HWC', 'Handyway Cargo', 'Conexión Logística', 'Conexión Logística/SPP', 'Correo / SPP', 'Havanna Perú')
ORDER BY nombre;

-- ============================================================
-- REVERTIR (solo si hace falta, a mano)
-- ============================================================
-- UPDATE "Empresa" SET "nombre" = 'HWC' WHERE "nombre" = 'Handyway Cargo';
-- UPDATE "Empresa" SET "nombre" = 'Conexión Logística/SPP' WHERE "nombre" = 'Conexión Logística';  -- solo testing
-- Havanna Perú: si no tiene presupuestos ni accesos, UPDATE "Empresa" SET "activo" = false WHERE "nombre" = 'Havanna Perú';
