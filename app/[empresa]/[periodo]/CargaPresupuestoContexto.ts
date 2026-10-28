"use client";

import { createContext, useContext } from "react";

// Estado compartido de la carga del Presupuestado en el Reporte: lo escribe ProveedorCarga
// (reporte/CargaPresupuesto.tsx) y lo lee AccionesFlujo para no dejar "Enviar a revisión" con
// valores tipeados que todavía no se guardaron. Fuera del Reporte (o sin carga activa) no hay
// proveedor y el valor es false.
export const HayCambiosSinGuardarContext = createContext(false);

export function useHayCambiosSinGuardar(): boolean {
  return useContext(HayCambiosSinGuardarContext);
}
