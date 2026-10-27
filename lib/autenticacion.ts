import { normalizarEmail } from "@/lib/email";
import { verifyPassword } from "@/lib/password";

// Lógica de credenciales del login, sin next/headers ni prisma para poder testearla:
// la búsqueda del usuario se inyecta (en el login real es prisma.usuario.findFirst
// con coincidencia insensible a mayúsculas, que además tolera emails viejos guardados
// con mayúsculas hasta que se corra prisma/scripts/normalizar-emails-usuarios.ts).
export type UsuarioCredenciales = {
  id: string;
  activo: boolean;
  passwordHash: string | null;
};

export async function autenticar<U extends UsuarioCredenciales>(
  emailTipeado: string,
  password: string,
  buscarPorEmail: (emailNormalizado: string) => Promise<U | null>
): Promise<U | null> {
  const usuario = await buscarPorEmail(normalizarEmail(emailTipeado));
  if (!usuario || !usuario.activo || !usuario.passwordHash) return null;
  return (await verifyPassword(password, usuario.passwordHash)) ? usuario : null;
}
