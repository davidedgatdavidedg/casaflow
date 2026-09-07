// lib/calcolo/__fixtures__/immobili.ts
//
// Fixture unica: ogni voce di IMMOBILI rappresenta un Immobile (l'atto di
// acquisto) con una o più UnitaCatastale al suo interno, più campi
// opzionali per mutuo/agenzia/notaio. Un campo "atteso" assente significa
// che quel calcolo non viene verificato per quella unità/immobile — non è
// un errore, è una scelta (vedi immobili.test.ts per come vengono
// eseguiti i test).
//
// Gli immobili "reali" sono estratti dalle visure catastali caricate il
// 12/06/2026 (Lecco - Moggio; Milano - Milano e Peschiera Borromeo) e dal
// foglio Excel originale "ImmobilSIM" (sheet Strambio, DiazBox).
//
// Gli immobili "fittizi" servono a testare casi limite dell'algoritmo che
// non corrispondono a nessun immobile reale a disposizione.
//
// NOTE:
// - Lo stato abitativo IMU di default, se non specificato su una unità, è
//   "affittata".
// - I valori di IMU non tengono conto della quota di possesso (alcuni
//   immobili reali sono in comproprietà) — vedi TODO in fondo al file.
// - Via M.L. King e Via della Liberazione (Peschiera Borromeo): le unità
//   catastali che condividono foglio e particella sono state raggruppate
//   in un solo immobile, essendo di fatto un unico complesso.
// - Dati mutuo: confermati assenti (importoMutuo: 0) per Moggio, Via
//   Diaz, Via M.L. King e Via della Liberazione. Unico mutuo reale noto:
//   Strambio (dati dal foglio Excel originale).
// - metriQuadri: inizializzata a 0 su tutte le unità reali — compilala
//   quando hai il dato, serve per TARI, utenze e spese condominiali.

import type {
  CategoriaCatastale,
  StatoAbitativoImu,
  TipoVenditore,
} from "../tipi";

export interface UnitaCatastaleTest {
  etichetta?: string;
  comune: string;
  categoriaCatastale: CategoriaCatastale;
  renditaCatastale: number;
  statoAbitativoImu?: StatoAbitativoImu; // default "affittata" se omesso
  aliquotaImuPersonalizzata?: number;
  coefficienteRivalutazionePersonalizzato?: number;
  /** Superficie in mq — usata per TARI, utenze e spese condominiali.
   * Se assente o 0, quei costi risultano zero per questa unità. */
  metriQuadri?: number;
  // Puramente identificativi — nessun impatto sui calcoli, solo per
  // tracciare il riferimento alla visura catastale reale.
  foglio?: string;
  particella?: string;
  subalterno?: string;
  imuAtteso?: number;
}

export interface ImmobileTest {
  etichetta: string;
  unita: UnitaCatastaleTest[];

  // Campi dell'atto — opzionali, compilali quando hai il dato.
  prezzoAcquisto?: number;
  primaCasa?: boolean;
  acquistoDa?: TipoVenditore;
  registroAtteso?: number;
  ipotecariaAttesa?: number;
  catastaleAttesa?: number;

  // Spese di agenzia — opzionali.
  percentualeAgenzia?: number; // se assente, si usa il default (3%) della funzione
  agenziaImponibileAtteso?: number;
  agenziaIvaAttesa?: number;
  agenziaTotaleAtteso?: number;

  // Mutuo — parametri completi, opzionali. Usati sia per verificare
  // calcolaSpeseMutuo sia per popolare la sezione "Mutuo" della GUI
  // quando questo immobile viene caricato dal selettore di debug.
  importoMutuo?: number;
  tassoMutuoPercentuale?: number; // es. 3.2 per 3,2% — tasso fisso
  durataMutuoAnni?: number;
  decorrenzaMutuo?: string; // formato ISO "YYYY-MM-DD"
  speseIncassoPerRataMutuo?: number;
  percentualeIstruttoria?: number; // se assente, si usa il default (0,5%) della funzione
  istruttoriaAttesa?: number;
  impostaSostitutivaAttesa?: number;
  speseMutuoTotaleAtteso?: number;

  // Costi notarili — opzionali.
  onorarioNotaioPersonalizzato?: number; // valore assoluto €, se assente si stima al 2% del prezzo
  visureNotaio?: number; // se assente si usa il default (150€)
  tassaArchivioNotaio?: number; // se assente si usa il default (35€)
  notaioOnorarioAtteso?: number;
  notaioVisureAtteso?: number;
  notaioTassaArchivioAtteso?: number;
  notaioTotaleAtteso?: number;

  // TARI — opzionale.
  tariAnnuoPersonalizzato?: number; // valore assoluto €/anno, se assente si stima dalla metratura (2,5€/mq)
  tariAttesa?: number;

  // Spese condominiali — opzionale.
  condominioAnnuoPersonalizzato?: number; // valore assoluto €/anno, se assente si stima dalla metratura (5€/mq)
  condominioAttesoAnnuo?: number;

  // Utenze — opzionali, ciascuna come totale annuo esplicito.
  // Se assenti, si usa la metratura come proxy interno di stima.
  energiaElettricaAnnua?: number;
  gasAnnuo?: number;
  internetAnnuo?: number;
}

export const IMMOBILI = {
  // ── Fittizi: costi notarili ──────────────────────────────────────────────
  fittizioNotaioDefault: {
    etichetta: "Fittizio — costi notaio con valori di default (2%, 150€, 35€)",
    unita: [
      { comune: "Milano", categoriaCatastale: "A/2", renditaCatastale: 538.09 },
    ],
    prezzoAcquisto: 200000,
    // onorario 200000*0.02 = 4000; visure 150; tassa archivio 35
    notaioOnorarioAtteso: 4000,
    notaioVisureAtteso: 150,
    notaioTassaArchivioAtteso: 35,
    notaioTotaleAtteso: 4185,
  },
  fittizioNotaioPersonalizzato: {
    etichetta: "Fittizio — costi notaio con valori personalizzati",
    unita: [
      { comune: "Milano", categoriaCatastale: "A/2", renditaCatastale: 538.09 },
    ],
    prezzoAcquisto: 200000,
    onorarioNotaioPersonalizzato: 3200, // valore assoluto, es. da preventivo reale
    visureNotaio: 130,
    tassaArchivioNotaio: 28,
    notaioOnorarioAtteso: 3200,
    notaioVisureAtteso: 130,
    notaioTassaArchivioAtteso: 28,
    notaioTotaleAtteso: 3358,
  },
} satisfies Record<string, ImmobileTest>;

// TODO (funzionalità non ancora implementata): gestione della quota di
// possesso. Diversi immobili reali sono posseduti in comproprietà (es.
// 1/2, 1/4, proprietà superficiaria). Quando calcolaImu supporterà un
// parametro `quotaPossesso`, questa fixture andrà arricchita di
// conseguenza per le unità interessate.
