import Link from "next/link";
import { requireUsuarioAlDia } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { prisma } from "@/lib/prisma";
import { listarEmpresas, slugify } from "@/lib/slug";
import { PERIODO } from "@/lib/config";

// Landing post-login: qué empresas ve depende del usuario. Un ADMIN ve las
// 13; el resto solo las que tenga asignadas vía UsuarioEmpresa (ver comentario
// en schema.prisma: un ADMIN no necesita filas ahí porque ve todo).
export default async function MisEmpresasPage() {
  const usuario = await requireUsuarioAlDia();

  const empresas =
    usuario.rol === "ADMIN"
      ? await listarEmpresas()
      : await prisma.empresa.findMany({
          where: { activo: true, usuarios: { some: { usuarioId: usuario.id } } },
          orderBy: { nombre: "asc" },
        });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-14">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs tracking-[0.15em] text-ink-secondary uppercase mb-1">
            <span className="w-2 h-2 bg-plata" />
            {usuario.nombre}
          </p>
          <h1 className="text-4xl font-serif font-semibold tracking-tight">Mis empresas</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-ink-secondary">
          {usuario.rol === "ADMIN" && (
            <Link href="/admin/usuarios" className="underline underline-offset-2 hover:text-ink">
              Gestión de usuarios
            </Link>
          )}
          <Link href="/cuenta" className="underline underline-offset-2 hover:text-ink">
            Cambiar contraseña
          </Link>
          <form action={logout}>
            <button type="submit" className="underline underline-offset-2 hover:text-ink">
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      {empresas.length === 0 ? (
        <p className="text-sm text-ink-muted border-t border-line-strong pt-6">
          Todavía no tenés empresas asignadas. Pedile acceso al administrador.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line-strong pt-6">
          {empresas.map((empresa) => (
            <Link
              key={empresa.id}
              href={`/${slugify(empresa.nombre)}/${PERIODO}/presupuesto`}
              className="text-sm text-marino transition hover:text-marino-dark hover:underline underline-offset-2"
            >
              {empresa.nombre}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
