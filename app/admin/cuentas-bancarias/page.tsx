import { prisma } from "@/lib/prisma";
import { requireAdminOFinanzas, PermisoDenegadoError } from "@/lib/auth";
import CuentasBancariasForm from "./CuentasBancariasForm";

export default async function CuentasBancariasPage() {
  let empresas;
  let cuentas;
  try {
    await requireAdminOFinanzas();
    [empresas, cuentas] = await Promise.all([
      prisma.empresa.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
      prisma.cuentaBancaria.findMany({
        orderBy: { nombre: "asc" },
        select: { id: true, empresaId: true, nombre: true, banco: true, terminacion: true, activa: true },
      }),
    ]);
  } catch (error) {
    // Ver el comentario equivalente en admin/usuarios/page.tsx.
    if (error instanceof PermisoDenegadoError) return null;
    throw error;
  }

  return <CuentasBancariasForm cuentasIniciales={cuentas} empresas={empresas} />;
}
