// components/scelta-valutazione.tsx
import Link from "next/link";

/** Il primo bivio del percorso guidato: investimento vs prima casa.
 * Estratto come componente a sé — stesso contenuto usato in due punti
 * di ingresso diversi: la home per chi non è loggato e /nuovo per chi
 * ha già un portafoglio. */
export default function SceltaValutazione() {
  const classeCard =
    "rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-6 text-left transition-colors hover:border-[var(--brass)]/50 hover:bg-[var(--brass)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brass)]/40";

  return (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center">
      <h2 className="font-[var(--font-display)] text-2xl tracking-tight">
        Cosa vuoi fare?
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
        Scegli cosa stai valutando. Ti faremo solo le domande necessarie per aiutarti a decidere.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/investi" className={classeCard}>
          <p className="font-[var(--font-display)] text-lg">
            Sto valutando un immobile come investimento
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Voglio capire quanto può rendere, a quali condizioni e quali sono le variabili che contano davvero.
          </p>
        </Link>

        <Link href="/prima-casa" className={classeCard}>
          <p className="font-[var(--font-display)] text-lg">
            Sto pensando di acquistare casa
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Voglio capire quanto mi costerà davvero e se è sostenibile per me.
          </p>
        </Link>
      </div>
    </div>
  );
}
