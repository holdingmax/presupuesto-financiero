"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { crearSesion, verifyPassword, cerrarSesion } from "@/lib/auth";

export type ResultadoLogin = { ok: false; error: string } | { ok: true };

const ERROR_GENERICO = "Email o contraseña incorrectos.";

export async function login(
  _estadoPrevio: ResultadoLogin | null,
  formData: FormData
): Promise<ResultadoLogin> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, error: "Ingresá tu email y tu contraseña." };
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });

  // Mismo mensaje genérico sin importar cuál de estas condiciones falló —
  // no hay que revelarle a quien intenta entrar cuál fue el problema exacto.
  if (!usuario || !usuario.activo || !usuario.passwordHash) {
    return { ok: false, error: ERROR_GENERICO };
  }

  const passwordValida = await verifyPassword(password, usuario.passwordHash);
  if (!passwordValida) {
    return { ok: false, error: ERROR_GENERICO };
  }

  await crearSesion(usuario.id);
  redirect("/");
}

export async function logout() {
  await cerrarSesion();
  redirect("/login");
}
