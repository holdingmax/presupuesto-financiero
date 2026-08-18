"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { segmento: "presupuesto", etiqueta: "Presupuesto" },
  { segmento: "ejecucion", etiqueta: "Ejecución financiera" },
] as const;

type Props = {
  empresaSlug: string;
  periodo: string;
};

export default function NavTabs({ empresaSlug, periodo }: Props) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 px-6 pb-3 text-sm">
      {TABS.map((tab) => {
        const href = `/${empresaSlug}/${periodo}/${tab.segmento}`;
        const activo = pathname?.startsWith(href) ?? false;
        return (
          <Link
            key={tab.segmento}
            href={href}
            className={`rounded-md px-3 py-1.5 transition ${
              activo
                ? "bg-marino text-white font-medium"
                : "text-ink-secondary hover:text-ink hover:bg-paper-cool"
            }`}
          >
            {tab.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
