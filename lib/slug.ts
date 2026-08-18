import { cache } from "react";
import { prisma } from "@/lib/prisma";

// PENDIENTE: el slug se calcula al vuelo a partir de Empresa.nombre en vez de
// persistirse en una columna propia. Es la respuesta correcta hoy (13 filas,
// nombre no es único, no hay pantalla para renombrar una empresa todavía) —
// si en algún momento se agrega gestión de empresas (crear/renombrar desde la
// UI), reconsiderar agregar una columna `slug` persistida para que las URLs
// no dependan de recalcular el mismo string en cada request.
// Rango Unicode de "combining diacritical marks" (0x0300–0x036f), construido
// con códigos numéricos en vez de escribir el rango \uXXXX literal — al
// tipear ese escape directamente termina insertándose el carácter combinante
// real en el archivo en lugar del texto del escape.
const MARCAS_DIACRITICAS = new RegExp(
  "[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]",
  "g"
);

export function quitarDiacriticos(texto: string): string {
  return texto.normalize("NFD").replace(MARCAS_DIACRITICAS, "");
}

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
