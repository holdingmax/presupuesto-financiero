import Link from "next/link";
import { enlacesDePeriodos } from "@/lib/periodosHabilitados";
import { nombreDePeriodo } from "@/lib/ejecucionSemanas";

// Selector de mes de la pantalla de Presupuesto (no está en NavTabs: Ejecución financiera y
// Reporte no lo tienen). Links a los períodos de lib/config.ts, con el actual resaltado.
export default function PeriodoSelector({ empresaSlug, periodo }: { empresaSlug: string; periodo: string }) {
  return (
    <nav aria-label="Mes del presupuesto" className="mx-auto flex w-full max-w-3xl items-center gap-1 px-6 pt-6 text-sm">
      <span className="mr-2 text-xs uppercase tracking-[0.15em] text-ink-secondary">Mes</span>
      {enlacesDePeriodos(empresaSlug, periodo).map((enlace) => (
        <Link
          key={enlace.periodo}
          href={enlace.href}
          aria-current={enlace.activo ? "page" : undefined}
          className={`rounded-md px-3 py-1.5 transition ${
            enlace.activo
              ? "bg-marino text-white font-medium"
              : "text-ink-secondary hover:text-ink hover:bg-paper-cool"
          }`}
        >
          {nombreDePeriodo(enlace.periodo)}
        </Link>
      ))}
    </nav>
  );
}
