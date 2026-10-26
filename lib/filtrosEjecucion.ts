// Filtros de la lista de movimientos de Ejecución global (semana abierta y cerrada). Parte pura: la
// URL es la única fuente (se pueden compartir y la paginación los respeta), y el mismo predicado
// `coincide` filtra la pantalla, el Total, la cantidad, las páginas y el Excel.

export type FiltrosEjecucion = {
  // "Solo sin clasificar". En la URL sigue siendo ?filtro=sin_clasificar (los links viejos andan).
  soloSinClasificar: boolean;
  // AAAA-MM-DD, ambos extremos inclusivos.
  desde?: string;
  hasta?: string;
  clasificacion?: string;
  // Coincide con la unidad de la fila o con cualquiera de las de su desglose.
  unidad?: string;
  // bancoYCuenta tal cual está guardado.
  cuenta?: string;
  // Texto contenido en el concepto, sin distinguir mayúsculas ni tildes.
  texto?: string;
};

export const SIN_FILTROS: FiltrosEjecucion = { soloSinClasificar: false };

export type ParametrosUrl = Record<string, string | string[] | undefined>;

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TEXTO = 100;

function primero(valor: string | string[] | undefined): string | undefined {
  const v = Array.isArray(valor) ? valor[0] : valor;
  const limpio = v?.trim();
  return limpio ? limpio : undefined;
}

function fechaValida(valor: string | undefined): string | undefined {
  if (!valor || !FECHA_ISO.test(valor)) return undefined;
  const d = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valor ? valor : undefined;
}

export function parsearFiltros(params: ParametrosUrl): FiltrosEjecucion {
  const filtros: FiltrosEjecucion = { soloSinClasificar: primero(params.filtro) === "sin_clasificar" };
  const desde = fechaValida(primero(params.desde));
  const hasta = fechaValida(primero(params.hasta));
  if (desde) filtros.desde = desde;
  if (hasta) filtros.hasta = hasta;
  const clasificacion = primero(params.clasificacion);
  if (clasificacion) filtros.clasificacion = clasificacion;
  const unidad = primero(params.unidad);
  if (unidad) filtros.unidad = unidad;
  const cuenta = primero(params.cuenta);
  if (cuenta) filtros.cuenta = cuenta;
  const texto = primero(params.q)?.slice(0, MAX_TEXTO).trim();
  if (texto) filtros.texto = texto;
  return filtros;
}

// Querystring SIN el "?" inicial ("" si no hay nada). `pagina` se agrega solo si es > 1.
export function aQuery(filtros: FiltrosEjecucion, pagina?: number): string {
  const p = new URLSearchParams();
  if (filtros.soloSinClasificar) p.set("filtro", "sin_clasificar");
  if (filtros.desde) p.set("desde", filtros.desde);
  if (filtros.hasta) p.set("hasta", filtros.hasta);
  if (filtros.clasificacion) p.set("clasificacion", filtros.clasificacion);
  if (filtros.unidad) p.set("unidad", filtros.unidad);
  if (filtros.cuenta) p.set("cuenta", filtros.cuenta);
  if (filtros.texto) p.set("q", filtros.texto);
  if (pagina !== undefined && pagina > 1) p.set("pagina", String(pagina));
  return p.toString();
}

export function hayFiltros(filtros: FiltrosEjecucion): boolean {
  return aQuery(filtros) !== "";
}

// Hay algún filtro además de "Solo sin clasificar".
export function hayFiltrosAdemasDeSinClasificar(filtros: FiltrosEjecucion): boolean {
  return hayFiltros({ ...filtros, soloSinClasificar: false });
}

// Sin mayúsculas ni tildes (mismo criterio que normalizarTexto de lib/unidadesNegocio, sin
// colapsar espacios: el texto buscado es una subcadena).
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export type FilaFiltrable = {
  // AAAA-MM-DD, como se muestra.
  fecha: string;
  concepto: string;
  bancoYCuenta: string;
  clasificacion: string;
  unidadNegocio: string;
  unidadesDesglose: string[];
};

export function coincide(fila: FilaFiltrable, filtros: FiltrosEjecucion): boolean {
  if (filtros.soloSinClasificar && fila.clasificacion !== "SIN CLASIFICAR") return false;
  if (filtros.desde && fila.fecha < filtros.desde) return false;
  if (filtros.hasta && fila.fecha > filtros.hasta) return false;
  if (filtros.clasificacion && fila.clasificacion !== filtros.clasificacion) return false;
  if (filtros.unidad && fila.unidadNegocio !== filtros.unidad && !fila.unidadesDesglose.includes(filtros.unidad)) {
    return false;
  }
  if (filtros.cuenta && fila.bancoYCuenta !== filtros.cuenta) return false;
  if (filtros.texto && !normalizar(fila.concepto).includes(normalizar(filtros.texto))) return false;
  return true;
}
