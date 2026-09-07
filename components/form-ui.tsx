// components/form-ui.tsx
//
// "Mattoncini" riusabili del form di CasaFlow: componenti di presentazione
// puri, senza stato proprio, riceve tutto via props. Estratti da
// calcolatore-quick-mode.tsx per renderlo più piccolo e per poterli
// riusare in futuri form (es. una eventuale pagina di confronto tra
// immobili) senza duplicare markup.

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
