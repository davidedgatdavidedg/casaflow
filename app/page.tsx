// app/page.tsx
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { elencaImmobiliUtente, caricaImmobileUtente } from "@/lib/actions/immobili";
import { mappaDatiSalvatiAParametriSimulazione } from "@/lib/calcolo/mappaDatiSalvati";
import { calcolaSimulazione } from "@/lib/calcolo/simulazione";
import GraficoPortafoglio, { type ImmobilePortafoglio } from "@/components/grafico-portafoglio";

const formatoEuro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const formatoDataOra = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function PaginaPortafoglio() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-[var(--ink)] text-[var(--ink-text)]">
      <div className="sticky top-0 z-20 bg-[var(--ink)]">
        <header className="border-b border-[var(--rule)] px-6 py-5 lg:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-[var(--font-display)] text-2xl tracking-tight">
                CasaFlow
              </h1>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Simulatore di redditività per investimenti immobiliari
                {" — "}
                <Link href="/documentazione" className="text-[var(--brass)] hover:underline">
                  Come funziona
                </Link>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {userId && (
                <Link
                  href="/immobile"
                  target="_blank"
                  className="rounded-sm border border-[var(--brass)]/50 px-4 py-2 text-sm text-[var(--brass)] transition-colors hover:bg-[var(--brass)]/10"
                >
                  + Nuovo immobile
                </Link>
              )}

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
          </div>
        </header>
      </div>

      {!userId ? (
        <div className="mx-auto max-w-lg px-6 py-24 text-center">
          <h2 className="font-[var(--font-display)] text-xl">
            Accedi per iniziare
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            Qui trovi il portafoglio dei tuoi immobili valutati — ma prima
            serve accedere, così CasaFlow sa quali sono i tuoi.
          </p>
          <div className="mt-6">
            <SignInButton mode="modal">
              <button
                type="button"
                className="rounded-sm border border-[var(--brass)]/50 px-4 py-2.5 text-sm text-[var(--brass)] transition-colors hover:bg-[var(--brass)]/10"
              >
                Accedi con Google
              </button>
            </SignInButton>
          </div>
        </div>
      ) : (
        <PortafoglioContenuto />
      )}
    </div>
  );
}

async function PortafoglioContenuto() {
  const elenco = await elencaImmobiliUtente();

  const immobiliBase = await Promise.all(
    elenco.map(async (voce) => {
      const record = await caricaImmobileUtente(voce.id);
      const parametri = mappaDatiSalvatiAParametriSimulazione(
        record.dati as Record<string, unknown>
      );
      const risultato = calcolaSimulazione(parametri, { calcolaLeve: false });
      return {
        id: voce.id,
        nome: voce.nome,
        valore: parametri.prezzoAcquisto,
        debito: parametri.importoMutuo,
        irr: risultato.irr,
        aggiornatoIl: voce.aggiornatoIl,
      };
    })
  );

  const immobili = immobiliBase.sort(
    (a, b) => (b.irr ?? -Infinity) - (a.irr ?? -Infinity)
  );

  const valoreTotale = immobili.reduce((s, im) => s + im.valore, 0);
  const debitoTotale = immobili.reduce((s, im) => s + im.debito, 0);
  const capitaleProprio = valoreTotale - debitoTotale;
  const irrPonderati = immobili.filter((im) => im.irr !== null && im.valore > 0);
  const irrMedioPonderato =
    irrPonderati.length > 0
      ? irrPonderati.reduce((s, im) => s + im.irr! * im.valore, 0) /
        irrPonderati.reduce((s, im) => s + im.valore, 0)
      : null;

  return (
    <div className="px-6 py-8 lg:px-10">
      {immobili.length === 0 ? (
        <div className="rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-8 text-center">
          <p className="text-sm text-[var(--muted)]">
            Non hai ancora nessun immobile salvato. Comincia una prima
            valutazione.
          </p>
          <Link
            href="/immobile" target="_blank"
            className="mt-4 inline-block rounded-sm border border-[var(--brass)]/50 px-4 py-2 text-sm text-[var(--brass)] transition-colors hover:bg-[var(--brass)]/10"
          >
            + Nuovo immobile
          </Link>
        </div>
      ) : (
        <>
          {/* ─── KPI di sintesi + grafico, affiancati ─────────────────── */}
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <div className="rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-3">
                <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                  Valore totale
                </p>
                <p className="mt-0.5 text-right font-[var(--font-mono)] text-base">
                  {formatoEuro.format(valoreTotale)}
                </p>
              </div>
              <div className="rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-3">
                <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                  Debito totale
                </p>
                <p className="mt-0.5 text-right font-[var(--font-mono)] text-base">
                  {formatoEuro.format(debitoTotale)}
                </p>
              </div>
              <div className="rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-3">
                <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                  Capitale proprio
                </p>
                <p className="mt-0.5 text-right font-[var(--font-mono)] text-base">
                  {formatoEuro.format(capitaleProprio)}
                </p>
              </div>
              <div className="rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-3">
                <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                  IRR medio (ponderato)
                </p>
                <p className="mt-0.5 text-right font-[var(--font-mono)] text-base text-[var(--brass)]">
                  {irrMedioPonderato !== null
                    ? `${(irrMedioPonderato * 100).toFixed(2)}%`
                    : "n/d"}
                </p>
              </div>
            </div>

            <div className="rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-4">
              <h3 className="mb-1.5 font-[var(--font-display)] text-sm uppercase tracking-wide text-[var(--muted)]">
                Leva vs. rendimento
              </h3>
              <p className="mb-2 text-[10px] text-[var(--muted)]">
                Ogni bolla è un immobile: dimensione proporzionale al valore.
                In alto a sinistra i candidati migliori (poco debito, IRR alto).
              </p>
              <GraficoPortafoglio immobili={immobili} />
            </div>
          </div>

          {/* ─── Elenco con mini-barre debito/equity ───────────────── */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {immobili.map((im) => {
              const leva = im.valore > 0 ? (im.debito / im.valore) * 100 : 0;
              const positivo = im.irr !== null && im.irr >= 0;
              return (
                <Link
                  key={im.id}
                  href={`/immobile?id=${im.id}`}
                  target="_blank"
                  className="block rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--brass)]/50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            im.irr === null
                              ? "var(--muted)"
                              : positivo
                              ? "var(--brass)"
                              : "var(--brick)",
                        }}
                      />
                      <span className="font-medium">{im.nome}</span>
                    </div>
                    <span className="font-[var(--font-mono)] text-sm text-[var(--brass)]">
                      {im.irr !== null ? `${(im.irr * 100).toFixed(2)}%` : "IRR n/d"}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full bg-[var(--brick)]"
                        style={{ width: `${Math.min(leva, 100)}%` }}
                      />
                    </div>
                    <span className="shrink-0 font-[var(--font-mono)] text-[10px] text-[var(--muted)]">
                      {formatoEuro.format(im.debito)} debito ·{" "}
                      {formatoEuro.format(im.valore - im.debito)} proprio
                    </span>
                  </div>

                  <p className="mt-2 text-[10px] text-[var(--muted)]">
                    {formatoEuro.format(im.valore)} — ultimo aggiornamento{" "}
                    {formatoDataOra.format(im.aggiornatoIl)}
                  </p>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
