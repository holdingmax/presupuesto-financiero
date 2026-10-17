// Spinner básico mientras carga Ejecución (índice y semana) — cubre los
// cold-starts de Neon (puede tardar unos segundos en despertar si estuvo
// inactivo). Al vivir en este nivel, cubre también /ejecucion/[numeroSemana].
export default function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line-strong border-t-marino" />
    </div>
  );
}
