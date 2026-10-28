import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decimalTextoDeCentavos } from "@/lib/conteoMovimientos";
import type { Plantilla } from "@/lib/reporte/motor";
import { puedeEditarPresupuestoAhora } from "@/lib/estadoPresupuesto";
import {
  DETALLE_CARGA_DESDE_REPORTE,
  celdaDeEntrada,
  nombreDeEntrada,
  planDeCarga,
  validarAclaracion,
  validarImporteCarga,
  type EntradaCarga,
  type LineaParaCarga,
} from "@/lib/reporte/cargaGerente";

// Escritura de la carga del Presupuestado en el Reporte (Etapa 2). SIN autorización ni
// next/*: la hace guardarPresupuestoDelReporte (A/reporte/actionsCarga.ts) antes de llamar acá.
// Está separado para poder probar la concurrencia contra una base de prueba (prisma/scripts/
// probar-carga-reporte.ts) sin una sesión.

const MAX_ENTRADAS = 200;

export type ResultadoCarga =
  | { ok: true; creadas: number; actualizadas: number; borradas: number }
  | { ok: false; error: string };

// Las líneas del mes con lo que necesita el plan. Solo lee: sin PresupuestoMensual no hay líneas.
export async function leerLineasParaCarga(empresaId: string, periodo: string): Promise<LineaParaCarga[]> {
  const presupuesto = await prisma.presupuestoMensual.findUnique({
    where: { empresaId_periodo: { empresaId, periodo } },
    select: { id: true },
  });
  return presupuesto ? leerLineas(prisma, presupuesto.id) : [];
}

async function leerLineas(db: Prisma.TransactionClient | typeof prisma, presupuestoId: string): Promise<LineaParaCarga[]> {
  const lineas = await db.lineaPresupuesto.findMany({
    where: { presupuestoId },
    orderBy: { createdAt: "asc" },
    select: { id: true, clasificacion: true, detalle: true, importe: true, _count: { select: { desglose: true } } },
  });
  return lineas.map((l) => ({
    id: l.id,
    clasificacion: l.clasificacion,
    detalle: l.detalle,
    importeCentavos: Math.round(Number(l.importe.toFixed(2)) * 100),
    tieneDesglose: l._count.desglose > 0,
  }));
}

function esClaveUnicaDuplicada(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

// Guarda el valor final de cada celda que cambió. Una LineaPresupuesto por clasificación:
//   - sin línea y valor → la crea (concepto = texto de la fila, detalle "Carga desde el Reporte");
//   - con línea y valor → actualiza su importe (respeta concepto y detalle);
//   - vacío o 0 → borra la línea.
// Todo se valida ANTES de escribir y se escribe en una transacción: o entra todo o nada.
//
// Sin duplicados por doble clic ni por dos personas a la vez: la transacción toma un bloqueo de
// fila sobre el PresupuestoMensual (FOR UPDATE), así que dos guardados del mismo presupuesto se
// serializan; el segundo lee recién cuando el primero terminó, encuentra la línea y la
// actualiza en vez de crear otra. (LineaPresupuesto no tiene índice único por clasificación y
// no se agrega uno: sería una migración.)
export async function aplicarCargaPresupuesto(p: {
  empresaId: string;
  periodo: string;
  plantilla: Plantilla;
  entradas: EntradaCarga[];
  esAdminOFinanzas: boolean;
  esRevisor: boolean;
}): Promise<ResultadoCarga> {
  const { entradas } = p;
  if (!Array.isArray(entradas) || entradas.length === 0) return { ok: true, creadas: 0, actualizadas: 0, borradas: 0 };
  if (entradas.length > MAX_ENTRADAS) return { ok: false, error: "Demasiados cambios en un solo guardado." };

  // 1) Lo tipeado, validado: no depende de la base.
  const vistos = new Set<string>();
  const importes: (number | null)[] = [];
  for (const e of entradas) {
    if (!e || typeof e !== "object" || typeof e.clave !== "string") return { ok: false, error: "Entrada inválida." };
    if (e.destino !== "fila" && e.destino !== "sinFila") return { ok: false, error: "Entrada inválida." };
    const k = `${e.destino}|${e.clave}`;
    if (vistos.has(k)) return { ok: false, error: `Campo repetido: ${nombreDeEntrada(p.plantilla, e)}.` };
    vistos.add(k);
    const importe = validarImporteCarga(e.importe, p.esAdminOFinanzas);
    if (!importe.ok) return { ok: false, error: `${nombreDeEntrada(p.plantilla, e)}: ${importe.error}` };
    importes.push(importe.centavos);
  }

  // 2) El presupuesto del mes se crea en el PRIMER guardado con algo que escribir, no al abrir
  //    la pantalla ni al guardar todo vacío.
  let presupuesto = await prisma.presupuestoMensual.findUnique({
    where: { empresaId_periodo: { empresaId: p.empresaId, periodo: p.periodo } },
    select: { id: true },
  });
  if (!presupuesto) {
    if (importes.every((c) => c === null)) return { ok: true, creadas: 0, actualizadas: 0, borradas: 0 };
    try {
      presupuesto = await prisma.presupuestoMensual.create({
        data: { empresaId: p.empresaId, periodo: p.periodo },
        select: { id: true },
      });
    } catch (error) {
      // Otro guardado lo creó en el mismo instante (clave única empresa+período).
      if (!esClaveUnicaDuplicada(error)) throw error;
      presupuesto = await prisma.presupuestoMensual.findUnique({
        where: { empresaId_periodo: { empresaId: p.empresaId, periodo: p.periodo } },
        select: { id: true },
      });
      if (!presupuesto) throw error;
    }
  }
  const presupuestoId = presupuesto.id;

  return prisma.$transaction(
    async (tx): Promise<ResultadoCarga> => {
      // Bloqueo: desde acá, otro guardado de este presupuesto espera a que este termine.
      await tx.$queryRaw`SELECT id FROM "PresupuestoMensual" WHERE id = ${presupuestoId} FOR UPDATE`;

      // 3) El estado se lee DENTRO del bloqueo: si en el medio se envió a revisión o se
      //    validó, no se escribe nada.
      const actual = await tx.presupuestoMensual.findUniqueOrThrow({
        where: { id: presupuestoId },
        select: { estado: true },
      });
      if (actual.estado === "VALIDADO") {
        return { ok: false, error: "Este presupuesto ya está validado, no se puede editar." };
      }
      if (!puedeEditarPresupuestoAhora(actual.estado, p.esRevisor)) {
        return {
          ok: false,
          error: "Este presupuesto está en revisión — mientras dure, solo quien lo revisa puede modificarlo.",
        };
      }

      // 4) El plan se recalcula con lo que hay AHORA en la base.
      const plan = planDeCarga(p.plantilla, await leerLineas(tx, presupuestoId));
      type Operacion =
        | { tipo: "crear"; concepto: string; detalle: string; centavos: number; clasificacion: string }
        | { tipo: "actualizar"; id: string; centavos: number; detalle?: string }
        | { tipo: "borrar"; id: string };
      const operaciones: Operacion[] = [];
      for (let i = 0; i < entradas.length; i++) {
        const e = entradas[i];
        const celda = celdaDeEntrada(plan, e);
        if (!celda) return { ok: false, error: `${nombreDeEntrada(p.plantilla, e)}: no es un campo que se pueda cargar.` };
        if (celda.modo === "soloLectura") {
          return {
            ok: false,
            error: `${nombreDeEntrada(p.plantilla, e)}: ya no se puede editar desde acá (${celda.motivo}). Recargá la pantalla.`,
          };
        }
        const centavos = importes[i];
        if (centavos === null) {
          if (celda.lineaId) operaciones.push({ tipo: "borrar", id: celda.lineaId });
          continue;
        }
        let detalle = DETALLE_CARGA_DESDE_REPORTE;
        if (celda.requiereAclaracion) {
          const aclaracion = validarAclaracion(e.aclaracion);
          if (!aclaracion.ok) return { ok: false, error: `${nombreDeEntrada(p.plantilla, e)}: ${aclaracion.error}` };
          detalle = aclaracion.detalle;
        }
        if (!celda.lineaId) {
          operaciones.push({ tipo: "crear", concepto: celda.texto, detalle, centavos, clasificacion: celda.categoria });
        } else if (centavos !== celda.valorCentavos || (celda.requiereAclaracion && detalle !== celda.aclaracionInicial)) {
          operaciones.push({
            tipo: "actualizar",
            id: celda.lineaId,
            centavos,
            ...(celda.requiereAclaracion ? { detalle } : {}),
          });
        }
      }

      // 5) Recién ahora se escribe.
      let creadas = 0;
      let actualizadas = 0;
      let borradas = 0;
      for (const op of operaciones) {
        if (op.tipo === "crear") {
          await tx.lineaPresupuesto.create({
            data: {
              presupuestoId,
              concepto: op.concepto,
              detalle: op.detalle,
              importe: decimalTextoDeCentavos(op.centavos),
              clasificacion: op.clasificacion,
            },
          });
          creadas++;
        } else if (op.tipo === "actualizar") {
          await tx.lineaPresupuesto.update({
            where: { id: op.id },
            data: {
              importe: decimalTextoDeCentavos(op.centavos),
              ...(op.detalle !== undefined ? { detalle: op.detalle } : {}),
            },
          });
          actualizadas++;
        } else {
          await tx.lineaPresupuesto.delete({ where: { id: op.id } });
          borradas++;
        }
      }
      // Lo que hace el revisor en EN_REVISION se avisa al gerente y obliga a volver a marcar
      // "Terminé de revisar" (igual que marcarComoModificadoSiEnRevision en Presupuesto).
      if (operaciones.length > 0 && actual.estado === "EN_REVISION") {
        await tx.presupuestoMensual.update({
          where: { id: presupuestoId },
          data: { fueModificadoPorRevisor: true, revisionCompletada: false },
        });
      }
      return { ok: true, creadas, actualizadas, borradas };
    },
    { maxWait: 10_000, timeout: 20_000 }
  );
}
