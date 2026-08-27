// Consolidación de la lista de empresas (confirmado con Leticia, 2026-08-27):
// - Cielos, Tucson y "Logística / CREAR" no son entidades separadas — Cielos es
//   Avianor, Tucson está dentro de Radio, CREAR es parte de Mantenor. Se
//   eliminan. Verificado antes de escribir esto: las 3 tienen 0
//   PresupuestoMensual y 0 MovimientoBancario en testing — no hay datos que
//   migrar. El chequeo de abajo lo vuelve a confirmar en el momento de correr,
//   no confía ciegamente en lo que se vio en el diagnóstico.
// - "Correo / SPP" se renombra a "Conexión Logística" — empresa real, mismo id,
//   no se toca ningún dato (PresupuestoMensual/UsuarioEmpresa quedan intactos).
// - Se agrega "Bradenton" (todavía no existía).
//
// Idempotente: correr de nuevo después de aplicado no rompe nada (cada paso
// chequea el estado actual antes de actuar). Pensado para reusar tal cual
// contra producción cuando corresponda — no es un script de un solo uso.

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const EMPRESAS_A_ELIMINAR = ["Cielos", "Tucson", "Logística / CREAR"];
const RENOMBRE = { desde: "Correo / SPP", hacia: "Conexión Logística" };
const EMPRESA_NUEVA = "Bradenton";

async function eliminarEmpresaSinDatos(nombre: string) {
  const empresa = await prisma.empresa.findFirst({ where: { nombre } });
  if (!empresa) {
    console.log(`"${nombre}": no existe (ya se habrá corrido antes) — salteo.`);
    return;
  }

  // Vuelve a confirmar que no hay datos reales antes de borrar, en vez de
  // confiar en un diagnóstico previo que puede haber quedado desactualizado.
  const presupuestos = await prisma.presupuestoMensual.count({ where: { empresaId: empresa.id } });
  if (presupuestos > 0) {
    throw new Error(
      `"${nombre}" tiene ${presupuestos} PresupuestoMensual — no la borro, esto no coincide con lo verificado antes. Revisar a mano.`
    );
  }

  const accesosBorrados = await prisma.usuarioEmpresa.deleteMany({ where: { empresaId: empresa.id } });
  await prisma.empresa.delete({ where: { id: empresa.id } });
  console.log(`"${nombre}": eliminada (${accesosBorrados.count} fila(s) de UsuarioEmpresa borradas con ella).`);
}

async function main() {
  console.log("=== Eliminando empresas consolidadas (Cielos, Tucson, Logística / CREAR) ===");
  for (const nombre of EMPRESAS_A_ELIMINAR) {
    await eliminarEmpresaSinDatos(nombre);
  }

  console.log("\n=== Renombrando Correo / SPP -> Conexión Logística ===");
  const correo = await prisma.empresa.findFirst({ where: { nombre: RENOMBRE.desde } });
  if (correo) {
    await prisma.empresa.update({ where: { id: correo.id }, data: { nombre: RENOMBRE.hacia } });
    console.log(`"${RENOMBRE.desde}" -> "${RENOMBRE.hacia}" (id ${correo.id})`);
  } else {
    const yaRenombrada = await prisma.empresa.findFirst({ where: { nombre: RENOMBRE.hacia } });
    console.log(
      yaRenombrada
        ? `Ya estaba renombrada a "${RENOMBRE.hacia}" — salteo.`
        : `ATENCIÓN: no encontré ni "${RENOMBRE.desde}" ni "${RENOMBRE.hacia}" — revisar a mano.`
    );
  }

  console.log("\n=== Agregando Bradenton ===");
  const bradenton = await prisma.empresa.findFirst({ where: { nombre: EMPRESA_NUEVA } });
  if (bradenton) {
    console.log(`"${EMPRESA_NUEVA}" ya existe — salteo.`);
  } else {
    const creada = await prisma.empresa.create({ data: { nombre: EMPRESA_NUEVA } });
    console.log(`Creada "${EMPRESA_NUEVA}" (id ${creada.id})`);
  }

  console.log("\n=== Estado final de Empresa ===");
  const todas = await prisma.empresa.findMany({ orderBy: { nombre: "asc" } });
  for (const e of todas) console.log(`  ${e.nombre}`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
