"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminOFinanzas, requireAccesoEmpresa } from "@/lib/auth";
import { resolverEmpresaPorSlug } from "@/lib/slug";
import { decimalTextoDeCentavos, centavosDeDecimalTexto } from "@/lib/conteoMovimientos";
import { camposManuales } from "@/lib/reporte/motor";
import { plantillaDeEmpresa } from "@/lib/reporte/plantillas";
import { motivoBloqueo, parsearCuenta, periodoActual } from "@/lib/reporte/bloqueo";
import { semanasDeEmpresa } from "@/lib/reporte/valoresManuales";

export type EntradaCarga = { filaClave: string; columna: "PRESUPUESTADO" | "REAL"; texto: string };
export type ResultadoCarga = { ok: true; guardados: number; borrados: number } | { ok: false; error: string };

const FORMATO_PERIODO = /^\d{4}-\d{2}$/;

// Guarda los valores manuales del Reporte de UNA empresa y mes (plan 2b §7.4). Solo
// ADMIN/FINANZAS con acceso a la empresa. Valida cada fila contra la plantilla, aplica la
// regla de bloqueo (lo cerrado no se modifica para atrás) sobre lo que CAMBIA, y hace todo en
// una transacción: texto vacío borra el valor; una cuenta ("a+b-c") se guarda resuelta y la
// cuenta va a `nota`.
export async function guardarValoresManuales(
  empresaSlug: string,
  periodo: string,
  entradas: EntradaCarga[]
): Promise<ResultadoCarga> {
  const usuario = await requireAdminOFinanzas();
  if (!FORMATO_PERIODO.test(periodo)) return { ok: false, error: "Período inválido." };
  const empresa = await resolverEmpresaPorSlug(empresaSlug);
  if (!empresa) return { ok: false, error: "No encontré esa empresa." };
  await requireAccesoEmpresa(empresa.id);
  const plantilla = plantillaDeEmpresa(empresaSlug);
  if (!plantilla) return { ok: false, error: "Esta empresa no tiene reporte por plantilla." };

  const campos = new Map(camposManuales(plantilla).map((c) => [`${c.clave}|${c.columna}`, c]));
  const vistos = new Set<string>();
  const cambios: { filaClave: string; columna: "PRESUPUESTADO" | "REAL"; centavos: number | null; nota: string | null }[] = [];
  for (const e of entradas) {
    const k = `${e.filaClave}|${e.columna}`;
    const campo = campos.get(k);
    if (!campo) return { ok: false, error: `"${e.filaClave}" no es un campo manual de esta plantilla.` };
    if (vistos.has(k)) return { ok: false, error: `Campo repetido: ${campo.texto.trim()}.` };
    vistos.add(k);
    if (e.texto.trim() === "") {
      cambios.push({ filaClave: e.filaClave, columna: e.columna, centavos: null, nota: null });
      continue;
    }
    const cuenta = parsearCuenta(e.texto);
    if (!cuenta) return { ok: false, error: `No entiendo el importe de "${campo.texto.trim()}": ${e.texto}` };
    cambios.push({ filaClave: e.filaClave, columna: e.columna, centavos: cuenta.centavos, nota: cuenta.nota });
  }

  const existentes = await prisma.valorManualReporte.findMany({
    where: { empresaId: empresa.id, periodo },
    select: { filaClave: true, columna: true, importe: true },
  });
  const actual = new Map(existentes.map((v) => [`${v.filaClave}|${v.columna}`, centavosDeDecimalTexto(v.importe.toFixed(2))]));

  // Solo lo que cambia pasa por la regla de bloqueo.
  const cambiados = cambios.filter((c) => (actual.get(`${c.filaClave}|${c.columna}`) ?? null) !== c.centavos);
  if (cambiados.length > 0) {
    const [presupuesto, semanas] = await Promise.all([
      prisma.presupuestoMensual.findUnique({
        where: { empresaId_periodo: { empresaId: empresa.id, periodo } },
        select: { estado: true },
      }),
      semanasDeEmpresa(empresa.id, [periodo]),
    ]);
    for (const c of cambiados) {
      const campo = campos.get(`${c.filaClave}|${c.columna}`)!;
      const motivo = motivoBloqueo({
        periodo,
        actual: periodoActual(),
        columna: c.columna,
        bloque: campo.bloque,
        presupuestoValidado: presupuesto?.estado === "VALIDADO",
        semanas: semanas.get(periodo)!,
      });
      if (motivo) return { ok: false, error: `"${campo.texto.trim()}" está bloqueado: ${motivo}` };
    }
  }

  let guardados = 0;
  let borrados = 0;
  await prisma.$transaction(async (tx) => {
    for (const c of cambiados) {
      const donde = {
        empresaId_periodo_filaClave_columna: {
          empresaId: empresa.id,
          periodo,
          filaClave: c.filaClave,
          columna: c.columna,
        },
      };
      if (c.centavos === null) {
        await tx.valorManualReporte.deleteMany({
          where: { empresaId: empresa.id, periodo, filaClave: c.filaClave, columna: c.columna },
        });
        borrados++;
      } else {
        const importe = decimalTextoDeCentavos(c.centavos);
        await tx.valorManualReporte.upsert({
          where: donde,
          create: {
            empresaId: empresa.id,
            periodo,
            filaClave: c.filaClave,
            columna: c.columna,
            importe,
            nota: c.nota,
            cargadoPorId: usuario.id,
          },
          update: { importe, nota: c.nota, cargadoPorId: usuario.id },
        });
        guardados++;
      }
    }
  });

  revalidatePath(`/${empresaSlug}/${periodo}/reporte`);
  revalidatePath(`/${empresaSlug}/${periodo}/reporte/carga`);
  return { ok: true, guardados, borrados };
}
