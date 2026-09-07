// lib/calcolo/interpretazioneIrr.ts
//
// Traduce l'IRR grezzo in un giudizio orientativo in linguaggio semplice,
// confrontandolo con range tipici di mercato per investimenti
// immobiliari a leva — NON un giudizio assoluto (non esiste un "IRR
// giusto" universale, dipende da rischio, liquidità, tempo dedicato),
// ma un orientamento per capire dove si colloca il proprio caso.

export type FasciaIrr = "negativo" | "basso" | "medio" | "buono" | "alto";

export interface InterpretazioneIrr {
  fascia: FasciaIrr;
  etichetta: string;
  descrizione: string;
}

/**
 * Soglie orientative per un investimento immobiliare residenziale a
 * leva in Italia — non un dato normato, una convenzione diffusa nella
 * pratica di settore (range più ampi si usano per immobiliare
 * commerciale/value-add, qui parliamo di piccolo investitore privato).
 */
export function interpretaIrr(irr: number | null): InterpretazioneIrr {
  if (irr === null) {
    return {
      fascia: "negativo",
      etichetta: "Non calcolabile",
      descrizione:
        "Non esiste un tasso che azzeri il valore attuale netto dei flussi: succede se, ad esempio, tutti i flussi hanno lo stesso segno. Controlla i dati inseriti.",
    };
  }

  if (irr < 0) {
    return {
      fascia: "negativo",
      etichetta: "Negativo",
      descrizione:
        "L'investimento restituisce meno di quanto hai versato: a parità di altre condizioni, il capitale investito altrove (anche fermo) renderebbe di più.",
    };
  }

  if (irr < 0.02) {
    return {
      fascia: "basso",
      etichetta: "Basso",
      descrizione:
        "Un rendimento in questa fascia è tipicamente inferiore a quello di un titolo di Stato a lungo termine, pur assumendoti il rischio e l'impegno di gestione di un immobile.",
    };
  }

  if (irr < 0.05) {
    return {
      fascia: "medio",
      etichetta: "Nella media",
      descrizione:
        "Un IRR in questa fascia è tipico per un investimento immobiliare residenziale a leva prudente in Italia — né particolarmente basso né particolarmente attraente rispetto al rischio assunto.",
    };
  }

  if (irr < 0.1) {
    return {
      fascia: "buono",
      etichetta: "Buono",
      descrizione:
        "Un IRR in questa fascia è superiore alla media di un investimento immobiliare residenziale prudente — verifica che le ipotesi alla base (canone, rivalutazione, costi) siano realistiche e non ottimistiche.",
    };
  }

  return {
    fascia: "alto",
    etichetta: "Alto",
    descrizione:
      "Un IRR così alto è raro per un investimento residenziale prudente: prima di fidartene, verifica con particolare attenzione le ipotesi più ottimistiche (canone, rivalutazione, costi di ristrutturazione) — un rendimento anomalo nasconde spesso un'ipotesi troppo favorevole.",
  };
}
