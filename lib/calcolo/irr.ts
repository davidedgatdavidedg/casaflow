// lib/calcolo/irr.ts
//
// Motore matematico puro per IRR (Internal Rate of Return / TIR) e VAN
// (Valore Attuale Netto / NPV). Non sa nulla del dominio immobiliare:
// quando in futuro si aggiungeranno nuove voci ai flussi di cassa, sarà
// flussiCassa.ts a cambiare, non questo.
//
// Espone DUE varianti:
// - calcolaIRR/calcolaVAN: IRR "classico" (equivalente a TIR di Excel),
//   attualizza per indice intero di periodo (0, 1, 2...), assumendo
//   flussi a intervalli annuali esatti.
// - calcolaXIRR/calcolaVANDate: IRR su date reali (equivalente a TIR.X
//   di Excel/XIRR), attualizza in base ai giorni effettivi trascorsi
//   dalla prima transazione (convenzione Attuale/365) — l'unica
//   coerente con un modello che, come flussiCassa.ts, assegna una data
//   reale a ogni singola transazione (rate mensili, pro-rata del primo
//   anno, differimenti fiscali a date specifiche). Usare quest'ultima
//   per l'IRR "ufficiale" mostrato in interfaccia.

interface FlussoConEsponente {
  esponente: number;
  importo: number;
}

function calcolaVANGenerico(flussi: FlussoConEsponente[], tasso: number): number {
  return flussi.reduce(
    (somma, f) => somma + f.importo / Math.pow(1 + tasso, f.esponente),
    0
  );
}

function derivataVANGenerico(flussi: FlussoConEsponente[], tasso: number): number {
  return flussi.reduce((somma, f) => {
    if (f.esponente === 0) return somma;
    return somma - (f.esponente * f.importo) / Math.pow(1 + tasso, f.esponente + 1);
  }, 0);
}

const MAX_ITERAZIONI_NEWTON = 100;
const TOLLERANZA = 1e-9;
const TASSO_MINIMO = -0.99; // vincolo di dominio: (1+tasso) non può essere <= 0
const TASSO_MASSIMO_BISEZIONE = 10; // 1000%, limite superiore ragionevole di ricerca

/** Range di ricerca primario per la scansione a griglia: economicamente
 * sensato per un investimento immobiliare, e soprattutto numericamente
 * STABILE. Vicino a TASSO_MINIMO (-99%) il denominatore (1+tasso)^n
 * tende a zero e il VAN esplode a valori enormi (ordini di 1e30+),
 * dove gli arrotondamenti in virgola mobile possono generare falsi
 * cambi di segno che non corrispondono a radici economicamente reali.
 * Si scandaglia quindi prima questa zona stabile; solo se non si trova
 * nulla si ripiega sul range esteso completo come ultima risorsa. */
const TASSO_MINIMO_SCANSIONE_PRIMARIA = -0.95;
const TASSO_MASSIMO_SCANSIONE_PRIMARIA = 5; // 500%

function calcolaIRRGenerico(
  flussi: FlussoConEsponente[],
  stimaIniziale: number
): number | null {
  if (flussi.length < 2) return null;

  const tuttiPositivi = flussi.every((f) => f.importo >= 0);
  const tuttiNegativi = flussi.every((f) => f.importo <= 0);
  if (tuttiPositivi || tuttiNegativi) return null;

  const irrNewton = calcolaIRRNewtonGenerico(flussi, stimaIniziale);
  if (irrNewton !== null) return irrNewton;

  return calcolaIRRBisezioneGenerico(flussi);
}

function calcolaIRRNewtonGenerico(
  flussi: FlussoConEsponente[],
  stimaIniziale: number
): number | null {
  let tasso = stimaIniziale;

  for (let i = 0; i < MAX_ITERAZIONI_NEWTON; i++) {
    const valoreVAN = calcolaVANGenerico(flussi, tasso);
    const derivata = derivataVANGenerico(flussi, tasso);

    if (Math.abs(derivata) < 1e-12) {
      return null; // derivata quasi nulla: Newton-Raphson non può procedere
    }

    let nuovoTasso = tasso - valoreVAN / derivata;

    if (nuovoTasso <= TASSO_MINIMO) {
      nuovoTasso = TASSO_MINIMO + 1e-6; // resta nel dominio valido
    }

    if (Math.abs(nuovoTasso - tasso) < TOLLERANZA) {
      return nuovoTasso;
    }

    tasso = nuovoTasso;
  }

  return null; // non convergenza entro il numero massimo di iterazioni
}

function calcolaIRRBisezioneGenerico(flussi: FlussoConEsponente[]): number | null {
  // Non ci si limita a guardare gli estremi dell'intervallo: con più di
  // un'inversione di segno nei flussi, il VAN in funzione del tasso può
  // non essere monotono. Si scandaglia quindi l'intervallo con una
  // griglia di punti, cercando il PRIMO cambio di segno — prima in una
  // zona economicamente sensata e numericamente stabile, poi (solo se
  // necessario) sul range esteso completo.
  return (
    cercaRadiceAGrigliaGenerico(
      flussi,
      TASSO_MINIMO_SCANSIONE_PRIMARIA,
      TASSO_MASSIMO_SCANSIONE_PRIMARIA
    ) ?? cercaRadiceAGrigliaGenerico(flussi, TASSO_MINIMO, TASSO_MASSIMO_BISEZIONE)
  );
}

function cercaRadiceAGrigliaGenerico(
  flussi: FlussoConEsponente[],
  tassoMin: number,
  tassoMax: number,
  numeroCampioni = 2000
): number | null {
  const passo = (tassoMax - tassoMin) / numeroCampioni;

  let basso = tassoMin;
  let vanBasso = calcolaVANGenerico(flussi, basso);
  let alto = tassoMax;
  let trovato = false;

  for (let i = 1; i <= numeroCampioni; i++) {
    const tassoCorrente = tassoMin + i * passo;
    const vanCorrente = calcolaVANGenerico(flussi, tassoCorrente);

    if (vanBasso * vanCorrente <= 0) {
      alto = tassoCorrente;
      trovato = true;
      break;
    }

    basso = tassoCorrente;
    vanBasso = vanCorrente;
  }

  if (!trovato) return null;

  for (let i = 0; i < 200; i++) {
    const medio = (basso + alto) / 2;
    const vanMedio = calcolaVANGenerico(flussi, medio);

    if (Math.abs(vanMedio) < 1e-6) {
      return medio;
    }

    if (vanBasso * vanMedio < 0) {
      alto = medio;
    } else {
      basso = medio;
      vanBasso = vanMedio;
    }
  }

  return (basso + alto) / 2;
}

// ─── API "classica" (indice intero di periodo) ──────────────────────────

/**
 * Calcola il Valore Attuale Netto (VAN) di una serie di flussi di cassa
 * periodici (indice intero: 0, 1, 2...), dato un tasso di sconto.
 */
export function calcolaVAN(flussi: number[], tassoSconto: number): number {
  return calcolaVANGenerico(
    flussi.map((importo, indice) => ({ esponente: indice, importo })),
    tassoSconto
  );
}

/**
 * Calcola l'IRR "classico" (equivalente a TIR di Excel) su una serie di
 * flussi periodici a indice intero — presuppone che ogni flusso cada a
 * un anno esatto di distanza dal precedente. Per un IRR su date reali
 * (equivalente a TIR.X/XIRR), usa calcolaXIRR.
 *
 * @param flussi Serie di flussi di cassa, dal periodo 0 in poi
 * @param stimaIniziale Punto di partenza per Newton-Raphson (default 10%)
 */
export function calcolaIRR(flussi: number[], stimaIniziale = 0.1): number | null {
  return calcolaIRRGenerico(
    flussi.map((importo, indice) => ({ esponente: indice, importo })),
    stimaIniziale
  );
}

// ─── API su date reali (XIRR / TIR.X) ───────────────────────────────────

export interface TransazioneDatata {
  data: Date;
  importo: number;
}

const GIORNI_ANNO = 365; // convenzione Attuale/365, la stessa usata da Excel XIRR

function flussiConEsponenteData(
  transazioni: TransazioneDatata[]
): FlussoConEsponente[] {
  if (transazioni.length === 0) return [];
  // Ordina sempre per data: la funzione deve essere corretta
  // indipendentemente dall'ordine con cui il chiamante passa le
  // transazioni — la prima cronologicamente è sempre il riferimento t=0.
  const ordinate = [...transazioni].sort((a, b) => a.data.getTime() - b.data.getTime());
  const dataIniziale = ordinate[0].data.getTime();
  return ordinate.map((t) => ({
    esponente: (t.data.getTime() - dataIniziale) / (1000 * 60 * 60 * 24 * GIORNI_ANNO),
    importo: t.importo,
  }));
}

/**
 * Calcola il VAN su transazioni con date reali (non periodi a indice
 * intero) — attualizza in base ai giorni effettivi dalla prima
 * transazione, convenzione Attuale/365. Le transazioni NON devono
 * essere pre-ordinate per data: viene usata la prima della lista come
 * riferimento (t=0), qualunque sia la sua posizione.
 */
export function calcolaVANDate(transazioni: TransazioneDatata[], tassoSconto: number): number {
  return calcolaVANGenerico(flussiConEsponenteData(transazioni), tassoSconto);
}

/**
 * Calcola l'IRR su transazioni con date reali — equivalente a TIR.X
 * (XIRR) di Excel. È la versione coerente con un modello che assegna una
 * data reale a ogni singola transazione (rate mensili del mutuo,
 * pro-rata del primo anno, differimenti fiscali a date specifiche):
 * aggregare tutto in totali annui e attualizzare per indice intero (vedi
 * calcolaIRR) sottostima la precisione già disponibile nei dati.
 *
 * @param transazioni Elenco di transazioni con data e importo (l'ordine
 *   nell'array non conta: la prima transazione temporale diventa t=0)
 * @param stimaIniziale Punto di partenza per Newton-Raphson (default 10%)
 */
export function calcolaXIRR(
  transazioni: TransazioneDatata[],
  stimaIniziale = 0.1
): number | null {
  return calcolaIRRGenerico(flussiConEsponenteData(transazioni), stimaIniziale);
}
