"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import LogoCasaFlow from "@/components/logo-casaflow";
import { Show, SignInButton, useAuth } from "@clerk/nextjs";
import { InputNumeroMigliaia, ToggleSiNo } from "@/components/form-ui";
import SelettorePercentuale from "@/components/selettore-percentuale";
import { salvaImmobile } from "@/lib/actions/immobili";
import {
  calcolaStimaPrimaCasa,
  type ParametriStimaPrimaCasa,
  type RisultatoStimaPrimaCasa,
  type SostenibilitaMensile,
} from "@/lib/calcolo/stimaPrimaCasa";
import { TASSO_MUTUO_STIMATO_DEFAULT } from "@/lib/calcolo/stimaRapida";
import {
  ANNI_INVESTIMENTO_DEFAULT,
  PERCENTUALE_RIVALUTAZIONE_DEFAULT,
} from "@/lib/calcolo/tipi";

const OPZIONI_DURATA_MUTUO = [15, 20, 25, 30];
const CHIAVE_SESSION_STORAGE =
  "casaflow:wizard-prima-casa:risposte-in-attesa-di-login";

const formatoEuro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const formatoPercentuale = (frazione: number, decimali = 1) =>
  `${(frazione * 100).toFixed(decimali).replace(".", ",")}%`;

interface RisposteWizardPrimaCasa {
  prezzoAcquisto: number;
  ristrutturazionePrevista: boolean;
  ristrutturazioneImporto: number;
  liquiditaDisponibile: number;
  mutuoRichiesto: boolean;
  percentualeMutuo: number;
  durataMutuoAnni: number;
  redditoNettoMensileFamiliare: number;
  altreRatePresenti: boolean;
  altreRateMensili: number;
}

const RISPOSTE_INIZIALI: RisposteWizardPrimaCasa = {
  prezzoAcquisto: 0,
  ristrutturazionePrevista: false,
  ristrutturazioneImporto: 0,
  liquiditaDisponibile: 0,
  mutuoRichiesto: false,
  percentualeMutuo: 80,
  durataMutuoAnni: 25,
  redditoNettoMensileFamiliare: 0,
  altreRatePresenti: false,
  altreRateMensili: 0,
};

function AvanzamentoWizard({ corrente, totale }: { corrente: number; totale: number }) {
  const percentuale = (corrente / totale) * 100;
  return (
    <div className="mb-7">
      <div className="mb-2 flex items-center justify-between text-xs text-[var(--muted)]">
        <span>Prima valutazione</span>
        <span>{corrente} di {totale}</span>
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
  totale,
  titolo,
  sottotitolo,
  children,
}: {
  step: number;
  totale: number;
  titolo: string;
  sottotitolo?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md">
      <AvanzamentoWizard corrente={step} totale={totale} />
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

function mappaRisposteAParametri(
  risposte: RisposteWizardPrimaCasa
): ParametriStimaPrimaCasa {
  return {
    prezzoAcquisto: risposte.prezzoAcquisto,
    ristrutturazione: risposte.ristrutturazionePrevista
      ? risposte.ristrutturazioneImporto
      : 0,
    liquiditaDisponibile: risposte.liquiditaDisponibile,
    mutuoRichiesto: risposte.mutuoRichiesto,
    percentualeMutuo: risposte.percentualeMutuo,
    durataMutuoAnni: risposte.durataMutuoAnni,
    redditoNettoMensileFamiliare: risposte.redditoNettoMensileFamiliare,
    altreRateMensili: risposte.altreRatePresenti ? risposte.altreRateMensili : 0,
  };
}

function costruisciDatiPerSalvataggio(risposte: RisposteWizardPrimaCasa) {
  const oggiIso = new Date().toISOString().slice(0, 10);
  const importoMutuo = risposte.mutuoRichiesto
    ? Math.round(risposte.prezzoAcquisto * (risposte.percentualeMutuo / 100))
    : 0;
  const anniScenario =
    importoMutuo > 0 ? risposte.durataMutuoAnni : ANNI_INVESTIMENTO_DEFAULT;

  return {
    prezzoAcquisto: risposte.prezzoAcquisto,
    primaCasaRegistro: true,
    acquistoDa: "privato" as const,
    unitaList: [
      {
        etichetta: "",
        comune: "",
        categoriaCatastale: "A/2" as const,
        renditaCatastale: 0,
        statoAbitativoImu: "abitazionePrincipale" as const,
        metriQuadri: 0,
        aliquotaImuPersonalizzata: "",
        foglio: "",
        particella: "",
        subalterno: "",
      },
    ],
    importoMutuo,
    // Arrotondato: 0.035 * 100 in JavaScript non dà esattamente 3.5
    // ma 3.5000000000000004 (aritmetica a virgola mobile — 0.035 non è
    // rappresentabile esattamente in binario). Stesso fix già applicato
    // nel wizard investimento.
    tassoMutuoPercentuale:
      importoMutuo > 0 ? arrotonda(TASSO_MUTUO_STIMATO_DEFAULT * 100) : 0,
    durataMutuoAnni: importoMutuo > 0 ? risposte.durataMutuoAnni : 0,
    dataAcquisto: oggiIso,
    speseIncassoPerRata: 0,
    affittoLordoAnnuo: 0,
    oneriAccessoriAnnui: 0,
    renditaFigurativaAnnua: 0,
    regimeFiscaleAffitto: "cedolareSecca" as const,
    tipoCedolare: "standard" as const,
    aliquotaMarginaleIrpef: 0.23,
    anniInvestimento: anniScenario,
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

export default function WizardPrimaCasa() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [step, setStep] = useState(0);
  const [risposte, setRisposte] =
    useState<RisposteWizardPrimaCasa>(RISPOSTE_INIZIALI);
  const [risultato, setRisultato] = useState<RisultatoStimaPrimaCasa | null>(null);
  const [durataPersonalizzata, setDurataPersonalizzata] = useState(false);
  const [vuoleProseguire, setVuoleProseguire] = useState(false);
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);
  const [salvataggioAvviato, setSalvataggioAvviato] = useState(false);
  const [erroreSalvataggio, setErroreSalvataggio] = useState<string | null>(null);

  function aggiorna(patch: Partial<RisposteWizardPrimaCasa>) {
    setRisposte((prev) => ({ ...prev, ...patch }));
  }

  function vediRisultato() {
    setRisultato(calcolaStimaPrimaCasa(mappaRisposteAParametri(risposte)));
    setStep(4);
  }

  function tornaAModificare() {
    setRisultato(null);
    setStep(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    const salvato = sessionStorage.getItem(CHIAVE_SESSION_STORAGE);
    if (!salvato) return;
    sessionStorage.removeItem(CHIAVE_SESSION_STORAGE);
    try {
      const risposteRipristinate: RisposteWizardPrimaCasa = JSON.parse(salvato);
      setRisposte(risposteRipristinate);
      setRisultato(
        calcolaStimaPrimaCasa(mappaRisposteAParametri(risposteRipristinate))
      );
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
      const nome = `Prima casa da ${formatoEuro.format(risposte.prezzoAcquisto)}`;
      const { id } = await salvaImmobile(nome, dati);
      router.push(`/immobile?id=${id}&daWizardPrimaCasa=1`);
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

  const importoMutuo = risposte.mutuoRichiesto
    ? Math.round(risposte.prezzoAcquisto * (risposte.percentualeMutuo / 100))
    : 0;

  // Con mutuo il percorso ha 4 domande reali (prezzo, risparmi, mutuo,
  // reddito); senza, la domanda sul reddito si salta del tutto (vedi
  // più sotto) e restano solo 3. Finché l'utente non risponde alla
  // domanda sul mutuo, risposte.mutuoRichiesto è ancora al suo default
  // (false), quindi la barra mostra "di 3" fin dall'inizio — se poi
  // sceglie "Sì", il totale sale a 4: è il prezzo normale di un
  // wizard che si biforca, non un bug.
  const totalePassi = risposte.mutuoRichiesto ? 4 : 3;

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
            totale={totalePassi}
            titolo="Quanto costa la casa che stai valutando?"
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
            totale={totalePassi}
            titolo="Quanti risparmi avete a disposizione?"
            sottotitolo="Ci servirà per stimare quanto capitale richiede l'acquisto e quanto potrebbe rimanervi dopo."
          >
            <label className="block text-sm">
              <span className="mb-1.5 block text-[var(--muted)]">Liquidità disponibile</span>
              <InputNumeroMigliaia
                valore={risposte.liquiditaDisponibile}
                onChange={(v) => aggiorna({ liquiditaDisponibile: v })}
                mostraStepper={false}
                prefisso="€"
              />
            </label>

            <PulsantiNavigazione onIndietro={() => setStep(0)} onAvanti={() => setStep(2)} />
          </Domanda>
        )}

        {step === 2 && (
          <Domanda
            step={3}
            totale={totalePassi}
            titolo="Pensi di utilizzare un mutuo?"
            sottotitolo="Per questa prima valutazione ci bastano importo e durata. Utilizzeremo un tasso indicativo e te lo mostreremo nel risultato."
          >
            <ToggleSiNo
              valore={risposte.mutuoRichiesto}
              onChange={(v) => aggiorna({ mutuoRichiesto: v })}
            />

            {risposte.mutuoRichiesto && (
              <>
                <div className="mt-5">
                  <span className="mb-2 block text-sm text-[var(--muted)]">
                    Quanto del prezzo pensi di finanziare?
                  </span>
                  <SelettorePercentuale
                    valore={risposte.percentualeMutuo}
                    onChange={(v) => aggiorna({ percentualeMutuo: v })}
                    importoRiferimento={risposte.prezzoAcquisto}
                  />
                </div>

                <div className="mt-6">
                  <span className="mb-2 block text-sm text-[var(--muted)]">
                    In quanti anni pensi di rimborsarlo?
                  </span>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {OPZIONI_DURATA_MUTUO.map((anni) => (
                      <button
                        key={anni}
                        type="button"
                        onClick={() => {
                          aggiorna({ durataMutuoAnni: anni });
                          setDurataPersonalizzata(false);
                        }}
                        className={`rounded-sm border px-4 py-3 text-sm transition-colors ${
                          risposte.durataMutuoAnni === anni && !durataPersonalizzata
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
                        setDurataPersonalizzata(true);
                        if (OPZIONI_DURATA_MUTUO.includes(risposte.durataMutuoAnni)) {
                          aggiorna({ durataMutuoAnni: 0 });
                        }
                      }}
                      className={`rounded-sm border px-4 py-3 text-sm transition-colors ${
                        durataPersonalizzata
                          ? "border-[var(--brass)] bg-[var(--brass)]/15 text-[var(--brass)]"
                          : "border-[var(--rule)] text-[var(--muted)] hover:border-[var(--brass)]/50"
                      }`}
                    >
                      Altro
                    </button>
                  </div>

                  {durataPersonalizzata && (
                    <label className="mt-4 block text-sm">
                      <span className="mb-1.5 block text-[var(--muted)]">Numero di anni</span>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        step={1}
                        value={risposte.durataMutuoAnni || ""}
                        onChange={(e) =>
                          aggiorna({
                            durataMutuoAnni: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-full rounded-sm border border-[var(--rule)] bg-[var(--ink)] px-3 py-2 text-sm text-[var(--ink-text)] outline-none transition-colors focus:border-[var(--brass)] focus-visible:ring-2 focus-visible:ring-[var(--brass)]/40"
                      />
                    </label>
                  )}
                </div>
              </>
            )}

            <PulsantiNavigazione
              onIndietro={() => setStep(1)}
              onAvanti={() => (risposte.mutuoRichiesto ? setStep(3) : vediRisultato())}
              disabilitaAvanti={risposte.mutuoRichiesto && risposte.durataMutuoAnni <= 0}
              etichettaAvanti={risposte.mutuoRichiesto ? "Avanti" : "Vedi la prima valutazione"}
            />
          </Domanda>
        )}

        {step === 3 && (
          <Domanda
            step={4}
            totale={totalePassi}
            titolo="Quanto peserebbe la rata sul vostro reddito?"
            sottotitolo="Non stiamo valutando se una banca concederà il mutuo. Questi dati ci servono per stimare quanto peserebbero gli impegni finanziari sul vostro reddito."
          >
            <label className="block text-sm">
              <span className="mb-1.5 block text-[var(--muted)]">
                Reddito netto mensile complessivo del nucleo
              </span>
              <InputNumeroMigliaia
                valore={risposte.redditoNettoMensileFamiliare}
                onChange={(v) => aggiorna({ redditoNettoMensileFamiliare: v })}
                mostraStepper={false}
                prefisso="€"
                suffisso="/ mese"
              />
            </label>

            <div className="mt-5">
              <span className="mb-1.5 block text-sm text-[var(--muted)]">
                Avete già altre rate o finanziamenti?
              </span>
              <ToggleSiNo
                valore={risposte.altreRatePresenti}
                onChange={(v) => aggiorna({ altreRatePresenti: v })}
              />
            </div>

            {risposte.altreRatePresenti && (
              <label className="mt-4 block text-sm">
                <span className="mb-1.5 block text-[var(--muted)]">
                  Quanto pagate complessivamente ogni mese?
                </span>
                <InputNumeroMigliaia
                  valore={risposte.altreRateMensili}
                  onChange={(v) => aggiorna({ altreRateMensili: v })}
                  mostraStepper={false}
                  prefisso="€"
                  suffisso="/ mese"
                />
              </label>
            )}

            <PulsantiNavigazione
              onIndietro={() => setStep(2)}
              onAvanti={vediRisultato}
              disabilitaAvanti={risposte.redditoNettoMensileFamiliare <= 0}
              etichettaAvanti="Vedi la prima valutazione"
            />
          </Domanda>
        )}

        {step === 4 && risultato && (
          <RisultatoPrimaCasa
            risultato={risultato}
            risposte={risposte}
            importoMutuo={importoMutuo}
            onModifica={tornaAModificare}
            onApprofondisci={() => {
              if (!isSignedIn) {
                sessionStorage.setItem(
                  CHIAVE_SESSION_STORAGE,
                  JSON.stringify(risposte)
                );
                setVuoleProseguire(true);
              } else {
                eseguiSalvataggioENavigazione();
              }
            }}
            salvataggioInCorso={salvataggioInCorso}
            erroreSalvataggio={erroreSalvataggio}
          />
        )}
      </main>
    </div>
  );
}

function RisultatoPrimaCasa({
  risultato,
  risposte,
  importoMutuo,
  onModifica,
  onApprofondisci,
  salvataggioInCorso,
  erroreSalvataggio,
}: {
  risultato: RisultatoStimaPrimaCasa;
  risposte: RisposteWizardPrimaCasa;
  importoMutuo: number;
  onModifica: () => void;
  onApprofondisci: () => void;
  salvataggioInCorso: boolean;
  erroreSalvataggio: string | null;
}) {
  // Stessa pagina del wizard prima casa: dopo il login (OAuth Google
  // richiede un redirect a pagina intera) l'utente deve tornare esattamente
  // qui, non su un default esterno — stesso principio già applicato in
  // wizard-investimento.tsx.
  const pathname = usePathname();
  const mostraModifica =
    risultato.scenario === "liquiditaInsufficiente" ||
    risultato.scenario === "liquiditaQuasiAssorbita" ||
    risultato.scenario === "rataElevata" ||
    risultato.scenario === "criticitaMultiple";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          La tua prima valutazione
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          Abbiamo utilizzato i dati che ci hai fornito e alcune ipotesi iniziali.
        </p>
      </div>

      {risultato.scenario === "criticitaMultiple" && (
        <div className="mt-8 rounded-sm border border-[var(--brick)]/50 bg-[var(--surface)] p-5 text-center">
          <h2 className="font-[var(--font-display)] text-lg text-[var(--brick)]">
            Con queste condizioni, l&apos;acquisto presenta elementi di criticità
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            La rata assorbirebbe una quota elevata del vostro reddito e l&apos;operazione utilizzerebbe quasi interamente — o supererebbe — la liquidità disponibile. Prima di approfondire l&apos;acquisto, può essere utile verificare prezzo, importo del mutuo o durata.
          </p>
        </div>
      )}

      {risultato.scenario === "liquiditaQuasiAssorbita" && (
        <div className="mt-8 rounded-sm border border-[var(--brass)]/40 bg-[var(--surface)] p-5 text-center">
          <h2 className="font-[var(--font-display)] text-lg text-[var(--brass)]">
            La liquidità disponibile verrebbe quasi interamente assorbita
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            L&apos;operazione non risulta insufficiente in senso stretto, ma lascerebbe un margine molto ridotto per imprevisti o spese successive all&apos;acquisto. Prima di procedere, può valere la pena rivedere prezzo o risparmi destinati all&apos;operazione.
          </p>
        </div>
      )}

      {risultato.scenario === "primeIndicazioniFavorevoli" && (
        <div className="mt-8 rounded-sm border border-[var(--brass)]/40 bg-[var(--surface)] p-5 text-center">
          <h2 className="font-[var(--font-display)] text-lg text-[var(--brass)]">
            Le prime indicazioni sono favorevoli
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            {risultato.sostenibilitaMensile
              ? "Con i dati disponibili, la rata avrebbe un peso contenuto rispetto al vostro reddito e l'acquisto lascerebbe una parte significativa dei risparmi disponibile. È un buon punto di partenza, ma non è ancora una prova di sostenibilità complessiva."
              : "Con i dati disponibili, l'acquisto lascerebbe una parte significativa dei vostri risparmi disponibile anche dopo aver coperto anticipo, lavori e costi iniziali. È un buon punto di partenza, ma non è ancora una prova di sostenibilità complessiva."}
          </p>
        </div>
      )}

      {risultato.sostenibilitaMensile && (
        <BoxRataReddito
          sostenibilita={risultato.sostenibilitaMensile}
          rataMensile={risultato.mutuo.rataMensile}
        />
      )}

      {risultato.sostenibilitaMensile && (
        <section className="mt-8">
          <h2 className="font-[var(--font-display)] text-2xl tracking-tight">
            Ma la rata non racconta tutta la storia.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Comprare casa richiede capitale oggi e deve lasciarti un margine sufficiente per affrontare il futuro.
          </p>
        </section>
      )}

      <section className="mt-5 rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-5">
        <h3 className="font-[var(--font-display)] text-lg">Quanto capitale assorbe l&apos;acquisto?</h3>
        <dl className="mt-4 space-y-2 text-sm">
          <Riga etichetta="Anticipo sul prezzo" valore={formatoEuro.format(risultato.capitale.anticipoPrezzo)} />
          {risultato.capitale.ristrutturazione > 0 && (
            <Riga etichetta="Ristrutturazione" valore={formatoEuro.format(risultato.capitale.ristrutturazione)} />
          )}
          <Riga etichetta="Costi iniziali stimati" valore={formatoEuro.format(risultato.capitale.costiAcquistoStimati)} />
          <Riga etichetta="Capitale necessario" valore={formatoEuro.format(risultato.capitale.capitaleNecessario)} evidenza />
        </dl>

        <div className="mt-5 border-t border-[var(--rule)] pt-4">
          <Riga etichetta="Risparmi disponibili" valore={formatoEuro.format(risultato.capitale.liquiditaDisponibile)} />

          {risultato.capitale.liquiditaResidua >= 0 ? (
            <div className="mt-4 text-center">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Liquidità residua stimata</p>
              <p className="mt-2 font-[var(--font-display)] text-4xl tracking-tight text-[var(--brass)]">
                {formatoEuro.format(risultato.capitale.liquiditaResidua)}
              </p>
              <h3 className="mt-5 font-[var(--font-display)] text-lg">
                {formatoEuro.format(risultato.capitale.liquiditaResidua)} sono un margine sufficiente per voi?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                Non possiamo dirlo ancora. Dipende dalle vostre spese familiari, dai costi effettivi della nuova casa e dal margine che volete mantenere per gli imprevisti.
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-sm border border-[var(--brick)]/50 p-4 text-center">
              <h3 className="font-[var(--font-display)] text-lg text-[var(--brick)]">
                Le risorse indicate non sono sufficienti per questa operazione
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                Con {risposte.mutuoRichiesto ? "il mutuo e i risparmi" : "i risparmi"} che hai indicato, stimiamo che servano circa <strong className="text-[var(--ink-text)]">{formatoEuro.format(risultato.capitale.gapLiquidita)}</strong> in più per coprire anticipo, lavori e costi iniziali. Questo non significa necessariamente che la casa sia fuori portata: puoi verificare le nostre ipotesi oppure modificare prezzo, {risposte.mutuoRichiesto ? "mutuo o lavori" : "lavori o risparmi destinati all'operazione"}.
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-4">
          <h3 className="mb-3 text-sm font-medium">Tu ci hai detto</h3>
          <dl className="space-y-2 text-sm">
            <Riga etichetta="Prezzo casa" valore={formatoEuro.format(risposte.prezzoAcquisto)} />
            {risposte.ristrutturazionePrevista && (
              <Riga etichetta="Ristrutturazione" valore={formatoEuro.format(risposte.ristrutturazioneImporto)} />
            )}
            <Riga etichetta="Risparmi disponibili" valore={formatoEuro.format(risposte.liquiditaDisponibile)} />
            <Riga
              etichetta="Mutuo"
              valore={risposte.mutuoRichiesto ? `${risposte.percentualeMutuo}% — ${formatoEuro.format(importoMutuo)}` : "Nessuno"}
            />
            {risposte.mutuoRichiesto && (
              <Riga etichetta="Durata mutuo" valore={`${risposte.durataMutuoAnni} anni`} />
            )}
            {risposte.mutuoRichiesto && (
              <>
                <Riga etichetta="Reddito netto familiare" valore={`${formatoEuro.format(risposte.redditoNettoMensileFamiliare)}/mese`} />
                <Riga etichetta="Altre rate" valore={risposte.altreRatePresenti ? `${formatoEuro.format(risposte.altreRateMensili)}/mese` : "Nessuna"} />
              </>
            )}
          </dl>
        </div>

        <div className="rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-4">
          <h3 className="mb-3 text-sm font-medium">Noi abbiamo ipotizzato</h3>
          <dl className="space-y-2 text-sm">
            <Riga etichetta="Imposte prima casa" valore={formatoEuro.format(risultato.ipotesi.imposteAcquistoStimate)} />
            <Riga etichetta="Notaio" valore={formatoEuro.format(risultato.ipotesi.notaioStimato)} />
            <Riga etichetta="Intermediazione" valore={formatoEuro.format(risultato.ipotesi.agenziaStimata)} />
            {risultato.mutuo.importo > 0 && (
              <>
                <Riga etichetta="Spese mutuo" valore={formatoEuro.format(risultato.ipotesi.speseMutuoStimate)} />
                <Riga etichetta="Tasso mutuo" valore={formatoPercentuale(risultato.ipotesi.tassoMutuoStimato ?? 0, 1)} />
              </>
            )}
          </dl>
          <p className="mt-3 border-t border-[var(--rule)] pt-3 text-xs italic leading-relaxed text-[var(--muted)]">
            Questa è una prima valutazione. Alcuni costi potranno essere ricalcolati con maggiore precisione quando inserirai i dati catastali e le condizioni reali del mutuo.
          </p>
        </div>
      </div>

      <div className="mt-8 text-center">
        {mostraModifica && (
          <button
            type="button"
            onClick={onModifica}
            className="mb-4 mr-3 rounded-sm border border-[var(--rule)] px-6 py-3 text-sm text-[var(--muted)] transition-colors hover:border-[var(--brass)]/50 hover:text-[var(--ink-text)]"
          >
            ← Modifica le condizioni
          </button>
        )}

        <Show when="signed-out">
          <p className="mb-3 text-sm text-[var(--muted)]">
            Salva la tua valutazione per continuare. I dati che hai già inserito non andranno persi.
          </p>
          <SignInButton mode="modal" forceRedirectUrl={pathname}>
            <button
              type="button"
              onClick={onApprofondisci}
              disabled={salvataggioInCorso}
              className="rounded-sm border border-[var(--brass)]/50 px-6 py-3 text-sm text-[var(--brass)] transition-colors hover:bg-[var(--brass)]/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Approfondisci la sostenibilità
            </button>
          </SignInButton>
        </Show>
        <Show when="signed-in">
          <button
            type="button"
            onClick={onApprofondisci}
            disabled={salvataggioInCorso}
            className="rounded-sm border border-[var(--brass)]/50 px-6 py-3 text-sm text-[var(--brass)] transition-colors hover:bg-[var(--brass)]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvataggioInCorso ? "Preparazione…" : "Approfondisci la sostenibilità"}
          </button>
        </Show>

        {erroreSalvataggio && (
          <p className="mt-3 text-xs text-[var(--brick)]">{erroreSalvataggio}</p>
        )}

        <p className="mt-4 text-xs text-[var(--muted)]">
          Considera le spese familiari, i costi effettivi della casa e il margine per gli imprevisti.
        </p>
      </div>
    </div>
  );
}

/** Isolata in un componente a parte (invece che inline in
 * RisultatoPrimaCasa) proprio per poter ricevere sostenibilita già
 * garantita non-null via prop: evita di dover ripetere il controllo
 * null in mezzo al JSX, e rende esplicito che l'intero box non ha
 * senso di esistere quando non c'è una rata da valutare. */
function BoxRataReddito({
  sostenibilita,
  rataMensile,
}: {
  sostenibilita: SostenibilitaMensile;
  rataMensile: number;
}) {
  const rapporto = sostenibilita.rapportoImpegniReddito;
  const rapportoPerc = rapporto !== null ? rapporto * 100 : 0;
  const giudizio = testoGiudizioRata(sostenibilita);

  return (
    <section className="mt-8 rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-5">
      <h2 className="font-[var(--font-display)] text-lg">La rata rispetto al vostro reddito</h2>
      <p className="mt-4 font-[var(--font-display)] text-4xl tracking-tight text-[var(--brass)]">
        {formatoEuro.format(rataMensile)}
        <span className="ml-1 text-sm font-normal text-[var(--muted)]">/ mese</span>
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">Rata stimata del mutuo</p>

      <dl className="mt-5 space-y-2 text-sm">
        <Riga etichetta="Altre rate" valore={`${formatoEuro.format(sostenibilita.altreRateMensili)}/mese`} />
        <Riga etichetta="Reddito netto" valore={`${formatoEuro.format(sostenibilita.redditoNettoMensile)}/mese`} />
        <Riga
          etichetta="Impegni finanziari complessivi"
          valore={rapporto !== null ? formatoPercentuale(rapporto, 1) : "n/d"}
          evidenza
        />
      </dl>

      <div className="mt-5">
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-[var(--brass)] transition-all"
            style={{ width: `${Math.min(Math.max(rapportoPerc, 0), 100)}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-[var(--muted)]">
          <span>0%</span>
          <span>{rapporto !== null ? `${rapportoPerc.toFixed(1).replace(".", ",")}%` : "n/d"}</span>
          <span>100%</span>
        </div>
      </div>

      <div className="mt-5 border-t border-[var(--rule)] pt-4">
        <p className="font-[var(--font-display)] text-base text-[var(--brass)]">
          {giudizio.titolo}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          {giudizio.descrizione}
        </p>
      </div>
    </section>
  );
}

function testoGiudizioRata(sostenibilita: SostenibilitaMensile) {
  const rapporto = sostenibilita.rapportoImpegniReddito;
  const percentuale = rapporto !== null ? formatoPercentuale(rapporto, 1) : "n/d";

  switch (sostenibilita.giudizio) {
    case "generalmenteCompatibile":
      return {
        titolo: "Prime indicazioni: generalmente compatibile",
        descrizione:
          "Il peso complessivo delle rate sul reddito rientra nella fascia indicativa più contenuta usata da CasaFlow per questa prima valutazione. Non rappresenta una previsione sulla concessione del mutuo da parte di una banca.",
      };
    case "daValutareConAttenzione":
      return {
        titolo: "Da valutare con attenzione",
        descrizione: `Con le ipotesi utilizzate, circa il ${percentuale} del reddito netto mensile sarebbe destinato alla nuova rata e agli altri finanziamenti. È una fascia che merita una verifica più attenta del margine disponibile.`,
      };
    case "pesoElevato":
      return {
        titolo: "La rata avrebbe un peso elevato sul vostro reddito",
        descrizione: `Con le ipotesi utilizzate, circa il ${percentuale} del reddito netto mensile sarebbe destinato alla nuova rata e agli altri finanziamenti. Non significa che il mutuo non possa essere concesso, ma lascia meno margine per altre spese e imprevisti.`,
      };
  }
}

function Riga({
  etichetta,
  valore,
  evidenza = false,
}: {
  etichetta: string;
  valore: string;
  evidenza?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[var(--muted)]">{etichetta}</dt>
      <dd className={`text-right ${evidenza ? "font-medium text-[var(--brass)]" : ""}`}>
        {valore}
      </dd>
    </div>
  );
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
