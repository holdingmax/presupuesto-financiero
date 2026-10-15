import { normalizarCuenta } from "@/lib/unidadesNegocio";
import { BANCOS_EXTRACTO, esBancoExtracto, NOMBRE_BANCO, type BancoExtracto } from "@/lib/extractos/tipos";

// Reglas de la lista de cuentas bancarias por empresa (plan docs/lector_bancos_plan.md
// §4.1). Funciones puras, sin base de datos: las usa la pantalla /admin/cuentas-bancarias
// (en el servidor, el cliente solo ayuda) y el selector de "Subir extracto".
//
// El nombre canónico es EXACTAMENTE el del madre de Kike: "MACRO 599", "GALICIA 731",
// "FRANCES 891" (BBVA), "BSE 560", "BNA 241", "SANT 099". El código del banco es la
// primera palabra del nombre.

export type CuentaExistente = { id: string; nombre: string; activa: boolean };

export type DatosCuenta = { nombre: string; banco: string; terminacion: string };

export type CuentaValidada = { nombre: string; banco: BancoExtracto; terminacion: string };

export type ResultadoValidacionCuenta =
  | { ok: true; cuenta: CuentaValidada }
  // reactivarId: ya existe una cuenta INACTIVA con ese nombre; se ofrece reactivarla.
  | { ok: false; error: string; reactivarId?: string };

const FORMA_NOMBRE = /^([A-Z]+) (\d+)$/;

// `existentes`: las cuentas de la MISMA empresa (activas e inactivas). `editandoId`: la
// cuenta que se está editando, para que no choque consigo misma.
export function validarCuenta(
  datos: DatosCuenta,
  existentes: CuentaExistente[],
  editandoId?: string
): ResultadoValidacionCuenta {
  const nombre = normalizarCuenta(datos.nombre);
  const forma = FORMA_NOMBRE.exec(nombre);
  if (!forma) {
    return { ok: false, error: 'El nombre tiene que ser el banco y el número, por ejemplo "MACRO 599".' };
  }
  const [, palabraBanco, numero] = forma;

  if (!esBancoExtracto(datos.banco)) {
    return { ok: false, error: `Banco no válido. Los bancos son: ${BANCOS_EXTRACTO.join(", ")}.` };
  }
  if (palabraBanco !== datos.banco) {
    return {
      ok: false,
      error: `El nombre empieza con ${palabraBanco} pero elegiste el banco ${datos.banco} (${NOMBRE_BANCO[datos.banco]}).`,
    };
  }

  const terminacion = datos.terminacion.trim();
  if (!/^\d{3,6}$/.test(terminacion)) {
    return { ok: false, error: "La terminación son entre 3 y 6 dígitos, sin otros caracteres." };
  }
  if (!numero.endsWith(terminacion)) {
    return {
      ok: false,
      error: `La terminación (${terminacion}) tiene que ser los últimos dígitos del número del nombre (${numero}).`,
    };
  }

  // Repetido dentro de la misma empresa, contando también las inactivas.
  const repetida = existentes.find((c) => c.id !== editandoId && normalizarCuenta(c.nombre) === nombre);
  if (repetida) {
    return repetida.activa
      ? { ok: false, error: `Ya existe la cuenta ${nombre} en esta empresa.` }
      : {
          ok: false,
          error: `Ya existe la cuenta ${nombre} en esta empresa, pero está inactiva. Reactivala en vez de crear otra.`,
          reactivarId: repetida.id,
        };
  }

  return { ok: true, cuenta: { nombre, banco: datos.banco, terminacion } };
}

// El selector de subida muestra solo las activas; las inactivas siguen existiendo (no se
// borran) para el historial. No modifica la lista que recibe.
export function cuentasActivas<T extends { activa: boolean }>(cuentas: T[]): T[] {
  return cuentas.filter((c) => c.activa);
}

// --- Validaciones al subir un extracto crudo -------------------------------------------

export type CuentaElegida = { nombre: string; banco: string; terminacion: string };

export type ResultadoControlCuentaArchivo = { ok: true; avisos: string[] } | { ok: false; error: string };

// 3 y 4 del plan §3.2: el banco detectado tiene que ser el de la cuenta elegida, y el número
// de cuenta del archivo tiene que terminar en la terminación de la cuenta elegida. Bloquea:
// cargar un extracto en la cuenta equivocada es el error más caro y silencioso. Galicia y
// Nación no traen número: se avisa que no se pudo verificar.
export function controlarCuentaDelArchivo(
  cuenta: CuentaElegida,
  bancoDetectado: BancoExtracto,
  cuentaEnArchivo: string | null
): ResultadoControlCuentaArchivo {
  if (bancoDetectado !== cuenta.banco) {
    const esperado = esBancoExtracto(cuenta.banco) ? NOMBRE_BANCO[cuenta.banco] : cuenta.banco;
    return {
      ok: false,
      error: `El archivo es de ${NOMBRE_BANCO[bancoDetectado]} pero elegiste ${cuenta.nombre} (${esperado}). No se cargó nada.`,
    };
  }
  if (cuentaEnArchivo === null) {
    return {
      ok: true,
      avisos: [`Este formato no trae el número de cuenta: no se pudo verificar que sea ${cuenta.nombre}.`],
    };
  }
  if (!cuentaEnArchivo.endsWith(cuenta.terminacion)) {
    return {
      ok: false,
      error: `El número de cuenta del archivo (termina en ${cuentaEnArchivo.slice(-4)}) no coincide con ${cuenta.nombre} (termina en ${cuenta.terminacion}). No se cargó nada.`,
    };
  }
  return { ok: true, avisos: [] };
}

// Si el archivo trae número de cuenta y no se eligió cuenta, la que coincide (banco +
// terminación) entre las activas — solo si es única.
export function sugerirCuenta<T extends { nombre: string; banco: string; terminacion: string; activa: boolean }>(
  cuentas: T[],
  bancoDetectado: BancoExtracto,
  cuentaEnArchivo: string | null
): T | null {
  if (cuentaEnArchivo === null) return null;
  const candidatas = cuentasActivas(cuentas).filter(
    (c) => c.banco === bancoDetectado && cuentaEnArchivo.endsWith(c.terminacion)
  );
  return candidatas.length === 1 ? candidatas[0] : null;
}
