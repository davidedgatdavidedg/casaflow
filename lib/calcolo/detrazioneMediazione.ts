// lib/calcolo/detrazioneMediazione.ts

export interface DetrazioneMediazione {
  spesaAmmessa: number;
  importo: number;
}

/**
 * Detrazione IRPEF sulle spese di intermediazione immobiliare.
 * Fonte: art. 15, comma 1, lett. b-bis), DPR 917/1986 (TUIR) — verificato
 * il 04/09/2026, confermato in vigore per il 2026.
 *
 * Condizioni: spetta SOLO se l'immobile acquistato è destinato ad
 * abitazione principale dell'acquirente (residenza anagrafica e dimora
 * abituale) — non per un acquisto puramente ad uso investimento/affitto.
 * Non spetta al venditore, né per la ricerca di un immobile da affittare.
 */
const ALIQUOTA_DETRAZIONE_MEDIAZIONE = 0.19;
const TETTO_SPESA_MEDIAZIONE = 1000;

/**
 * Calcola la detrazione IRPEF sulle spese di intermediazione immobiliare.
 *
 * @param speseAgenziaTotale Spesa totale sostenuta per l'agenzia (con IVA)
 * @param abitazionePrincipale Se l'immobile è (o sarà) abitazione
 *   principale dell'acquirente — condizione necessaria per la detrazione
 */
export function calcolaDetrazioneMediazione(
  speseAgenziaTotale: number,
  abitazionePrincipale: boolean
): DetrazioneMediazione {
  if (!abitazionePrincipale) {
    return { spesaAmmessa: 0, importo: 0 };
  }

  const spesaAmmessa = Math.min(speseAgenziaTotale, TETTO_SPESA_MEDIAZIONE);
  return {
    spesaAmmessa: arrotonda(spesaAmmessa),
    importo: arrotonda(spesaAmmessa * ALIQUOTA_DETRAZIONE_MEDIAZIONE),
  };
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
