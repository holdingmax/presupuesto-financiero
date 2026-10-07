import { prisma } from "@/lib/prisma";
import { requireAdmin, PermisoDenegadoError } from "@/lib/auth";
import UnidadesNegocioForm from "./UnidadesNegocioForm";

export default async function UnidadesNegocioPage() {
  let empresas;
  try {
    await requireAdmin();
    empresas = await prisma.empresa.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, unidadesNegocio: true },
    });
  } catch (error) {
    // Ver el comentario equivalente en admin/usuarios/page.tsx.
    if (error instanceof PermisoDenegadoError) return null;
    throw error;
  }

  return <UnidadesNegocioForm empresasIniciales={empresas} />;
}
