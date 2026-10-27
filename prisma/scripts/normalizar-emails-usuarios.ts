// Pasa a minúsculas (y recorta espacios) Usuario.email, para alinear los datos existentes con
// lib/email.ts (normalizarEmail). Motivo: el login distinguía mayúsculas y un email guardado
// como "FEDE@X.COM" fallaba al tipearlo en minúsculas.
//
// DRY-RUN POR DEFECTO: sin flags solo hace SELECT y muestra qué filas cambiaría. Para escribir
// hay que pasar --aplicar explícitamente. Antes de escribir, verifica que la normalización no
// genere duplicados (ni entre las filas a cambiar ni contra filas que ya están en minúsculas):
// si los hay, aborta con código 1 sin tocar nada.
//
// Uso (apuntando a la base con el env-file que corresponda):
//   npx tsx --env-file=.env.testing.local prisma/scripts/normalizar-emails-usuarios.ts            # dry-run
//   npx tsx --env-file=.env.testing.local prisma/scripts/normalizar-emails-usuarios.ts --aplicar  # escribe

import { prisma } from "@/lib/prisma";
import { normalizarEmail } from "@/lib/email";

const aplicar = process.argv.includes("--aplicar");

function nombreDeBase() {
  try {
    return new URL(process.env.DATABASE_URL ?? "").pathname.replace(/^\//, "") || "(desconocida)";
  } catch {
    return "(desconocida)";
  }
}

async function main() {
  console.log(`Base: ${nombreDeBase()} · modo: ${aplicar ? "APLICAR (escribe)" : "dry-run (solo lectura)"}`);

  const usuarios = await prisma.usuario.findMany({
    select: { id: true, email: true, nombre: true },
    orderBy: { createdAt: "asc" },
  });

  const grupos = new Map<string, typeof usuarios>();
  for (const u of usuarios) {
    const clave = normalizarEmail(u.email);
    grupos.set(clave, [...(grupos.get(clave) ?? []), u]);
  }

  const duplicados = [...grupos.entries()].filter(([, filas]) => filas.length > 1);
  if (duplicados.length > 0) {
    console.error("ABORTA: la normalización generaría emails duplicados:");
    for (const [clave, filas] of duplicados) {
      console.error(`  ${clave}: ${filas.map((f) => JSON.stringify(f.email)).join(", ")}`);
    }
    process.exitCode = 1;
    return;
  }

  const cambios = usuarios
    .map((u) => ({ ...u, nuevo: normalizarEmail(u.email) }))
    .filter((u) => u.nuevo !== u.email);

  console.log(`Usuarios: ${usuarios.length} · filas que cambiarían: ${cambios.length} · duplicados: 0`);
  for (const c of cambios) {
    console.log(`  ${c.id}  ${c.nombre}: ${JSON.stringify(c.email)} -> ${JSON.stringify(c.nuevo)}`);
  }

  if (!aplicar) {
    console.log("Dry-run: no se escribió nada. Pasar --aplicar para ejecutar el cambio.");
    return;
  }
  if (cambios.length === 0) {
    console.log("Nada para cambiar.");
    return;
  }

  await prisma.$transaction(
    cambios.map((c) => prisma.usuario.update({ where: { id: c.id }, data: { email: c.nuevo } }))
  );
  console.log(`Aplicado: ${cambios.length} fila(s) actualizadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
