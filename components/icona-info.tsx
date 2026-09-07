// components/icona-info.tsx
"use client";

import { useState } from "react";
import { CAMPI_DOCUMENTATI } from "@/lib/documentazione/campi";

/** Icona ⓘ accanto a un'etichetta di campo: al passaggio del mouse (o
 * tocco) mostra la spiegazione breve del campo, con un link che porta
 * dritto alla sezione corrispondente nella pagina /documentazione. */
export default function IconaInfo({ campoId }: { campoId: string }) {
  const [aperto, setAperto] = useState(false);
  const campo = CAMPI_DOCUMENTATI.find((c) => c.id === campoId);

  if (!campo) return null;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setAperto((v) => !v)}
        onMouseEnter={() => setAperto(true)}
        onMouseLeave={() => setAperto(false)}
        className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[var(--muted)] text-[9px] leading-none text-[var(--muted)] hover:border-[var(--brass)] hover:text-[var(--brass)]"
        aria-label={`Informazioni su ${campo.etichetta}`}
      >
        i
      </button>
      {aperto && (
        <div
          className="absolute left-0 top-full z-30 mt-1 w-64 rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-3 text-xs shadow-lg"
          onMouseEnter={() => setAperto(true)}
          onMouseLeave={() => setAperto(false)}
        >
          <p className="leading-relaxed text-[var(--ink-text)]">{campo.spiegazioneBreve}</p>
          {campo.vociImpattate.length > 0 && (
            <a
              href={`/documentazione#${campo.vociImpattate[0]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-[var(--brass)] hover:underline"
            >
              Approfondisci →
            </a>
          )}
        </div>
      )}
    </span>
  );
}
