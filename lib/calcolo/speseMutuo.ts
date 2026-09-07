// lib/calcolo/speseMutuo.ts

export interface SpeseMutuo {
  istruttoria: number;
  impostaSostitutiva: number;
  totale: number;
}

/**
 * Aliquote dell'imposta sostitutiva sui mutui.
 * Fonte: art. 18, DPR 29 settembre 1973, n. 601, come modificato
 * dall'art. 1-bis, comma 6, Legge 30 luglio 2004, n. 191 (che ha portato
 * l'aliquota ordinaria dallo 0,25% al 2% per i mutui non agevolati prima
 * casa), verificata il 30/08/2026:
 * https://www.notariato.it/it/casa/trattamento-fiscale/
 *
 * Nota: l'aliquota agevolata 0,25% richiede una dichiarazione esplicita
 * dei requisiti prima casa nell'atto di mutuo — non basta l'intenzione,
 * va formalizzata. Qui si assume che, se primaCasa è true, la
 * dichiarazione sia stata correttamente resa.
 */
const ALIQUOTA_SOSTITUTIVA_PRIMA_CASA = 0.0025;
const ALIQUOTA_SOSTITUTIVA_ALTRO = 0.02;

/**
 * Percentuale di spese di istruttoria bancaria sul mutuo. Valore tipico
 * di mercato — NON normato per legge, varia da banca a banca.
 * Configurabile in advanced mode.
 */
const PERCENTUALE_ISTRUTTORIA_DEFAULT = 0.005;

/**
 * Calcola le spese di attivazione di un mutuo: istruttoria bancaria e
 * imposta sostitutiva (in luogo di registro/ipotecaria/bollo sul
 * finanziamento).
 *
 * @param importoMutuo Importo finanziato
 * @param primaCasa Se il mutuo beneficia dell'agevolazione prima casa
 * @param percentualeIstruttoria Percentuale di istruttoria (default: 0,5%, mercato)
 */
export function calcolaSpeseMutuo(
  importoMutuo: number,
  primaCasa: boolean,
  percentualeIstruttoria: number = PERCENTUALE_ISTRUTTORIA_DEFAULT
): SpeseMutuo {
  const istruttoria = arrotonda(importoMutuo * percentualeIstruttoria);
  const aliquotaSostitutiva = primaCasa
    ? ALIQUOTA_SOSTITUTIVA_PRIMA_CASA
    : ALIQUOTA_SOSTITUTIVA_ALTRO;
  const impostaSostitutiva = arrotonda(importoMutuo * aliquotaSostitutiva);

  return {
    istruttoria,
    impostaSostitutiva,
    totale: arrotonda(istruttoria + impostaSostitutiva),
  };
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
