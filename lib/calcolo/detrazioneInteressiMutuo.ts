// lib/calcolo/detrazioneInteressiMutuo.ts

export interface DetrazioneInteressiMutuo {
  spesaAmmessa: number;
  importo: number;
}

/**
 * Detrazione IRPEF sugli interessi passivi (e oneri accessori, incluse
 * le spese notarili specifiche dell'atto di mutuo — NON quelle del
 * rogito) di un mutuo ipotecario per l'acquisto dell'abitazione
 * principale.
 * Fonte: art. 15, comma 1, lett. b), DPR 917/1986 (TUIR) — verificato
 * il 04/09/2026, confermato in vigore per il 2026.
 *
 * Condizioni: spetta SOLO se l'immobile finanziato è (o sarà, entro il
 * termine di legge) abitazione principale — non per un mutuo relativo
 * a un acquisto puramente ad uso investimento/affitto. È una detrazione
 * ANNUALE, ricalcolata ogni anno sugli interessi effettivamente pagati
 * in quell'anno (a differenza di ristrutturazione/mobili, che si
 * spalmano su 10 rate fisse).
 */
const ALIQUOTA_DETRAZIONE_INTERESSI_MUTUO = 0.19;
const TETTO_INTERESSI_MUTUO_ANNUO = 4000;

/**
 * Calcola la detrazione IRPEF annua sugli interessi passivi del mutuo.
 *
 * @param interessiPassiviAnnui Interessi passivi effettivamente pagati nell'anno
 * @param abitazionePrincipale Se l'immobile finanziato è abitazione
 *   principale — condizione necessaria per la detrazione
 */
export function calcolaDetrazioneInteressiMutuo(
  interessiPassiviAnnui: number,
  abitazionePrincipale: boolean
): DetrazioneInteressiMutuo {
  if (!abitazionePrincipale) {
    return { spesaAmmessa: 0, importo: 0 };
  }

  const spesaAmmessa = Math.min(interessiPassiviAnnui, TETTO_INTERESSI_MUTUO_ANNUO);
  return {
    spesaAmmessa: arrotonda(spesaAmmessa),
    importo: arrotonda(spesaAmmessa * ALIQUOTA_DETRAZIONE_INTERESSI_MUTUO),
  };
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
