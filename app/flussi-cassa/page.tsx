// app/flussi-cassa/page.tsx
import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import {
  calcolaFlussiCassa,
  aggiungiCumulato,
  trovaAnnoRientro,
  elencoTransazioni,
  type CategoriaVoce,
  type VoceFlusso,
} from "@/lib/calcolo/flussiCassa";
import { calcolaXIRR } from "@/lib/calcolo/irr";
import { interpretaIrr } from "@/lib/calcolo/interpretazioneIrr";
import type { Mutuo } from "@/lib/calcolo/tipi";
import TabellaMovimenti from "@/components/tabella-movimenti";
import GraficoFlussi, { type DatoAnnoGrafico } from "@/components/grafico-flussi";

const formatoDataOra = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function sommaCategoria(voci: VoceFlusso[], categoria: CategoriaVoce): number {
  return voci
    .filter((v) => v.categoria === categoria)
    .reduce((somma, v) => somma + v.importo, 0);
}

interface PageProps {
  searchParams: Promise<{
    nome?: string;
    idImmobile?: string;
    ultimoSalvataggio?: string;
    dataAcquisto?: string;
    prezzo?: string;
    registro?: string;
    ipotecaria?: string;
    catastale?: string;
    notaioOnorario?: string;
    notaioVisure?: string;
    notaioTassaArchivio?: string;
    agenziaTotale?: string;
    importoMutuo?: string;
    tassoMutuo?: string;
    durataMutuo?: string;
    decorrenzaMutuo?: string;
    speseMutuo?: string;
    speseMutuoIstruttoria?: string;
    speseMutuoImpostaSostitutiva?: string;
    affittoLordo?: string;
    oneriAccessori?: string;
    renditaFigurativa?: string;
    tassazioneImporto?: string;
    tassazioneEtichetta?: string;
    imu?: string;
    tari?: string;
    addizionali?: string;
    energiaElettrica?: string;
    gas?: string;
    internet?: string;
    condominio?: string;
    manutenzioneOrdinaria?: string;
    manutenzioneStraordinaria?: string;
    assicurazione?: string;
    altriCosti?: string;
    ristrutturazione?: string;
    arredamento?: string;
    abitazionePrincipale?: string;
    anni?: string;
    rivendita?: string;
  }>;
}

export default async function FlussiCassaPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const prezzoAcquisto = parseFloat(params.prezzo ?? "0");
  const dataAcquisto = new Date(
    params.dataAcquisto ?? new Date().toISOString().slice(0, 10)
  );
  const anniInvestimento = parseInt(params.anni ?? "0", 10);
  const importoMutuo = parseFloat(params.importoMutuo ?? "0");

  const mutuo: Mutuo | null =
    importoMutuo > 0
      ? {
          importo: importoMutuo,
          tasso: parseFloat(params.tassoMutuo ?? "0") / 100,
          durataAnni: parseInt(params.durataMutuo ?? "0", 10),
          dataDecorrenza: new Date(
            params.decorrenzaMutuo ?? new Date().toISOString().slice(0, 10)
          ),
          speseIncassoPerRata: parseFloat(params.speseMutuo ?? "0"),
        }
      : null;

  const parametriValidi = prezzoAcquisto > 0 && anniInvestimento > 0;

  const righeCalcolate = parametriValidi
    ? calcolaFlussiCassa({
        dataAcquisto,
        prezzoAcquisto,
        registro: parseFloat(params.registro ?? "0"),
        ipotecaria: parseFloat(params.ipotecaria ?? "0"),
        catastale: parseFloat(params.catastale ?? "0"),
        notaioOnorario: parseFloat(params.notaioOnorario ?? "0"),
        notaioVisure: parseFloat(params.notaioVisure ?? "0"),
        notaioTassaArchivio: parseFloat(params.notaioTassaArchivio ?? "0"),
        agenziaTotale: parseFloat(params.agenziaTotale ?? "0"),
        mutuo,
        speseMutuoIstruttoria: parseFloat(params.speseMutuoIstruttoria ?? "0"),
        speseMutuoImpostaSostitutiva: parseFloat(
          params.speseMutuoImpostaSostitutiva ?? "0"
        ),
        affittoLordoAnnuo: parseFloat(params.affittoLordo ?? "0"),
        oneriAccessoriAnnui: parseFloat(params.oneriAccessori ?? "0"),
        renditaFigurativaAnnua: parseFloat(params.renditaFigurativa ?? "0"),
        tassazioneAffittoImporto: parseFloat(params.tassazioneImporto ?? "0"),
        tassazioneAffittoEtichetta: params.tassazioneEtichetta ?? "",
        imuAnnua: parseFloat(params.imu ?? "0"),
        tariAnnua: parseFloat(params.tari ?? "0"),
        addizionaliAnnue: parseFloat(params.addizionali ?? "0"),
        energiaElettricaAnnua: parseFloat(params.energiaElettrica ?? "0"),
        gasAnnuo: parseFloat(params.gas ?? "0"),
        internetAnnuo: parseFloat(params.internet ?? "0"),
        condominioAnnuo: parseFloat(params.condominio ?? "0"),
        manutenzioneOrdinariaAnnua: parseFloat(params.manutenzioneOrdinaria ?? "0"),
        manutenzioneStraordinariaAnnua: parseFloat(
          params.manutenzioneStraordinaria ?? "0"
        ),
        assicurazioneAnnua: parseFloat(params.assicurazione ?? "0"),
        altriCostiAcquisto: parseFloat(params.altriCosti ?? "0"),
        ristrutturazione: parseFloat(params.ristrutturazione ?? "0"),
        arredamento: parseFloat(params.arredamento ?? "0"),
        immobileAbitazionePrincipale: params.abitazionePrincipale === "1",
        anniInvestimento,
        prezzoRivenditaStimato: parseFloat(params.rivendita ?? "0"),
      })
    : [];

  const righeConCumulato = aggiungiCumulato(righeCalcolate);
  const transazioni = elencoTransazioni(righeCalcolate);
  const irr = parametriValidi ? calcolaXIRR(transazioni) : null;
  const interpretazione = interpretaIrr(irr);
  const annoRientro = trovaAnnoRientro(righeConCumulato);
  const annoRientroCalendario =
    righeConCumulato.find((r) => r.anno === annoRientro)?.annoCalendario ?? null;

  const righeOltreOrizzonte = righeConCumulato.filter(
    (r) => r.anno > anniInvestimento
  );

  const datiGrafico: DatoAnnoGrafico[] = righeConCumulato.map((r) => ({
    annoCalendario: r.annoCalendario,
    postVendita: r.anno > anniInvestimento,
    investimenti: sommaCategoria(r.voci, "investimenti"),
    ricavi: sommaCategoria(r.voci, "ricavi"),
    costi: sommaCategoria(r.voci, "costi"),
    oneri: sommaCategoria(r.voci, "oneri"),
    imposte: sommaCategoria(r.voci, "imposte"),
    flussoCumulato: r.flussoCumulato,
  }));

  const nomeImmobile = params.nome ?? null;
  const linkRitorno = params.idImmobile
    ? `/immobile?id=${params.idImmobile}`
    : "/immobile";
  const ultimoSalvataggio = params.ultimoSalvataggio
    ? new Date(params.ultimoSalvataggio)
    : null;

  return (
    <div className="min-h-screen bg-[var(--ink)] text-[var(--ink-text)]">
      <div className="sticky top-0 z-20 bg-[var(--ink)]">
        <header className="border-b border-[var(--rule)] px-6 py-5 lg:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-baseline gap-3">
                <Link href={linkRitorno} className="text-sm text-[var(--brass)] hover:underline">
                  ← Torna al calcolatore
                </Link>
                <h1 className="font-[var(--font-display)] text-2xl tracking-tight">
                  <Link href="/">CasaFlow</Link>
                </h1>
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Simulatore di redditività per investimenti immobiliari
                {" — "}
                <Link href="/documentazione" className="text-[var(--brass)] hover:underline">
                  Come funziona
                </Link>
              </p>
            </div>

            {/* Cruscotto minimo: sempre in vista durante lo scroll. */}
            <div className="flex items-center gap-2 rounded-sm border border-[var(--rule)] bg-[var(--surface)] px-3 py-2 font-[var(--font-mono)] text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    interpretazione.fascia === "negativo"
                      ? "var(--brick)"
                      : interpretazione.fascia === "basso"
                      ? "var(--muted)"
                      : "var(--brass)",
                }}
                title={interpretazione.etichetta}
              />
              <span className="text-[var(--muted)]">IRR</span>
              <span className="text-base font-medium text-[var(--ink-text)]">
                {irr !== null ? `${(irr * 100).toFixed(1)}%` : "n/d"}
              </span>
              <span className="hidden text-[var(--muted)] sm:inline">
                — {interpretazione.etichetta}
              </span>
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
              <UserButton afterSignOutUrl="/" />
            </Show>
          </div>
        </header>

        {nomeImmobile && (
          <div className="border-b border-[var(--rule)] bg-[var(--brass)]/5 px-6 py-2.5 lg:px-10">
            <p className="text-sm text-[var(--brass)]">
              Stai lavorando su: <span className="font-medium">{nomeImmobile}</span>
              {ultimoSalvataggio && (
                <span className="ml-2 text-xs text-[var(--muted)]">
                  (ultimo salvataggio {formatoDataOra.format(ultimoSalvataggio)})
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      <div className="px-6 py-8 lg:px-10">
        {!parametriValidi && (
          <div className="mt-6 rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-5">
            <p className="text-sm text-[var(--muted)]">
              Parametri insufficienti per calcolare i flussi di cassa. Torna al
              calcolatore, compila i dati dell&apos;immobile e riapri questo
              link.
            </p>
          </div>
        )}

        {parametriValidi && (
          <>
            {/* ─── Grafico: barre impilate per categoria + cumulato ────── */}
            <div className="rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-5">
              <h3 className="mb-4 font-[var(--font-display)] text-sm uppercase tracking-wide text-[var(--muted)]">
                Flussi per categoria e cumulato nel tempo
              </h3>
              <GraficoFlussi dati={datiGrafico} annoRientroCalendario={annoRientroCalendario} />
              {righeOltreOrizzonte.length > 0 && (
                <p className="mt-3 text-[10px] leading-relaxed text-[var(--muted)]">
                  <span className="text-[var(--brass)]">
                    * Flussi dopo la fine dell&apos;investimento (
                    {righeOltreOrizzonte.map((r) => r.annoCalendario).join(", ")}
                    ):
                  </span>{" "}
                  la tassazione dell&apos;affitto e le detrazioni fiscali si
                  realizzano tramite dichiarazione dei redditi l&apos;anno
                  successivo a quello di competenza — anche quando cade dopo
                  la vendita dell&apos;immobile. Questi flussi restano dovuti
                  (o spettanti) e sono inclusi nel calcolo dell&apos;IRR.
                </p>
              )}
            </div>

            {/* ─── Dettaglio movimenti: tabella ordinabile e filtrabile ── */}
            <h2 className="mt-8 font-[var(--font-display)] text-sm uppercase tracking-wide text-[var(--muted)]">
              Dettaglio movimenti
            </h2>

            <div className="mt-3">
              <TabellaMovimenti
                transazioni={transazioni}
                anniInvestimento={anniInvestimento}
                nomeImmobile={nomeImmobile}
              />
            </div>

            <p className="mt-4 text-[10px] leading-relaxed text-[var(--muted)]">
              Le date sono stime verosimili, non dati reali: acquisto e costi
              accessori alla decorrenza del mutuo (o al 1° gennaio se non c&apos;è
              mutuo), IMU e TARI ad acconto/saldo entro l&apos;anno di
              competenza, rate mutuo il primo di ogni mese, il resto al 1°
              gennaio dell&apos;anno. Tassazione affitto, addizionali IRPEF e
              detrazioni fiscali (mediazione, interessi mutuo) sono invece
              realizzate l&apos;anno SUCCESSIVO a quello di competenza (30
              giugno), coerentemente con il ciclo della dichiarazione dei
              redditi
              {righeOltreOrizzonte.length > 0 && (
                <> — per questo compare almeno un anno oltre l&apos;orizzonte
                  (contrassegnato con *)</>
              )}
              .
            </p>
          </>
        )}
      </div>
    </div>
  );
}
