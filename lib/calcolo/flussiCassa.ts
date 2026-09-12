// lib/calcolo/flussiCassa.ts
//
// Assembla i flussi di cassa di un investimento immobiliare a livello di
// singola transazione (categoria, voce, importo, data), non solo
// aggregati annuali — coerente con un registro movimenti tipo Excel.
//
// Ogni "anno" rappresenta un vero ANNO SOLARE (gennaio-dicembre), non un
// blocco di 12 mesi dalla decorrenza del mutuo. L'orizzonte di
// investimento (anniInvestimento) è però calcolato sull'ANNIVERSARIO
// ESATTO dell'acquisto, non su anni solari interi: sia il primo sia
// l'ultimo anno sono quindi PARZIALI, simmetricamente:
// - Anno 0: dalla data di acquisto a fine anno solare (es. acquisto 3
//   settembre → 4 mesi di affitto/IMU/rate mutuo pro-rata).
// - Ultimo anno: da inizio anno solare fino alla data ESATTA
//   dell'anniversario (es. acquisto 20/04/2023, orizzonte 3 anni →
//   vendita 20/04/2026, non 1° gennaio 2026).
// Gli anni intermedi restano sempre anni solari pieni.
//
// A differenza di irr.ts (motore matematico puro, stabile), QUESTO è il
// modulo pensato per crescere: quando si aggiungeranno altre voci di
// flusso, andranno aggiunte qui — irr.ts non va toccato.

import { calcolaPianoAmmortamento } from "./ammortamento";
import { calcolaDetrazioneMediazione } from "./detrazioneMediazione";
import { calcolaDetrazioneInteressiMutuo } from "./detrazioneInteressiMutuo";
import {
  calcolaDetrazioneRistrutturazione,
  NUMERO_RATE_RISTRUTTURAZIONE,
} from "./detrazioneRistrutturazione";
import { calcolaDetrazioneMobili, NUMERO_RATE_MOBILI } from "./detrazioneMobili";
import type { Mutuo } from "./tipi";

export type CategoriaVoce = "investimenti" | "costi" | "oneri" | "imposte" | "ricavi";

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
  /** Data reale di acquisto dell'immobile — indipendente dalla
   * decorrenza del mutuo, che nella pratica parte un mese dopo (vedi
   * `mutuo.dataDecorrenza`). Determina l'anno solare 0 e il pro-rata dei
   * flussi operativi (affitto, IMU, TARI, utenze) sul primo anno. */
  dataAcquisto: Date;

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
  /** Quota del canone destinata a coprire spese fisse (es. condominio),
   * a carico del conduttore ma incassata dal proprietario per girarla a
   * chi di dovere — NON è reddito da locazione: nessuna tassazione
   * (cedolare/IRPEF) si applica a questa componente. */
  oneriAccessoriAnnui?: number;
  /** Beneficio economico dell'uso personale dell'immobile (invece di
   * affittarlo a terzi o pagare un alloggio altrove) — "rendita
   * figurativa". Un ricavo di cassa fittizio (non incassi realmente
   * nulla) ma reale ai fini del confronto d'investimento: nessuna
   * tassazione si applica, non essendo reddito vero. Ha senso solo se
   * affittoLordoAnnuo è zero (uso alternativo, non cumulabile). */
  renditaFigurativaAnnua?: number;
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
    dataAcquisto,
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
    oneriAccessoriAnnui = 0,
    renditaFigurativaAnnua = 0,
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

  const annoBase = dataAcquisto.getFullYear();

  // Mesi del primo anno solare (anno 0) durante i quali l'immobile è
  // POSSEDUTO: dall'acquisto a fine anno. Usato per il pro-rata di
  // affitto/IMU/TARI/utenze — concetto legato alla proprietà
  // dell'immobile, non al mutuo (che può decorrere più avanti).
  const meseAcquisto = dataAcquisto.getMonth(); // 0 = gennaio
  const mesiOperativiAnnoZero = 12 - meseAcquisto;
  const frazioneAnnoZero = mesiOperativiAnnoZero / 12;

  // Mesi del primo anno solare durante i quali sono maturate RATE DI
  // MUTUO: concetto distinto dal precedente. Il mutuo decorre da
  // mutuo.dataDecorrenza, che nella pratica è il 1° del mese successivo
  // all'acquisto (la prima rata non parte lo stesso mese del rogito) —
  // può quindi cadere in un mese diverso, e in rari casi (acquisto a
  // dicembre) perfino nell'anno solare successivo, col risultato che
  // l'anno 0 non ha alcuna rata di mutuo.
  const mesiRateAnnoZero =
    mutuo && mutuo.dataDecorrenza.getFullYear() === annoBase
      ? 12 - mutuo.dataDecorrenza.getMonth()
      : 0;

  // Data esatta di vendita: acquisto + anniInvestimento anni ESATTI (non
  // il 1° gennaio di un anno solare pieno). L'ultimo anno diventa quindi
  // anch'esso PARZIALE — simmetrico all'anno 0, ma alla fine invece che
  // all'inizio: da gennaio dell'anno solare fino alla data di vendita.
  const dataVendita = new Date(
    dataAcquisto.getFullYear() + anniInvestimento,
    dataAcquisto.getMonth(),
    dataAcquisto.getDate()
  );
  const meseVendita = dataVendita.getMonth();
  // Mesi posseduti nell'ultimo anno solare: da gennaio (incluso) al mese
  // di vendita (incluso).
  const mesiOperativiAnnoFinale = meseVendita + 1;
  const frazioneAnnoFinale = mesiOperativiAnnoFinale / 12;

  // Numero totale di rate mutuo maturate dalla decorrenza fino al mese
  // della vendita (incluso) — serve per tagliare correttamente le rate
  // dell'ultimo anno, che ora può essere parziale.
  const numeroRateFinoAVendita = mutuo
    ? Math.max(
        0,
        (dataVendita.getFullYear() - mutuo.dataDecorrenza.getFullYear()) * 12 +
          (dataVendita.getMonth() - mutuo.dataDecorrenza.getMonth()) +
          1
      )
    : 0;

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

  /**
   * Costruisce le voci operative (affitto, IMU, TARI, utenze, spese
   * ricorrenti) per un dato anno-indice, applicando la frazione di anno
   * effettivamente posseduta (1 = anno pieno, <1 = periodo parziale
   * dell'anno 0). Push diretto sull'array passato; la tassazione affitto
   * e le addizionali vengono invece SEMPRE differite all'anno successivo
   * (vedi sopra), quindi gestite a parte con `differisci`.
   */
  function aggiungiVociOperative(
    vociTarget: VoceSenzaAnnoCalendario[],
    anno: number,
    annoCalendario: number,
    frazione: number,
    dataProRata: Date
  ) {
    const pieno = frazione === 1;
    const suffisso = pieno ? "" : " (periodo parziale)";

    vociTarget.push({
      anno,
      categoria: "ricavi",
      descrizione: `Affitto lordo${suffisso}`,
      importo: affittoLordoAnnuo * frazione,
      data: pieno ? primoGennaio(annoCalendario) : dataProRata,
    });

    // Oneri accessori: quota del canone per spese fisse (es. condominio),
    // incassata dal proprietario ma non trattenuta — NON è reddito da
    // locazione, quindi nessuna tassazione differita collegata (a
    // differenza dell'affitto lordo, sopra).
    if (oneriAccessoriAnnui > 0) {
      vociTarget.push({
        anno,
        categoria: "ricavi",
        descrizione: `Oneri accessori${suffisso}`,
        importo: oneriAccessoriAnnui * frazione,
        data: pieno ? primoGennaio(annoCalendario) : dataProRata,
      });
    }

    // Rendita figurativa: beneficio dell'uso personale dell'immobile
    // (prima casa, o uso saltuario invece di affittare/pagare un
    // alloggio altrove) — ricavo di cassa fittizio, mai tassato (non è
    // reddito vero). Ha senso solo in alternativa all'affitto vero
    // (che infatti resta a zero quando questa è valorizzata).
    if (renditaFigurativaAnnua > 0 && affittoLordoAnnuo === 0) {
      vociTarget.push({
        anno,
        categoria: "ricavi",
        descrizione: `Rendita figurativa (uso personale)${suffisso}`,
        importo: renditaFigurativaAnnua * frazione,
        data: pieno ? primoGennaio(annoCalendario) : dataProRata,
      });
    }

    // Tassazione affitto: SEMPRE presente (anche se importo 0), stesso
    // comportamento delle altre voci sempre-presenti — ma differita.
    differisci(anno + 1, {
      anno: anno + 1,
      categoria: "imposte",
      descrizione: `Tassazione affitto (${tassazioneAffittoEtichetta})${suffisso}`,
      importo: -tassazioneAffittoImporto * frazione,
      data: dataInAnno(annoBase + anno + 1, GIORNO_MESE_TASSAZIONE_AFFITTO),
    });

    if (addizionaliAnnue > 0) {
      differisci(anno + 1, {
        anno: anno + 1,
        categoria: "imposte",
        descrizione: `Addizionali IRPEF regionale/comunale${suffisso}`,
        importo: -addizionaliAnnue * frazione,
        data: dataInAnno(annoBase + anno + 1, GIORNO_MESE_TASSAZIONE_AFFITTO),
      });
    }

    if (imuAnnua > 0) {
      if (pieno) {
        vociTarget.push(
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
          }
        );
      } else {
        vociTarget.push({
          anno,
          categoria: "imposte",
          descrizione: "IMU (periodo parziale, pro-rata sui mesi posseduti)",
          importo: -imuAnnua * frazione,
          data: dataProRata,
        });
      }
    }

    if (tariAnnua > 0) {
      if (pieno) {
        vociTarget.push(
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
      } else {
        vociTarget.push({
          anno,
          categoria: "imposte",
          descrizione: "TARI (periodo parziale, pro-rata sui mesi posseduti)",
          importo: -tariAnnua * frazione,
          data: dataProRata,
        });
      }
    }

    const speseRicorrentiSemplici: [number, string][] = [
      [energiaElettricaAnnua, "Energia elettrica"],
      [gasAnnuo, "Gas"],
      [internetAnnuo, "Internet"],
      [condominioAnnuo, "Spese condominiali"],
      [manutenzioneOrdinariaAnnua, "Manutenzione ordinaria"],
      [manutenzioneStraordinariaAnnua, "Manutenzione straordinaria"],
      [assicurazioneAnnua, "Assicurazione"],
    ];
    for (const [importoAnnuo, descrizione] of speseRicorrentiSemplici) {
      if (importoAnnuo > 0) {
        vociTarget.push({
          anno,
          categoria: "costi",
          descrizione: `${descrizione}${suffisso}`,
          importo: -importoAnnuo * frazione,
          data: pieno ? primoGennaio(annoCalendario) : dataProRata,
        });
      }
    }
  }

  // ─── Anno 0: acquisto (+ periodo operativo, pieno o parziale) ──────
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
        categoria: "oneri",
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

  // Detrazioni su ristrutturazione e mobili: come mediazione/interessi,
  // NON immediate — ma qui la spalmatura è su 10 quote annuali (non una
  // sola), a partire dall'anno successivo alla spesa. Riusa lo stesso
  // meccanismo di differimento, semplicemente chiamato 10 volte.
  if (ristrutturazione > 0) {
    const detrazioneRistrutturazione = calcolaDetrazioneRistrutturazione(
      ristrutturazione,
      immobileAbitazionePrincipale
    );
    if (detrazioneRistrutturazione.rataAnnua > 0) {
      for (let quota = 1; quota <= NUMERO_RATE_RISTRUTTURAZIONE; quota++) {
        differisci(quota, {
          anno: quota,
          categoria: "imposte",
          descrizione: `Detrazione ristrutturazione (quota ${quota}/${NUMERO_RATE_RISTRUTTURAZIONE})`,
          importo: detrazioneRistrutturazione.rataAnnua,
          data: dataInAnno(annoBase + quota, GIORNO_MESE_TASSAZIONE_AFFITTO),
        });
      }
    }
  }

  if (arredamento > 0) {
    const detrazioneMobili = calcolaDetrazioneMobili(
      arredamento,
      ristrutturazione > 0
    );
    if (detrazioneMobili.rataAnnua > 0) {
      for (let quota = 1; quota <= NUMERO_RATE_MOBILI; quota++) {
        differisci(quota, {
          anno: quota,
          categoria: "imposte",
          descrizione: `Detrazione mobili (quota ${quota}/${NUMERO_RATE_MOBILI})`,
          importo: detrazioneMobili.rataAnnua,
          data: dataInAnno(annoBase + quota, GIORNO_MESE_TASSAZIONE_AFFITTO),
        });
      }
    }
  }

  // Flussi operativi dell'anno 0: pro-rata sui mesi posseduti (o pieni,
  // se l'acquisto è a gennaio).
  aggiungiVociOperative(
    vociAnnoZero,
    0,
    annoBase,
    frazioneAnnoZero,
    dataAcquisto
  );

  // Rate del mutuo che cadono nell'anno solare 0 (dalla decorrenza del
  // mutuo — non dall'acquisto — a dicembre incluso; zero se il mutuo
  // decorre nell'anno solare successivo, es. acquisto a dicembre).
  const rateAnnoZero = piano.slice(0, mesiRateAnnoZero);
  for (const rata of rateAnnoZero) {
    const dataRata = primoDelMese(mutuo!.dataDecorrenza, rata.numero - 1);
    vociAnnoZero.push(
      {
        anno: 0,
        categoria: "investimenti",
        descrizione: "Rimborso capitale mutuo",
        importo: -rata.quotaCapitale,
        data: dataRata,
      },
      {
        anno: 0,
        categoria: "oneri",
        descrizione: "Interessi passivi mutuo",
        importo: -rata.quotaInteressi,
        data: dataRata,
      }
    );
  }

  if (rateAnnoZero.length > 0) {
    const interessiAnnoZero = rateAnnoZero.reduce((s, r) => s + r.quotaInteressi, 0);
    const detrazioneInteressiAnnoZero = calcolaDetrazioneInteressiMutuo(
      interessiAnnoZero,
      immobileAbitazionePrincipale
    );
    if (detrazioneInteressiAnnoZero.importo > 0) {
      differisci(1, {
        anno: 1,
        categoria: "imposte",
        descrizione: "Detrazione interessi mutuo (19%)",
        importo: detrazioneInteressiAnnoZero.importo,
        data: dataInAnno(annoBase + 1, GIORNO_MESE_TASSAZIONE_AFFITTO),
      });
    }
  }

  righe.push({
    anno: 0,
    annoCalendario: annoBase,
    voci: arrotondaVoci(vociAnnoZero).map((v) => ({ ...v, annoCalendario: annoBase })),
    flussoTotale: arrotonda(sommaVoci(vociAnnoZero)),
  });

  // ─── Anni 1..N: anni solari pieni, tranne l'ultimo (parziale fino
  // alla data esatta di vendita) ────────────────────────────────────────
  for (let anno = 1; anno <= anniInvestimento; anno++) {
    const annoCalendario = annoBase + anno;
    const voci: VoceSenzaAnnoCalendario[] = [];
    const ultimoAnno = anno === anniInvestimento;

    aggiungiVociOperative(
      voci,
      anno,
      annoCalendario,
      ultimoAnno ? frazioneAnnoFinale : 1,
      ultimoAnno ? dataVendita : primoGennaio(annoCalendario)
    );

    // Rate del mutuo di questo anno solare: continuano esattamente da
    // dove sono finite le rate dell'anno precedente (mesiRateAnnoZero +
    // blocchi di 12 mesi) — nota: mesiRateAnnoZero, non
    // mesiOperativiAnnoZero, perché la decorrenza del mutuo può cadere
    // in un mese diverso dall'acquisto (tipicamente un mese dopo).
    // Nell'ultimo anno, il blocco si ferma al mese della vendita, non ai
    // 12 mesi pieni.
    const inizioSliceRate = mesiRateAnnoZero + (anno - 1) * 12;
    const fineSliceRate = ultimoAnno
      ? numeroRateFinoAVendita
      : inizioSliceRate + 12;
    const rateAnno = piano.slice(inizioSliceRate, fineSliceRate);
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
          categoria: "oneri",
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
        data: dataVendita,
      });

      if (capitaleResiduo > 0) {
        voci.push({
          anno,
          categoria: "investimenti",
          descrizione: "Estinzione debito residuo mutuo",
          importo: -capitaleResiduo,
          data: dataVendita,
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
  // "+ 0" normalizza -0 a +0: -0 * frazione produce -0 (es. quando un
  // importo di partenza è zero, come la tassazione della rendita
  // figurativa), che supererebbe i confronti con toEqual/toBeCloseTo ma
  // fallirebbe un confronto stretto (Object.is) con toBe(0). Sommare 0 a
  // -0 in IEEE754 restituisce sempre +0.
  return Math.round(n * 100) / 100 + 0;
}
