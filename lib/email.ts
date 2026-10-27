// Única forma de normalizar un email antes de guardarlo o buscarlo. Postgres compara
// strings distinguiendo mayúsculas (Usuario.email es @unique), así que sin esto
// "Fede@x.com" y "fede@x.com" son usuarios distintos y el login falla según cómo se tipee.
export function normalizarEmail(email: string) {
  return email.trim().toLowerCase();
}
