"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import Link from "next/link";
import LogoCasaFlow from "@/components/logo-casaflow";
import { Show, SignInButton, useAuth } from "@clerk/nextjs";
import { InputNumeroMigliaia, ToggleSiNo } from "@/components/form-ui";
import SelettorePercentuale from "@/components/selettore-percentuale";
import TooltipInfo from "@/components/tooltip-info";
import { salvaImmobile } from "@/lib/actions/immobili";
import {
  calcolaStimaRapida,
  TASSO_MUTUO_STIMATO_DEFAULT,
  type ParametriStimaRapida,
  type RisultatoStimaRapida,
} from "@/lib/calcolo/stimaRapida";
import { PERCENTUALE_RIVALUTAZIONE_DEFAULT } from "@/lib/calcolo/tipi";
import { DATA_AGGIORNAMENTO_BENCHMARK_BTP } from "@/lib/calcolo/benchmarkBtp";

const OPZIONI_ORIZZONTE = [3, 5, 10, 20];

const formatoEuro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const formatoPercentuale = (frazione: number, decimali = 1) =>
  `${(frazione * 100).toFixed(decimali).replace(".", ",")}%`;

const formatoPuntiPercentuali = (frazione: number) => {
  const valore = frazione * 100;
  const segno = valore > 0 ? "+" : valore < 0 ? "−" : "";
  return `${segno}${Math.abs(valore).toFixed(1).replace(".", ",")} p.p.`;
};

interface RisposteWizard {
  prezzoAcquisto: number;
  ristrutturazionePrevista: boolean;
  ristrutturazioneImporto: number;
  canoneMensile: number;
  finanziamentoRichiesto: boolean;
  percentualeFinanziata: number;
  anniInvestimento: number;
}

const RISPOSTE_INIZIALI: RisposteWizard = {
  prezzoAcquisto: 0,
  ristrutturazionePrevista: false,
  ristrutturazioneImporto: 0,
  canoneMensile: 0,
  finanziamentoRichiesto: false,
  percentualeFinanziata: 80,
  anniInvestimento: 0,
};

function costruisciDatiPerSalvataggio(risposte: RisposteWizard) {
  const oggiIso = new Date().toISOString().slice(0, 10);
  const importoMutuo = risposte.finanziamentoRichiesto
    ? Math.round(risposte.prezzoAcquisto * (risposte.percentualeFinanziata / 100))
    : 0;

  return {
    prezzoAcquisto: risposte.prezzoAcquisto,
    primaCasaRegistro: false,
    acquistoDa: "privato" as const,
    unitaList: [
      {
        etichetta: "",
        comune: "",
        categoriaCatastale: "A/2" as const,
        renditaCatastale: 0,
        statoAbitativoImu: "affittata" as const,
        metriQuadri: 0,
        aliquotaImuPersonalizzata: "",
        foglio: "",
        particella: "",
        subalterno: "",
      },
    ],
    importoMutuo,
    // Arrotondato: 0.035 * 100 in JavaScript non dà esattamente 3.5
    // (aritmetica a virgola mobile — 0.035 non è rappresentabile
    // esattamente in binario), ma 3.5000000000000004. Senza
    // arrotondare, quel valore finirebbe salvato così com'è e
    // ricomparirebbe identico nel campo "Tasso mutuo" del calcolatore
    // completo.
    tassoMutuoPercentuale:
      importoMutuo > 0 ? arrotonda(TASSO_MUTUO_STIMATO_DEFAULT * 100) : 0,
    durataMutuoAnni: importoMutuo > 0 ? risposte.anniInvestimento : 0,
    dataAcquisto: oggiIso,
    speseIncassoPerRata: 0,
    affittoLordoAnnuo: risposte.canoneMensile * 12,
    oneriAccessoriAnnui: 0,
    renditaFigurativaAnnua: 0,
    regimeFiscaleAffitto: "cedolareSecca" as const,
    tipoCedolare: "standard" as const,
    aliquotaMarginaleIrpef: 0.23,
    anniInvestimento: risposte.anniInvestimento,
    rivalutazioneAnnuaPercentuale: PERCENTUALE_RIVALUTAZIONE_DEFAULT * 100,
    onorarioNotaioPersonalizzato: "",
    agenziaPersonalizzata: "",
    visureNotaioPersonalizzate: "",
    tassaArchivioPersonalizzata: "",
    tariffaTariPersonalizzata: "",
    condominioAnnuoPersonalizzato: "",
    manutenzioneOrdinariaPersonalizzata: "",
    manutenzioneStraordinariaPersonalizzata: "",
    assicurazionePersonalizzata: "",
    altriCostiAcquistoPersonalizzato: "",
    ristrutturazione: risposte.ristrutturazionePrevista
      ? risposte.ristrutturazioneImporto
      : 0,
    arredamento: 0,
  };
}

function AvanzamentoWizard({ corrente }: { corrente: number }) {
  const percentuale = (corrente / 4) * 100;
  return (
    <div className="mb-7">
      <div className="mb-2 flex items-center justify-between text-xs text-[var(--muted)]">
        <span>Prima stima</span>
        <span>{corrente} di 4</span>
      </div>
      <div className="h-px overflow-hidden bg-[var(--rule)]">
        <div
          className="h-full bg-[var(--brass)] transition-all"
          style={{ width: `${percentuale}%` }}
        />
      </div>
    </div>
  );
}

function Domanda({
  step,
  titolo,
  sottotitolo,
  children,
}: {
  step: number;
  titolo: string;
  sottotitolo?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md">
      <AvanzamentoWizard corrente={step} />
      <h2 className="font-[var(--font-display)] text-xl tracking-tight">{titolo}</h2>
      {sottotitolo && (
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{sottotitolo}</p>
      )}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function PulsantiNavigazione({
  onIndietro,
  onAvanti,
  disabilitaAvanti,
  etichettaAvanti = "Avanti",
}: {
  onIndietro: () => void;
  onAvanti: () => void;
  disabilitaAvanti?: boolean;
  etichettaAvanti?: string;
}) {
  return (
    <div className="mt-8 flex items-center justify-between">
      <button
        type="button"
        onClick={onIndietro}
        className="text-sm text-[var(--muted)] hover:text-[var(--ink-text)]"
      >
        ← Indietro
      </button>
      <button
        type="button"
        onClick={onAvanti}
        disabled={disabilitaAvanti}
        className="rounded-sm border border-[var(--brass)]/50 px-5 py-2.5 text-sm text-[var(--brass)] transition-colors hover:bg-[var(--brass)]/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {etichettaAvanti}
      </button>
    </div>
  );
}

function mappaRisposteAParametriStima(risposte: RisposteWizard): ParametriStimaRapida {
  return {
    prezzoAcquisto: risposte.prezzoAcquisto,
    ristrutturazione: risposte.ristrutturazionePrevista
      ? risposte.ristrutturazioneImporto
      : 0,
    affittoLordoMensile: risposte.canoneMensile,
    finanziamentoRichiesto: risposte.finanziamentoRichiesto,
    percentualeFinanziata: risposte.percentualeFinanziata,
    anniInvestimento: risposte.anniInvestimento,
  };
}

const CHIAVE_SESSION_STORAGE = "casaflow:wizard-investimento:risposte-in-attesa-di-login";

export default function WizardInvestimento() {
  const router = useRouter();
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const [step, setStep] = useState(0);
  const [risposte, setRisposte] = useState<RisposteWizard>(RISPOSTE_INIZIALI);
  const [risultato, setRisultato] = useState<RisultatoStimaRapida | null>(null);
  const [mostraOrizzontePersonalizzato, setMostraOrizzontePersonalizzato] = useState(false);
  const [vuoleProseguire, setVuoleProseguire] = useState(false);
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);
  const [salvataggioAvviato, setSalvataggioAvviato] = useState(false);
  const [erroreSalvataggio, setErroreSalvataggio] = useState<string | null>(null);

  function aggiorna(patch: Partial<RisposteWizard>) {
    setRisposte((prev) => ({ ...prev, ...patch }));
  }

  function vediRisultato() {
    setRisultato(calcolaStimaRapida(mappaRisposteAParametriStima(risposte)));
    setStep(4);
  }

  useEffect(() => {
    const salvato = sessionStorage.getItem(CHIAVE_SESSION_STORAGE);
    if (!salvato) return;
    sessionStorage.removeItem(CHIAVE_SESSION_STORAGE);
    try {
      const risposteRipristinate: RisposteWizard = JSON.parse(salvato);
      setRisposte(risposteRipristinate);
      setRisultato(calcolaStimaRapida(mappaRisposteAParametriStima(risposteRipristinate)));
      setStep(4);
      setVuoleProseguire(true);
    } catch {
      // Dato temporaneo non valido: l'utente può rifare il wizard.
    }
  }, []);

  async function eseguiSalvataggioENavigazione() {
    setSalvataggioInCorso(true);
    setErroreSalvataggio(null);
    try {
      const dati = costruisciDatiPerSalvataggio(risposte);
      const nome = `Immobile da ${formatoEuro.format(risposte.prezzoAcquisto)}`;
      const { id } = await salvaImmobile(nome, dati);
      router.push(`/immobile?id=${id}&daWizard=1`);
    } catch (errore) {
      setErroreSalvataggio(
        errore instanceof Error ? errore.message : "Errore nel salvataggio."
      );
      setSalvataggioInCorso(false);
    }
  }

  useEffect(() => {
    if (vuoleProseguire && isSignedIn && !salvataggioAvviato) {
      setSalvataggioAvviato(true);
      eseguiSalvataggioENavigazione();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vuoleProseguire, isSignedIn, salvataggioAvviato]);

  const importoMutuo = risposte.finanziamentoRichiesto
    ? Math.round(risposte.prezzoAcquisto * (risposte.percentualeFinanziata / 100))
    : 0;

  return (
    <div className="min-h-screen bg-[var(--ink)] text-[var(--ink-text)]">
      <header className="border-b border-[var(--rule)] px-6 py-5 lg:px-10">
        <h1>
          <LogoCasaFlow />
        </h1>
      </header>

      <main className="px-6 py-16 lg:px-10">
        {step === 0 && (
          <Domanda
            step={1}
            titolo="Quanto costa l'immobile?"
            sottotitolo="Inserisci il prezzo richiesto o quello che pensi di offrire."
          >
            <label className="block text-sm">
              <span className="mb-1.5 block text-[var(--muted)]">Prezzo di acquisto</span>
              <InputNumeroMigliaia
                valore={risposte.prezzoAcquisto}
                onChange={(v) => aggiorna({ prezzoAcquisto: v })}
                mostraStepper={false}
                prefisso="€"
              />
            </label>

            <div className="mt-5">
              <span className="mb-1.5 block text-sm text-[var(--muted)]">
                Prevedi lavori di ristrutturazione?
              </span>
              <ToggleSiNo
                valore={risposte.ristrutturazionePrevista}
                onChange={(v) => aggiorna({ ristrutturazionePrevista: v })}
              />
            </div>

            {risposte.ristrutturazionePrevista && (
              <label className="mt-4 block text-sm">
                <span className="mb-1.5 block text-[var(--muted)]">
                  Quanto prevedi di spendere?
                </span>
                <InputNumeroMigliaia
                  valore={risposte.ristrutturazioneImporto}
                  onChange={(v) => aggiorna({ ristrutturazioneImporto: v })}
                  mostraStepper={false}
                  prefisso="€"
                />
              </label>
            )}

            <PulsantiNavigazione
              onIndietro={() => router.push("/")}
              onAvanti={() => setStep(1)}
              disabilitaAvanti={risposte.prezzoAcquisto <= 0}
            />
          </Domanda>
        )}

        {step === 1 && (
          <Domanda
            step={2}
            titolo="A quanto pensi di affittare l'immobile?"
            sottotitolo="Indica il canone mensile previsto. Per ora non preoccuparti di tasse e costi: useremo alcune ipotesi iniziali e te le mostreremo prima di approfondire l'analisi."
          >
            <label className="block text-sm">
              <span className="mb-1.5 block text-[var(--muted)]">Canone mensile</span>
              <InputNumeroMigliaia
                valore={risposte.canoneMensile}
                onChange={(v) => aggiorna({ canoneMensile: v })}
                mostraStepper={false}
                prefisso="€"
                suffisso="/ mese"
              />
            </label>

            <PulsantiNavigazione onIndietro={() => setStep(0)} onAvanti={() => setStep(2)} />
          </Domanda>
        )}

        {step === 2 && (
          <Domanda
            step={3}
            titolo="Pensi di utilizzare un mutuo?"
            sottotitolo="Per questa prima stima ci basta sapere quanto pensi di finanziare. Tasso e durata saranno indicati chiaramente nel risultato."
          >
            <ToggleSiNo
              valore={risposte.finanziamentoRichiesto}
              onChange={(v) => aggiorna({ finanziamentoRichiesto: v })}
            />

            {risposte.finanziamentoRichiesto && (
              <div className="mt-5">
                <span className="mb-2 block text-sm text-[var(--muted)]">
                  Quanto del prezzo pensi di finanziare?
                </span>
                <SelettorePercentuale
                  valore={risposte.percentualeFinanziata}
                  onChange={(v) => aggiorna({ percentualeFinanziata: v })}
                  importoRiferimento={risposte.prezzoAcquisto}
                />
              </div>
            )}

            <PulsantiNavigazione onIndietro={() => setStep(1)} onAvanti={() => setStep(3)} />
          </Domanda>
        )}

        {step === 3 && (
          <Domanda
            step={4}
            titolo="Per quanto tempo pensi di mantenere l'investimento?"
            sottotitolo="Al termine dell'orizzonte ipotizzeremo la vendita dell'immobile."
          >
            <div className="grid grid-cols-2 gap-3">
              {OPZIONI_ORIZZONTE.map((anni) => (
                <button
                  key={anni}
                  type="button"
                  onClick={() => {
                    aggiorna({ anniInvestimento: anni });
                    setMostraOrizzontePersonalizzato(false);
                  }}
                  className={`rounded-sm border px-4 py-3 text-sm transition-colors ${
                    risposte.anniInvestimento === anni && !mostraOrizzontePersonalizzato
                      ? "border-[var(--brass)] bg-[var(--brass)]/15 text-[var(--brass)]"
                      : "border-[var(--rule)] text-[var(--muted)] hover:border-[var(--brass)]/50"
                  }`}
                >
                  {anni} anni
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMostraOrizzontePersonalizzato(true);
                  if (OPZIONI_ORIZZONTE.includes(risposte.anniInvestimento)) {
                    aggiorna({ anniInvestimento: 0 });
                  }
                }}
                className={`rounded-sm border px-4 py-3 text-sm transition-colors ${
                  mostraOrizzontePersonalizzato
                    ? "border-[var(--brass)] bg-[var(--brass)]/15 text-[var(--brass)]"
                    : "border-[var(--rule)] text-[var(--muted)] hover:border-[var(--brass)]/50"
                }`}
              >
                Altro
              </button>
            </div>

            {mostraOrizzontePersonalizzato && (
              <label className="mt-4 block text-sm">
                <span className="mb-1.5 block text-[var(--muted)]">Numero di anni</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  step={1}
                  value={risposte.anniInvestimento || ""}
                  onChange={(e) => aggiorna({ anniInvestimento: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full rounded-sm border border-[var(--rule)] bg-[var(--ink)] px-3 py-2 text-sm text-[var(--ink-text)] outline-none transition-colors focus:border-[var(--brass)] focus-visible:ring-2 focus-visible:ring-[var(--brass)]/40"
                />
              </label>
            )}

            <PulsantiNavigazione
              onIndietro={() => setStep(2)}
              onAvanti={vediRisultato}
              disabilitaAvanti={risposte.anniInvestimento <= 0}
              etichettaAvanti="Vedi la prima stima"
            />
          </Domanda>
        )}

        {step === 4 && risultato && (
          <div className="mx-auto max-w-2xl">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                La tua prima valutazione
              </p>
              <p className="mt-3 font-[var(--font-display)] text-5xl tracking-tight text-[var(--brass)]">
                {risultato.irr !== null ? formatoPercentuale(risultato.irr, 1) : "n/d"}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                IRR annuo stimato sul capitale investito · orizzonte {risposte.anniInvestimento} anni
              </p>
            </div>

            <div className="mt-8 rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-5">
              <div className="flex items-center gap-2">
                <h3 className="font-[var(--font-display)] text-base">Confronto con il BTP</h3>
                <TooltipInfo>
                  Usiamo un BTP con durata comparabile come riferimento per valutare il costo opportunità del capitale. Un investimento immobiliare comporta inoltre minore liquidità, rischi specifici e maggiore impegno gestionale. Benchmark indicativo aggiornato al {DATA_AGGIORNAMENTO_BENCHMARK_BTP}.
                </TooltipInfo>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">Il tuo investimento</dt>
                  <dd>{risultato.irr !== null ? formatoPercentuale(risultato.irr, 1) : "n/d"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">BTP con durata comparabile</dt>
                  <dd>{formatoPercentuale(risultato.benchmarkBtp.rendimentoNetto, 1)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-[var(--rule)] pt-2">
                  <dt className="text-[var(--muted)]">Differenziale</dt>
                  <dd className="font-medium text-[var(--brass)]">
                    {risultato.differenzialeBtp !== null
                      ? formatoPuntiPercentuali(risultato.differenzialeBtp)
                      : "n/d"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-4 rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-5 text-center">
              <p className="font-[var(--font-display)] text-lg text-[var(--brass)]">
                {risultato.giudizio.etichetta}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {risultato.giudizio.descrizione}
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-4">
                <h3 className="mb-3 text-sm font-medium">Tu ci hai detto</h3>
                <dl className="space-y-2 text-sm">
                  <Riga etichetta="Prezzo" valore={formatoEuro.format(risposte.prezzoAcquisto)} />
                  {risposte.ristrutturazionePrevista && (
                    <Riga etichetta="Ristrutturazione" valore={formatoEuro.format(risposte.ristrutturazioneImporto)} />
                  )}
                  <Riga etichetta="Canone mensile" valore={formatoEuro.format(risposte.canoneMensile)} />
                  <Riga
                    etichetta="Mutuo"
                    valore={risposte.finanziamentoRichiesto ? `${risposte.percentualeFinanziata}% — ${formatoEuro.format(importoMutuo)}` : "Nessuno"}
                  />
                  <Riga etichetta="Orizzonte" valore={`${risposte.anniInvestimento} anni`} />
                </dl>
              </div>

              <div className="rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-4">
                <h3 className="mb-3 text-sm font-medium">Noi abbiamo ipotizzato</h3>
                <dl className="space-y-2 text-sm">
                  <Riga etichetta="Imposte di acquisto" valore={formatoEuro.format(risultato.ipotesi.impostaAcquistoStimata)} />
                  <Riga etichetta="Onorario notaio" valore={formatoEuro.format(risultato.ipotesi.notaioStimato)} />
                  <Riga etichetta="Intermediazione" valore={formatoEuro.format(risultato.ipotesi.agenziaStimata)} />
                  <Riga etichetta="Cedolare secca" valore="21%" />
                  <Riga etichetta="Manutenzione" valore={`${formatoEuro.format(risultato.ipotesi.manutenzioneStimataAnnua)}/anno`} />
                  {risultato.ipotesi.tassoMutuoStimato !== null && (
                    <>
                      <Riga etichetta="Tasso mutuo" valore={formatoPercentuale(risultato.ipotesi.tassoMutuoStimato, 1)} />
                      <Riga etichetta="Durata mutuo" valore={`${risultato.ipotesi.durataMutuoAnni} anni`} />
                    </>
                  )}
                  <Riga etichetta="Rivalutazione immobile" valore={`${formatoPercentuale(risultato.ipotesi.rivalutazioneAnnua, 2)} annuo`} />
                  {risposte.ristrutturazionePrevista && (
                    <Riga
                      etichetta="Valorizzazione dei lavori"
                      valore={`${formatoPercentuale(risultato.ipotesi.coefficienteValorizzazioneRistrutturazione, 0)} del costo`}
                    />
                  )}
                </dl>
                <p className="mt-3 border-t border-[var(--rule)] pt-3 text-xs italic leading-relaxed text-[var(--muted)]">
                  Questa è una stima preliminare. Alcuni costi dipendono da dati che non ti abbiamo ancora chiesto, come rendita catastale, comune e metratura. Potrai inserirli nel passaggio successivo.
                  {risposte.ristrutturazionePrevista && (
                    <>
                      {" "}Per il valore di rivendita assumiamo che solo una parte della spesa di ristrutturazione si rifletta sul valore dell&apos;immobile — non è una previsione di mercato, solo un&apos;ipotesi di partenza.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Show when="signed-out">
                <p className="mb-3 text-sm text-[var(--muted)]">
                  Salva la tua analisi per continuare. I dati che hai già inserito non andranno persi.
                </p>
                <SignInButton mode="modal" forceRedirectUrl={pathname}>
                  <button
                    type="button"
                    onClick={() => {
                      sessionStorage.setItem(CHIAVE_SESSION_STORAGE, JSON.stringify(risposte));
                      setVuoleProseguire(true);
                    }}
                    disabled={salvataggioInCorso}
                    className="rounded-sm border border-[var(--brass)]/50 px-6 py-3 text-sm text-[var(--brass)] transition-colors hover:bg-[var(--brass)]/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Rendi più precisa l&apos;analisi
                  </button>
                </SignInButton>
              </Show>
              <Show when="signed-in">
                <button
                  type="button"
                  onClick={eseguiSalvataggioENavigazione}
                  disabled={salvataggioInCorso}
                  className="rounded-sm border border-[var(--brass)]/50 px-6 py-3 text-sm text-[var(--brass)] transition-colors hover:bg-[var(--brass)]/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {salvataggioInCorso ? "Preparazione…" : "Rendi più precisa l'analisi"}
                </button>
              </Show>

              {erroreSalvataggio && (
                <p className="mt-3 text-xs text-[var(--brick)]">{erroreSalvataggio}</p>
              )}

              <p className="mt-4 text-xs text-[var(--muted)]">
                Verifica le ipotesi utilizzate e sostituiscile con i dati reali del tuo investimento.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Riga({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[var(--muted)]">{etichetta}</dt>
      <dd className="text-right">{valore}</dd>
    </div>
  );
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
