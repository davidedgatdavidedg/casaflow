// lib/documentazione/voci.ts
//
// Fonte unica di verità per la documentazione di ogni voce che compare
// nei flussi di cassa. Alimenta sia la pagina /documentazione sia i
// tooltip dei campi del form (via campi.ts, che referenzia questi id).
//
// Quando cambia una regola nel motore di calcolo (lib/calcolo/*.ts),
// aggiorna anche la scheda corrispondente qui — altrimenti la
// documentazione va fuori sincrono col comportamento reale dell'app.

export type CategoriaVoceDoc =
  | "investimenti"
  | "ricavi"
  | "costi"
  | "oneri"
  | "imposte"
  | "detrazioni";

export interface VoceDocumentata {
  id: string;
  nome: string;
  categoria: CategoriaVoceDoc;
  /** Id dei campi (in campi.ts) che determinano questa voce. */
  campiInput: string[];
  comeSiCalcola: string;
  quandoSiApplica: string;
  quandoNonSiApplica?: string;
  quandoSiPaga: string;
  aliquote?: string;
  massimali?: string;
  note?: string;
}

export const VOCI_DOCUMENTATE: VoceDocumentata[] = [
  // ─── INVESTIMENTI ─────────────────────────────────────────────────
  {
    id: "prezzo-acquisto",
    nome: "Prezzo di acquisto immobile",
    categoria: "investimenti",
    campiInput: ["prezzo-acquisto"],
    comeSiCalcola: "Il valore che inserisci direttamente, invariato.",
    quandoSiApplica: "Sempre, è l'esborso iniziale di ogni simulazione.",
    quandoSiPaga: "Alla data di acquisto (rogito).",
  },
  {
    id: "mutuo-erogato",
    nome: "Mutuo erogato",
    categoria: "investimenti",
    campiInput: ["importo-mutuo"],
    comeSiCalcola: "Pari all'importo finanziato inserito nella Sezione Mutuo.",
    quandoSiApplica: "Solo se hai indicato un importo di mutuo maggiore di zero.",
    quandoNonSiApplica: "Se l'importo mutuo è 0 (acquisto interamente in contanti).",
    quandoSiPaga: "Alla data di acquisto, contestualmente al prezzo pagato.",
  },
  {
    id: "rimborso-capitale-mutuo",
    nome: "Rimborso capitale mutuo",
    categoria: "investimenti",
    campiInput: ["importo-mutuo", "tasso-mutuo", "durata-mutuo", "data-acquisto"],
    comeSiCalcola:
      "Quota capitale di ogni rata, calcolata con piano di ammortamento alla francese (rata costante) a partire da importo, tasso e durata del mutuo.",
    quandoSiApplica: "Ogni mese in cui il mutuo è attivo e non ancora estinto.",
    quandoSiPaga:
      "Il primo di ogni mese, a partire dal mese successivo all'acquisto (la decorrenza del mutuo è sempre calcolata come 1° del mese dopo il rogito, non modificabile direttamente).",
  },
  {
    id: "valore-rivendita",
    nome: "Valore di rivendita stimato",
    categoria: "investimenti",
    campiInput: ["prezzo-acquisto", "rivalutazione-annua", "anni-investimento"],
    comeSiCalcola:
      "Prezzo di acquisto × (1 + rivalutazione annua)^anni di investimento — capitalizzazione composta sull'intero orizzonte.",
    quandoSiApplica: "Sempre, è l'incasso finale della simulazione.",
    quandoSiPaga:
      "All'anniversario esatto dell'acquisto (data di acquisto + N anni), non al 1° gennaio di un anno solare.",
    note:
      "È il prezzo di vendita stimato, non la plusvalenza tassabile: oggi CasaFlow non modella l'eventuale tassazione della plusvalenza (imposta sostitutiva 26% o IRPEF, dovuta solo se si vende entro 5 anni dall'acquisto) — un tema aperto, non ancora implementato.",
  },
  {
    id: "estinzione-debito",
    nome: "Estinzione debito residuo mutuo",
    categoria: "investimenti",
    campiInput: ["importo-mutuo", "tasso-mutuo", "durata-mutuo", "anni-investimento"],
    comeSiCalcola:
      "Capitale residuo del piano di ammortamento all'ultima rata pagata prima della vendita.",
    quandoSiApplica:
      "Solo se c'è un mutuo attivo e non è ancora completamente estinto alla data di vendita.",
    quandoNonSiApplica:
      "Se non c'è mutuo, o se la durata del mutuo è già trascorsa interamente prima della vendita.",
    quandoSiPaga: "Alla data esatta di vendita, contestualmente all'incasso della rivendita.",
  },

  // ─── RICAVI ────────────────────────────────────────────────────────
  {
    id: "affitto-lordo",
    nome: "Affitto lordo",
    categoria: "ricavi",
    campiInput: ["affitto-lordo", "data-acquisto", "anni-investimento"],
    comeSiCalcola:
      "Il canone annuo inserito, distribuito pro-rata sui mesi effettivamente posseduti nel primo e nell'ultimo anno (se acquisto/vendita cadono a metà anno solare); pieno negli anni intermedi.",
    quandoSiApplica: "Se hai inserito un affitto lordo annuo maggiore di zero.",
    quandoSiPaga: "Il 1° gennaio di ogni anno pieno, o alla data di acquisto/vendita per gli anni parziali.",
  },
  {
    id: "oneri-accessori",
    nome: "Oneri accessori",
    categoria: "ricavi",
    campiInput: ["oneri-accessori", "data-acquisto", "anni-investimento"],
    comeSiCalcola: "Il valore annuo inserito, pro-rata come l'affitto lordo negli anni parziali.",
    quandoSiApplica: "Se hai valorizzato il campo (es. quota condominio incassata dal conduttore e girata all'amministratore).",
    quandoSiPaga: "Stesse date dell'affitto lordo.",
    note: "Non è reddito da locazione: nessuna imposta si applica a questa componente, a differenza dell'affitto lordo.",
  },
  {
    id: "rendita-figurativa",
    nome: "Rendita figurativa (uso personale)",
    categoria: "ricavi",
    campiInput: ["rendita-figurativa", "affitto-lordo", "data-acquisto", "anni-investimento"],
    comeSiCalcola: "Il valore annuo inserito, pro-rata come l'affitto lordo negli anni parziali.",
    quandoSiApplica:
      "Solo se l'affitto lordo è pari a zero — rappresenta il beneficio economico di usare l'immobile tu stesso (prima casa, o casa vacanza) invece di affittarlo a terzi o pagare un alloggio altrove.",
    quandoNonSiApplica: "Se l'affitto lordo è maggiore di zero (le due voci sono mutuamente esclusive, anche a livello di calcolo, non solo di interfaccia).",
    quandoSiPaga: "Stesse date dell'affitto lordo.",
    note: "È un ricavo di cassa fittizio (non incassi realmente nulla): nessuna imposta si applica, non essendo reddito vero.",
  },

  // ─── COSTI ─────────────────────────────────────────────────────────
  {
    id: "intermediazione",
    nome: "Intermediazione immobiliare",
    categoria: "costi",
    campiInput: ["prezzo-acquisto", "spese-agenzia-personalizzata"],
    comeSiCalcola:
      "Stima di default: 3% del prezzo di acquisto + IVA 22% sulla provvigione. Se inserisci un importo personalizzato, viene scomposto in imponibile + IVA per calcolare correttamente la detrazione mediazione collegata.",
    quandoSiApplica: "Sempre, salvo che tu azzeri esplicitamente il valore personalizzato.",
    quandoSiPaga: "Alla data di acquisto.",
    aliquote: "3% + IVA 22% (stima di default).",
  },
  {
    id: "onorario-notaio",
    nome: "Onorario notaio",
    categoria: "costi",
    campiInput: ["prezzo-acquisto", "onorario-notaio-personalizzato"],
    comeSiCalcola: "Stima di default: 2% del prezzo di acquisto, sovrascrivibile con un importo assoluto.",
    quandoSiApplica: "Sempre.",
    quandoSiPaga: "Alla data di acquisto.",
    aliquote: "2% del prezzo (stima di default).",
  },
  {
    id: "visure",
    nome: "Visure ipotecarie/catastali",
    categoria: "costi",
    campiInput: ["visure-notarili-personalizzate"],
    comeSiCalcola: "Valore fisso di default, sovrascrivibile.",
    quandoSiApplica: "Sempre.",
    quandoSiPaga: "Alla data di acquisto.",
  },
  {
    id: "tassa-archivio",
    nome: "Tassa archivio notarile",
    categoria: "costi",
    campiInput: ["tassa-archivio-personalizzata"],
    comeSiCalcola: "Valore fisso di default, sovrascrivibile.",
    quandoSiApplica: "Sempre.",
    quandoSiPaga: "Alla data di acquisto.",
  },
  {
    id: "altri-costi",
    nome: "Altri costi non detraibili",
    categoria: "costi",
    campiInput: ["altri-costi"],
    comeSiCalcola: "Il valore inserito, invariato.",
    quandoSiApplica: "Solo se valorizzato (0€ di default).",
    quandoSiPaga: "Alla data di acquisto.",
    note: "Non genera alcuna detrazione fiscale, a differenza di ristrutturazione e arredamento — usalo per spese minori non catalogate altrove.",
  },
  {
    id: "ristrutturazione-costo",
    nome: "Ristrutturazione (costo)",
    categoria: "costi",
    campiInput: ["ristrutturazione"],
    comeSiCalcola: "Il valore inserito, invariato.",
    quandoSiApplica: "Solo se valorizzato (0€ di default).",
    quandoSiPaga: "Alla data di acquisto.",
    note: "Genera anche una detrazione fiscale spalmata su 10 anni — vedi la voce \"Detrazione ristrutturazione\".",
  },
  {
    id: "arredamento-costo",
    nome: "Arredamento (costo)",
    categoria: "costi",
    campiInput: ["arredamento"],
    comeSiCalcola: "Il valore inserito, invariato.",
    quandoSiApplica: "Solo se valorizzato (0€ di default).",
    quandoSiPaga: "Alla data di acquisto.",
    note: "Genera una detrazione fiscale (bonus mobili) solo se c'è anche una ristrutturazione collegata — vedi \"Detrazione mobili\".",
  },
  {
    id: "energia-elettrica",
    nome: "Energia elettrica",
    categoria: "costi",
    campiInput: ["energia-elettrica"],
    comeSiCalcola: "Stima di default proporzionale ai metri quadri totali delle unità, sovrascrivibile con un importo annuo assoluto.",
    quandoSiApplica: "Sempre (con stima automatica se non personalizzato).",
    quandoSiPaga: "Il 1° gennaio di ogni anno pieno (o pro-rata negli anni parziali).",
  },
  {
    id: "gas",
    nome: "Gas",
    categoria: "costi",
    campiInput: ["gas"],
    comeSiCalcola: "Stima di default proporzionale ai metri quadri totali, sovrascrivibile.",
    quandoSiApplica: "Sempre (con stima automatica se non personalizzato).",
    quandoSiPaga: "Il 1° gennaio di ogni anno pieno (o pro-rata negli anni parziali).",
  },
  {
    id: "internet",
    nome: "Internet",
    categoria: "costi",
    campiInput: ["internet"],
    comeSiCalcola: "Importo fisso di default, sovrascrivibile.",
    quandoSiApplica: "Sempre (con stima automatica se non personalizzato).",
    quandoSiPaga: "Il 1° gennaio di ogni anno pieno (o pro-rata negli anni parziali).",
  },
  {
    id: "condominio",
    nome: "Spese condominiali",
    categoria: "costi",
    campiInput: ["condominio"],
    comeSiCalcola: "Stima di default proporzionale ai metri quadri totali, sovrascrivibile con un importo annuo assoluto.",
    quandoSiApplica: "Sempre (con stima automatica se non personalizzato).",
    quandoSiPaga: "Il 1° gennaio di ogni anno pieno (o pro-rata negli anni parziali).",
  },
  {
    id: "manutenzione-ordinaria",
    nome: "Manutenzione ordinaria",
    categoria: "costi",
    campiInput: ["manutenzione-ordinaria", "prezzo-acquisto"],
    comeSiCalcola: "Percentuale annua del prezzo di acquisto (default e personalizzabile).",
    quandoSiApplica: "Sempre.",
    quandoSiPaga: "Il 1° gennaio di ogni anno pieno (o pro-rata negli anni parziali).",
  },
  {
    id: "manutenzione-straordinaria",
    nome: "Manutenzione straordinaria",
    categoria: "costi",
    campiInput: ["manutenzione-straordinaria", "prezzo-acquisto"],
    comeSiCalcola: "Percentuale annua del prezzo di acquisto (default e personalizzabile).",
    quandoSiApplica: "Sempre.",
    quandoSiPaga: "Il 1° gennaio di ogni anno pieno (o pro-rata negli anni parziali).",
  },
  {
    id: "assicurazione",
    nome: "Assicurazione",
    categoria: "costi",
    campiInput: ["assicurazione"],
    comeSiCalcola: "Stima di default proporzionale ai metri quadri totali, sovrascrivibile con un importo annuo assoluto.",
    quandoSiApplica: "Sempre (con stima automatica se non personalizzato).",
    quandoSiPaga: "Il 1° gennaio di ogni anno pieno (o pro-rata negli anni parziali).",
  },

  // ─── ONERI (finanziari) ──────────────────────────────────────────────
  {
    id: "istruttoria-mutuo",
    nome: "Istruttoria bancaria mutuo",
    categoria: "oneri",
    campiInput: ["importo-mutuo"],
    comeSiCalcola: "Valore fisso di default legato alla presenza di un mutuo.",
    quandoSiApplica: "Solo se c'è un mutuo attivo.",
    quandoSiPaga: "Alla data di acquisto.",
  },
  {
    id: "interessi-mutuo",
    nome: "Interessi passivi mutuo",
    categoria: "oneri",
    campiInput: ["importo-mutuo", "tasso-mutuo", "durata-mutuo", "data-acquisto"],
    comeSiCalcola: "Quota interessi di ogni rata del piano di ammortamento alla francese.",
    quandoSiApplica: "Ogni mese in cui il mutuo è attivo e non ancora estinto.",
    quandoSiPaga: "Il primo di ogni mese, stesse date del rimborso capitale.",
    note: "Genera anche una detrazione fiscale se l'immobile è abitazione principale — vedi \"Detrazione interessi mutuo\".",
  },

  // ─── IMPOSTE ─────────────────────────────────────────────────────────
  {
    id: "registro",
    nome: "Imposta di registro",
    categoria: "imposte",
    campiInput: ["prezzo-acquisto", "prima-casa", "acquisto-da", "rendita-catastale"],
    comeSiCalcola:
      "Se acquisti da privato: percentuale sul valore catastale rivalutato (rendita × 1,05 × moltiplicatore 110 se prima casa, o 120/126 per altre categorie). Se acquisti da impresa con vendita soggetta a IVA: imposta fissa, e l'IVA si applica separatamente sul prezzo.",
    quandoSiApplica: "Sempre, con aliquota diversa in base a prima casa sì/no e tipo venditore.",
    quandoSiPaga: "Alla data di acquisto (rogito).",
    aliquote: "2% (prima casa) o 9% (altri casi) del valore catastale rivalutato, se da privato.",
  },
  {
    id: "ipotecaria",
    nome: "Imposta ipotecaria",
    categoria: "imposte",
    campiInput: ["prezzo-acquisto", "prima-casa", "acquisto-da"],
    comeSiCalcola: "Importo fisso o percentuale minima, secondo le regole del tipo di acquisto.",
    quandoSiApplica: "Sempre.",
    quandoSiPaga: "Alla data di acquisto.",
  },
  {
    id: "catastale",
    nome: "Imposta catastale",
    categoria: "imposte",
    campiInput: ["prezzo-acquisto", "prima-casa", "acquisto-da"],
    comeSiCalcola: "Importo fisso o percentuale minima, secondo le regole del tipo di acquisto.",
    quandoSiApplica: "Sempre.",
    quandoSiPaga: "Alla data di acquisto.",
  },
  {
    id: "imposta-sostitutiva-mutuo",
    nome: "Imposta sostitutiva mutuo",
    categoria: "imposte",
    campiInput: ["importo-mutuo"],
    comeSiCalcola: "0,25% dell'importo finanziato (mutuo prima casa) o 2% (altri casi), secondo le regole generali.",
    quandoSiApplica: "Solo se c'è un mutuo attivo.",
    quandoSiPaga: "Alla data di acquisto.",
    aliquote: "0,25% (prima casa) o 2% (altri casi).",
  },
  {
    id: "imu",
    nome: "IMU",
    categoria: "imposte",
    campiInput: ["rendita-catastale", "categoria-catastale", "stato-imu", "comune", "aliquota-imu-personalizzata"],
    comeSiCalcola:
      "Rendita catastale rivalutata del 5%, moltiplicata per il coefficiente della categoria catastale, per l'aliquota comunale (censita per alcuni comuni, altrimenti il minimo di legge 0,86% salvo personalizzazione).",
    quandoSiApplica: "Sempre, salvo l'unità sia abitazione principale (non di lusso).",
    quandoNonSiApplica: "Se lo stato IMU dell'unità è impostato su \"abitazione principale\" (categorie non di lusso: A/2, A/3, A/4, A/5, A/6, A/7).",
    quandoSiPaga: "Acconto 16 giugno, saldo 16 dicembre, entro l'anno di competenza — non differita all'anno successivo come le imposte sul reddito.",
    aliquote: "Varia per comune; censite alcune aliquote specifiche, altrimenti minimo di legge 0,86%.",
  },
  {
    id: "tari",
    nome: "TARI",
    categoria: "imposte",
    campiInput: ["tari-personalizzata"],
    comeSiCalcola: "Stima di default 2,5€/mq, sovrascrivibile con un importo annuo assoluto.",
    quandoSiApplica: "Sempre (con stima automatica se non personalizzata).",
    quandoSiPaga: "Acconto e saldo entro l'anno di competenza, semplificati sulle stesse date dell'IMU (16 giugno/16 dicembre) — le scadenze reali variano per comune.",
  },
  {
    id: "tassazione-affitto",
    nome: "Tassazione affitto",
    categoria: "imposte",
    campiInput: ["affitto-lordo", "regime-fiscale", "tipo-cedolare", "aliquota-marginale-irpef"],
    comeSiCalcola:
      "Cedolare secca: 21% del canone lordo (10% per canone concordato). Regime ordinario: aliquota marginale IRPEF scelta dall'utente, su un imponibile che tiene conto della riduzione forfettaria di legge.",
    quandoSiApplica: "Sempre che l'affitto lordo sia maggiore di zero.",
    quandoNonSiApplica: "Se l'affitto lordo è zero (uso personale/rendita figurativa, non tassata).",
    quandoSiPaga:
      "L'anno SUCCESSIVO a quello in cui il canone è maturato (30 giugno, data semplificata) — coerente con il ciclo della dichiarazione dei redditi, non nello stesso anno dell'incasso.",
    aliquote: "21% cedolare standard, 10% cedolare concordato, o aliquota marginale IRPEF scelta (23%/35%/43%, scaglioni 2026).",
  },
  {
    id: "addizionali-irpef",
    nome: "Addizionali IRPEF regionale/comunale",
    categoria: "imposte",
    campiInput: ["affitto-lordo", "regime-fiscale"],
    comeSiCalcola: "Percentuale aggiuntiva sull'imponibile, solo in regime di tassazione ordinaria.",
    quandoSiApplica: "Solo se hai scelto il regime fiscale \"ordinaria\" (non con cedolare secca, che le assorbe).",
    quandoNonSiApplica: "Con cedolare secca (la sostituisce integralmente).",
    quandoSiPaga: "Stesso differimento della tassazione affitto: l'anno successivo a quello di competenza.",
  },

  // ─── DETRAZIONI ─────────────────────────────────────────────────────
  {
    id: "detrazione-mediazione",
    nome: "Detrazione mediazione immobiliare",
    categoria: "detrazioni",
    campiInput: ["prima-casa", "intermediazione"],
    comeSiCalcola: "19% della spesa di intermediazione, fino al tetto di spesa ammessa.",
    quandoSiApplica: "Solo per l'acquisto della PRIMA casa (abitazione principale).",
    quandoNonSiApplica: "Per l'acquisto di immobili non destinati ad abitazione principale.",
    quandoSiPaga: "L'anno successivo all'acquisto (tramite dichiarazione dei redditi), in un'unica soluzione — non spalmata su più anni.",
    aliquote: "19%",
    massimali: "Tetto di spesa 1.000€ (quindi detrazione massima 190€).",
  },
  {
    id: "detrazione-interessi-mutuo",
    nome: "Detrazione interessi mutuo",
    categoria: "detrazioni",
    campiInput: ["prima-casa", "importo-mutuo", "tasso-mutuo"],
    comeSiCalcola: "19% degli interessi passivi pagati nell'anno, fino al tetto annuo.",
    quandoSiApplica: "Solo per il mutuo sulla PRIMA casa (abitazione principale).",
    quandoNonSiApplica: "Per mutui su immobili non abitazione principale.",
    quandoSiPaga: "L'anno successivo a quello in cui gli interessi sono maturati (tramite dichiarazione dei redditi).",
    aliquote: "19%",
    massimali: "Tetto di 4.000€ di interessi annui (quindi detrazione massima 760€/anno).",
  },
  {
    id: "detrazione-ristrutturazione",
    nome: "Detrazione ristrutturazione",
    categoria: "detrazioni",
    campiInput: ["ristrutturazione", "prima-casa"],
    comeSiCalcola: "50% (abitazione principale) o 36% (altri immobili) della spesa ammessa, ripartita in 10 quote annuali costanti.",
    quandoSiApplica: "Se hai valorizzato il campo Ristrutturazione (> 0€).",
    quandoSiPaga:
      "La prima quota l'anno successivo alla spesa, poi una quota identica ogni anno per altri 9 anni — se l'orizzonte di investimento è più corto di 10 anni, le quote residue continuano comunque oltre la vendita dell'immobile (il beneficio fiscale non si perde vendendo).",
    aliquote: "50% (prima casa) o 36% (altri immobili).",
    massimali: "Tetto di spesa 96.000€ per unità immobiliare.",
  },
  {
    id: "detrazione-mobili",
    nome: "Detrazione mobili",
    categoria: "detrazioni",
    campiInput: ["arredamento", "ristrutturazione"],
    comeSiCalcola: "50% della spesa ammessa, ripartita in 10 quote annuali costanti.",
    quandoSiApplica: "Solo se c'è ANCHE una spesa di ristrutturazione valorizzata (> 0€) — è condizionata, non autonoma.",
    quandoNonSiApplica: "Se il campo Ristrutturazione è a zero, anche con arredamento valorizzato: nessuna detrazione.",
    quandoSiPaga: "Stesso meccanismo della detrazione ristrutturazione: 10 quote annuali a partire dall'anno successivo alla spesa.",
    aliquote: "50%",
    massimali: "Tetto di spesa 5.000€ per unità immobiliare.",
  },
];
