-- Limpieza de los movimientos de PRUEBA de 2026-09 en TESTING (extractos crudos subidos antes del lector).
-- NO se ejecuta desde el repo: lo corrés vos en el SQL Editor de Neon, SOLO en la base de testing.
-- Alcance exacto: las semanas ABIERTAS número 1 de 2026-09 de Fredy Publicidad, Gold Seguridad y HWC.
-- Lo cerrado (Conexión/SPP y Radio, sem 1) no se toca: el filtro exige estado = 'ABIERTA'.
-- Las semanas (filas de EjecucionSemanal) y los presupuestos NO se borran, solo sus movimientos.

-- ============================================================
-- PASO 1. Vista previa (solo SELECT). Tiene que dar: Fredy 37, Gold 6, HWC 176.
-- ============================================================
SELECT e.nombre AS empresa, pm.periodo, es."numeroSemana", es.estado,
       COUNT(mb.id)::int AS movimientos,
       COUNT(d.id)::int AS porciones_de_prorrateo,
       COUNT(a.id)::int AS adjuntos
FROM "EjecucionSemanal" es
JOIN "PresupuestoMensual" pm ON pm.id = es."presupuestoId"
JOIN "Empresa" e ON e.id = pm."empresaId"
LEFT JOIN "MovimientoBancario" mb ON mb."ejecucionId" = es.id
LEFT JOIN "MovimientoBancarioDesglose" d ON d."movimientoId" = mb.id
LEFT JOIN "Adjunto" a ON a."movimientoId" = mb.id
WHERE pm.periodo = '2026-09' AND es."numeroSemana" = 1 AND es.estado = 'ABIERTA'
  AND e.nombre IN ('Fredy Publicidad', 'Gold Seguridad', 'HWC')
GROUP BY e.nombre, pm.periodo, es."numeroSemana", es.estado
ORDER BY e.nombre;

-- ============================================================
-- PASO 2. Borrado. Un solo bloque: si algún conteo no es el esperado (3 semanas; 37, 6 y 176
-- movimientos) o hay adjuntos, FRENA con un error y no borra nada.
-- (Las porciones de prorrateo se borran solas con el movimiento: ON DELETE CASCADE.
--  Se borran antes igual, de forma explícita, para que quede a la vista.)
-- ============================================================
DO $$
DECLARE
  n_sem int; n_fr int; n_go int; n_hw int; n_adj int; n_des int; n_mov int;
BEGIN
  CREATE TEMP TABLE _semanas_prueba ON COMMIT DROP AS
  SELECT es.id, e.nombre AS empresa
  FROM "EjecucionSemanal" es
  JOIN "PresupuestoMensual" pm ON pm.id = es."presupuestoId"
  JOIN "Empresa" e ON e.id = pm."empresaId"
  WHERE pm.periodo = '2026-09' AND es."numeroSemana" = 1 AND es.estado = 'ABIERTA'
    AND e.nombre IN ('Fredy Publicidad', 'Gold Seguridad', 'HWC');

  SELECT COUNT(*)::int INTO n_sem FROM _semanas_prueba;
  SELECT COUNT(*)::int INTO n_fr FROM "MovimientoBancario" mb JOIN _semanas_prueba s ON s.id = mb."ejecucionId" WHERE s.empresa = 'Fredy Publicidad';
  SELECT COUNT(*)::int INTO n_go FROM "MovimientoBancario" mb JOIN _semanas_prueba s ON s.id = mb."ejecucionId" WHERE s.empresa = 'Gold Seguridad';
  SELECT COUNT(*)::int INTO n_hw FROM "MovimientoBancario" mb JOIN _semanas_prueba s ON s.id = mb."ejecucionId" WHERE s.empresa = 'HWC';
  SELECT COUNT(*)::int INTO n_adj FROM "Adjunto" a JOIN "MovimientoBancario" mb ON mb.id = a."movimientoId" JOIN _semanas_prueba s ON s.id = mb."ejecucionId";

  IF n_sem <> 3 OR n_fr <> 37 OR n_go <> 6 OR n_hw <> 176 THEN
    RAISE EXCEPTION 'No coincide lo esperado: semanas=% (3), Fredy=% (37), Gold=% (6), HWC=% (176). No se borró nada.', n_sem, n_fr, n_go, n_hw;
  END IF;
  IF n_adj > 0 THEN
    RAISE EXCEPTION 'Hay % adjuntos colgados de estos movimientos. No se borró nada: revisar antes.', n_adj;
  END IF;

  DELETE FROM "MovimientoBancarioDesglose" d
  USING "MovimientoBancario" mb, _semanas_prueba s
  WHERE d."movimientoId" = mb.id AND mb."ejecucionId" = s.id;
  GET DIAGNOSTICS n_des = ROW_COUNT;

  DELETE FROM "MovimientoBancario" mb
  USING _semanas_prueba s
  WHERE mb."ejecucionId" = s.id;
  GET DIAGNOSTICS n_mov = ROW_COUNT;

  RAISE NOTICE 'Borrados: % movimientos y % porciones de prorrateo.', n_mov, n_des;
END $$;

-- ============================================================
-- PASO 3. Verificación (solo SELECT). Las 3 semanas siguen existiendo con 0 movimientos;
-- las cerradas de Conexión/SPP (2698) y Radio (263) siguen igual.
-- ============================================================
SELECT e.nombre AS empresa, pm.periodo, es."numeroSemana", es.estado, COUNT(mb.id)::int AS movimientos
FROM "EjecucionSemanal" es
JOIN "PresupuestoMensual" pm ON pm.id = es."presupuestoId"
JOIN "Empresa" e ON e.id = pm."empresaId"
LEFT JOIN "MovimientoBancario" mb ON mb."ejecucionId" = es.id
WHERE pm.periodo = '2026-09'
GROUP BY e.nombre, pm.periodo, es."numeroSemana", es.estado
ORDER BY (es.estado = 'ABIERTA'), e.nombre;
