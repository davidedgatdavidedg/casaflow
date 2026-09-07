// lib/documentazione/campi.ts
//
// Fonte unica di verità per la spiegazione di ogni campo di input del
// form. Alimenta i tooltip (icona ⓘ) accanto alle etichette dei campi
// e, tramite vociImpattate, collega ogni campo alle voci di
// documentazione (voci.ts) su cui incide — per il link "Approfondisci".

export interface CampoDocumentato {
  id: string;
  etichetta: string;
  sezione: string;
  spiegazioneBreve: string;
  /** Id delle voci (in voci.ts) che questo campo determina. */
  vociImpattate: string[];
}

export const CAMPI_DOCUMENTATI: CampoDocumentato[] = [
  // ─── Sezione 01: Immobile ────────────────────────────────────────────
  {
    id: "prezzo-acquisto",
    etichetta: "Prezzo di acquisto",
    sezione: "Immobile",
    spiegazioneBreve:
      "Il prezzo pattuito per l'immobile. Base di calcolo per imposte di acquisto, stime di manutenzione e rivalutazione futura.",
    vociImpattate: [
      "prezzo-acquisto",
      "registro",
      "ipotecaria",
      "catastale",
      "intermediazione",
      "onorario-notaio",
      "manutenzione-ordinaria",
      "manutenzione-straordinaria",
      "valore-rivendita",
    ],
  },
  {
    id: "data-acquisto",
    etichetta: "Data di acquisto",
    sezione: "Immobile",
    spiegazioneBreve:
      "La data reale del rogito. Determina l'anno solare di partenza, il pro-rata del primo e ultimo anno, e — indirettamente — la decorrenza del mutuo (1° del mese successivo).",
    vociImpattate: ["affitto-lordo", "rimborso-capitale-mutuo", "interessi-mutuo", "valore-rivendita"],
  },
  {
    id: "prima-casa",
    etichetta: "Prima casa (ai fini registro)",
    sezione: "Immobile",
    spiegazioneBreve:
      "Se l'immobile è la tua abitazione principale. Cambia l'aliquota di registro, esenta dall'IMU, e abilita le detrazioni riservate alla prima casa (mediazione, interessi mutuo, aliquote maggiorate su ristrutturazione).",
    vociImpattate: ["registro", "imu", "detrazione-mediazione", "detrazione-interessi-mutuo", "detrazione-ristrutturazione"],
  },
  {
    id: "acquisto-da",
    etichetta: "Acquisto da",
    sezione: "Immobile",
    spiegazioneBreve:
      "Se acquisti da un privato o da un'impresa costruttrice cambia il meccanismo delle imposte di acquisto (registro proporzionale vs. imposta fissa + IVA).",
    vociImpattate: ["registro", "ipotecaria", "catastale"],
  },
  {
    id: "etichetta-unita",
    etichetta: "Etichetta (unità)",
    sezione: "Immobile — Unità catastali",
    spiegazioneBreve: "Solo per riconoscere l'unità a colpo d'occhio (es. \"Appartamento\", \"Box\"). Non entra in nessun calcolo.",
    vociImpattate: [],
  },
  {
    id: "comune",
    etichetta: "Comune",
    sezione: "Immobile — Unità catastali",
    spiegazioneBreve:
      "Determina l'aliquota IMU applicata: alcuni comuni hanno un'aliquota censita nel nostro database, altrimenti si usa il minimo di legge (personalizzabile).",
    vociImpattate: ["imu"],
  },
  {
    id: "categoria-catastale",
    etichetta: "Categoria catastale",
    sezione: "Immobile — Unità catastali",
    spiegazioneBreve:
      "Determina il moltiplicatore usato per calcolare sia il valore catastale ai fini del registro sia la base imponibile IMU, e se l'esenzione IMU per abitazione principale è applicabile (esclusa per le categorie di lusso A/1, A/8, A/9).",
    vociImpattate: ["registro", "imu"],
  },
  {
    id: "rendita-catastale",
    etichetta: "Rendita catastale",
    sezione: "Immobile — Unità catastali",
    spiegazioneBreve:
      "Il dato di base per calcolare sia l'imposta di registro (rivalutata del 5% e moltiplicata per un coefficiente) sia l'IMU annua.",
    vociImpattate: ["registro", "imu"],
  },
  {
    id: "stato-imu",
    etichetta: "Utilizzo ai fini IMU",
    sezione: "Immobile — Unità catastali",
    spiegazioneBreve:
      "Se l'unità è abitazione principale (non di lusso) è esente da IMU; altrimenti (affittata, a disposizione) l'IMU è sempre dovuta.",
    vociImpattate: ["imu"],
  },
  {
    id: "metri-quadri",
    etichetta: "Metri quadri",
    sezione: "Immobile — Unità catastali",
    spiegazioneBreve:
      "Usati per stimare in automatico le spese proporzionali alla metratura: utenze, condominio, assicurazione, TARI — tutte sovrascrivibili con un importo assoluto se lo conosci.",
    vociImpattate: ["energia-elettrica", "gas", "condominio", "assicurazione", "tari"],
  },
  {
    id: "aliquota-imu-personalizzata",
    etichetta: "Aliquota IMU personalizzata",
    sezione: "Immobile — Unità catastali",
    spiegazioneBreve:
      "Visibile solo se il comune non è tra quelli censiti — inserisci qui l'aliquota reale della delibera comunale, se la conosci, al posto del minimo di legge.",
    vociImpattate: ["imu"],
  },
  {
    id: "onorario-notaio-personalizzato",
    etichetta: "Onorario notaio",
    sezione: "Immobile — avanzate",
    spiegazioneBreve: "Sostituisce la stima automatica (2% del prezzo) con l'importo reale, se lo conosci da un preventivo.",
    vociImpattate: ["onorario-notaio"],
  },
  {
    id: "spese-agenzia-personalizzata",
    etichetta: "Intermediazione immobiliare",
    sezione: "Immobile — avanzate",
    spiegazioneBreve:
      "Sostituisce la stima automatica (3% + IVA) con l'importo reale — incide anche sulla detrazione mediazione, se prima casa.",
    vociImpattate: ["intermediazione", "detrazione-mediazione"],
  },
  {
    id: "visure-notarili-personalizzate",
    etichetta: "Visure ipotecarie/catastali",
    sezione: "Immobile — avanzate",
    spiegazioneBreve: "Sostituisce il valore fisso di default con l'importo reale.",
    vociImpattate: ["visure"],
  },
  {
    id: "tassa-archivio-personalizzata",
    etichetta: "Tassa archivio notarile",
    sezione: "Immobile — avanzate",
    spiegazioneBreve: "Sostituisce il valore fisso di default con l'importo reale.",
    vociImpattate: ["tassa-archivio"],
  },

  // ─── Sezione 02: Costi di avviamento ─────────────────────────────────
  {
    id: "ristrutturazione",
    etichetta: "Ristrutturazione",
    sezione: "Costi di avviamento",
    spiegazioneBreve:
      "Spesa una tantum per lavori di ristrutturazione. Genera anche una detrazione fiscale spalmata su 10 anni (50% se prima casa, 36% altrimenti), e abilita il bonus mobili se compili anche Arredamento.",
    vociImpattate: ["ristrutturazione-costo", "detrazione-ristrutturazione", "detrazione-mobili"],
  },
  {
    id: "arredamento",
    etichetta: "Arredamento",
    sezione: "Costi di avviamento",
    spiegazioneBreve:
      "Spesa una tantum per mobili/elettrodomestici. Genera una detrazione fiscale (bonus mobili, 50% su 10 anni) SOLO se hai valorizzato anche Ristrutturazione.",
    vociImpattate: ["arredamento-costo", "detrazione-mobili"],
  },
  {
    id: "altri-costi",
    etichetta: "Altri costi non detraibili",
    sezione: "Costi di avviamento",
    spiegazioneBreve: "Spese minori non catalogate altrove — a differenza di ristrutturazione/arredamento, non generano alcuna detrazione fiscale.",
    vociImpattate: ["altri-costi"],
  },

  // ─── Sezione 03: Mutuo ────────────────────────────────────────────────
  {
    id: "importo-mutuo",
    etichetta: "Importo finanziato",
    sezione: "Mutuo",
    spiegazioneBreve:
      "L'importo del mutuo. Se zero, l'acquisto si considera interamente in contanti (nessuna rata, nessun onere finanziario, nessuna imposta sostitutiva).",
    vociImpattate: ["mutuo-erogato", "imposta-sostitutiva-mutuo", "istruttoria-mutuo", "rimborso-capitale-mutuo", "interessi-mutuo", "estinzione-debito", "detrazione-interessi-mutuo"],
  },
  {
    id: "tasso-mutuo",
    etichetta: "Tasso annuo",
    sezione: "Mutuo",
    spiegazioneBreve: "Il tasso di interesse annuo del mutuo, usato per calcolare l'intero piano di ammortamento.",
    vociImpattate: ["rimborso-capitale-mutuo", "interessi-mutuo", "estinzione-debito", "detrazione-interessi-mutuo"],
  },
  {
    id: "durata-mutuo",
    etichetta: "Durata",
    sezione: "Mutuo",
    spiegazioneBreve: "Il numero di anni del piano di ammortamento — non necessariamente uguale all'orizzonte di investimento.",
    vociImpattate: ["rimborso-capitale-mutuo", "interessi-mutuo", "estinzione-debito"],
  },
  {
    id: "spese-incasso-mutuo",
    etichetta: "Spese incasso mutuo",
    sezione: "Mutuo — avanzate",
    spiegazioneBreve: "Un costo fisso per rata, se la tua banca lo applica.",
    vociImpattate: [],
  },

  // ─── Sezione 04: Affitto ──────────────────────────────────────────────
  {
    id: "affitto-lordo",
    etichetta: "Affitto lordo annuo atteso",
    sezione: "Affitto",
    spiegazioneBreve:
      "Il canone annuo lordo. Se lo lasci a zero, puoi invece valorizzare la Rendita figurativa per un uso personale dell'immobile (le due voci sono alternative).",
    vociImpattate: ["affitto-lordo", "tassazione-affitto", "addizionali-irpef", "rendita-figurativa"],
  },
  {
    id: "oneri-accessori",
    etichetta: "Oneri accessori",
    sezione: "Affitto",
    spiegazioneBreve:
      "Quota del canone per spese fisse (es. condominio) che incassi dal conduttore ma non trattieni — non è reddito da locazione, quindi non tassata.",
    vociImpattate: ["oneri-accessori"],
  },
  {
    id: "rendita-figurativa",
    etichetta: "Rendita figurativa",
    sezione: "Affitto",
    spiegazioneBreve:
      "Visibile solo se l'affitto è a zero. Rappresenta il beneficio di usare l'immobile tu stesso invece di affittarlo o pagare un alloggio altrove — un ricavo fittizio, mai tassato.",
    vociImpattate: ["rendita-figurativa"],
  },
  {
    id: "regime-fiscale",
    etichetta: "Regime fiscale",
    sezione: "Affitto",
    spiegazioneBreve: "Cedolare secca (aliquota fissa, sostituisce anche il registro sul contratto) oppure tassazione ordinaria IRPEF a scaglioni.",
    vociImpattate: ["tassazione-affitto", "addizionali-irpef"],
  },
  {
    id: "tipo-cedolare",
    etichetta: "Tipo cedolare",
    sezione: "Affitto",
    spiegazioneBreve: "Standard (21%) o concordato (10%, solo in comuni ad alta densità abitativa e con specifici accordi territoriali).",
    vociImpattate: ["tassazione-affitto"],
  },
  {
    id: "aliquota-marginale-irpef",
    etichetta: "Aliquota marginale IRPEF",
    sezione: "Affitto",
    spiegazioneBreve:
      "Visibile solo in regime ordinario. Dipende dal tuo reddito complessivo (compresi altri redditi oltre l'affitto) — il tool non lo conosce, la scegli tu.",
    vociImpattate: ["tassazione-affitto"],
  },

  // ─── Sezione 05: Costi ricorrenti ─────────────────────────────────────
  {
    id: "condominio",
    etichetta: "Spese condominiali",
    sezione: "Costi ricorrenti",
    spiegazioneBreve: "Importo annuo, con una stima automatica proporzionale alla metratura se lo lasci vuoto.",
    vociImpattate: ["condominio"],
  },
  {
    id: "tari-personalizzata",
    etichetta: "TARI",
    sezione: "Costi ricorrenti — avanzate",
    spiegazioneBreve: "Sostituisce la stima automatica (2,5€/mq) con l'importo reale del tuo comune.",
    vociImpattate: ["tari"],
  },
  {
    id: "energia-elettrica",
    etichetta: "Energia elettrica",
    sezione: "Costi ricorrenti — avanzate",
    spiegazioneBreve: "Sostituisce la stima automatica proporzionale alla metratura con l'importo reale.",
    vociImpattate: ["energia-elettrica"],
  },
  {
    id: "gas",
    etichetta: "Gas",
    sezione: "Costi ricorrenti — avanzate",
    spiegazioneBreve: "Sostituisce la stima automatica proporzionale alla metratura con l'importo reale.",
    vociImpattate: ["gas"],
  },
  {
    id: "internet",
    etichetta: "Internet",
    sezione: "Costi ricorrenti — avanzate",
    spiegazioneBreve: "Sostituisce il valore fisso di default con l'importo reale del tuo abbonamento.",
    vociImpattate: ["internet"],
  },
  {
    id: "manutenzione-ordinaria",
    etichetta: "Manutenzione ordinaria",
    sezione: "Costi ricorrenti — avanzate",
    spiegazioneBreve: "Percentuale annua del prezzo di acquisto — l'etichetta sotto il campo mostra l'equivalente in euro.",
    vociImpattate: ["manutenzione-ordinaria"],
  },
  {
    id: "manutenzione-straordinaria",
    etichetta: "Manutenzione straordinaria",
    sezione: "Costi ricorrenti — avanzate",
    spiegazioneBreve: "Percentuale annua del prezzo di acquisto — l'etichetta sotto il campo mostra l'equivalente in euro.",
    vociImpattate: ["manutenzione-straordinaria"],
  },
  {
    id: "assicurazione",
    etichetta: "Assicurazione",
    sezione: "Costi ricorrenti — avanzate",
    spiegazioneBreve: "Sostituisce la stima automatica proporzionale alla metratura con il premio reale della tua polizza.",
    vociImpattate: ["assicurazione"],
  },

  // ─── Sezione 06: Orizzonte investimento ───────────────────────────────
  {
    id: "anni-investimento",
    etichetta: "Anni di investimento",
    sezione: "Orizzonte investimento",
    spiegazioneBreve:
      "Il numero di anni esatti tra acquisto e vendita — la vendita cade all'anniversario preciso della data di acquisto, non a fine anno solare.",
    vociImpattate: ["valore-rivendita", "estinzione-debito"],
  },
  {
    id: "rivalutazione-annua",
    etichetta: "Rivalutazione annua immobile",
    sezione: "Orizzonte investimento",
    spiegazioneBreve: "La crescita di valore stimata dell'immobile ogni anno — capitalizzata sull'intero orizzonte per stimare il prezzo di rivendita.",
    vociImpattate: ["valore-rivendita"],
  },
];
