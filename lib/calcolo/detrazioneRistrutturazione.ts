// lib/calcolo/detrazioneRistrutturazione.ts

export interface DetrazioneRistrutturazione {
  spesaAmmessa: number;
  aliquota: number;
  importoTotale: number; // totale detraibile sull'intero periodo (10 anni)
  rataAnnua: number; // importoTotale / 10
}

/**
 * Detrazione IRPEF sulle spese di ristrutturazione edilizia (recupero
 * del patrimonio edilizio, art. 16-bis TUIR).
 * Fonte: Legge di Bilancio 2025 (L. 30 dicembre 2024, n. 207) —
 * verificato il 04/09/2026, confermato in vigore per il 2026.
 *
 * Aliquota doppia: 50% se l'immobile è abitazione principale, 36% per
 * gli altri immobili (seconde case, immobili ad uso investimento/affitto).
 * Tetto di spesa: 96.000€ per unità immobiliare.
 * La detrazione NON è immediata: si ripartisce in 10 quote annuali di
 * pari importo, a partire dall'anno di sostenimento della spesa (la
 * prima quota si realizza, come tutte le detrazioni IRPEF, tramite
 * dichiarazione dei redditi l'anno successivo).
 */
const ALIQUOTA_ABITAZIONE_PRINCIPALE = 0.5;
const ALIQUOTA_ALTRI_IMMOBILI = 0.36;
const TETTO_SPESA = 96000;
export const NUMERO_RATE_RISTRUTTURAZIONE = 10;

/**
 * Calcola la detrazione IRPEF sulle spese di ristrutturazione.
 *
 * @param spesa Spesa sostenuta per la ristrutturazione
 * @param abitazionePrincipale Se l'immobile è abitazione principale —
 *   determina l'aliquota (50% invece di 36%)
 */
export function calcolaDetrazioneRistrutturazione(
  spesa: number,
  abitazionePrincipale: boolean
): DetrazioneRistrutturazione {
  const spesaAmmessa = Math.min(spesa, TETTO_SPESA);
  const aliquota = abitazionePrincipale
    ? ALIQUOTA_ABITAZIONE_PRINCIPALE
    : ALIQUOTA_ALTRI_IMMOBILI;
  const importoTotale = arrotonda(spesaAmmessa * aliquota);
  const rataAnnua = arrotonda(importoTotale / NUMERO_RATE_RISTRUTTURAZIONE);

  return { spesaAmmessa, aliquota, importoTotale, rataAnnua };
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
