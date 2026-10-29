import Link from "next/link";
import type { VistaReporte } from "@/lib/reporte/vistaReporte";

const OPCIONES: { vista: VistaReporte; texto: string }[] = [
  { vista: "actual", texto: "Mostrar período actual" },
  { vista: "todo", texto: "Mostrar todo" },
];

// Filtro de columnas del Reporte: un mes o los meses anteriores también. Son links (?vista=), sin
// estado en el cliente; el mes lo sigue eligiendo el selector de mes.
export default function VistaSelector({
  empresaSlug,
  periodo,
  vista,
}: {
  empresaSlug: string;
  periodo: string;
  vista: VistaReporte;
}) {
  return (
    <nav aria-label="Vista del reporte" className="flex w-full items-center gap-1 px-3 pt-1 text-xs">
      {OPCIONES.map((o) => (
        <Link
          key={o.vista}
          href={`/${empresaSlug}/${periodo}/reporte?vista=${o.vista}`}
          aria-current={o.vista === vista ? "page" : undefined}
          className={`rounded-md px-2.5 py-1 transition ${
            o.vista === vista
              ? "bg-marino text-white font-medium"
              : "text-ink-secondary hover:text-ink hover:bg-paper-cool"
          }`}
        >
          {o.texto}
        </Link>
      ))}
    </nav>
  );
}
