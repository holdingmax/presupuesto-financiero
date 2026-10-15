export function formatearImporte(valor: number) {
  return valor.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

// Con centavos: los importes de un extracto bancario tienen decimales y no se pierden, solo
// se ocultaban al mostrar pesos enteros. Para la tabla de movimientos de Ejecución.
export function formatearImporteConCentavos(valor: number) {
  return valor.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
