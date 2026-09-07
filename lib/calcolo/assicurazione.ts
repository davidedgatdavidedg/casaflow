// lib/calcolo/assicurazione.ts

export interface Assicurazione {
  totale: number;
}

/**
 * Costo annuo stimato della polizza assicurativa casa, in €/mq/anno —
 * usato SOLO per proporre una stima di default, mai come unità di
 * misura esposta all'utente (che inserisce sempre un importo assoluto
 * annuo, stessa logica di energia/gas/internet). Valore indicativo di
 * mercato per una polizza base (incendio/scoppio, eventuale
 * responsabilità civile) — NON normato, varia molto per massimali e
 * copertura scelta.
 */
export const COSTO_ASSICURAZIONE_DEFAULT_PER_MQ = 2;

/**
 * Stima il costo annuo dell'assicurazione casa.
 *
 * @param metriQuadri Superficie dell'immobile, usata solo per proporre
 *   una stima di default se non specificato un importo assoluto
 * @param totaleAnnuoPersonalizzato Importo ASSOLUTO annuo in €, se noto
 *   con precisione (es. dal proprio preventivo assicurativo)
 */
export function calcolaAssicurazione(
  metriQuadri: number,
  totaleAnnuoPersonalizzato?: number
): Assicurazione {
  const totale =
    totaleAnnuoPersonalizzato ?? metriQuadri * COSTO_ASSICURAZIONE_DEFAULT_PER_MQ;
  return { totale: arrotonda(totale) };
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
