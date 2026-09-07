// lib/calcolo/flussiCassa.ts
//
// Assembla i flussi di cassa di un investimento immobiliare a livello di
// singola transazione (categoria, voce, importo, data), non solo
// aggregati annuali — coerente con un registro movimenti tipo Excel.
//
// A differenza di irr.ts (motore matematico puro, stabile), QUESTO è il
// modulo pensato per crescere: quando si aggiungeranno altre voci di
// flusso (manutenzione, spese condominiali, periodi di sfitto, ecc.),
// andranno aggiunte qui — irr.ts non va toccato.

import { calcolaPianoAmmortamento } from "./ammortamento";
import { calcolaDetrazioneMediazione } from "./detrazioneMediazione";
import { calcolaDetrazioneInteressiMutuo } from "./detrazioneInteressiMutuo";
import type { Mutuo } from "./tipi";

export type CategoriaVoce = "investimenti" | "costi" | "imposte" | "ricavi";

export interface VoceFlusso {
  anno: number; // anno "indice" dell'investimento (0 = acquisto, 1..N = anni operativi) — usato per raggruppamento e calcolo
  annoCalendario: number; // anno solare reale (es. 2026) — usato solo per la visualizzazione
  categoria: CategoriaVoce;
  descrizione: string;
  /** Positivo = entrata di cassa, negativo = uscita di cassa. */
  importo: number;
  /** Data verosimile della transazione (stima, non un dato reale). */
  data: Date;
}

export interface RigaFlussoCassa {
  anno: number;
  annoCalendario: number;
  voci: VoceFlusso[];
  flussoTotale: number; // somma di tutte le voci dell'anno
}

export interface RigaFlussoCassaConCumulato extends RigaFlussoCassa {
  flussoCumulato: number;
}

/** Voce prima di ricevere annoCalendario — assegnato in un unico
 * passaggio finale quando la riga viene composta, invece che ripetuto
 * in ciascuno dei numerosi punti in cui si crea una singola voce. */
type VoceSenzaAnnoCalendario = Omit<VoceFlusso, "annoCalendario">;

export interface ParametriFlussiCassa {
  prezzoAcquisto: number;

  registro: number;
  ipotecaria: number;
  catastale: number;

  notaioOnorario: number;
  notaioVisure: number;
  notaioTassaArchivio: number;

  agenziaTotale: number;

  mutuo: Mutuo | null;
  speseMutuoIstruttoria: number;
  speseMutuoImpostaSostitutiva: number;

  affittoLordoAnnuo: number;
  tassazioneAffittoImporto: number;
  tassazioneAffittoEtichetta: string;

  imuAnnua: number;

  // Nuove voci ricorrenti — tutte opzionali (default 0 se omesse).
  tariAnnua?: number;
  /** Addizionali IRPEF (regionale + comunale) — si applicano solo in
   * regime di tassazione ordinaria, non con cedolare secca. */
  addizionaliAnnue?: number;
  energiaElettricaAnnua?: number;
  gasAnnuo?: number;
  internetAnnuo?: number;
  condominioAnnuo?: number;
  manutenzioneOrdinariaAnnua?: number;
  manutenzioneStraordinariaAnnua?: number;
  assicurazioneAnnua?: number;

  // Costi una tantum aggiuntivi (anno 0) — opzionali, default 0.
  altriCostiAcquisto?: number;
  ristrutturazione?: number;
  arredamento?: number;

  /** Se l'immobile è (o sarà) abitazione principale dell'acquirente —
   * condiziona le detrazioni su mediazione e interessi mutuo, che NON
   * spettano per un acquisto puramente ad uso investimento/affitto. */
  immobileAbitazionePrincipale?: boolean;

  anniInvestimento: number;
  prezzoRivenditaStimato: number;
}

/** 16 giugno: scadenza tipica dell'acconto IMU. */
const GIORNO_MESE_IMU_ACCONTO: [number, number] = [5, 16]; // mese 0-indexed (giugno = 5)
/** 16 dicembre: scadenza tipica del saldo IMU. */
const GIORNO_MESE_IMU_SALDO: [number, number] = [11, 16];
/** 30 giugno: scadenza semplificata per i pagamenti/benefici legati alla
 * dichiarazione dei redditi (tassazione affitto, addizionali IRPEF,
 * detrazioni su mediazione e interessi mutuo) — tutti realizzati l'anno
 * SUCCESSIVO a quello di competenza, coerentemente con il ciclo reale
 * della dichiarazione. Semplificato a un'unica data indicativa (nella
 * realtà acconto e saldo possono cadere in momenti diversi). */
const GIORNO_MESE_TASSAZIONE_AFFITTO: [number, number] = [5, 30];

/** Scadenze TARI: non esiste una data unica nazionale (ogni Comune
 * delibera le proprie, tipicamente 2-3 rate), qui approssimate sulle
 * stesse date dell'IMU per semplicità — verifica sempre il tuo Comune. */
const GIORNO_MESE_TARI_ACCONTO: [number, number] = [5, 16];
const GIORNO_MESE_TARI_SALDO: [number, number] = [11, 16];

function dataInAnno(anno: number, [mese, giorno]: [number, number]): Date {
  return new Date(anno, mese, giorno);
}

function primoGennaio(anno: number): Date {
  return new Date(anno, 0, 1);
}

/** Primo giorno del mese, N mesi dopo la data di decorrenza del mutuo
 * (offsetMesi 0 = mese stesso della decorrenza). */
function primoDelMese(dataDecorrenza: Date, offsetMesi: number): Date {
  return new Date(
    dataDecorrenza.getFullYear(),
    dataDecorrenza.getMonth() + offsetMesi,
    1
  );
}

/**
 * Costruisce l'elenco dei flussi di cassa, transazione per transazione,
 * con categoria, descrizione, importo e data stimata.
 */
export function calcolaFlussiCassa(
  parametri: ParametriFlussiCassa
): RigaFlussoCassa[] {
  const {
    prezzoAcquisto,
    registro,
    ipotecaria,
    catastale,
    notaioOnorario,
    notaioVisure,
    notaioTassaArchivio,
    agenziaTotale,
    mutuo,
    speseMutuoIstruttoria,
    speseMutuoImpostaSostitutiva,
    affittoLordoAnnuo,
    tassazioneAffittoImporto,
    tassazioneAffittoEtichetta,
    imuAnnua,
    tariAnnua = 0,
    addizionaliAnnue = 0,
    energiaElettricaAnnua = 0,
    gasAnnuo = 0,
    internetAnnuo = 0,
    condominioAnnuo = 0,
    manutenzioneOrdinariaAnnua = 0,
    manutenzioneStraordinariaAnnua = 0,
    assicurazioneAnnua = 0,
    altriCostiAcquisto = 0,
    ristrutturazione = 0,
    arredamento = 0,
    immobileAbitazionePrincipale = false,
    anniInvestimento,
    prezzoRivenditaStimato,
  } = parametri;

  const importoMutuo = mutuo?.importo ?? 0;
  const piano = mutuo ? calcolaPianoAmmortamento(mutuo) : [];

  // Data di riferimento per l'acquisto: la decorrenza del mutuo se
  // presente (in pratica coincide o è vicinissima al rogito), altrimenti
  // il 1° gennaio dell'anno corrente.
  const dataAcquisto = mutuo ? mutuo.dataDecorrenza : primoGennaio(new Date().getFullYear());
  const annoBase = dataAcquisto.getFullYear();

  const righe: RigaFlussoCassa[] = [];

  // Alcuni benefici/imposte fiscali non si realizzano nello stesso anno
  // dell'evento che li genera, ma l'anno successivo tramite la
  // dichiarazione dei redditi (tassazione affitto, addizionali IRPEF,
  // detrazioni su mediazione e interessi mutuo). IMU e TARI restano
  // invece nell'anno di competenza: si pagano direttamente (acconto/
  // saldo), non tramite dichiarazione dell'anno dopo.
  //
  // Le voci differite vengono accumulate qui, per anno-indice di
  // destinazione, e iniettate SOLO alla fine — o dentro una riga già
  // esistente, o creando una riga nuova anche oltre anniInvestimento se
  // il differimento dell'ultimo anno operativo esce dall'orizzonte
  // (es. vendi nell'ultimo anno: la tassazione di quell'affitto si paga
  // comunque l'anno dopo, anche se l'immobile non è più tuo).
  const vociDifferitePerAnno = new Map<number, VoceSenzaAnnoCalendario[]>();
  function differisci(annoTarget: number, voce: VoceSenzaAnnoCalendario) {
    const elenco = vociDifferitePerAnno.get(annoTarget) ?? [];
    elenco.push(voce);
    vociDifferitePerAnno.set(annoTarget, elenco);
  }

  // ─── Anno 0: acquisto ───────────────────────────────────────────
  const vociAnnoZero: VoceSenzaAnnoCalendario[] = [
    {
      anno: 0,
      categoria: "investimenti",
      descrizione: "Prezzo di acquisto immobile",
      importo: -prezzoAcquisto,
      data: dataAcquisto,
    },
  ];

  if (importoMutuo > 0) {
    vociAnnoZero.push({
      anno: 0,
      categoria: "investimenti",
      descrizione: "Mutuo erogato",
      importo: importoMutuo,
      data: dataAcquisto,
    });
  }

  vociAnnoZero.push(
    {
      anno: 0,
      categoria: "imposte",
      descrizione: "Imposta di registro",
      importo: -registro,
      data: dataAcquisto,
    },
    {
      anno: 0,
      categoria: "imposte",
      descrizione: "Imposta ipotecaria",
      importo: -ipotecaria,
      data: dataAcquisto,
    },
    {
      anno: 0,
      categoria: "imposte",
      descrizione: "Imposta catastale",
      importo: -catastale,
      data: dataAcquisto,
    },
    {
      anno: 0,
      categoria: "costi",
      descrizione: "Intermediazione immobiliare",
      importo: -agenziaTotale,
      data: dataAcquisto,
    },
    {
      anno: 0,
      categoria: "costi",
      descrizione: "Onorario notaio",
      importo: -notaioOnorario,
      data: dataAcquisto,
    },
    {
      anno: 0,
      categoria: "costi",
      descrizione: "Visure ipotecarie/catastali",
      importo: -notaioVisure,
      data: dataAcquisto,
    },
    {
      anno: 0,
      categoria: "costi",
      descrizione: "Tassa archivio notarile",
      importo: -notaioTassaArchivio,
      data: dataAcquisto,
    }
  );

  if (importoMutuo > 0) {
    vociAnnoZero.push(
      {
        anno: 0,
        categoria: "costi",
        descrizione: "Istruttoria bancaria mutuo",
        importo: -speseMutuoIstruttoria,
        data: dataAcquisto,
      },
      {
        anno: 0,
        categoria: "imposte",
        descrizione: "Imposta sostitutiva mutuo",
        importo: -speseMutuoImpostaSostitutiva,
        data: dataAcquisto,
      }
    );
  }

  // La detrazione mediazione si realizza l'anno successivo all'acquisto
  // (tramite la dichiarazione dei redditi), quindi va sempre all'anno
  // indice 1 — indipendentemente da anniInvestimento.
  const detrazioneMediazione = calcolaDetrazioneMediazione(
    agenziaTotale,
    immobileAbitazionePrincipale
  );
  if (detrazioneMediazione.importo > 0) {
    differisci(1, {
      anno: 1,
      categoria: "imposte",
      descrizione: "Detrazione mediazione immobiliare (19%)",
      importo: detrazioneMediazione.importo,
      data: dataInAnno(annoBase + 1, GIORNO_MESE_TASSAZIONE_AFFITTO),
    });
  }

  if (altriCostiAcquisto > 0) {
    vociAnnoZero.push({
      anno: 0,
      categoria: "costi",
      descrizione: "Altri costi",
      importo: -altriCostiAcquisto,
      data: dataAcquisto,
    });
  }

  if (ristrutturazione > 0) {
    vociAnnoZero.push({
      anno: 0,
      categoria: "costi",
      descrizione: "Ristrutturazione",
      importo: -ristrutturazione,
      data: dataAcquisto,
    });
  }

  if (arredamento > 0) {
    vociAnnoZero.push({
      anno: 0,
      categoria: "costi",
      descrizione: "Arredamento",
      importo: -arredamento,
      data: dataAcquisto,
    });
  }

  righe.push({
    anno: 0,
    annoCalendario: annoBase,
    voci: arrotondaVoci(vociAnnoZero).map((v) => ({ ...v, annoCalendario: annoBase })),
    flussoTotale: arrotonda(sommaVoci(vociAnnoZero)),
  });

  // ─── Anni 1..N ────────────────────────────────────────────────────
  for (let anno = 1; anno <= anniInvestimento; anno++) {
    const annoCalendario = annoBase + anno;
    const voci: VoceSenzaAnnoCalendario[] = [
      {
        anno,
        categoria: "ricavi",
        descrizione: "Affitto lordo",
        importo: affittoLordoAnnuo,
        data: primoGennaio(annoCalendario),
      },
      {
        anno,
        categoria: "imposte",
        descrizione: "IMU (acconto)",
        importo: -imuAnnua / 2,
        data: dataInAnno(annoCalendario, GIORNO_MESE_IMU_ACCONTO),
      },
      {
        anno,
        categoria: "imposte",
        descrizione: "IMU (saldo)",
        importo: -imuAnnua / 2,
        data: dataInAnno(annoCalendario, GIORNO_MESE_IMU_SALDO),
      },
    ];

    // Tassazione affitto: si paga tramite dichiarazione dei redditi
    // l'anno SUCCESSIVO a quello in cui il reddito è maturato — anche
    // se questo esce dall'orizzonte di investimento (es. ultimo anno).
    differisci(anno + 1, {
      anno: anno + 1,
      categoria: "imposte",
      descrizione: `Tassazione affitto (${tassazioneAffittoEtichetta})`,
      importo: -tassazioneAffittoImporto,
      data: dataInAnno(annoBase + anno + 1, GIORNO_MESE_TASSAZIONE_AFFITTO),
    });

    if (tariAnnua > 0) {
      voci.push(
        {
          anno,
          categoria: "imposte",
          descrizione: "TARI (acconto)",
          importo: -tariAnnua / 2,
          data: dataInAnno(annoCalendario, GIORNO_MESE_TARI_ACCONTO),
        },
        {
          anno,
          categoria: "imposte",
          descrizione: "TARI (saldo)",
          importo: -tariAnnua / 2,
          data: dataInAnno(annoCalendario, GIORNO_MESE_TARI_SALDO),
        }
      );
    }

    if (addizionaliAnnue > 0) {
      differisci(anno + 1, {
        anno: anno + 1,
        categoria: "imposte",
        descrizione: "Addizionali IRPEF regionale/comunale",
        importo: -addizionaliAnnue,
        data: dataInAnno(annoBase + anno + 1, GIORNO_MESE_TASSAZIONE_AFFITTO),
      });
    }

    if (energiaElettricaAnnua > 0) {
      voci.push({
        anno,
        categoria: "costi",
        descrizione: "Energia elettrica",
        importo: -energiaElettricaAnnua,
        data: primoGennaio(annoCalendario),
      });
    }

    if (gasAnnuo > 0) {
      voci.push({
        anno,
        categoria: "costi",
        descrizione: "Gas",
        importo: -gasAnnuo,
        data: primoGennaio(annoCalendario),
      });
    }

    if (internetAnnuo > 0) {
      voci.push({
        anno,
        categoria: "costi",
        descrizione: "Internet",
        importo: -internetAnnuo,
        data: primoGennaio(annoCalendario),
      });
    }

    if (condominioAnnuo > 0) {
      voci.push({
        anno,
        categoria: "costi",
        descrizione: "Spese condominiali",
        importo: -condominioAnnuo,
        data: primoGennaio(annoCalendario),
      });
    }

    if (manutenzioneOrdinariaAnnua > 0) {
      voci.push({
        anno,
        categoria: "costi",
        descrizione: "Manutenzione ordinaria",
        importo: -manutenzioneOrdinariaAnnua,
        data: primoGennaio(annoCalendario),
      });
    }

    if (manutenzioneStraordinariaAnnua > 0) {
      voci.push({
        anno,
        categoria: "costi",
        descrizione: "Manutenzione straordinaria",
        importo: -manutenzioneStraordinariaAnnua,
        data: primoGennaio(annoCalendario),
      });
    }

    if (assicurazioneAnnua > 0) {
      voci.push({
        anno,
        categoria: "costi",
        descrizione: "Assicurazione",
        importo: -assicurazioneAnnua,
        data: primoGennaio(annoCalendario),
      });
    }

    // Rate del mutuo: una riga al mese (capitale e interessi separati),
    // non più aggregate — ciascuna datata il primo del mese corrispondente.
    const rateAnno = piano.slice((anno - 1) * 12, anno * 12);
    for (const rata of rateAnno) {
      const dataRata = primoDelMese(mutuo!.dataDecorrenza, rata.numero - 1);
      voci.push(
        {
          anno,
          categoria: "investimenti",
          descrizione: "Rimborso capitale mutuo",
          importo: -rata.quotaCapitale,
          data: dataRata,
        },
        {
          anno,
          categoria: "costi",
          descrizione: "Interessi passivi mutuo",
          importo: -rata.quotaInteressi,
          data: dataRata,
        }
      );
    }

    if (rateAnno.length > 0) {
      const interessiAnno = rateAnno.reduce((s, r) => s + r.quotaInteressi, 0);
      const detrazioneInteressi = calcolaDetrazioneInteressiMutuo(
        interessiAnno,
        immobileAbitazionePrincipale
      );
      if (detrazioneInteressi.importo > 0) {
        differisci(anno + 1, {
          anno: anno + 1,
          categoria: "imposte",
          descrizione: "Detrazione interessi mutuo (19%)",
          importo: detrazioneInteressi.importo,
          data: dataInAnno(annoBase + anno + 1, GIORNO_MESE_TASSAZIONE_AFFITTO),
        });
      }
    }

    if (anno === anniInvestimento) {
      const capitaleResiduo =
        rateAnno.length > 0 ? rateAnno[rateAnno.length - 1].capitaleResiduo : 0;

      voci.push({
        anno,
        categoria: "investimenti",
        descrizione: "Valore di rivendita stimato",
        importo: prezzoRivenditaStimato,
        data: primoGennaio(annoCalendario),
      });

      if (capitaleResiduo > 0) {
        voci.push({
          anno,
          categoria: "investimenti",
          descrizione: "Estinzione debito residuo mutuo",
          importo: -capitaleResiduo,
          data: primoGennaio(annoCalendario),
        });
      }
    }

    righe.push({
      anno,
      annoCalendario,
      voci: arrotondaVoci(voci).map((v) => ({ ...v, annoCalendario })),
      flussoTotale: arrotonda(sommaVoci(voci)),
    });
  }

  // ─── Iniezione delle voci differite ────────────────────────────────
  // Ogni voce differita va o dentro una riga già esistente (0..N), o —
  // se il suo anno di destinazione supera anniInvestimento — in una
  // riga nuova, creata qui per la prima volta. Nella pratica l'unico
  // caso possibile di "riga nuova" è anniInvestimento + 1 (il
  // differimento dell'ultimo anno operativo), dato che tutti gli altri
  // anni di destinazione ricadono già dentro l'orizzonte.
  for (const [annoTarget, vociTarget] of vociDifferitePerAnno) {
    const annoCalendarioTarget = annoBase + annoTarget;
    const vociTargetConAnno = arrotondaVoci(vociTarget).map((v) => ({
      ...v,
      annoCalendario: annoCalendarioTarget,
    }));

    const rigaEsistente = righe.find((r) => r.anno === annoTarget);
    if (rigaEsistente) {
      rigaEsistente.voci = [...rigaEsistente.voci, ...vociTargetConAnno];
      rigaEsistente.flussoTotale = arrotonda(sommaVoci(rigaEsistente.voci));
    } else {
      righe.push({
        anno: annoTarget,
        annoCalendario: annoCalendarioTarget,
        voci: vociTargetConAnno,
        flussoTotale: arrotonda(sommaVoci(vociTargetConAnno)),
      });
    }
  }

  // Riordino per sicurezza: l'iniezione di righe "fuori orizzonte" può
  // aver aggiunto una riga in coda fuori dall'ordine di costruzione.
  righe.sort((a, b) => a.anno - b.anno);

  return righe;
}

/** Estrae il solo array di flussi totali, pronto per calcolaIRR/calcolaVAN. */
export function estraiFlussiTotali(righe: RigaFlussoCassa[]): number[] {
  return righe.map((r) => r.flussoTotale);
}

/** Appiattisce tutte le voci di tutti gli anni in un unico elenco di
 * transazioni, ordinato cronologicamente — pronto per una tabella unica
 * stile registro movimenti. */
export function elencoTransazioni(righe: RigaFlussoCassa[]): VoceFlusso[] {
  return righe
    .flatMap((r) => r.voci)
    .sort((a, b) => a.data.getTime() - b.data.getTime());
}

/** Aggiunge il flusso cumulato progressivo a ciascuna riga — utile per
 * individuare l'anno di rientro dell'investimento (payback period). */
export function aggiungiCumulato(
  righe: RigaFlussoCassa[]
): RigaFlussoCassaConCumulato[] {
  let cumulato = 0;
  return righe.map((r) => {
    cumulato = arrotonda(cumulato + r.flussoTotale);
    return { ...r, flussoCumulato: cumulato };
  });
}

/** Restituisce il primo anno in cui il flusso cumulato torna non negativo
 * (l'investimento ha "recuperato" l'esborso iniziale), o null se non
 * avviene entro l'orizzonte considerato. */
export function trovaAnnoRientro(
  righeConCumulato: RigaFlussoCassaConCumulato[]
): number | null {
  const riga = righeConCumulato.find((r) => r.flussoCumulato >= 0);
  return riga ? riga.anno : null;
}

function sommaVoci(voci: { importo: number }[]): number {
  return voci.reduce((somma, v) => somma + v.importo, 0);
}

function arrotondaVoci<T extends { importo: number }>(voci: T[]): T[] {
  return voci.map((v) => ({ ...v, importo: arrotonda(v.importo) }));
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
