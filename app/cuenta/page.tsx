import { requireUsuario } from "@/lib/auth";
import CambiarPasswordForm from "./CambiarPasswordForm";

export default async function CuentaPage() {
  const usuario = await requireUsuario();

  return (
    <div className="mx-auto w-full max-w-lg px-6 py-14">
      <p className="flex items-center gap-2 text-xs tracking-[0.15em] text-ink-secondary uppercase mb-1">
        <span className="w-2 h-2 bg-plata" />
        {usuario.nombre} · {usuario.email}
      </p>
      <h1 className="text-4xl font-serif font-semibold tracking-tight mb-8">Mi cuenta</h1>

      {usuario.debeActualizarPassword && (
        <p className="mb-6 text-sm text-terracota bg-terracota-tint rounded-md px-3 py-2">
          Tenés que definir tu propia contraseña antes de continuar.
        </p>
      )}

      <CambiarPasswordForm />
    </div>
  );
}
