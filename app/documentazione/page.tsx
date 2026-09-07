// app/documentazione/page.tsx
import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { VOCI_DOCUMENTATE, type CategoriaVoceDoc } from "@/lib/documentazione/voci";

const ETICHETTE_CATEGORIA: Record<CategoriaVoceDoc, string> = {
  investimenti: "Investimenti",
  ricavi: "Ricavi",
  costi: "Costi",
  oneri: "Oneri finanziari",
  imposte: "Imposte",
  detrazioni: "Detrazioni fiscali",
};

const ORDINE_CATEGORIE: CategoriaVoceDoc[] = [
  "investimenti",
  "ricavi",
  "costi",
  "oneri",
  "imposte",
  "detrazioni",
];

export default function DocumentazionePage() {
  return (
    <div className="min-h-screen bg-[var(--ink)] text-[var(--ink-text)]">
      <header className="border-b border-[var(--rule)] px-6 py-5 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-baseline gap-3">
              <Link href="/immobile" className="text-sm text-[var(--brass)] hover:underline">
                ← Torna al calcolatore
              </Link>
              <h1 className="font-[var(--font-display)] text-2xl tracking-tight">
                <Link href="/">CasaFlow</Link>
              </h1>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Come funziona: ogni voce dei flussi di cassa, spiegata
            </p>
          </div>

          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                type="button"
                className="rounded-sm border border-[var(--brass)]/50 px-3 py-2 text-sm text-[var(--brass)] transition-colors hover:bg-[var(--brass)]/10"
              >
                Accedi con Google
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </header>

      <div className="mx-auto flex max-w-5xl gap-10 px-6 py-10 lg:px-10">
        {/* Indice laterale */}
        <nav className="hidden w-48 shrink-0 lg:block">
          <div className="sticky top-10 space-y-6 text-sm">
            {ORDINE_CATEGORIE.map((categoria) => (
              <div key={categoria}>
                <p className="mb-2 font-medium text-[var(--brass)]">
                  {ETICHETTE_CATEGORIA[categoria]}
                </p>
                <ul className="space-y-1.5 border-l border-[var(--rule)] pl-3">
                  {VOCI_DOCUMENTATE.filter((v) => v.categoria === categoria).map((v) => (
                    <li key={v.id}>
                      <a
                        href={`#${v.id}`}
                        className="text-[var(--muted)] hover:text-[var(--ink-text)]"
                      >
                        {v.nome}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* Contenuto */}
        <div className="min-w-0 flex-1">
          <p className="mb-8 text-sm leading-relaxed text-[var(--muted)]">
            Questa pagina spiega come CasaFlow calcola ogni singola voce
            che trovi nei flussi di cassa: da quali campi del form
            dipende, quando si applica, quando no, con quali aliquote e
            massimali, e in che data matura o si paga. Riflette esattamente
            il comportamento del motore di calcolo — se qualcosa qui non
            corrisponde a quello che vedi nell&apos;app, è un errore da
            segnalarci, non una versione "semplificata" del vero
            funzionamento.
          </p>

          {ORDINE_CATEGORIE.map((categoria) => (
            <section key={categoria} className="mb-12">
              <h2 className="mb-5 font-[var(--font-display)] text-xl tracking-tight text-[var(--brass)]">
                {ETICHETTE_CATEGORIA[categoria]}
              </h2>
              <div className="space-y-8">
                {VOCI_DOCUMENTATE.filter((v) => v.categoria === categoria).map((voce) => (
                  <article
                    key={voce.id}
                    id={voce.id}
                    className="scroll-mt-6 rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-5"
                  >
                    <h3 className="mb-3 font-[var(--font-display)] text-base">
                      {voce.nome}
                    </h3>
                    <dl className="space-y-2.5 text-sm">
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                          Come si calcola
                        </dt>
                        <dd className="mt-0.5 leading-relaxed">{voce.comeSiCalcola}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                          Quando si applica
                        </dt>
                        <dd className="mt-0.5 leading-relaxed">{voce.quandoSiApplica}</dd>
                      </div>
                      {voce.quandoNonSiApplica && (
                        <div>
                          <dt className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                            Quando NON si applica
                          </dt>
                          <dd className="mt-0.5 leading-relaxed">{voce.quandoNonSiApplica}</dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                          Quando si paga / matura
                        </dt>
                        <dd className="mt-0.5 leading-relaxed">{voce.quandoSiPaga}</dd>
                      </div>
                      {voce.aliquote && (
                        <div>
                          <dt className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                            Aliquote
                          </dt>
                          <dd className="mt-0.5 leading-relaxed text-[var(--brass)]">{voce.aliquote}</dd>
                        </div>
                      )}
                      {voce.massimali && (
                        <div>
                          <dt className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                            Massimali
                          </dt>
                          <dd className="mt-0.5 leading-relaxed text-[var(--brass)]">{voce.massimali}</dd>
                        </div>
                      )}
                      {voce.note && (
                        <div>
                          <dt className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                            Nota
                          </dt>
                          <dd className="mt-0.5 leading-relaxed text-[var(--muted)]">{voce.note}</dd>
                        </div>
                      )}
                    </dl>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
