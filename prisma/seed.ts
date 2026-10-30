// Seed inicial de empresas / unidades de negocio.
// Cargado a partir de lo mencionado en las reuniones con Vigo, Ricci y Macchi.
// Ajustar CUIT reales antes de pasar a producción.

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

// PENDIENTE: la lista sigue incluyendo Cielos, Tucson y "Logística / CREAR", que scripts/consolidar-empresas-2026-08.ts
// eliminó (no son entidades separadas). Un db:seed las vuelve a crear; limpiarlas queda para otro cambio.
const EMPRESAS = [
  "Havanna",
  "Fredy Publicidad",
  "Conexión Logística",
  "Brillante",
  "Mantenor",
  "Logística / CREAR",
  "Radio",
  "Handyway Cargo",
  "Havanna Perú",
  "Avianor",
  "Plate Silver",
  "Gold Seguridad",
  "Cielos",
  "Tucson",
  "Expensas",
];

async function main() {
  for (const nombre of EMPRESAS) {
    const existe = await prisma.empresa.findFirst({ where: { nombre } });
    if (!existe) {
      await prisma.empresa.create({ data: { nombre } });
    }
  }

  const passwordHash = process.env.SEED_ADMIN_PASSWORD
    ? await hashPassword(process.env.SEED_ADMIN_PASSWORD)
    : undefined;
  if (!passwordHash) {
    console.warn(
      "SEED_ADMIN_PASSWORD no está seteada — Leticia queda sin contraseña (no podrá loguearse)."
    );
  }

  await prisma.usuario.upsert({
    where: { email: "leticia.araoz@holdingmax.com" },
    update: passwordHash ? { passwordHash } : {},
    create: {
      nombre: "Leticia Araoz",
      email: "leticia.araoz@holdingmax.com",
      rol: "ADMIN",
      passwordHash,
    },
  });

  console.log("Seed completo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
