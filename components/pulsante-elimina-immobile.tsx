// components/pulsante-elimina-immobile.tsx
"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { eliminaImmobile } from "@/lib/actions/immobili";

/** Icona cestino in un badge che sporge dall'angolo in alto a destra
 * della schedina — sta FUORI dal <Link> che rende cliccabile l'intera
 * scheda (sono elementi fratelli, non annidati): un <button> dentro un
 * <a> non è HTML valido e crea problemi di accessibilità/idratazione.
 *
 * onClick con preventDefault/stopPropagation ovunque: il pulsante vive
 * sopra un elemento cliccabile (o vicinissimo ad esso), e senza questo
 * un click sul cestino o dentro il pop-up finirebbe per attivare anche
 * la navigazione della scheda sottostante.
 *
 * Il pop-up di conferma è montato con un portal su document.body, non
 * nel punto dell'albero dove il pulsante viene chiamato: senza,
 * finirebbe annidato ovunque sia il pulsante — e se quel contenitore è
 * un elemento che accetta solo testo (es. un <p>), l'HTML risultante
 * non è valido e React segnala un errore di idratazione (successo
 * proprio con il pulsante di rinomina, stesso pattern, quando è stato
 * messo dentro un <p>). Il portal rende il componente immune da dove
 * verrà usato in futuro, non solo dai casi già noti. */
export default function PulsanteEliminaImmobile({
  id,
  nome,
}: {
  id: string;
  nome: string;
}) {
  const router = useRouter();
  const [confermaAperta, setConfermaAperta] = useState(false);
  const [inCorso, startTransition] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);

  function apriConferma(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setErrore(null);
    setConfermaAperta(true);
  }

  function chiudiConferma(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    setConfermaAperta(false);
  }

  function confermaEliminazione(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      try {
        await eliminaImmobile(id);
        setConfermaAperta(false);
        router.refresh(); // ricarica l'elenco lato server senza la voce appena eliminata
      } catch (errore) {
        setErrore(
          errore instanceof Error ? errore.message : "Errore nell'eliminazione."
        );
      }
    });
  }

  const popup = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={chiudiConferma}
    >
      <div
        className="w-full max-w-sm rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-[var(--font-display)] text-lg text-[var(--brick)]">
          Eliminare questo immobile?
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Stai per eliminare{" "}
          <span className="font-medium text-[var(--ink-text)]">{nome}</span>.
          Non sarà più visibile né modificabile da qui in poi.
        </p>
        {errore && (
          <p className="mt-2 text-sm text-[var(--brick)]">{errore}</p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={chiudiConferma}
            className="rounded-sm border border-[var(--rule)] px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:bg-white/5"
          >
            Annulla
          </button>
          <button
            type="button"
            disabled={inCorso}
            onClick={confermaEliminazione}
            className="rounded-sm border border-[var(--brick)]/50 px-3 py-2 text-sm text-[var(--brick)] transition-colors hover:bg-[var(--brick)]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {inCorso ? "Eliminazione…" : "Elimina"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        aria-label={`Elimina ${nome}`}
        onClick={apriConferma}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--rule)] bg-[var(--ink)] text-[var(--muted)] transition-colors hover:border-[var(--brick)]/60 hover:text-[var(--brick)]"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
          <path
            d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m-6 0 .6 10.2A1.5 1.5 0 0 0 8.1 17.6h3.8a1.5 1.5 0 0 0 1.5-1.4L14 6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {confermaAperta && createPortal(popup, document.body)}
    </>
  );
}
