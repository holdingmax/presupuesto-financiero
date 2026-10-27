"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { crearSesion, cerrarSesion } from "@/lib/auth";
import { autenticar } from "@/lib/autenticacion";

export type ResultadoLogin = { ok: false; error: string } | { ok: true };

const ERROR_GENERICO = "Email o contraseña incorrectos.";

export async function login(
  _estadoPrevio: ResultadoLogin | null,
  formData: FormData
): Promise<ResultadoLogin> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email.trim() || !password) {
    return { ok: false, error: "Ingresá tu email y tu contraseña." };
  }

  // Mismo mensaje genérico sin importar cuál de estas condiciones falló (usuario
  // inexistente, inactivo, sin contraseña o contraseña incorrecta) — no hay que
  // revelarle a quien intenta entrar cuál fue el problema exacto. El email se
  // busca normalizado y sin distinguir mayúsculas (tolera filas viejas guardadas
  // con mayúsculas).
  const usuario = await autenticar(email, password, (emailNormalizado) =>
    prisma.usuario.findFirst({ where: { email: { equals: emailNormalizado, mode: "insensitive" } } })
  );
  if (!usuario) {
    return { ok: false, error: ERROR_GENERICO };
  }

  await crearSesion(usuario.id);
  redirect("/");
}

export async function logout() {
  await cerrarSesion();
  redirect("/login");
}
