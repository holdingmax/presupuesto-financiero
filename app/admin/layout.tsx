import type { ReactNode } from "react";
import Link from "next/link";
import { requireUsuarioAlDia } from "@/lib/auth";

type Props = { children: ReactNode };

// Mismo patrón que app/[empresa]/[periodo]/layout.tsx: en vez de un
// redirect o un error, un usuario logueado sin permisos ve un panel
// explicándolo. requireUsuarioAlDia() ya cubre "no hay sesión" (-> /login)
// y "falta definir contraseña propia" (-> /cuenta).
export default async function AdminLayout({ children }: Props) {
  const usuario = await requireUsuarioAlDia();

  if (usuario.rol !== "ADMIN") {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <p className="text-sm text-terracota bg-terracota-tint rounded-md px-3 py-2">
          No tenés permisos de administrador.{" "}
          <Link href="/" className="underline underline-offset-2">
            Ver mis empresas
          </Link>
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
