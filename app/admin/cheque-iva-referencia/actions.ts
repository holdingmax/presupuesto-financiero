"use server";

import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parsearChequeIvaReferencia } from "@/lib/chequeIvaReferencia";

type ResultadoSubirChequeIvaReferencia =
  | { ok: true; filasImportadas: number; duplicadosAmbiguos: number }
  | { ok: false; error: string };

// Reemplaza la tabla completa en cada carga — no acumula entre cargas,
// mismo criterio que PagoReferencia (ver comentario del modelo en
// schema.prisma).
export async function subirChequeIvaReferencia(
  formData: FormData
): Promise<ResultadoSubirChequeIvaReferencia> {
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

  const filas = parsearChequeIvaReferencia(workbook);
  if (filas.length === 0) {
    return {
      ok: false,
      error: 'No encontré ninguna fila de cheque para importar. Revisá que el archivo tenga la hoja "operaciones_cheques".',
    };
  }

  await prisma.$transaction([
    prisma.chequeIvaReferencia.deleteMany({}),
    prisma.chequeIvaReferencia.createMany({ data: filas }),
  ]);

  revalidatePath("/admin/cheque-iva-referencia");
  return {
    ok: true,
    filasImportadas: filas.length,
    duplicadosAmbiguos: filas.filter((f) => f.duplicadoAmbiguo).length,
  };
}
