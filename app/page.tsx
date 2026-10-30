import Link from "next/link";
import { requireUsuarioAlDia, esAdminOFinanzas, veTodoEjecucion } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { prisma } from "@/lib/prisma";
import { listarEmpresas, slugify } from "@/lib/slug";
import { PERIODO_POR_DEFECTO } from "@/lib/config";
import { enlaceDeEmpresa } from "@/lib/navegacionEmpresa";
import { iniciales } from "@/lib/iniciales";

const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marino";
const LINK_NAV = `inline-flex min-h-11 items-center rounded-md px-3 text-sm text-ink-secondary transition hover:bg-surface-hover hover:text-ink ${FOCO}`;
const GRUPO = "text-xs font-medium tracking-[0.15em] text-ink-secondary uppercase";

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
    <div className="flex flex-1 flex-col">
      <header className="border-b border-line-strong bg-paper-raised">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3">
          <p className="flex items-center gap-2 font-serif text-lg font-semibold tracking-tight text-marino-dark">
            <span aria-hidden="true" className="h-2.5 w-2.5 bg-plata" />
            Presupuesto y Ejecución Financiera
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="px-2 text-sm font-medium text-ink">{usuario.nombre}</span>
            <Link href="/cuenta" className={LINK_NAV}>
              Cambiar contraseña
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className={`inline-flex min-h-11 items-center rounded-md border border-line-strong bg-paper-raised px-4 text-sm font-medium text-ink transition hover:border-marino hover:text-marino-dark ${FOCO}`}
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {/* Cada grupo se oculta si ninguno de sus links es visible para este usuario. */}
        {(veTodoEjecucion(usuario) || esAdminOFinanzas(usuario) || usuario.rol === "ADMIN") && (
          <nav aria-label="Secciones del sistema" className="mb-10 flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:gap-x-12">
            {(veTodoEjecucion(usuario) || esAdminOFinanzas(usuario)) && (
              <div>
                <h2 className={`${GRUPO} mb-1 px-3`}>Operación</h2>
                <ul className="flex flex-wrap gap-x-1">
                  {/* Ejecución global (plan §3.4): ADMIN, FINANZAS y quien tiene permiso de operar. */}
                  {veTodoEjecucion(usuario) && (
                    <li>
                      <Link href={`/ejecucion/${PERIODO_POR_DEFECTO}`} className={LINK_NAV}>
                        Ejecución global
                      </Link>
                    </li>
                  )}
                  {/* FINANZAS ve la administración financiera, no la de usuarios (decisión 2026-10-07). */}
                  {esAdminOFinanzas(usuario) && (
                    <>
                      <li>
                        <Link href="/admin/pago-referencia" className={LINK_NAV}>
                          Pagos de referencia
                        </Link>
                      </li>
                      <li>
                        <Link href="/admin/cheque-iva-referencia" className={LINK_NAV}>
                          Cheques IVA de referencia
                        </Link>
                      </li>
                      <li>
                        <Link href="/admin/cuentas-bancarias" className={LINK_NAV}>
                          Cuentas bancarias
                        </Link>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            )}
            {(usuario.rol === "ADMIN" || esAdminOFinanzas(usuario)) && (
              <div>
                <h2 className={`${GRUPO} mb-1 px-3`}>Administración</h2>
                <ul className="flex flex-wrap gap-x-1">
                  {usuario.rol === "ADMIN" && (
                    <li>
                      <Link href="/admin/usuarios" className={LINK_NAV}>
                        Gestión de usuarios
                      </Link>
                    </li>
                  )}
                  {esAdminOFinanzas(usuario) && (
                    <li>
                      <Link href="/admin/unidades-negocio" className={LINK_NAV}>
                        Unidades de negocio
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </nav>
        )}

        <div className="mb-6 border-b border-line-strong pb-4">
          <h1 className="font-serif text-3xl font-semibold tracking-tight whitespace-nowrap">Mis empresas</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {empresas.length === 1 ? "1 empresa" : `${empresas.length} empresas`}
          </p>
        </div>

        {empresas.length === 0 ? (
          <p className="text-sm text-ink-secondary">
            Todavía no tenés empresas asignadas. Pedile acceso al administrador.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {empresas.map((empresa) => (
              <li key={empresa.id}>
                <Link
                  href={enlaceDeEmpresa(esAdminOFinanzas(usuario), slugify(empresa.nombre))}
                  className={`flex min-h-16 items-center gap-4 rounded-lg border border-line-strong bg-paper-raised px-4 py-3 transition hover:border-marino hover:shadow-md hover:shadow-ink/10 ${FOCO}`}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-marino-tint text-sm font-semibold tracking-wide text-marino"
                  >
                    {iniciales(empresa.nombre) || "?"}
                  </span>
                  <span className="text-sm font-medium text-ink">{empresa.nombre}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
