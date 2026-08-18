import Link from "next/link";

export default function EmpresaNoEncontrada() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="mb-2 text-xs tracking-[0.15em] text-ink-muted uppercase">Error 404</p>
      <h1 className="mb-3 text-2xl font-serif font-semibold">No encontramos esa empresa</h1>
      <p className="mb-6 text-sm text-ink-secondary">
        Revisá la dirección o volvé a elegir la empresa desde el inicio.
      </p>
      <Link
        href="/login"
        className="inline-flex h-10 items-center rounded-md bg-marino px-4 text-sm font-medium text-white transition hover:bg-marino-dark"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
