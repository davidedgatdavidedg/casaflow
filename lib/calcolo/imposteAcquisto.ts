// lib/calcolo/imposteAcquisto.ts
import type { Immobile } from "./tipi";

export interface ImposteAcquisto {
  registro: number;
  ipotecaria: number;
  catastale: number;
  totale: number;
}

/**
 * Moltiplicatori e aliquote per il calcolo delle imposte d'acquisto
 * (registro, ipotecaria, catastale) su compravendita da privato.
 *
 * Fonte primaria: Art. 52, Testo Unico dell'Imposta di Registro (DPR 131/1986)
 * — moltiplicatori 110 (prima casa) e 120 (seconda casa) sul valore catastale
 * rivalutato.
 *
 * Fonte di conferma/divulgativa (voci seconda casa: 9% registro, 50€
 * ipotecaria, 50€ catastale da privato; 200€ ciascuna da impresa con IVA),
 * verificata il 30/08/2026:
 * https://quifinanza.it/fisco-tasse/tasse-seconda-casa-tutte-le-imposte-da-pagare/293810/
 *
 * Nota storica: una discrepanza di circa 113€ riscontrata confrontando
 * questo calcolo con il foglio Excel originale (ImmobilSIM, sheet Strambio)
 * è stata chiarita: l'Excel applicava per errore il moltiplicatore da
 * seconda casa (120) anche a un acquisto correttamente segnalato come prima
 * casa. Il calcolo di questa funzione (moltiplicatore 110 per prima casa)
 * è quello corretto secondo normativa.
 */
const MOLTIPLICATORE_PRIMA_CASA = 110;
const MOLTIPLICATORE_SECONDA_CASA = 120;
const ALIQUOTA_REGISTRO_PRIMA_CASA = 0.02;
const ALIQUOTA_REGISTRO_SECONDA_CASA = 0.09;
const IMPORTO_MINIMO_REGISTRO = 1000;
const IMPOSTA_FISSA_IMPRESA = 200;
const IMPOSTA_FISSA_IPO_CAT_PRIVATO = 50;

/**
 * Coefficiente di rivalutazione della rendita catastale.
 * Fonte: art. 3, comma 48, Legge 23 dicembre 1996, n. 662
 */
const COEFFICIENTE_RIVALUTAZIONE = 1.05;

/**
 * Calcola le imposte dovute all'acquisto di un immobile (registro,
 * ipotecaria, catastale), differenziando tra acquisto da privato
 * (fuori campo IVA, imposte proporzionali sul valore catastale) e da
 * impresa costruttrice (imposte fisse; l'eventuale IVA è gestita altrove).
 *
 * L'immobile può aggregare più unità catastali (es. appartamento + box
 * acquistati nello stesso atto): la base imponibile si calcola sulla
 * somma delle rendite di tutte le unità, coerentemente con il fatto che
 * l'atto genera un'unica imposta di registro, non una per unità.
 */
export function calcolaImposteAcquisto(immobile: Immobile): ImposteAcquisto {
  const { unita, primaCasa, acquistoDa, prezzoAcquisto } = immobile;

  // Prezzo a zero = nessun acquisto reale in corso (form non ancora
  // compilato) — non ha senso applicare il minimo di legge sul
  // registro (1.000€) né gli importi fissi di ipotecaria/catastale, che
  // esistono per una transazione vera, non come "pavimento" assoluto
  // indipendente da qualsiasi altro dato.
  if (prezzoAcquisto <= 0) {
    return { registro: 0, ipotecaria: 0, catastale: 0, totale: 0 };
  }

  if (acquistoDa === "impresa") {
    return {
      registro: IMPOSTA_FISSA_IMPRESA,
      ipotecaria: IMPOSTA_FISSA_IMPRESA,
      catastale: IMPOSTA_FISSA_IMPRESA,
      totale: IMPOSTA_FISSA_IMPRESA * 3,
    };
  }

  const renditaComplessiva = unita.reduce(
    (somma, u) => somma + u.renditaCatastale,
    0
  );

  const moltiplicatore = primaCasa
    ? MOLTIPLICATORE_PRIMA_CASA
    : MOLTIPLICATORE_SECONDA_CASA;
  const aliquotaRegistro = primaCasa
    ? ALIQUOTA_REGISTRO_PRIMA_CASA
    : ALIQUOTA_REGISTRO_SECONDA_CASA;

  const baseImponibile = renditaComplessiva * COEFFICIENTE_RIVALUTAZIONE * moltiplicatore;
  const registroCalcolato = baseImponibile * aliquotaRegistro;
  const registro = arrotonda(Math.max(registroCalcolato, IMPORTO_MINIMO_REGISTRO));

  return {
    registro,
    ipotecaria: IMPOSTA_FISSA_IPO_CAT_PRIVATO,
    catastale: IMPOSTA_FISSA_IPO_CAT_PRIVATO,
    totale: arrotonda(registro + IMPOSTA_FISSA_IPO_CAT_PRIVATO * 2),
  };
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
