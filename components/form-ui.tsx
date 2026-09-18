// components/form-ui.tsx
//
// "Mattoncini" riusabili del form di CasaFlow: componenti di presentazione
// puri, senza stato proprio, riceve tutto via props. Estratti da
// calcolatore-quick-mode.tsx per renderlo più piccolo e per poterli
// riusare in futuri form (es. una eventuale pagina di confronto tra
// immobili) senza duplicare markup.
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import IconaInfo from "@/components/icona-info";

export const classiInput =
  "w-full rounded-sm border border-[var(--rule)] bg-[var(--ink)] px-3 py-2 text-sm text-[var(--ink-text)] outline-none transition-colors focus:border-[var(--brass)] focus-visible:ring-2 focus-visible:ring-[var(--brass)]/40";

/** Formattatore condiviso per la colonna risultati: 1 decimale fisso,
 * per omogeneità visiva tra tutti i pannelli. */
export const formatoEuroColonna = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Foglio/particella/subalterno sono opzionali (stringa vuota = non
 * specificato, sempre valido); se compilati devono essere numeri interi
 * maggiori di 0. */
export function identificativoValido(valore: string): boolean {
  if (valore === "") return true;
  return /^\d+$/.test(valore) && parseInt(valore, 10) > 0;
}

export function BoxAvanzato({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-5 rounded-sm border border-white/10 bg-white/5 p-4 sm:col-span-2 sm:grid-cols-2">
      {children}
    </div>
  );
}

export function SezioneForm({
  numero,
  titolo,
  children,
}: {
  numero: string;
  titolo: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-baseline gap-3">
        <span className="font-[var(--font-mono)] text-xs text-[var(--brass)]">
          {numero}
        </span>
        <h2 className="font-[var(--font-display)] text-lg">{titolo}</h2>
        <div className="h-px flex-1 bg-[var(--rule)]" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function Campo({
  label,
  unita,
  modificato,
  infoId,
  children,
}: {
  label: string;
  unita?: string;
  modificato?: boolean;
  infoId?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 flex items-center gap-1.5 text-[var(--muted)]">
        {label}
        {unita ? ` (${unita})` : ""}
        {infoId && <IconaInfo campoId={infoId} />}
        {modificato && (
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--brass)]"
            title="Valore modificato rispetto all'immobile di prova caricato"
          />
        )}
      </span>
      {children}
    </label>
  );
}

export function InputNumero({
  valore,
  onChange,
  step = 1,
}: {
  valore: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <input
      className={classiInput}
      type="number"
      step={step}
      value={valore}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
    />
  );
}

/** Inserisce il punto delle migliaia manualmente, senza affidarsi a
 * Intl.NumberFormat: la locale "it-IT" raggruppa le migliaia solo a
 * partire da 5 cifre per una regola di ECMA-402 (minimumGroupingDigits),
 * quindi "1800" resterebbe senza punto — non quello che vogliamo qui.
 * La regex inserisce un punto prima di ogni gruppo di 3 cifre che ha
 * almeno un'altra cifra prima di sé (\B = non a inizio numero). */
function formattaMigliaia(numero: number): string {
  return Math.round(numero).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Campo numerico per importi assoluti "pieni" (prezzo, ristrutturazione,
 * canone, mutuo, ecc.): mostra il valore con il separatore delle
 * migliaia (1.000, non 1000) IN TEMPO REALE mentre si digita, e
 * affianca due pulsanti su/giù con uno step configurabile (default 5).
 *
 * Un <input type="number"> nativo non può mostrare "1.000" (il punto
 * non è un formato numerico valido per il browser), quindi questo è un
 * campo di testo con parsing/formattazione manuali. La parte delicata è
 * non far "saltare" il cursore a fine campo ogni volta che il testo
 * viene riformattato durante la digitazione: la posizione del cursore
 * viene quindi tradotta in "quante cifre ci sono prima di esso" PRIMA
 * di riformattare, e ricostruita cercando la stessa quantità di cifre
 * nel nuovo testo formattato, subito dopo.
 *
 * NON usare per percentuali o conteggi piccoli (tasso mutuo, anni,
 * rivalutazione): per quelli resta valido InputNumero, che mantiene i
 * decimali e le frecce native del browser.
 */
export function InputNumeroMigliaia({
  valore,
  onChange,
  step = 5,
  min = 0,
  mostraStepper = true,
  prefisso,
  suffisso,
}: {
  valore: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  mostraStepper?: boolean;
  prefisso?: string;
  suffisso?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Non null SOLO nell'istante tra una digitazione e il successivo
  // ripristino del cursore — vedi gestisciCambiamento/useLayoutEffect.
  const cifrePrimaDelCursoreRef = useRef<number | null>(null);

  const [testoVisualizzato, setTestoVisualizzato] = useState(() =>
    formattaMigliaia(valore)
  );

  // Se il valore cambia dall'esterno (caricamento di un salvataggio, un
  // clic sulle frecce, o il genitore che sovrascrive il valore) e non
  // stiamo già gestendo una digitazione in corso, riformatta da zero.
  useEffect(() => {
    if (cifrePrimaDelCursoreRef.current === null) {
      setTestoVisualizzato(formattaMigliaia(valore));
    }
  }, [valore]);

  // Dopo che il testo digitato è stato riformattato (nel render
  // successivo a gestisciCambiamento), riposiziona il cursore nello
  // stesso punto "logico" (stesso numero di cifre prima di esso) invece
  // di lasciarlo saltare a fine campo.
  useLayoutEffect(() => {
    if (cifrePrimaDelCursoreRef.current === null) return;
    const input = inputRef.current;
    if (input) {
      const posizione = trovaPosizioneCursore(
        testoVisualizzato,
        cifrePrimaDelCursoreRef.current
      );
      input.setSelectionRange(posizione, posizione);
    }
    cifrePrimaDelCursoreRef.current = null;
  }, [testoVisualizzato]);

  function gestisciCambiamento(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const posizioneCursore = input.selectionStart ?? input.value.length;
    const testoGrezzo = input.value;

    const cifrePrimaDelCursore = testoGrezzo
      .slice(0, posizioneCursore)
      .replace(/\D/g, "").length;

    const soloCifre = testoGrezzo.replace(/\D/g, "");
    const numero = soloCifre === "" ? 0 : parseInt(soloCifre, 10);

    cifrePrimaDelCursoreRef.current = cifrePrimaDelCursore;
    onChange(numero);
    setTestoVisualizzato(formattaMigliaia(numero));
  }

  function incrementa(delta: number) {
    onChange(Math.max(valore + delta, min));
  }

  return (
    <div className="flex">
      {prefisso && (
        <span className="flex items-center rounded-l-sm border border-r-0 border-[var(--rule)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)]">
          {prefisso}
        </span>
      )}
      <input
        ref={inputRef}
        className={`${classiInput} ${prefisso ? "rounded-l-none" : ""} ${mostraStepper ? "rounded-r-none border-r-0" : ""} ${suffisso ? "rounded-r-none border-r-0" : ""}`}
        type="text"
        inputMode="numeric"
        value={testoVisualizzato}
        onChange={gestisciCambiamento}
      />
      {suffisso && (
        <span className={`flex items-center border border-l-0 border-[var(--rule)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] ${mostraStepper ? "" : "rounded-r-sm"}`}>
          {suffisso}
        </span>
      )}
      {mostraStepper && (
        <div className={`flex shrink-0 flex-col overflow-hidden rounded-r-sm border border-[var(--rule)] ${suffisso ? "border-l-0" : ""}`}>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => incrementa(step)}
            aria-label="Aumenta"
            className="flex-1 px-2 text-[10px] leading-none text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-[var(--brass)]"
          >
            ▲
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => incrementa(-step)}
            aria-label="Diminuisci"
            className="flex-1 border-t border-[var(--rule)] px-2 text-[10px] leading-none text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-[var(--brass)]"
          >
            ▼
          </button>
        </div>
      )}
    </div>
  );
}

/** Cerca la posizione (indice di carattere) nel testo formattato subito
 * dopo la N-esima cifra, dove N = cifreDaContare — usata per rimettere
 * il cursore "nello stesso punto logico" dopo che il testo è stato
 * riformattato con separatori delle migliaia. */
function trovaPosizioneCursore(testo: string, cifreDaContare: number): number {
  if (cifreDaContare === 0) return 0;
  let cifreViste = 0;
  for (let i = 0; i < testo.length; i++) {
    if (/\d/.test(testo[i])) {
      cifreViste++;
      if (cifreViste === cifreDaContare) return i + 1;
    }
  }
  return testo.length;
}

export function ToggleSiNo({
  valore,
  onChange,
}: {
  valore: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex gap-2">
      {[
        { etichetta: "Sì", val: true },
        { etichetta: "No", val: false },
      ].map(({ etichetta, val }) => (
        <button
          key={etichetta}
          type="button"
          onClick={() => onChange(val)}
          className={`flex-1 rounded-sm border px-3 py-2 text-sm transition-colors ${
            valore === val
              ? "border-[var(--brass)] bg-[var(--brass)]/15 text-[var(--brass)]"
              : "border-[var(--rule)] text-[var(--muted)]"
          }`}
        >
          {etichetta}
        </button>
      ))}
    </div>
  );
}

export function RigaDati({
  etichetta,
  valore,
  negativo,
  enfasi,
}: {
  etichetta: string;
  valore: string;
  negativo?: boolean;
  enfasi?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[var(--muted)]">{etichetta}</dt>
      <dd
        className={
          enfasi
            ? "text-base font-medium text-[var(--brass)]"
            : negativo
            ? "text-[var(--brick)]"
            : "text-[var(--ink-text)]"
        }
      >
        {valore}
      </dd>
    </div>
  );
}
