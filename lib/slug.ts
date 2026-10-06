import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { quitarDiacriticos } from "@/lib/texto";

// PENDIENTE: el slug se calcula al vuelo a partir de Empresa.nombre en vez de
// persistirse en una columna propia. Es la respuesta correcta hoy (13 filas,
// nombre no es único, no hay pantalla para renombrar una empresa todavía) —
// si en algún momento se agrega gestión de empresas (crear/renombrar desde la
// UI), reconsiderar agregar una columna `slug` persistida para que las URLs
// no dependan de recalcular el mismo string en cada request.
// quitarDiacriticos se movió a lib/texto.ts (módulo puro, importable desde el
// cliente) — se re-exporta acá para no cambiar ningún import existente.
export { quitarDiacriticos };

export function slugify(texto: string): string {
  return quitarDiacriticos(texto)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// cache() de React deduplica esta consulta dentro de un mismo request —
// el layout y cada página pueden llamarla sin pegarle dos veces a la base.
export const listarEmpresas = cache(async () => {
  return prisma.empresa.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  });
});

// Solo lectura: nunca crea una empresa. El slug viene de texto arbitrario
// tipeado en la URL, así que un slug sin match real es "no existe", no
// "todavía no existe" — el llamador decide qué hacer (típicamente notFound()).
export const resolverEmpresaPorSlug = cache(async (slug: string) => {
  const empresas = await listarEmpresas();
  return empresas.find((empresa) => slugify(empresa.nombre) === slug) ?? null;
});
