"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { subirPagoReferencia } from "./actions";

type EstadoPagoReferencia = {
  total: number;
  liquidacionesFinales: number;
  ultimaCarga: string | null;
};

type Props = {
  estadoInicial: EstadoPagoReferencia;
};

export default function PagoReferenciaForm({ estadoInicial }: Props) {
  const router = useRouter();
  const [estado, setEstado] = useState(estadoInicial);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubir(e: React.FormEvent) {
    e.preventDefault();
    const archivo = fileInputRef.current?.files?.[0];
    if (!archivo) {
      setError("Elegí un archivo antes de subir.");
      return;
    }

    setSubiendo(true);
    setError("");
    setMensajeExito("");

    const formData = new FormData();
    formData.append("archivo", archivo);

    const resultado = await subirPagoReferencia(formData);

    setSubiendo(false);

    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }

    setMensajeExito(
      `Se importaron ${resultado.filasImportadas} pagos (${resultado.liquidacionesFinales} liquidaciones finales), reemplazando la carga anterior.`
    );
    setEstado({
      total: resultado.filasImportadas,
      liquidacionesFinales: resultado.liquidacionesFinales,
      ultimaCarga: new Date().toISOString(),
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-14">
      <div className="mb-8">
        <p className="flex items-center gap-2 text-xs tracking-[0.15em] text-ink-secondary uppercase mb-1">
          <span className="w-2 h-2 bg-plata" />
          Administración
        </p>
        <h1 className="text-4xl font-serif font-semibold tracking-tight">Pagos de referencia</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Planilla de pagos de Macchi (PAGOS_2025-2026.xlsx), usada para distinguir
          &quot;Liquidación final&quot; de &quot;Sueldos&quot; al subir un extracto bancario.
        </p>
      </div>

      <div className="mb-8 rounded-md border border-line-strong bg-paper-raised px-5 py-4 text-sm">
        <p className="text-ink-secondary">
          Cargados hoy: <span className="font-medium text-ink">{estado.total}</span> pagos, de los
          cuales <span className="font-medium text-ink">{estado.liquidacionesFinales}</span> son
          liquidaciones finales.
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          {estado.ultimaCarga
            ? `Última carga: ${new Date(estado.ultimaCarga).toLocaleString("es-AR")}`
            : "Todavía no se cargó ninguna planilla."}
        </p>
      </div>

      <form
        onSubmit={handleSubir}
        className="rounded-md border border-dashed border-line-strong bg-paper px-6 py-8 text-center"
      >
        <p className="text-sm text-ink-secondary mb-1">
          Subí PAGOS_2025-2026.xlsx (se leen todas las hojas mensuales del archivo —
          &quot;DEFINITIVO&quot; queda afuera, va atrasada).
        </p>
        <p className="text-xs text-ink-muted mb-4">
          Esto reemplaza por completo la carga anterior — no se acumula entre cargas.
        </p>

        <div className="flex items-center justify-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="text-sm text-ink-secondary file:mr-3 file:h-9 file:px-3 file:rounded-md file:border file:border-line file:bg-paper file:text-sm file:text-ink-secondary hover:file:border-line-strong"
          />
          <button
            type="submit"
            disabled={subiendo}
            className="h-9 px-4 rounded-md bg-marino text-white text-sm font-medium hover:bg-marino-dark transition disabled:opacity-50 whitespace-nowrap"
          >
            {subiendo ? "Subiendo..." : "Subir archivo"}
          </button>
        </div>

        {error && (
          <p className="mt-4 text-left text-sm text-terracota bg-terracota-tint rounded-md px-3 py-2">
            {error}
          </p>
        )}
        {mensajeExito && (
          <p className="mt-4 text-left text-sm text-marino bg-marino-tint rounded-md px-3 py-2">
            {mensajeExito}
          </p>
        )}
      </form>

      <p className="mt-6 text-sm">
        <Link href="/" className="text-ink-secondary underline underline-offset-2 hover:text-ink">
          ← Mis empresas
        </Link>
      </p>
    </div>
  );
}
