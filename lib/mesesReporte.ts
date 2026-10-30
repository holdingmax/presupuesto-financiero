// Nombres de mes del Reporte (banda de cada mes y título). Puro (sin prisma ni next/*).
// Recibe períodos "AAAA-MM"; con un texto que no tiene esa forma devuelve lo que pueda sin romper.

const MESES_LARGOS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function partes(periodo: string): { anio: string; mes: string; indice: number } {
  const [anio = "", mes = ""] = periodo.split("-");
  return { anio, mes, indice: Number(mes) - 1 };
}

// "2026-09" -> "Septiembre".
export function nombreMesLargo(periodo: string): string {
  const { mes, indice } = partes(periodo);
  return MESES_LARGOS[indice] ?? mes;
}

// "2026-09" -> "SEPTIEMBRE" (banda del mes).
export function nombreMesBanda(periodo: string): string {
  return nombreMesLargo(periodo).toUpperCase();
}

// "2026-09" -> "Septiembre 2026".
export function mesYAnio(periodo: string): string {
  const { anio } = partes(periodo);
  return anio === "" ? nombreMesLargo(periodo) : `${nombreMesLargo(periodo)} ${anio}`;
}

// ["2026-07", "2026-08", "2026-09"] -> "Julio a Septiembre 2026"; si cruza de año, cada extremo con el suyo.
// Un solo período -> "Septiembre 2026". Lista vacía -> "".
export function rangoDeMeses(periodos: string[]): string {
  if (periodos.length === 0) return "";
  const primero = periodos[0];
  const ultimo = periodos[periodos.length - 1];
  if (periodos.length === 1) return mesYAnio(primero);
  if (partes(primero).anio === partes(ultimo).anio) return `${nombreMesLargo(primero)} a ${mesYAnio(ultimo)}`;
  return `${mesYAnio(primero)} a ${mesYAnio(ultimo)}`;
}
