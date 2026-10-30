import { Poppins } from "next/font/google";

// Tipografía de la tabla del Reporte: réplica del Excel "PRESUPUESTO MES A MES" (Century Gothic).
// Poppins es la geométrica gratuita más parecida; Century Gothic queda como fallback si el equipo la tiene.
// Solo se aplica dentro de la tarjeta de la tabla (ReportePlantilla.tsx), no a toda la app.
export const poppinsReporte = Poppins({
  variable: "--font-reporte",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const FAMILIA_REPORTE =
  'var(--font-reporte), "Century Gothic", CenturyGothic, "Apple Gothic", system-ui, sans-serif';
