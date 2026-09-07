// lib/calcolo/detrazioneMobili.ts

export interface DetrazioneMobili {
  spesaAmmessa: number;
  importoTotale: number; // totale detraibile sull'intero periodo (10 anni)
  rataAnnua: number; // importoTotale / 10
}

/**
 * Detrazione IRPEF sulle spese di arredamento (bonus mobili ed
 * elettrodomestici), collegata a un intervento di ristrutturazione.
 * Fonte: art. 16, comma 2, D.L. 63/2013 e successive proroghe —
 * verificato il 04/09/2026, confermato in vigore per il 2026.
 *
 * Aliquota 50% (fissa — a differenza del bonus ristrutturazioni non
 * risulta una fonte affidabile e univoca su una eventuale riduzione al
 * 36% per gli immobili non abitazione principale: la maggioranza delle
 * fonti verificate riporta 50% flat, ma è un punto su cui vale la pena
 * un controllo periodico visto che la normativa cambia spesso).
 * Tetto di spesa: 5.000€ per unità immobiliare.
 * Condizione: serve un intervento di ristrutturazione collegato,
 * iniziato non prima dell'anno precedente a quello della spesa per i
 * mobili — qui semplificato a "c'è una spesa di ristrutturazione > 0
 * nello stesso acquisto".
 * Come il bonus ristrutturazioni, si ripartisce in 10 quote annuali di
 * pari importo, non è immediata.
 */
const ALIQUOTA_MOBILI = 0.5;
const TETTO_SPESA = 5000;
export const NUMERO_RATE_MOBILI = 10;

/**
 * Calcola la detrazione IRPEF sulle spese di arredamento.
 *
 * @param spesa Spesa sostenuta per mobili/elettrodomestici
 * @param ristrutturazioneCollegata Se esiste una spesa di ristrutturazione
 *   collegata — condizione necessaria per la detrazione
 */
export function calcolaDetrazioneMobili(
  spesa: number,
  ristrutturazioneCollegata: boolean
): DetrazioneMobili {
  if (!ristrutturazioneCollegata) {
    return { spesaAmmessa: 0, importoTotale: 0, rataAnnua: 0 };
  }

  const spesaAmmessa = Math.min(spesa, TETTO_SPESA);
  const importoTotale = arrotonda(spesaAmmessa * ALIQUOTA_MOBILI);
  const rataAnnua = arrotonda(importoTotale / NUMERO_RATE_MOBILI);

  return { spesaAmmessa, importoTotale, rataAnnua };
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
