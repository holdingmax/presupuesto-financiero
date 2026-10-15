"use client";

import { useState } from "react";
import Link from "next/link";
import { BANCOS_EXTRACTO, NOMBRE_BANCO } from "@/lib/extractos/tipos";
import {
  cambiarEstadoCuentaBancaria,
  crearCuentaBancaria,
  editarCuentaBancaria,
  type CuentaDto,
} from "./actions";

type Empresa = { id: string; nombre: string; cuentasBancarias: CuentaDto[] };

type Props = { empresasIniciales: Empresa[] };

type Borrador = { nombre: string; banco: string; terminacion: string };
const BORRADOR_VACIO: Borrador = { nombre: "", banco: "MACRO", terminacion: "" };

const campo =
  "h-9 px-2 rounded-md border border-line bg-paper text-sm text-ink focus:outline-none focus:border-marino";

// Misma pantalla y molde que /admin/unidades-negocio: una tarjeta por empresa. Las reglas
// las vuelve a validar el servidor (lib/cuentasBancarias.ts); acá solo se ayuda a tipear.
export default function CuentasBancariasForm({ empresasIniciales }: Props) {
  const [empresas, setEmpresas] = useState(empresasIniciales);
  const [nuevas, setNuevas] = useState<Record<string, Borrador>>({});
  const [editando, setEditando] = useState<{ id: string; borrador: Borrador } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [mensajes, setMensajes] = useState<Record<string, { ok: boolean; texto: string; reactivarId?: string }>>({});

  function reemplazar(cuenta: CuentaDto) {
    setEmpresas((prev) =>
      prev.map((e) =>
        e.id !== cuenta.empresaId
          ? e
          : {
              ...e,
              cuentasBancarias: e.cuentasBancarias.some((c) => c.id === cuenta.id)
                ? e.cuentasBancarias.map((c) => (c.id === cuenta.id ? cuenta : c))
                : [...e.cuentasBancarias, cuenta],
            }
      )
    );
  }

  function avisar(empresaId: string, ok: boolean, texto: string, reactivarId?: string) {
    setMensajes((prev) => ({ ...prev, [empresaId]: { ok, texto, reactivarId } }));
  }

  async function agregar(empresaId: string) {
    const b = nuevas[empresaId] ?? BORRADOR_VACIO;
    setOcupado(true);
    const r = await crearCuentaBancaria(empresaId, b);
    setOcupado(false);
    if (!r.ok) return avisar(empresaId, false, r.error, r.reactivarId);
    reemplazar(r.cuenta);
    setNuevas((prev) => ({ ...prev, [empresaId]: BORRADOR_VACIO }));
    avisar(empresaId, true, ["Cuenta agregada.", ...r.avisos].join(" "));
  }

  async function guardarEdicion(cuenta: CuentaDto) {
    if (!editando) return;
    const cambioNombre = editando.borrador.nombre.trim().toUpperCase() !== cuenta.nombre;
    if (
      cambioNombre &&
      !window.confirm(
        "Cambiar el nombre NO modifica los movimientos ya cargados: siguen guardados con el nombre anterior. ¿Continuar?"
      )
    ) {
      return;
    }
    setOcupado(true);
    const r = await editarCuentaBancaria(cuenta.id, editando.borrador);
    setOcupado(false);
    if (!r.ok) return avisar(cuenta.empresaId, false, r.error);
    reemplazar(r.cuenta);
    setEditando(null);
    avisar(cuenta.empresaId, true, ["Cuenta guardada.", ...r.avisos].join(" "));
  }

  async function cambiarEstado(cuenta: CuentaDto, activa: boolean) {
    setOcupado(true);
    const r = await cambiarEstadoCuentaBancaria(cuenta.id, activa);
    setOcupado(false);
    if (!r.ok) return avisar(cuenta.empresaId, false, r.error);
    reemplazar(r.cuenta);
    avisar(cuenta.empresaId, true, activa ? "Cuenta reactivada." : "Cuenta desactivada (no se borra).");
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-14">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs tracking-[0.15em] text-ink-secondary uppercase mb-1">
            <span className="w-2 h-2 bg-plata" />
            Administración
          </p>
          <h1 className="text-4xl font-serif font-semibold tracking-tight">Cuentas bancarias</h1>
          <p className="mt-2 text-sm text-ink-secondary">
            Las cuentas de cada empresa para elegir al subir un extracto crudo del banco. El nombre
            es el mismo que usa el archivo madre (MACRO 599, GALICIA 731, FRANCES 891, BSE 560, BNA
            241, SANT 099). Las cuentas no se borran: se desactivan.
          </p>
        </div>
        <Link href="/" className="text-sm text-ink-secondary underline underline-offset-2 hover:text-ink">
          Volver
        </Link>
      </div>

      <div className="space-y-4">
        {empresas.map((empresa) => {
          const cuentas = [...empresa.cuentasBancarias].sort(
            (a, b) => Number(b.activa) - Number(a.activa) || a.nombre.localeCompare(b.nombre, "es")
          );
          const borrador = nuevas[empresa.id] ?? BORRADOR_VACIO;
          const mensaje = mensajes[empresa.id];
          return (
            <div key={empresa.id} className="rounded-md border border-line-strong bg-paper-raised px-5 py-4">
              <p className="text-sm font-medium">{empresa.nombre}</p>

              {cuentas.length === 0 ? (
                <p className="mt-2 text-xs text-ink-muted">Todavía no tiene cuentas cargadas.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line-hairline">
                  {cuentas.map((c) => {
                    const enEdicion = editando?.id === c.id;
                    return (
                      <li key={c.id} className={`py-2 ${c.activa ? "" : "opacity-50"}`}>
                        {enEdicion ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              value={editando.borrador.nombre}
                              onChange={(e) =>
                                setEditando({ id: c.id, borrador: { ...editando.borrador, nombre: e.target.value } })
                              }
                              className={`${campo} w-36`}
                              aria-label="Nombre"
                            />
                            <select
                              value={editando.borrador.banco}
                              onChange={(e) =>
                                setEditando({ id: c.id, borrador: { ...editando.borrador, banco: e.target.value } })
                              }
                              className={campo}
                              aria-label="Banco"
                            >
                              {BANCOS_EXTRACTO.map((b) => (
                                <option key={b} value={b}>
                                  {b} · {NOMBRE_BANCO[b]}
                                </option>
                              ))}
                            </select>
                            <input
                              value={editando.borrador.terminacion}
                              onChange={(e) =>
                                setEditando({
                                  id: c.id,
                                  borrador: { ...editando.borrador, terminacion: e.target.value.replace(/\D/g, "") },
                                })
                              }
                              inputMode="numeric"
                              className={`${campo} w-24`}
                              aria-label="Terminación"
                            />
                            <button
                              type="button"
                              disabled={ocupado}
                              onClick={() => guardarEdicion(c)}
                              className="h-8 px-3 rounded-md bg-marino text-white text-xs font-medium hover:bg-marino-dark disabled:opacity-40"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditando(null)}
                              className="h-8 px-3 rounded-md border border-line text-xs text-ink-secondary hover:border-line-strong"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm">
                              <span className="font-medium">{c.nombre}</span>
                              <span className="ml-3 text-xs text-ink-muted">
                                {NOMBRE_BANCO[c.banco as keyof typeof NOMBRE_BANCO] ?? c.banco} · termina en{" "}
                                {c.terminacion} · {c.activa ? "activa" : "inactiva"}
                              </span>
                            </p>
                            <div className="flex gap-3 text-xs">
                              <button
                                type="button"
                                disabled={ocupado}
                                onClick={() =>
                                  setEditando({
                                    id: c.id,
                                    borrador: { nombre: c.nombre, banco: c.banco, terminacion: c.terminacion },
                                  })
                                }
                                className="text-ink-secondary underline underline-offset-2 hover:text-ink"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                disabled={ocupado}
                                onClick={() => cambiarEstado(c, !c.activa)}
                                className="text-ink-secondary underline underline-offset-2 hover:text-ink"
                              >
                                {c.activa ? "Desactivar" : "Reactivar"}
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line-hairline pt-3">
                <input
                  value={borrador.nombre}
                  onChange={(e) => setNuevas((p) => ({ ...p, [empresa.id]: { ...borrador, nombre: e.target.value } }))}
                  placeholder="MACRO 599"
                  className={`${campo} w-36`}
                  aria-label="Nombre de la cuenta"
                />
                <select
                  value={borrador.banco}
                  onChange={(e) => setNuevas((p) => ({ ...p, [empresa.id]: { ...borrador, banco: e.target.value } }))}
                  className={campo}
                  aria-label="Banco"
                >
                  {BANCOS_EXTRACTO.map((b) => (
                    <option key={b} value={b}>
                      {b} · {NOMBRE_BANCO[b]}
                    </option>
                  ))}
                </select>
                <input
                  value={borrador.terminacion}
                  onChange={(e) =>
                    setNuevas((p) => ({ ...p, [empresa.id]: { ...borrador, terminacion: e.target.value.replace(/\D/g, "") } }))
                  }
                  placeholder="Terminación"
                  inputMode="numeric"
                  className={`${campo} w-28`}
                  aria-label="Terminación"
                />
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => agregar(empresa.id)}
                  className="h-8 px-3 rounded-md bg-marino text-white text-xs font-medium hover:bg-marino-dark active:scale-[0.99] transition disabled:opacity-40"
                >
                  Agregar cuenta
                </button>
              </div>

              {mensaje && (
                <p
                  className={`mt-3 text-xs rounded-md px-3 py-2 ${
                    mensaje.ok ? "text-marino bg-marino-tint" : "text-terracota bg-terracota-tint"
                  }`}
                >
                  {mensaje.texto}
                  {mensaje.reactivarId && (
                    <button
                      type="button"
                      className="ml-2 underline underline-offset-2"
                      onClick={() => {
                        const c = empresa.cuentasBancarias.find((x) => x.id === mensaje.reactivarId);
                        if (c) void cambiarEstado(c, true);
                      }}
                    >
                      Reactivar
                    </button>
                  )}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
