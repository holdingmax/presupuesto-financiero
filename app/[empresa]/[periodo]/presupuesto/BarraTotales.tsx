import type { TotalesPresupuesto } from "@/lib/presupuestoTotales";

// Pesos enteros, como el resto de la pantalla (formatearImporte de PresupuestoForm). Se
// calcula en centavos; solo se redondea para mostrar.
function pesos(centavos: number) {
  return `$${(centavos / 100).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function Valor({ etiqueta, centavos, color }: { etiqueta: string; centavos: number; color?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-ink-muted">{etiqueta}</p>
      <p className={`tabular truncate text-sm font-semibold sm:text-base ${color ?? "text-ink"}`}>{pesos(centavos)}</p>
    </div>
  );
}

// Barra con los totales de las líneas guardadas del mes (lib/presupuestoTotales.ts). Se
// renderiza con datos del servidor, así que se actualiza sola con cada router.refresh().
// Sticky arriba y compacta para no tapar el formulario.
export default function BarraTotales({ totales }: { totales: TotalesPresupuesto }) {
  const { ingresos, egresos, diferencia, prestamos, sinClasificar } = totales;
  return (
    <div
      aria-label="Totales del presupuesto"
      className="sticky top-0 z-20 -mx-6 mb-6 border-b border-line-strong bg-paper-raised/95 px-6 py-2 backdrop-blur"
    >
      <div className="grid grid-cols-3 gap-3">
        <Valor etiqueta="Total ingresos" centavos={ingresos} />
        <Valor etiqueta="Total egresos" centavos={egresos} />
        <Valor
          etiqueta="Diferencia"
          centavos={diferencia}
          color={diferencia < 0 ? "text-negative" : diferencia > 0 ? "text-positive" : undefined}
        />
      </div>
      {prestamos.lineas > 0 && (
        <p className="mt-1 text-xs text-ink-muted">
          Préstamos: {pesos(prestamos.centavos)}, no incluidos en los totales
        </p>
      )}
      {sinClasificar.lineas > 0 && (
        <p className="mt-1 text-xs text-terracota">
          {sinClasificar.lineas === 1
            ? "1 línea sin clasificación válida"
            : `${sinClasificar.lineas} líneas sin clasificación válida`}{" "}
          ({pesos(sinClasificar.centavos)}): no están en ingresos ni en egresos.
        </p>
      )}
    </div>
  );
}
