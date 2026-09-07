// lib/calcolo/tipi.ts

// ─── Catasto ────────────────────────────────────────────────────────────

export type CategoriaCatastale =
  // Gruppo A — Abitazioni e uffici
  | "A/1"  // Abitazione di tipo signorile
  | "A/2"  // Abitazione di tipo civile
  | "A/3"  // Abitazione di tipo economico
  | "A/4"  // Abitazione di tipo popolare
  | "A/5"  // Abitazione di tipo ultrapopolare
  | "A/6"  // Abitazione di tipo rurale
  | "A/7"  // Abitazione in villini
  | "A/8"  // Abitazione in ville
  | "A/9"  // Castelli, palazzi di eminenti pregi artistici o storici
  | "A/10" // Uffici e studi privati

  // Gruppo B — Edifici ad uso collettivo
  | "B/1" | "B/2" | "B/3" | "B/4" | "B/5" | "B/6" | "B/7" | "B/8"

  // Gruppo C — Immobili a destinazione commerciale/varia
  | "C/1"  // Negozi e botteghe
  | "C/2"  // Magazzini e locali di deposito (cantine, soffitte non abitabili)
  | "C/3"  // Laboratori per arti e mestieri
  | "C/4"  // Fabbricati per esercizi sportivi (senza fine di lucro)
  | "C/5"  // Stabilimenti balneari e di acque curative (senza fine di lucro)
  | "C/6"  // Stalle, scuderie, rimesse, autorimesse, box
  | "C/7"  // Tettoie chiuse o aperte

  // Gruppo D — Immobili a destinazione speciale
  | "D/1" | "D/2" | "D/3" | "D/4" | "D/5"
  | "D/6" | "D/7" | "D/8" | "D/9" | "D/10";

/** Categorie catastali più comuni per un investitore privato,
 * usate per limitare le opzioni proposte in quick mode. */
export const CATEGORIE_CATASTALI_QUICK_MODE: CategoriaCatastale[] = [
  "A/2", "A/3", "A/4", "A/5", "C/1", "C/2", "C/6",
];

/** Descrizione testuale di ciascuna categoria catastale, per mostrarla
 * accanto alla sigla nell'interfaccia (es. "A/2 — Abitazione di tipo civile"). */
export const DESCRIZIONE_CATEGORIA_CATASTALE: Record<CategoriaCatastale, string> = {
  "A/1": "Abitazione di tipo signorile",
  "A/2": "Abitazione di tipo civile",
  "A/3": "Abitazione di tipo economico",
  "A/4": "Abitazione di tipo popolare",
  "A/5": "Abitazione di tipo ultrapopolare",
  "A/6": "Abitazione di tipo rurale",
  "A/7": "Abitazione in villini",
  "A/8": "Abitazione in ville",
  "A/9": "Castelli, palazzi di eminenti pregi artistici o storici",
  "A/10": "Uffici e studi privati",
  "B/1": "Collegi, convitti, orfanotrofi, case di cura, caserme",
  "B/2": "Case di cura ed ospedali (senza fine di lucro)",
  "B/3": "Prigioni e riformatori",
  "B/4": "Uffici pubblici",
  "B/5": "Scuole e laboratori scientifici",
  "B/6": "Biblioteche, pinacoteche, musei, gallerie, accademie",
  "B/7": "Cappelle ed oratori non destinati all'esercizio pubblico del culto",
  "B/8": "Magazzini sotterranei per depositi di derrate",
  "C/1": "Negozi e botteghe",
  "C/2": "Magazzini e locali di deposito (cantine, soffitte)",
  "C/3": "Laboratori per arti e mestieri",
  "C/4": "Fabbricati per esercizi sportivi (senza fine di lucro)",
  "C/5": "Stabilimenti balneari e di acque curative (senza fine di lucro)",
  "C/6": "Stalle, scuderie, rimesse, autorimesse, box",
  "C/7": "Tettoie chiuse o aperte",
  "D/1": "Opifici (fabbricati industriali)",
  "D/2": "Alberghi e pensioni (con fine di lucro)",
  "D/3": "Teatri, cinema, sale per concerti e spettacoli",
  "D/4": "Case di cura ed ospedali (con fine di lucro)",
  "D/5": "Istituti di credito, cambio e assicurazione (con fine di lucro)",
  "D/6": "Fabbricati per esercizi sportivi (con fine di lucro)",
  "D/7": "Fabbricati per speciali esigenze di un'attività industriale",
  "D/8": "Fabbricati per speciali esigenze di un'attività commerciale",
  "D/9": "Edifici galleggianti o sospesi, ponti privati soggetti a pedaggio",
  "D/10": "Fabbricati per funzioni produttive connesse alle attività agricole",
};

// ─── IMU ────────────────────────────────────────────────────────────────

/** Stato abitativo ai fini IMU: diverso dal concetto di "prima casa"
 * usato per le imposte d'acquisto (vedi imu.ts per la spiegazione). */
export type StatoAbitativoImu =
  | "abitazionePrincipale"   // vi risiede e dimora abitualmente
  | "affittata"               // locata a terzi
  | "secondaCasaNonLocata";   // a disposizione, non locata, non principale

// ─── Unità catastale ────────────────────────────────────────────────────
//
// Rappresenta una singola unità così come compare in visura: un
// appartamento, un box, una cantina. calcolaImu lavora a questo livello,
// perché ogni unità può avere un uso diverso ai fini IMU (es. appartamento
// affittato, box tenuto per sé).

export interface UnitaCatastale {
  /** Utile per distinguere le unità quando un Immobile ne aggrega più di
   * una (es. "Appartamento", "Box") — opzionale per unità singole. */
  etichetta?: string;
  comune: string;
  categoriaCatastale: CategoriaCatastale;
  renditaCatastale: number;
  statoAbitativoImu: StatoAbitativoImu;
  /** Superficie in mq — opzionale, ma necessaria per calcolare TARI,
   * utenze e spese condominiali (tutte stimate per mq). Se assente,
   * quei costi risultano zero. */
  metriQuadri?: number;
}

// ─── Immobile (aggregato di una o più unità catastali) ──────────────────
//
// Rappresenta un'operazione di acquisto: un prezzo, un'unica imposta di
// registro, un unico notaio — anche quando l'atto comprende più unità
// catastali (es. appartamento + box acquistati insieme). calcolaImposteAcquisto
// lavora a questo livello, sommando le rendite di tutte le unità.

export type TipoVenditore = "privato" | "impresa";

export interface Immobile {
  prezzoAcquisto: number;
  primaCasa: boolean;
  acquistoDa: TipoVenditore;
  affittoLordoAnnuo: number;
  unita: UnitaCatastale[];
}

// ─── Orizzonte investimento ──────────────────────────────────────────────
//
// Parametri di scenario per la simulazione dell'investimento nel tempo:
// per quanti anni si detiene l'immobile prima di rivenderlo, e di quanto
// ci si aspetta si rivaluti ogni anno. Concettualmente distinti dai dati
// fiscali/catastali dell'immobile (sono ipotesi dell'utente, non fatti
// verificabili) — usati dal motore di flussi di cassa/IRR (non ancora
// implementato).

export interface OrizzonteInvestimento {
  anniInvestimento: number;
  percentualeRivalutazioneAnnua: number;
}

/** Durata di detenzione ipotizzata di default, in anni. */
export const ANNI_INVESTIMENTO_DEFAULT = 20;

/** Rivalutazione annua ipotizzata di default (0,10%) — valore
 * volutamente conservativo, modificabile dall'utente. */
export const PERCENTUALE_RIVALUTAZIONE_DEFAULT = 0.001;

// ─── Mutuo ──────────────────────────────────────────────────────────────

export interface PeriodoTasso {
  tassoAnnuo: number;
  dataInizio: Date;
  dataFine?: Date; // se omessa, vale fino alla fine del mutuo
}

export interface Mutuo {
  importo: number;
  durataAnni: number;
  dataDecorrenza: Date;
  tasso: number | PeriodoTasso[]; // fisso, oppure sequenza di periodi
  speseIncassoPerRata?: number;   // default 0, configurabile in advanced mode
}

// ─── Detrazioni ─────────────────────────────────────────────────────────

export type TipoDetrazione =
  | "interessiMutuo"
  | "intermediazione"
  | "ristrutturazione"
  | "mobili";

export interface ParametriDetrazione {
  capDetrazione: number;
  percentuale: number;
}

export interface RichiestaDetrazione {
  tipo: TipoDetrazione;
  imponibile: number;
}
