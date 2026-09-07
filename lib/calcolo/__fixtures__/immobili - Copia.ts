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
  tariffaTari?: number; // €/mq/anno, se assente si usa il default (2,5€/mq)
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
  // ── Reale: Lecco, Comune di Moggio ────────────────────────────────────
  moggio: {
    etichetta: "Moggio — Via per Cassina 11",
    unita: [
      {
        etichetta: "Appartamento, piano 1 (F.7 P.1522 Sub.9)",
        comune: "Moggio",
        categoriaCatastale: "A/2",
        renditaCatastale: 619.75,
        statoAbitativoImu: "secondaCasaNonLocata",
        metriQuadri: 0,
        imuAtteso: 895.41,
      },
    ],
    prezzoAcquisto: 65000,
    primaCasa: false,
    acquistoDa: "privato",
    registroAtteso: 7028.0, // arrotondato all'euro; il calcolo puro darebbe 7027.97€
    ipotecariaAttesa: 50,
    catastaleAttesa: 50,
    importoMutuo: 0,
  },

  // ── Reale: Milano, Via Strambio 7 — atto unico, due unità ─────────────
  strambio: {
    etichetta: "Milano — Via Strambio 7 (appartamento + cantina, atto unico)",
    unita: [
      {
        etichetta: "Appartamento, piano 6 (F.319 P.59 Sub.718)",
        comune: "Milano",
        categoriaCatastale: "A/3",
        renditaCatastale: 522.91,
        statoAbitativoImu: "abitazionePrincipale",
        metriQuadri: 0,
        // A/3 non è categoria di lusso: abitazione principale = esente da IMU
        imuAtteso: 0,
      },
      {
        etichetta: "Cantina, piano S1 (F.319 P.59 Sub.719)",
        comune: "Milano",
        categoriaCatastale: "C/2",
        renditaCatastale: 15.18,
        statoAbitativoImu: "abitazionePrincipale",
        metriQuadri: 0,
        // C/2 non è categoria di lusso: pertinenza dell'abitazione principale = esente
        imuAtteso: 0,
      },
    ],
    prezzoAcquisto: 420000,
    primaCasa: true,
    acquistoDa: "privato",
    registroAtteso: 1242.99, // corretto; l'Excel originale riportava 1355.99 per un bug di moltiplicatore
    ipotecariaAttesa: 50,
    catastaleAttesa: 50,
    importoMutuo: 294000,
    tassoMutuoPercentuale: 3.2,
    durataMutuoAnni: 20,
    decorrenzaMutuo: "2022-11-30",
    speseIncassoPerRataMutuo: 4,
  },

  // ── Reale: Peschiera Borromeo, Via Diaz — acquisto singolo autonomo ────
  diaz: {
    etichetta: "Peschiera Borromeo — Via Diaz",
    unita: [
      {
        etichetta: "Box, piano S1 (F.69 P.96 Sub.19)",
        comune: "Peschiera Borromeo",
        categoriaCatastale: "C/6",
        renditaCatastale: 57.84,
        statoAbitativoImu: "affittata",
        metriQuadri: 0,
        imuAtteso: 103.0,
      },
    ],
    prezzoAcquisto: 13000,
    primaCasa: false,
    acquistoDa: "privato",
    registroAtteso: 1000, // importo minimo; il proporzionale darebbe 655.91€
    ipotecariaAttesa: 50,
    catastaleAttesa: 50,
    importoMutuo: 0,
  },

  // ── Reale: Peschiera Borromeo, Via M.L. King — complesso, 3 unità ──────
  pescKing: {
    etichetta:
      "Peschiera Borromeo — Via M.L. King 3D (complesso: appartamento + box + posto auto)",
    unita: [
      {
        etichetta: "Appartamento, piano 4-5 (F.70 P.93 Sub.72)",
        comune: "Peschiera Borromeo",
        categoriaCatastale: "A/2",
        renditaCatastale: 592.63,
        statoAbitativoImu: "abitazionePrincipale",
        metriQuadri: 0,
        // A/2 non è categoria di lusso: abitazione principale = esente da IMU
        imuAtteso: 0,
      },
      {
        etichetta: "Box, piano S1 (F.70 P.93 Sub.79)",
        comune: "Peschiera Borromeo",
        categoriaCatastale: "C/6",
        renditaCatastale: 46.48,
        statoAbitativoImu: "abitazionePrincipale",
        metriQuadri: 0,
        // C/6 non è categoria di lusso: pertinenza dell'abitazione principale = esente
        imuAtteso: 0,
      },
      {
        etichetta: "Posto Auto, piano S1 (F.70 P.93 Sub.142)",
        comune: "Peschiera Borromeo",
        categoriaCatastale: "C/6",
        renditaCatastale: 34.24,
        statoAbitativoImu: "secondaCasaNonLocata",
        metriQuadri: 0,
        imuAtteso: 60.97,
      },
    ],
    prezzoAcquisto: 180000,
    primaCasa: true,
    acquistoDa: "privato",
    // Rendita complessiva 673.35 * 1.05 * 110 * 0.02 = 1555.44
    registroAtteso: 1555.44,
    ipotecariaAttesa: 50,
    catastaleAttesa: 50,
    importoMutuo: 0,
  },

  // ── Reale: Peschiera Borromeo, Via della Liberazione — complesso, 3 unità ──
  pescLiberazione: {
    etichetta:
      "Peschiera Borromeo — Via della Liberazione 33 (complesso: appartamento + box + cantina)",
    unita: [
      {
        etichetta: "Box, piano S1 (F.68 P.133 Sub.43)",
        comune: "Peschiera Borromeo",
        categoriaCatastale: "C/6",
        renditaCatastale: 47.41,
        statoAbitativoImu: "affittata",
        metriQuadri: 0,
        imuAtteso: 84.43,
      },
      {
        etichetta: "Appartamento, piano 5 (F.68 P.133 Sub.701)",
        comune: "Peschiera Borromeo",
        categoriaCatastale: "A/3",
        renditaCatastale: 568.1,
        statoAbitativoImu: "affittata",
        metriQuadri: 0,
        imuAtteso: 1011.67,
      },
      {
        etichetta: "Cantina, piano S1 (F.68 P.133 Sub.702)",
        comune: "Peschiera Borromeo",
        categoriaCatastale: "C/2",
        renditaCatastale: 13.74,
        statoAbitativoImu: "affittata",
        metriQuadri: 0,
        imuAtteso: 24.47,
      },
    ],
    prezzoAcquisto: 215000,
    primaCasa: false,
    acquistoDa: "privato",
    registroAtteso: 7020,
    ipotecariaAttesa: 50,
    catastaleAttesa: 50,
    importoMutuo: 0,
  },

  // ── Fittizi: casi limite IMU ───────────────────────────────────────────
  fittizioLussoAbitazionePrincipale: {
    etichetta: "Fittizio — categoria di lusso (A/1) come abitazione principale",
    unita: [
      {
        comune: "PaeseSenzaTabella",
        categoriaCatastale: "A/1",
        renditaCatastale: 1000,
        statoAbitativoImu: "abitazionePrincipale",
        imuAtteso: 1341.51,
      },
    ],
  },
  fittizioLussoRenditaBassa: {
    etichetta:
      "Fittizio — categoria di lusso, detrazione non porta l'imposta sotto zero",
    unita: [
      {
        comune: "PaeseSenzaTabella",
        categoriaCatastale: "A/1",
        renditaCatastale: 10,
        statoAbitativoImu: "abitazionePrincipale",
        imuAtteso: 0,
      },
    ],
  },
  fittizioLussoAffittata: {
    etichetta: "Fittizio — categoria di lusso (A/1) affittata, nessuna detrazione",
    unita: [
      {
        comune: "PaeseSenzaTabella",
        categoriaCatastale: "A/1",
        renditaCatastale: 1000,
        statoAbitativoImu: "affittata",
        imuAtteso: 1444.8,
      },
    ],
  },
  fittizioNegozioC1: {
    etichetta: "Fittizio — negozio C/1, moltiplicatore 55",
    unita: [
      {
        comune: "PaeseSenzaTabella",
        categoriaCatastale: "C/1",
        renditaCatastale: 1000,
        imuAtteso: 496.65,
      },
    ],
  },
  fittizioOpificioD1: {
    etichetta: "Fittizio — opificio D/1, moltiplicatore 65",
    unita: [
      {
        comune: "PaeseSenzaTabella",
        categoriaCatastale: "D/1",
        renditaCatastale: 1000,
        imuAtteso: 586.95,
      },
    ],
  },
  fittizioAliquotaPersonalizzata: {
    etichetta: "Fittizio — aliquota IMU personalizzata ha la precedenza sul comune",
    unita: [
      {
        comune: "Milano",
        categoriaCatastale: "A/2",
        renditaCatastale: 538.09,
        aliquotaImuPersonalizzata: 0.005,
        imuAtteso: 452.0,
      },
    ],
  },
  fittizioCoefficienteRivalutazione: {
    etichetta: "Fittizio — coefficiente di rivalutazione personalizzato",
    unita: [
      {
        comune: "PaeseSenzaTabella",
        categoriaCatastale: "A/2",
        renditaCatastale: 538.09,
        aliquotaImuPersonalizzata: 0.0106,
        coefficienteRivalutazionePersonalizzato: 1.05,
        imuAtteso: 958.23,
      },
    ],
  },
  fittizioAbitazionePrincipaleEsente: {
    etichetta: "Fittizio — abitazione principale non di lusso, esente da IMU",
    unita: [
      {
        comune: "Milano",
        categoriaCatastale: "A/2",
        renditaCatastale: 538.09,
        statoAbitativoImu: "abitazionePrincipale",
        imuAtteso: 0,
      },
    ],
  },
  fittizioSecondaCasaNonLocata: {
    etichetta:
      "Fittizio — seconda casa non locata, stesso trattamento di affittata",
    unita: [
      {
        comune: "Milano",
        categoriaCatastale: "A/2",
        renditaCatastale: 538.09,
        statoAbitativoImu: "secondaCasaNonLocata",
        imuAtteso: 1030.55,
      },
    ],
  },

  // ── Fittizi: casi limite imposte di acquisto ──────────────────────────
  fittizioPrimaCasaRegistroBase: {
    etichetta: "Fittizio — prima casa da privato, registro proporzionale al 2%",
    unita: [
      { comune: "Milano", categoriaCatastale: "A/2", renditaCatastale: 538.09 },
    ],
    primaCasa: true,
    acquistoDa: "privato",
    registroAtteso: 1242.99,
    ipotecariaAttesa: 50,
    catastaleAttesa: 50,
  },
  fittizioSecondaCasaRegistro9: {
    etichetta: "Fittizio — seconda casa da privato, registro al 9%",
    unita: [
      { comune: "Milano", categoriaCatastale: "A/2", renditaCatastale: 538.09 },
    ],
    primaCasa: false,
    acquistoDa: "privato",
    registroAtteso: 6101.94,
    ipotecariaAttesa: 50,
    catastaleAttesa: 50,
  },
  fittizioImportoMinimoRegistro: {
    etichetta: "Fittizio — rispetta l'importo minimo di registro (1000€)",
    unita: [
      { comune: "Milano", categoriaCatastale: "A/2", renditaCatastale: 50 },
    ],
    primaCasa: true,
    acquistoDa: "privato",
    registroAtteso: 1000,
    ipotecariaAttesa: 50,
    catastaleAttesa: 50,
  },
  fittizioAcquistoDaImpresa: {
    etichetta: "Fittizio — acquisto da impresa, imposte fisse a 200€ ciascuna",
    unita: [
      { comune: "Milano", categoriaCatastale: "A/2", renditaCatastale: 538.09 },
    ],
    acquistoDa: "impresa",
    registroAtteso: 200,
    ipotecariaAttesa: 200,
    catastaleAttesa: 200,
  },

  // ── Fittizi: spese di agenzia ──────────────────────────────────────────
  fittizioAgenziaDefault: {
    etichetta: "Fittizio — spese di agenzia con percentuale di default (3%)",
    unita: [
      { comune: "Milano", categoriaCatastale: "A/2", renditaCatastale: 538.09 },
    ],
    prezzoAcquisto: 200000,
    agenziaImponibileAtteso: 6000,
    agenziaIvaAttesa: 1320,
    agenziaTotaleAtteso: 7320,
  },
  fittizioAgenziaPersonalizzata: {
    etichetta: "Fittizio — spese di agenzia con percentuale personalizzata (2%)",
    unita: [
      { comune: "Milano", categoriaCatastale: "A/2", renditaCatastale: 538.09 },
    ],
    prezzoAcquisto: 200000,
    percentualeAgenzia: 0.02,
    agenziaImponibileAtteso: 4000,
    agenziaIvaAttesa: 880,
    agenziaTotaleAtteso: 4880,
  },

  // ── Fittizi: spese di attivazione mutuo ─────────────────────────────────
  fittizioSpeseMutuoPrimaCasa: {
    etichetta: "Fittizio — spese mutuo, prima casa (sostitutiva 0,25%)",
    unita: [
      { comune: "Milano", categoriaCatastale: "A/2", renditaCatastale: 538.09 },
    ],
    primaCasa: true,
    importoMutuo: 140000,
    tassoMutuoPercentuale: 3.5,
    durataMutuoAnni: 20,
    decorrenzaMutuo: "2024-01-01",
    istruttoriaAttesa: 700,
    impostaSostitutivaAttesa: 350,
    speseMutuoTotaleAtteso: 1050,
  },
  fittizioSpeseMutuoSecondaCasa: {
    etichetta: "Fittizio — spese mutuo, seconda casa (sostitutiva 2%)",
    unita: [
      { comune: "Milano", categoriaCatastale: "A/2", renditaCatastale: 538.09 },
    ],
    primaCasa: false,
    importoMutuo: 140000,
    tassoMutuoPercentuale: 3.5,
    durataMutuoAnni: 20,
    decorrenzaMutuo: "2024-01-01",
    istruttoriaAttesa: 700,
    impostaSostitutivaAttesa: 2800,
    speseMutuoTotaleAtteso: 3500,
  },

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
