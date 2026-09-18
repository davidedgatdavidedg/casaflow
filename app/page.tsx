// app/page.tsx
import Link from "next/link";
import LogoCasaFlow from "@/components/logo-casaflow";
import { auth } from "@clerk/nextjs/server";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { elencaImmobiliUtente, caricaImmobileUtente } from "@/lib/actions/immobili";
import { mappaDatiSalvatiAParametriSimulazione } from "@/lib/calcolo/mappaDatiSalvati";
import { calcolaSimulazione } from "@/lib/calcolo/simulazione";
import GraficoPortafoglio, { type ImmobilePortafoglio } from "@/components/grafico-portafoglio";
import PulsanteEliminaImmobile from "@/components/pulsante-elimina-immobile";
import PulsanteRinominaImmobile from "@/components/pulsante-rinomina-immobile";
import SceltaValutazione from "@/components/scelta-valutazione";

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
              <h1>
                <LogoCasaFlow link={false} />
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
              {/* Visibile solo se loggato: per chi non lo è, la
                  stessa scelta è già mostrata per intero nel corpo
                  della pagina (SceltaValutazione) — ripeterla anche
                  qui sarebbe ridondante. Per chi è loggato, invece, il
                  corpo mostra il portafoglio, non la scelta: qui è
                  l'unico punto d'accesso per aggiungere un nuovo
                  immobile. */}
              {userId && (
                <Link
                  href="/nuovo"
                  className="rounded-sm border border-[var(--brass)]/50 px-4 py-2 text-sm text-[var(--brass)] transition-colors hover:bg-[var(--brass)]/10"
                >
                  + Nuovo immobile
                </Link>
              )}

              <Show when="signed-out">
                <SignInButton mode="modal" forceRedirectUrl="/">
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
        <SceltaValutazione />
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
            href="/nuovo"
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
                <div key={im.id} className="relative">
                  <div className="absolute -right-2 -top-2 z-10 flex gap-1.5">
                    <PulsanteRinominaImmobile id={im.id} nomeAttuale={im.nome} />
                    <PulsanteEliminaImmobile id={im.id} nome={im.nome} />
                  </div>
                  <Link
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
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
