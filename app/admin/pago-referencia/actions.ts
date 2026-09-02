"use server";

import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parsearPagoReferencia } from "@/lib/pagoReferencia";

type ResultadoSubirPagoReferencia =
  | { ok: true; filasImportadas: number; liquidacionesFinales: number }
  | { ok: false; error: string };

// Reemplaza la tabla completa en cada carga — no acumula entre cargas,
// porque PAGOS_2025-2026.xlsx ya es la versión consolidada/corregida de
// Macchi (ver comentario del modelo en schema.prisma).
export async function subirPagoReferencia(
  formData: FormData
): Promise<ResultadoSubirPagoReferencia> {
  await requireAdmin();

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: "Elegí un archivo antes de subir." };
  }
  if (!archivo.name.toLowerCase().endsWith(".xlsx")) {
    return { ok: false, error: "El archivo tiene que ser un .xlsx." };
  }

  const buffer = await archivo.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const filas = parsearPagoReferencia(workbook);
  if (filas.length === 0) {
    return {
      ok: false,
      error: "No encontré ninguna fila de pago para importar. Revisá que el archivo tenga hojas mensuales con datos.",
    };
  }

  await prisma.$transaction([
    prisma.pagoReferencia.deleteMany({}),
    prisma.pagoReferencia.createMany({ data: filas }),
  ]);

  revalidatePath("/admin/pago-referencia");
  return {
    ok: true,
    filasImportadas: filas.length,
    liquidacionesFinales: filas.filter((f) => f.esLiquidacionFinal).length,
  };
}
