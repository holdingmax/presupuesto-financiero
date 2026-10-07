"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminOFinanzas } from "@/lib/auth";
import { esUnidadDeLaLista } from "@/lib/unidadesNegocio";

type ResultadoGuardarUnidades = { ok: true; unidades: string[] } | { ok: false; error: string };

// Asigna las unidades de negocio de UNA empresa (Empresa.unidadesNegocio), que el
// Reporte usa para sumar el REAL por unidad (lib/reporte.ts). Regla: cada unidad
// pertenece a UNA sola empresa — si no, un mismo importe se sumaría en dos
// reportes. Se valida acá, dentro de una transacción con un lock global, para que
// dos administradores guardando a la vez no puedan asignar la misma unidad a dos
// empresas distintas.
export async function guardarUnidadesEmpresa(
  empresaId: string,
  unidades: string[]
): Promise<ResultadoGuardarUnidades> {
  await requireAdminOFinanzas();

  const limpias = Array.from(new Set(unidades.map((u) => u.trim()).filter(Boolean))).sort();
  const invalidas = limpias.filter((u) => !esUnidadDeLaLista(u));
  if (invalidas.length > 0) {
    return { ok: false, error: `No son unidades de negocio de la lista: ${invalidas.join(", ")}.` };
  }

  return prisma.$transaction(async (tx) => {
    // "SELECT 1 FROM": pg_advisory_xact_lock devuelve void, que Prisma no deserializa.
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext('empresa-unidades-negocio'))`;

    const empresa = await tx.empresa.findUnique({ where: { id: empresaId }, select: { id: true } });
    if (!empresa) return { ok: false as const, error: "No encontré esa empresa." };

    if (limpias.length > 0) {
      const enOtras = await tx.empresa.findMany({
        where: { id: { not: empresaId }, unidadesNegocio: { hasSome: limpias } },
        select: { nombre: true, unidadesNegocio: true },
      });
      const conflictos = enOtras.flatMap((e) =>
        e.unidadesNegocio.filter((u) => limpias.includes(u)).map((u) => `${u} ya pertenece a ${e.nombre}`)
      );
      if (conflictos.length > 0) {
        return {
          ok: false as const,
          error: `Cada unidad pertenece a una sola empresa: ${conflictos.join("; ")}. Sacala de esa empresa primero.`,
        };
      }
    }

    await tx.empresa.update({ where: { id: empresaId }, data: { unidadesNegocio: limpias } });
    revalidatePath("/admin/unidades-negocio");
    return { ok: true as const, unidades: limpias };
  });
}
