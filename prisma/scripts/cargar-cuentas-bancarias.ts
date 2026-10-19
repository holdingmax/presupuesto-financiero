// Carga de la lista de cuentas bancarias del holding (tabla CuentaBancaria) a partir de
// UNIDAD_POR_CUENTA (lib/unidadesNegocio.ts). Mismas reglas que /admin/cuentas-bancarias:
// nombre único global (validarCuenta), empresa titular opcional (acá siempre null: el mapa
// no la trae), activa = true.
//
// Uso (DRY-RUN por defecto, no escribe nada):
//   npx tsx prisma/scripts/cargar-cuentas-bancarias.ts --host-esperado <host>
// Para escribir:
//   npx tsx prisma/scripts/cargar-cuentas-bancarias.ts --host-esperado <host> --aplicar
//
// - --host-esperado es OBLIGATORIO: se compara contra el host de DATABASE_URL ANTES de abrir
//   ninguna conexión; si no coincide, aborta. Nunca se imprime la URL ni la contraseña.
// - Idempotente: si ya existe una cuenta con ese nombre (activa o inactiva) se saltea sin
//   modificarla (no reactiva, no cambia banco/terminación/titular).
// - La unidad NO se guarda en CuentaBancaria (vive en UNIDAD_POR_CUENTA): se muestra solo
//   para revisar.

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { UNIDAD_POR_CUENTA, normalizarCuenta } from "@/lib/unidadesNegocio";
import { validarCuenta } from "@/lib/cuentasBancarias";

const CUENTAS_ESPERADAS = 49; // lista del commit b955e1c

// Cuentas cuya unidad está en duda: revisar con Kike antes de darlas por buenas.
const AMBIGUAS: Record<string, string> = {
  "GALICIA 388": "unidad en duda (hoy HAVANNA) — revisar con Kike",
  "MACRO 597": "unidad en duda (hoy HAVANNA) — revisar con Kike",
  "MACRO 247": "Flavia la ubica en Conexión (SPP); antes figuraba como BRILLANTE — confirmar",
  "GALICIA 455": "excepción: la razón social LI iría a BRILLANTE pero la cuenta es de SPP — confirmar",
  "MACRO 037": "posible misma cuenta que MACRO 8037 (grafía distinta) — confirmar si son 2 cuentas",
  "MACRO 8037": "posible misma cuenta que MACRO 037 (grafía distinta) — confirmar si son 2 cuentas",
};

function leerArgumento(nombre: string): string | null {
  const i = process.argv.indexOf(nombre);
  if (i === -1) return null;
  return process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : "";
}

// DATABASE_URL del entorno; si no está, la de .env (mismo archivo que usa Prisma por defecto).
function leerDatabaseUrl(): string | null {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const m = /^\s*DATABASE_URL\s*=\s*(.+?)\s*$/m.exec(readFileSync(".env", "utf8"));
    return m ? m[1].replace(/^["']|["']$/g, "") : null;
  } catch {
    return null;
  }
}

function hostDe(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null; // sin incluir la URL en ningún mensaje
  }
}

function abortar(mensaje: string): never {
  console.error(`ABORTO: ${mensaje}`);
  process.exit(1);
}

async function main() {
  const aplicar = process.argv.includes("--aplicar");
  const hostEsperado = leerArgumento("--host-esperado")?.trim().toLowerCase();
  if (!hostEsperado) abortar("falta --host-esperado <host>. No toqué la base.");

  // 1) Guardia de host, antes de cualquier acceso a la base.
  const url = leerDatabaseUrl();
  if (!url) abortar("no encontré DATABASE_URL (ni en el entorno ni en .env). No toqué la base.");
  const host = hostDe(url);
  if (!host) abortar("DATABASE_URL no es una URL válida. No toqué la base.");
  if (host !== hostEsperado) {
    abortar(`el host de DATABASE_URL no coincide con el esperado (${hostEsperado}). No toqué la base.`);
  }
  process.env.DATABASE_URL = url;
  console.log(`Host verificado: coincide con ${hostEsperado}.`);
  console.log(aplicar ? "MODO: APLICAR (escribe en la base)\n" : "MODO: DRY-RUN (no escribe nada; usar --aplicar para crear)\n");

  // 2) Cuentas a partir del mapa, validadas con las mismas reglas que la pantalla.
  const entradas = Object.entries(UNIDAD_POR_CUENTA);
  if (entradas.length !== CUENTAS_ESPERADAS) {
    console.warn(`AVISO: el mapa tiene ${entradas.length} cuentas y se esperaban ${CUENTAS_ESPERADAS}. Revisar antes de aplicar.\n`);
  }

  const prisma = new PrismaClient();
  try {
    const existentes = await prisma.cuentaBancaria.findMany({ select: { id: true, nombre: true, activa: true } });
    const nombresExistentes = new Set(existentes.map((c) => normalizarCuenta(c.nombre)));

    let aCrear = 0;
    let yaExisten = 0;
    let invalidas = 0;
    let creadas = 0;
    const ambiguasVistas: string[] = [];
    const yaVistas = new Set<string>(); // para validar contra lo que este mismo run ya va a crear

    for (const [nombreMapa, unidad] of entradas) {
      const nombre = normalizarCuenta(nombreMapa);
      const banco = nombre.split(" ")[0];
      const terminacion = nombre.split(" ")[1] ?? "";
      const etiqueta = `${nombre.padEnd(14)} → ${unidad.padEnd(9)}`;
      const aviso = AMBIGUAS[nombre];
      if (aviso) ambiguasVistas.push(`${nombre} (${unidad}): ${aviso}`);
      const marca = aviso ? "  ⚠ AMBIGUA" : "";

      if (nombresExistentes.has(nombre)) {
        yaExisten++;
        console.log(`EXISTE   ${etiqueta} se saltea, sin modificar${marca}`);
        continue;
      }

      const existentesParaValidar = [
        ...existentes,
        ...[...yaVistas].map((n) => ({ id: `nuevo:${n}`, nombre: n, activa: true })),
      ];
      const r = validarCuenta({ nombre, banco, terminacion }, existentesParaValidar);
      if (!r.ok) {
        invalidas++;
        console.log(`INVÁLIDA ${etiqueta} ${r.error}${marca}`);
        continue;
      }

      aCrear++;
      yaVistas.add(r.cuenta.nombre);
      if (!aplicar) {
        console.log(`CREARÍA  ${etiqueta} banco=${r.cuenta.banco} terminación=${r.cuenta.terminacion} titular=— activa=sí${marca}`);
        continue;
      }
      await prisma.cuentaBancaria.create({
        data: { empresaId: null, nombre: r.cuenta.nombre, banco: r.cuenta.banco, terminacion: r.cuenta.terminacion },
      });
      creadas++;
      console.log(`CREADA   ${etiqueta} banco=${r.cuenta.banco} terminación=${r.cuenta.terminacion}${marca}`);
    }

    console.log("\n=== Resumen ===");
    console.log(`En el mapa: ${entradas.length} | ya existen: ${yaExisten} | ${aplicar ? `creadas: ${creadas}` : `crearía: ${aCrear}`} | inválidas: ${invalidas}`);
    if (ambiguasVistas.length > 0) {
      console.log("\n=== AMBIGUAS: revisar con Kike ===");
      for (const a of ambiguasVistas) console.log(`- ${a}`);
    }
    if (!aplicar) console.log("\nDry-run: no se escribió nada.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Error:", e instanceof Error ? e.message : "desconocido");
  process.exit(1);
});
