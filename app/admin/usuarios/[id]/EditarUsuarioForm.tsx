"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { actualizarUsuario, restablecerPassword, type ResultadoActualizar } from "../actions";

type Empresa = { id: string; nombre: string };
type UsuarioInicial = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  empresaIds: string[];
};

const ESTADO_INICIAL: ResultadoActualizar | null = null;

export default function EditarUsuarioForm({
  usuario,
  empresas,
  esPropioUsuario,
}: {
  usuario: UsuarioInicial;
  empresas: Empresa[];
  esPropioUsuario: boolean;
}) {
  const actualizarUsuarioConId = actualizarUsuario.bind(null, usuario.id);
  const [estado, formAction, pendiente] = useActionState(actualizarUsuarioConId, ESTADO_INICIAL);
  const [rol, setRol] = useState(usuario.rol);

  const [passwordTemporal, setPasswordTemporal] = useState<string | null>(null);
  const [errorReset, setErrorReset] = useState("");
  const [reseteando, setReseteando] = useState(false);

  async function handleRestablecer() {
    if (!confirm(`¿Restablecer la contraseña de ${usuario.nombre}? Se van a cerrar todas sus sesiones activas.`)) {
      return;
    }
    setReseteando(true);
    setErrorReset("");
    const resultado = await restablecerPassword(usuario.id);
    setReseteando(false);
    if (!resultado.ok) {
      setErrorReset(resultado.error);
      return;
    }
    setPasswordTemporal(resultado.passwordTemporal);
  }

  const erroresCampo = estado && !estado.ok ? estado.errores : {};

  return (
    <div className="mx-auto w-full max-w-lg px-6 py-14">
      <h1 className="text-3xl font-serif font-semibold tracking-tight mb-8">Editar usuario</h1>

      <form action={formAction} className="space-y-5">
        <div>
          <label htmlFor="nombre" className="block text-sm text-ink-secondary mb-1.5">
            Nombre
          </label>
          <input
            id="nombre"
            name="nombre"
            defaultValue={usuario.nombre}
            className={`w-full h-11 rounded-md border bg-paper px-3.5 text-sm outline-none focus:ring-2 focus:ring-marino/15 ${
              erroresCampo.nombre ? "border-terracota" : "border-line focus:border-marino"
            }`}
          />
          {erroresCampo.nombre && <p className="mt-1 text-xs text-terracota">{erroresCampo.nombre}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm text-ink-secondary mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={usuario.email}
            className={`w-full h-11 rounded-md border bg-paper px-3.5 text-sm outline-none focus:ring-2 focus:ring-marino/15 ${
              erroresCampo.email ? "border-terracota" : "border-line focus:border-marino"
            }`}
          />
          {erroresCampo.email && <p className="mt-1 text-xs text-terracota">{erroresCampo.email}</p>}
        </div>

        <div>
          <label htmlFor="rol" className="block text-sm text-ink-secondary mb-1.5">
            Rol
          </label>
          <select
            id="rol"
            name="rol"
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            disabled={esPropioUsuario}
            className="w-full h-11 rounded-md border border-line bg-paper px-3.5 text-sm outline-none focus:border-marino focus:ring-2 focus:ring-marino/15 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="GERENTE">GERENTE</option>
            <option value="FINANZAS">FINANZAS</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          {esPropioUsuario && (
            <p className="mt-1 text-xs text-ink-muted">No podés cambiar tu propio rol.</p>
          )}
          {erroresCampo.rol && <p className="mt-1 text-xs text-terracota">{erroresCampo.rol}</p>}
        </div>

        {rol !== "ADMIN" && (
          <div>
            <p className="block text-sm text-ink-secondary mb-1.5">Empresas que puede ver</p>
            <div className="grid grid-cols-2 gap-2 rounded-md border border-line bg-paper px-3.5 py-3">
              {empresas.map((empresa) => (
                <label key={empresa.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="empresaIds"
                    value={empresa.id}
                    defaultChecked={usuario.empresaIds.includes(empresa.id)}
                  />
                  {empresa.nombre}
                </label>
              ))}
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="activo" defaultChecked={usuario.activo} />
          Usuario activo
        </label>

        {estado?.ok && estado.advertencia && (
          <p className="text-sm text-terracota bg-terracota-tint rounded-md px-3 py-2">
            {estado.advertencia}
          </p>
        )}
        {estado?.ok && (
          <p className="text-sm text-marino bg-marino-tint rounded-md px-3 py-2">Guardado.</p>
        )}

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={pendiente}
            className="h-11 px-5 rounded-md bg-marino text-white text-sm font-medium hover:bg-marino-dark transition disabled:opacity-60"
          >
            {pendiente ? "Guardando..." : "Guardar cambios"}
          </button>
          <Link href="/admin/usuarios" className="text-sm text-ink-secondary underline underline-offset-2">
            Volver al listado
          </Link>
        </div>
      </form>

      <div className="mt-10 border-t border-line-strong pt-6">
        <p className="text-sm font-medium mb-1">Restablecer contraseña</p>
        <p className="text-xs text-ink-muted mb-3">
          Genera una contraseña temporal nueva y cierra todas las sesiones activas de este usuario.
        </p>
        <button
          onClick={handleRestablecer}
          disabled={reseteando}
          className="h-10 px-4 rounded-md border border-line-strong text-sm hover:bg-paper-raised transition disabled:opacity-60"
        >
          {reseteando ? "Restableciendo..." : "Restablecer contraseña"}
        </button>
        {errorReset && <p className="mt-3 text-sm text-terracota">{errorReset}</p>}
        {passwordTemporal && (
          <p className="mt-3 text-sm bg-marino-tint text-marino rounded-md px-3 py-2">
            Contraseña temporal: <span className="font-mono font-semibold">{passwordTemporal}</span>
            <br />
            <span className="text-xs">Copiala ahora — no se va a volver a mostrar.</span>
          </p>
        )}
      </div>
    </div>
  );
}
