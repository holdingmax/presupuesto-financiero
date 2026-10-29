// Exclusión mutua EN PROCESO (una instancia del servidor): sirve para que dos cargas pesadas no
// corran a la vez y sumen su memoria (docs: archivo madre por la web, una sola a la vez). No
// reemplaza a los locks de la base, que protegen los datos; esto protege la memoria.
// intentar() devuelve la función que libera, o null si ya hay una en curso.

export type ExclusionMutua = { intentar: () => (() => void) | null };

export function crearExclusionMutua(): ExclusionMutua {
  let ocupada = false;
  return {
    intentar() {
      if (ocupada) return null;
      ocupada = true;
      let liberada = false;
      return () => {
        if (liberada) return; // soltar dos veces no libera la carga de otro
        liberada = true;
        ocupada = false;
      };
    },
  };
}
