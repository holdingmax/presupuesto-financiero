// Empresa y período ya no son fijos: ahora vienen de la URL (/[empresa]/[periodo]/...),
// resueltos vía lib/slug.ts y lib/presupuesto.ts. EMPRESA_NOMBRE se eliminó porque ya no
// tiene ningún uso — ninguna pantalla depende de "una sola empresa" en el código.
//
// Períodos de Presupuesto que puede abrir un usuario que no es ADMIN ni FINANZAS (ver
// lib/periodosHabilitados.ts). Es el selector de mes de la pantalla de Presupuesto: para
// habilitar un mes nuevo, agregarlo acá (en orden). Ejecución financiera y Reporte no
// usan esta lista.
export const PERIODOS_HABILITADOS: readonly string[] = ["2026-09", "2026-10", "2026-11"];

// Único período que el gerente (quien no es ADMIN ni FINANZAS) puede EDITAR: el mes en curso de
// carga. Los demás de PERIODOS_HABILITADOS los puede abrir, pero en solo lectura. Se aplica en el
// servidor (carga desde el Reporte y edición de líneas de Presupuesto). Hay que rotarlo a mano
// cada mes; tiene que estar en PERIODOS_HABILITADOS (lo controla un test). Ver
// puedeEditarPeriodoComoGerente en lib/periodosHabilitados.ts.
export const PERIODO_EN_CARGA_GERENTE = "2026-11";

// Período al que llevan los links de "Mis empresas" (y el aviso de período no habilitado).
// Tiene que estar en PERIODOS_HABILITADOS (lo controla un test).
export const PERIODO_POR_DEFECTO = "2026-09";

// Reporte por plantilla: muestra las etiquetas K (K1, K7...), sus tooltips y el panel
// "Pendiente de confirmar con Kike" a ADMIN y FINANZAS. En false se ocultan para todos
// (la lista sigue en lib/reporte/pendientes.ts); volver a true para reactivarlos. No
// afecta al control de arrastre ni a las marcas de la planilla (eso es verControl).
export const MOSTRAR_PENDIENTES_EN_REPORTE = false;

// Interruptor por empresa de la carga del gerente directo en el Reporte (plan: el gerente
// tipea su Presupuestado en /reporte). Lista de SLUGS de empresa (lib/slug.ts). Vacía = apagado
// para todas: el gerente sigue cargando en Presupuesto. Para volver atrás con una empresa,
// sacar su slug de la lista. Ver cargaEnReporteActiva en lib/estadoPresupuesto.ts.
export const EMPRESAS_CON_CARGA_EN_REPORTE: readonly string[] = ["brillante"];

// Etiqueta del ciclo fiscal que se muestra en la portada de login (app/login/page.tsx).
//
// PENDIENTE: no está derivada de PERIODO todavía. "3 meses hacia atrás terminando en PERIODO"
// se podría calcular de forma trivial, pero no sé si la regla real es esa (ventana móvil de
// 3 meses) o si en realidad es "el trimestre calendario que contiene a PERIODO" (ene-mar,
// abr-jun, jul-sep, oct-dic) — ambas reglas coinciden para PERIODO="2026-09" (da lo mismo,
// Jul-Sep en los dos casos) pero divergen para cualquier período que no sea fin de trimestre
// calendario. Avisen cuál es la regla correcta y lo calculamos a partir de PERIODO.
export const CICLO_FISCAL_LABEL = "Julio 2026 — Septiembre 2026";
