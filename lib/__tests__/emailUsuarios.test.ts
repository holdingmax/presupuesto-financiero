import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarEmail } from "@/lib/email";
import { autenticar, type UsuarioCredenciales } from "@/lib/autenticacion";
import { hashPassword } from "@/lib/password";
import { leerDatosUsuario } from "@/lib/usuarioDatos";

test("normalizarEmail recorta y pasa a minúsculas", () => {
  assert.equal(normalizarEmail("  FedericoDVigo@Gmail.COM \n"), "federicodvigo@gmail.com");
});

// Base falsa que, como Postgres, compara el email EXACTO (distingue mayúsculas): así el test
// falla si el login no normaliza lo que tipea el usuario.
async function baseExacta(emailGuardado: string, activo = true) {
  const usuario: UsuarioCredenciales & { email: string } = {
    id: "u1",
    email: emailGuardado,
    activo,
    passwordHash: await hashPassword("Clave-Temporal-23"),
  };
  return (emailBuscado: string) => Promise.resolve(emailBuscado === usuario.email ? usuario : null);
}

test("login: el mismo usuario entra con el email en minúsculas y en mayúsculas", async () => {
  const buscar = await baseExacta("federicodvigo@gmail.com");
  for (const tipeado of ["federicodvigo@gmail.com", "FEDERICODVIGO@GMAIL.COM", "  FederICOdvigo@Gmail.com "]) {
    const u = await autenticar(tipeado, "Clave-Temporal-23", buscar);
    assert.equal(u?.id, "u1", `debía entrar con ${JSON.stringify(tipeado)}`);
  }
});

test("login: clave incorrecta, usuario inactivo o inexistente no entran", async () => {
  const buscar = await baseExacta("fede@x.com");
  assert.equal(await autenticar("FEDE@x.com", "otra-clave", buscar), null);
  assert.equal(await autenticar("nadie@x.com", "Clave-Temporal-23", buscar), null);
  const inactivo = await baseExacta("fede@x.com", false);
  assert.equal(await autenticar("fede@x.com", "Clave-Temporal-23", inactivo), null);
});

test("alta/edición: el email del formulario se guarda en minúsculas y sin espacios", () => {
  const fd = new FormData();
  fd.set("nombre", "  Federico Vigo ");
  fd.set("email", "  FEDERICODVIGO@GMAIL.COM ");
  fd.set("rol", "GERENTE");
  fd.append("empresaIds", "e1");
  const datos = leerDatosUsuario(fd);
  assert.equal(datos.email, "federicodvigo@gmail.com");
  assert.equal(datos.nombre, "Federico Vigo");
  assert.deepEqual(datos.empresaIds, ["e1"]);
});
