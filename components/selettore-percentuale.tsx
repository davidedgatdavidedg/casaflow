"use client";

export default function SelettorePercentuale({
  valore,
  onChange,
  min = 0,
  max = 100,
  step = 5,
  importoRiferimento,
}: {
  valore: number;
  onChange: (valore: number) => void;
  min?: number;
  max?: number;
  step?: number;
  importoRiferimento?: number;
}) {
  const valoreNormalizzato = Math.min(max, Math.max(min, Number.isFinite(valore) ? valore : min));
  const importo = importoRiferimento
    ? Math.round(importoRiferimento * (valoreNormalizzato / 100))
    : null;

  const formatoEuro = new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

  return (
    <div>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valoreNormalizzato}
          onChange={(e) => onChange(Number(e.target.value))}
          className="min-w-0 flex-1 accent-[var(--brass)]"
          aria-label="Percentuale del prezzo finanziata"
        />
        <div className="flex w-24 items-center rounded-sm border border-[var(--rule)] bg-[var(--ink)] px-3 py-2 text-sm focus-within:border-[var(--brass)] focus-within:ring-2 focus-within:ring-[var(--brass)]/40">
          <input
            type="number"
            min={min}
            max={max}
            step={1}
            value={valoreNormalizzato}
            onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
            className="w-full bg-transparent text-right text-[var(--ink-text)] outline-none"
            aria-label="Percentuale finanziata"
          />
          <span className="ml-1 text-[var(--muted)]">%</span>
        </div>
      </div>

      {importo !== null && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          {formatoEuro.format(importo)} di mutuo su un prezzo di {formatoEuro.format(importoRiferimento!)}
        </p>
      )}
    </div>
  );
}
