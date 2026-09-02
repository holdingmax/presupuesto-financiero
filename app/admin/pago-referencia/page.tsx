import { requireAdmin, PermisoDenegadoError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PagoReferenciaForm from "./PagoReferenciaForm";

export default async function PagoReferenciaPage() {
  let estadoInicial;
  try {
    await requireAdmin();
    const [total, ultima, liquidacionesFinales] = await Promise.all([
      prisma.pagoReferencia.count(),
      prisma.pagoReferencia.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      prisma.pagoReferencia.count({ where: { esLiquidacionFinal: true } }),
    ]);
    estadoInicial = {
      total,
      liquidacionesFinales,
      ultimaCarga: ultima?.createdAt.toISOString() ?? null,
    };
  } catch (error) {
    // Ver el comentario equivalente en admin/usuarios/page.tsx.
    if (error instanceof PermisoDenegadoError) return null;
    throw error;
  }

  return <PagoReferenciaForm estadoInicial={estadoInicial} />;
}
