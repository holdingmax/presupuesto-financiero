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

## Brillante: Jujuy y Recupero Gastos pasan a Real manual (2026-10-29)
`br.otrasOperacionesJujuy` y `br.recuperoGastos` pasan de SIN_REAL a REAL_MANUAL (solo `brillante.ts`; el tipeo directo,
la acción y la pantalla no cambian). Excel de Kike (agosto): Jujuy = 27.776.193; Recupero Gastos = -1.313.615 (negativo
dentro de egresos: baja Total egresos). Expensas (12.959.207) queda fuera. El Presupuestado de Recupero Gastos no se toca.
Los fixtures de agosto del repo tienen estas filas vacías (Excel del 13/10): no se tocan; no se pudo verificar los números
contra el archivo. Foto del gerente: `fixtures/gerenteBrillante.json` (tomada antes del cambio).

### PENDIENTES para Kike (sin código)
1. K8: "Otras operaciones (MANTENOR JUJUY)" de Brillante vs. "Cobranza Mantenor Jujuy" de Mantenor: posible doble lectura de la misma plata.
2. Signo del Presupuestado de Recupero Gastos: el gerente carga en positivo y el Real va en negativo (el % de avance quedaría negativo).
3. Origen de Expensas (Real 12.959.207 en el Excel): no sabemos de dónde sale; sigue sin Real.

## Filas extra del Reporte (pedido de Kike, 28/10) — TANDA 1 hecha (2026-10-29), sin commit
Que ADMIN/FINANZAS agreguen filas al Reporte mientras revisan. Aprobado con ajustes: nombre rechazado solo si ya existe una FILA con esa
clave en la empresa (estática o extra), NO por coincidir con una categoría de Presupuesto sin fila (Préstamo Cocos, Pagos especiales…);
se rechazan OTRO, OTROS, VARIOS. Crear solo en mes con flujo no bloqueado. `hastaPeriodo` en el modelo, sin interfaz.
Tanda 1 (sin interfaz, sin acciones, interruptor apagado): modelo `FilaExtraReporte` + migración a mano
(`prisma/migrations/20261029120000_agregar_fila_extra_reporte`, NO aplicada), `lib/reporte/filasExtra.ts` (nombres, visibilidad,
`conFilasExtra`), `lib/reporte/plantillaConExtras.ts` (resolver), `EMPRESAS_CON_FILAS_EXTRA = []`, roles de totales en Brillante,
`guardarValoresManuales` valida claves con el resolver (test con hash que cuida que solo cambió esa línea).
La carga del Presupuestado del gerente sigue con la plantilla ESTÁTICA (con la otra, `esFilaManualEditable` le abriría la celda).
Faltan (Tanda 2+): acciones crear/borrar, ampliar el tipeo directo a la columna Presupuestado y a las filas extra, interfaz (botón por bloque),
prender el interruptor en Brillante.

### PENDIENTE: PDF de cierre
No existe en el repo (sin librería ni código de PDF). Queda fuera de las filas extra; si hace falta, es un desarrollo aparte.

## Filas extra — TANDA 2 hecha (2026-10-29), sin commit
Interruptor `EMPRESAS_CON_FILAS_EXTRA = ["brillante"]` (subconjunto de `EMPRESAS_CON_TIPEO_DIRECTO`, test). Acciones `crearFilaExtra` y
`borrarFilaExtra` (`reporte/actionsFilasExtra.ts`; reglas puras en `lib/reporte/accionesFilasExtra.ts`): solo ADMIN/FINANZAS, interruptor, bloque,
nombre (`filasExtra.ts`), mes con flujo no bloqueado; borrado solo sin valores, conteo + delete en la misma transacción serializable.
Tipeo directo ampliado: las filas extra aceptan Presupuestado y Real (`guardarTipeoDelReporte` → `guardarValoresManuales`; Presupuesto VALIDADO
bloquea la columna P; carga única en cerrado). Interfaz: «+ Agregar una fila» al final de cada bloque (antes de su total) y «×» en filas extra sin
valores. El gerente las ve en solo lectura: recibe `tipeo = null` y `filasExtra = null`; la carga del Presupuestado sigue con la plantilla estática.
Sin probar (necesita sesión/base): render real, crear/borrar contra la base, serialización de la transacción, formato visual.
