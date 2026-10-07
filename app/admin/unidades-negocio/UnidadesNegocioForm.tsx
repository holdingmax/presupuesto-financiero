"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UNIDADES_NEGOCIO } from "@/lib/unidadesNegocio";
import { guardarUnidadesEmpresa } from "./actions";

type EmpresaUnidades = { id: string; nombre: string; unidadesNegocio: string[] };

type Props = { empresasIniciales: EmpresaUnidades[] };

// Una tarjeta por empresa con las unidades de UNIDADES_NEGOCIO como casilleros.
// Una unidad que ya pertenece a OTRA empresa se muestra deshabilitada con el
// nombre de esa empresa — la regla "una unidad, una empresa" la vuelve a validar
// el server (guardarUnidadesEmpresa), que es la barrera real.
export default function UnidadesNegocioForm({ empresasIniciales }: Props) {
  const router = useRouter();
  const [empresas, setEmpresas] = useState(empresasIniciales);
  const [seleccion, setSeleccion] = useState<Record<string, string[]>>(
    Object.fromEntries(empresasIniciales.map((e) => [e.id, e.unidadesNegocio]))
  );
  const [guardando, setGuardando] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Record<string, { ok: boolean; texto: string }>>({});

  const duenoDe = (unidad: string, exceptoId: string) =>
    empresas.find((e) => e.id !== exceptoId && e.unidadesNegocio.includes(unidad))?.nombre ?? null;

  function alternar(empresaId: string, unidad: string) {
    setSeleccion((prev) => {
      const actual = prev[empresaId] ?? [];
      return {
        ...prev,
        [empresaId]: actual.includes(unidad) ? actual.filter((u) => u !== unidad) : [...actual, unidad],
      };
    });
    setMensajes((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== empresaId)));
  }

  async function guardar(empresa: EmpresaUnidades) {
    setGuardando(empresa.id);
    const resultado = await guardarUnidadesEmpresa(empresa.id, seleccion[empresa.id] ?? []);
    setGuardando(null);
    if (!resultado.ok) {
      setMensajes((prev) => ({ ...prev, [empresa.id]: { ok: false, texto: resultado.error } }));
      return;
    }
    setEmpresas((prev) => prev.map((e) => (e.id === empresa.id ? { ...e, unidadesNegocio: resultado.unidades } : e)));
    setSeleccion((prev) => ({ ...prev, [empresa.id]: resultado.unidades }));
    setMensajes((prev) => ({ ...prev, [empresa.id]: { ok: true, texto: "Guardado." } }));
    router.refresh();
  }

  const sinEmpresa = UNIDADES_NEGOCIO.filter((u) => !empresas.some((e) => e.unidadesNegocio.includes(u)));

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-14">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs tracking-[0.15em] text-ink-secondary uppercase mb-1">
            <span className="w-2 h-2 bg-plata" />
            Administración
          </p>
          <h1 className="text-4xl font-serif font-semibold tracking-tight">Unidades de negocio</h1>
          <p className="mt-2 text-sm text-ink-secondary">
            Qué unidades pertenecen a cada empresa. El Reporte suma como real de una empresa los
            movimientos de sus unidades, vengan del extracto que vengan. Cada unidad pertenece a una
            sola empresa.
          </p>
        </div>
        <Link href="/" className="text-sm text-ink-secondary underline underline-offset-2 hover:text-ink">
          Volver
        </Link>
      </div>

      {sinEmpresa.length > 0 && (
        <p className="mb-6 text-xs text-ink-muted">
          Sin empresa todavía: {sinEmpresa.join(", ")} — en el Reporte aparecen en el bloque &quot;No
          asignado a ninguna empresa&quot;.
        </p>
      )}

      <div className="space-y-4">
        {empresas.map((empresa) => {
          const elegidas = seleccion[empresa.id] ?? [];
          const cambio =
            [...elegidas].sort().join(",") !== [...empresa.unidadesNegocio].sort().join(",");
          const mensaje = mensajes[empresa.id];
          return (
            <div key={empresa.id} className="rounded-md border border-line-strong bg-paper-raised px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{empresa.nombre}</p>
                <button
                  type="button"
                  disabled={!cambio || guardando !== null}
                  onClick={() => guardar(empresa)}
                  className="h-8 px-3 rounded-md bg-marino text-white text-xs font-medium hover:bg-marino-dark active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {guardando === empresa.id ? "Guardando..." : "Guardar"}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {UNIDADES_NEGOCIO.map((unidad) => {
                  const dueno = duenoDe(unidad, empresa.id);
                  return (
                    <label
                      key={unidad}
                      title={dueno ? `Ya pertenece a ${dueno}` : undefined}
                      className={`flex items-center gap-1.5 text-xs ${dueno ? "text-ink-faint" : "text-ink-secondary cursor-pointer"}`}
                    >
                      <input
                        type="checkbox"
                        checked={elegidas.includes(unidad)}
                        disabled={dueno !== null && !elegidas.includes(unidad)}
                        onChange={() => alternar(empresa.id, unidad)}
                        className="accent-marino"
                      />
                      {unidad}
                      {dueno && <span className="text-ink-faint">({dueno})</span>}
                    </label>
                  );
                })}
              </div>
              {mensaje && (
                <p className={`mt-2 text-xs ${mensaje.ok ? "text-verde" : "text-terracota"}`}>{mensaje.texto}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
