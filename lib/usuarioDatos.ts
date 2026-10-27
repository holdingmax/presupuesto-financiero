import { normalizarEmail } from "@/lib/email";

export type DatosUsuario = {
  nombre: string;
  email: string;
  rol: string;
  empresaIds: string[];
};

// Lectura del formulario de alta/edición de usuario. Vive acá (y no en
// app/admin/usuarios/actions.ts, que es "use server" y solo exporta async) para
// poder testear que el email siempre queda normalizado.
export function leerDatosUsuario(formData: FormData): DatosUsuario {
  return {
    nombre: String(formData.get("nombre") ?? "").trim(),
    email: normalizarEmail(String(formData.get("email") ?? "")),
    rol: String(formData.get("rol") ?? ""),
    empresaIds: formData.getAll("empresaIds").map(String),
  };
}
