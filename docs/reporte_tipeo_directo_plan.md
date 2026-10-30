# Tipeo directo en el Reporte (Real manual) — plan aprobado e implementado (2026-10-29)

Solo ADMIN y FINANZAS tipean, en la columna Real del último mes, las celdas con `real: manual` (flujo) y los
componentes de Disponibilidades. Sin commit. Sin E2E (decisión del 2026-10-29: solo tests unitarios y de servidor).

## Piezas
- `lib/config.ts`: `EMPRESAS_CON_TIPEO_DIRECTO` (hoy `["brillante"]`). Disponibilidades solo se edita si la empresa
  también está en `EMPRESAS_QUE_VEN_DISPONIBILIDADES_EN_REPORTE` (test de subconjunto).
- `lib/reporte/tipeoDirecto.ts` (puro): `camposTipeables`, `armarVistaTipeo`, `motivoRechazoTipeo`.
- `reporte/actionsTipeo.ts`: `guardarTipeoDelReporte` = `requireAdminOFinanzas` + guardas del tipeo + delega en
  `guardarValoresManuales` (sin modificar: importes por `leerCuenta`, transacción, carga única en cerrado, sin override).
- `reporte/TipeoDirecto.tsx` (cliente) + cambios en `ReportePlantilla.tsx` y `page.tsx`.
- El gerente recibe `tipeo = null` siempre: ni celdas, ni claves, ni la acción en sus props.
- `/reporte/carga` no se tocó.

## Fuera de este paso
- Filas "Sin Real" (Brillante 16, Havanna 9, Radio 8, Fredy 9, HWC 14, Mantenor 2, Conexión 18): decisión pendiente.
- Control "saldo según extractos" al lado de Banco y FCI: paso aparte. Ojo: el Banco y FCI del mes M se compara con el
  saldo al cierre del mes M-1; el FCI no está en los extractos; BBVA no trae saldo; las cuentas salen de
  `UNIDAD_POR_CUENTA`, no de `movimiento.unidadNegocio`.

## PENDIENTES anotados (sin tocar)
a) Arrastre: falso "cuadra" si el mes anterior no tiene semanas cerradas (sus egresos reales quedan en null y el Saldo
   real los toma como 0, `motor.ts` ~466). Sin probar: sale de leer el código.
b) "Traspaso Saldo Inicial" se tipea dos veces (egreso en Brillante, ingreso en Mantenor): pueden quedar desparejos.
c) Importes: `77710.5+508606.95` se rechaza (el punto es solo de miles). Está bien así, pero el mensaje de error debería
   mostrar el ejemplo en formato argentino (`77.710,5+508.606,95`). Hoy el mensaje de `leerTermino` ya trae un ejemplo
   genérico (`100,50`); falta el pensado para sumas.
