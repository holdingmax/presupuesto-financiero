import Link from "next/link";

type Props = {
  empresaSlug: string;
  periodo: string;
  numeroSemana: number;
  pagina: number;
  totalPaginas: number;
  // Filtro activo (ver soloSinClasificar en actions.ts) — se preserva al cambiar
  // de página, si no un "Siguiente" con el filtro prendido lo perdería en la
  // navegación.
  filtro?: string;
};

// Son <Link> planos (sin "use client"): funcionan igual dentro de un Server
// Component (rama de solo lectura) o de un Client Component (PanelImputacion).
export default function Paginacion({
  empresaSlug,
  periodo,
  numeroSemana,
  pagina,
  totalPaginas,
  filtro,
}: Props) {
  if (totalPaginas <= 1) return null;

  const base = `/${empresaSlug}/${periodo}/ejecucion/${numeroSemana}`;
  const sufijoFiltro = filtro ? `&filtro=${filtro}` : "";
  const hayAnterior = pagina > 1;
  const haySiguiente = pagina < totalPaginas;

  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      {hayAnterior ? (
        <Link
          href={`${base}?pagina=${pagina - 1}${sufijoFiltro}`}
          className="text-marino transition hover:text-marino-dark"
        >
          ‹ Anterior
        </Link>
      ) : (
        <span className="cursor-not-allowed text-ink-muted opacity-40">‹ Anterior</span>
      )}

      <span className="text-ink-secondary">
        Página {pagina} de {totalPaginas}
      </span>

      {haySiguiente ? (
        <Link
          href={`${base}?pagina=${pagina + 1}${sufijoFiltro}`}
          className="text-marino transition hover:text-marino-dark"
        >
          Siguiente ›
        </Link>
      ) : (
        <span className="cursor-not-allowed text-ink-muted opacity-40">Siguiente ›</span>
      )}
    </div>
  );
}
