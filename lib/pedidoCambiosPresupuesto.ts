import type { EstadoPresupuesto } from "@prisma/client";

// Pedido de cambios del revisor al gerente (modelo PedidoCambiosPresupuesto). Puros
// (sin Prisma ni next/headers) para poder probarlos; presupuesto/actions.ts los usa
// en pedirCambios, y el form para mostrar u ocultar el botón.

export const MAX_MENSAJE_PEDIDO_CAMBIOS = 1000;

type ResultadoMensaje = { ok: true; mensaje: string } | { ok: false; error: string };

// El mensaje es obligatorio: sin él el gerente no sabe qué corregir. Se valida acá
// (servidor) aunque el cliente también lo limite — el límite no está en la base.
export function validarMensajePedido(texto: string): ResultadoMensaje {
  const mensaje = typeof texto === "string" ? texto.trim() : "";
  if (!mensaje) {
    return { ok: false, error: "Escribí qué cambios necesitás." };
  }
  if (mensaje.length > MAX_MENSAJE_PEDIDO_CAMBIOS) {
    return {
      ok: false,
      error: `El mensaje es demasiado largo (máximo ${MAX_MENSAJE_PEDIDO_CAMBIOS} caracteres).`,
    };
  }
  return { ok: true, mensaje };
}

// Solo mientras está EN_REVISION y solo quien revisa (puedeRevisarPresupuesto: ADMIN o
// permiso por empresa). revisionCompletada no importa: el revisor que ya marcó "Terminé
// de revisar" puede arrepentirse. En ABIERTO no hay nada que pedir y VALIDADO es definitivo.
export function puedePedirCambios(
  presupuesto: { estado: EstadoPresupuesto },
  esRevisor: boolean
): boolean {
  return presupuesto.estado === "EN_REVISION" && esRevisor;
}
