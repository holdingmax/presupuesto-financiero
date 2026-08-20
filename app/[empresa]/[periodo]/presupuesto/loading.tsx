// Spinner básico mientras carga el presupuesto — cubre los cold-starts de
// Neon (puede tardar unos segundos en despertar si estuvo inactivo).
export default function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line-strong border-t-marino" />
    </div>
  );
}
