import bcrypt from "bcryptjs";
import { randomInt } from "crypto";

// Separado de lib/auth.ts a propósito: ese archivo importa next/headers y
// next/navigation, que no existen fuera de un request de Next.js — este
// módulo no depende de nada de Next, así que también lo puede usar
// prisma/seed.ts (corre standalone con tsx, sin runtime de Next).

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// Alfabeto sin caracteres ambiguos (sin 0/O, 1/l/I) para que una contraseña
// temporal leída/dictada en voz alta o copiada a mano no se preste a confusión.
const ALFABETO_TEMPORAL = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generarPasswordTemporal(longitud = 16) {
  let password = "";
  for (let i = 0; i < longitud; i++) {
    password += ALFABETO_TEMPORAL[randomInt(ALFABETO_TEMPORAL.length)];
  }
  return password;
}
