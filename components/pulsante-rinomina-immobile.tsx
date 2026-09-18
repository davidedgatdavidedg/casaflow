// components/pulsante-rinomina-immobile.tsx
"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { rinominaImmobile } from "@/lib/actions/immobili";

/** Badge "matita" accanto a quello di eliminazione — stesso principio:
 * vive fuori dal <Link> che rende cliccabile l'intera scheda (sono
 * elementi fratelli, non annidati), quindi ogni interazione ferma
 * propagazione/comportamento di default per non attivare anche il
 * click sulla scheda sottostante.
 *
 * Il pop-up è montato con un portal su document.body, non nel punto
 * dell'albero dove il pulsante viene chiamato: senza, il markup del
 * pop-up (un <form> con un <h3> dentro) finirebbe annidato ovunque sia
 * il pulsante — e se quel contenitore è un elemento che accetta solo
 * testo (es. un <p>, come nel banner "Stai lavorando su" della pagina
 * di dettaglio), l'HTML risultante non è valido e React segnala un
 * errore di idratazione. Il portal rende il componente immune da dove
 * verrà usato in futuro, non solo dai casi già noti.
 *
 * onRinominato è opzionale: se il chiamante gestisce già il nome in
 * uno stato locale (es. la pagina di dettaglio, che è un componente
 * client), lo aggiorna direttamente lì invece di forzare un
 * router.refresh() — pensato per un componente server come il
 * portafoglio, dove non esiste altro modo di rispecchiare il nuovo
 * nome se non ricaricando i dati dal server. */
export default function PulsanteRinominaImmobile({
  id,
  nomeAttuale,
  onRinominato,
}: {
  id: string;
  nomeAttuale: string;
  onRinominato?: (nuovoNome: string) => void;
}) {
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [nome, setNome] = useState(nomeAttuale);
  const [inCorso, startTransition] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);

  function apri(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setNome(nomeAttuale); // riparte sempre dal nome attuale, non da un residuo di un tentativo precedente
    setErrore(null);
    setAperto(true);
  }

  function chiudi(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    setAperto(false);
  }

  function conferma(e: React.MouseEvent | React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const nomeRipulito = nome.trim();
    if (!nomeRipulito) {
      setErrore("Il nome non può essere vuoto.");
      return;
    }
    startTransition(async () => {
      try {
        await rinominaImmobile(id, nomeRipulito);
        setAperto(false);
        if (onRinominato) {
          onRinominato(nomeRipulito);
        } else {
          router.refresh();
        }
      } catch (err) {
        setErrore(
          err instanceof Error ? err.message : "Errore nel salvataggio del nome."
        );
      }
    });
  }

  const popup = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={chiudi}
    >
      <form
        className="w-full max-w-sm rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-5"
        onClick={(e) => e.stopPropagation()}
        onSubmit={conferma}
      >
        <h3 className="font-[var(--font-display)] text-lg text-[var(--brick)]">Rinomina immobile</h3>
        <label className="mt-3 block text-sm">
          <span className="mb-1.5 block text-[var(--muted)]">Nome</span>
          <input
            autoFocus
            className="w-full rounded-sm border border-[var(--rule)] bg-[var(--ink)] px-3 py-2 text-sm text-[var(--ink-text)] outline-none transition-colors focus:border-[var(--brass)] focus-visible:ring-2 focus-visible:ring-[var(--brass)]/40"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </label>
        {errore && <p className="mt-2 text-sm text-[var(--brick)]">{errore}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={chiudi}
            className="rounded-sm border border-[var(--rule)] px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:bg-white/5"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={inCorso}
            className="rounded-sm border border-[var(--brass)]/50 px-3 py-2 text-sm text-[var(--brass)] transition-colors hover:bg-[var(--brass)]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {inCorso ? "Salvataggio…" : "Salva"}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <>
      <button
        type="button"
        aria-label={`Rinomina ${nomeAttuale}`}
        onClick={apri}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--rule)] bg-[var(--ink)] text-[var(--muted)] transition-colors hover:border-[var(--brass)]/60 hover:text-[var(--brass)]"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
          <path
            d="M13.4 3.6a1.5 1.5 0 0 1 2.1 0l.9.9a1.5 1.5 0 0 1 0 2.1l-8 8-3.1.7.7-3.1 7.4-7.4Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {aperto && createPortal(popup, document.body)}
    </>
  );
}
