// "07/10" en hora de Argentina — para los textos de trazabilidad ("Cerrada por X
// el dd/mm"). Las fechas se guardan en UTC: sin timeZone explícito, un cierre a
// las 22:00 de Buenos Aires se mostraría como el día siguiente. Se arma con
// formatToParts + padStart porque el ICU de Node devuelve "7/10" para es-AR aun
// pidiendo day: "2-digit".
export function formatearDiaMes(fechaIso: string): string {
  const partes = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "numeric",
    month: "numeric",
  }).formatToParts(new Date(fechaIso));
  const parte = (tipo: string) => (partes.find((p) => p.type === tipo)?.value ?? "").padStart(2, "0");
  return `${parte("day")}/${parte("month")}`;
}

// "Cerrada por Leticia Araoz el 07/10" / "Cerrada el 07/10" (registros viejos,
// anteriores a que se guardara quién).
export function textoTrazabilidad(accion: string, fechaIso: string, por: string | null): string {
  return `${accion}${por ? ` por ${por}` : ""} el ${formatearDiaMes(fechaIso)}`;
}
