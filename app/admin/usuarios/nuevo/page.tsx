import { requireAdmin, PermisoDenegadoError } from "@/lib/auth";
import { listarEmpresas } from "@/lib/slug";
import NuevoUsuarioForm from "./NuevoUsuarioForm";

export default async function NuevoUsuarioPage() {
  let empresas;
  try {
    await requireAdmin();
    empresas = await listarEmpresas();
  } catch (error) {
    // Ver el comentario equivalente en admin/usuarios/page.tsx.
    if (error instanceof PermisoDenegadoError) return null;
    throw error;
  }

  return <NuevoUsuarioForm empresas={empresas} />;
}
