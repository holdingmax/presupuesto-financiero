import Link from "next/link";
import type { VistaReporte } from "@/lib/reporte/vistaReporte";

const OPCIONES: { vista: VistaReporte; texto: string }[] = [
  { vista: "actual", texto: "Mostrar período actual" },
  { vista: "todo", texto: "Mostrar todo" },
];

// Filtro de columnas del Reporte: un mes o los meses anteriores también. Son links (?vista=), sin
// estado en el cliente; el mes lo sigue eligiendo el selector de mes. Control segmentado: un
// rectángulo con borde y etiqueta «Vista»; la opción activa va en marino lleno (aria-current="page").
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
    <nav
      aria-label="Vista del reporte"
      className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-line-strong bg-paper-raised p-1 text-xs"
    >
      <span aria-hidden="true" className="px-2 text-[11px] font-medium tracking-[0.12em] text-ink-secondary uppercase">
        Vista
      </span>
      {OPCIONES.map((o) => (
        <Link
          key={o.vista}
          href={`/${empresaSlug}/${periodo}/reporte?vista=${o.vista}`}
          aria-current={o.vista === vista ? "page" : undefined}
          className={`inline-flex min-h-9 items-center rounded-md px-3 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marino ${
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
