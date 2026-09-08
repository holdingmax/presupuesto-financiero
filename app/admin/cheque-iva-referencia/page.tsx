import { requireAdmin, PermisoDenegadoError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ChequeIvaReferenciaForm from "./ChequeIvaReferenciaForm";

export default async function ChequeIvaReferenciaPage() {
  let estadoInicial;
  try {
    await requireAdmin();
    const [total, ultima, duplicadosAmbiguos] = await Promise.all([
      prisma.chequeIvaReferencia.count(),
      prisma.chequeIvaReferencia.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      prisma.chequeIvaReferencia.count({ where: { duplicadoAmbiguo: true } }),
    ]);
    estadoInicial = {
      total,
      duplicadosAmbiguos,
      ultimaCarga: ultima?.createdAt.toISOString() ?? null,
    };
  } catch (error) {
    // Ver el comentario equivalente en admin/usuarios/page.tsx.
    if (error instanceof PermisoDenegadoError) return null;
    throw error;
  }

  return <ChequeIvaReferenciaForm estadoInicial={estadoInicial} />;
}
