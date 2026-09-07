// components/timbro-rendimento.tsx
//
// Il "timbro" IRR mostrato in cima alla colonna risultati — estratto da
// calcolatore-quick-mode.tsx.

export default function TimbroRendimento({ valore }: { valore: number | null }) {
  const nonCalcolabile = valore === null;
  const positivo = !nonCalcolabile && valore >= 0;
  return (
    <div className="flex flex-col items-center rounded-sm border border-[var(--rule)] bg-[var(--surface)] py-8">
      <div
        className="flex h-32 w-32 -rotate-6 flex-col items-center justify-center rounded-full border-2 border-dashed"
        style={{
          borderColor: nonCalcolabile
            ? "var(--muted)"
            : positivo
            ? "var(--brass)"
            : "var(--brick)",
        }}
      >
        <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--muted)]">
          IRR
        </span>
        <span
          className="font-[var(--font-display)] text-3xl"
          style={{
            color: nonCalcolabile
              ? "var(--muted)"
              : positivo
              ? "var(--brass)"
              : "var(--brick)",
          }}
        >
          {nonCalcolabile ? "n/d" : `${(valore * 100).toFixed(1)}%`}
        </span>
        <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--muted)]">
          Sull&apos;intero orizzonte
        </span>
      </div>
      <span className="mt-2 text-[10px] text-[var(--muted)]">
        Clicca per il dettaglio dei flussi →
      </span>
    </div>
  );
}
