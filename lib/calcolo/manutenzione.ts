// lib/calcolo/manutenzione.ts

export interface Manutenzione {
  ordinaria: number;
  straordinaria: number;
  totale: number;
}

/**
 * Percentuali annue del valore dell'immobile usate come stima di
 * manutenzione. Sono convenzioni di mercato diffuse nella prassi degli
 * investimenti immobiliari (regola del pollice), NON dati normati per
 * legge — variano molto in base a età, stato e tipologia dell'immobile.
 * Esportate perché usate anche come default nel placeholder del form
 * (calcolatore-quick-mode.tsx), evitando un valore duplicato lì.
 */
export const PERCENTUALE_MANUTENZIONE_ORDINARIA_DEFAULT = 0.001;
export const PERCENTUALE_MANUTENZIONE_STRAORDINARIA_DEFAULT = 0.001;

/**
 * Stima la manutenzione annua (ordinaria + straordinaria) come
 * percentuale del valore dell'immobile.
 *
 * @param valoreImmobile Prezzo di acquisto o valore corrente dell'immobile
 * @param percentualeOrdinaria Default 0,1%/anno
 * @param percentualeStraordinaria Default 0,1%/anno
 */
export function calcolaManutenzione(
  valoreImmobile: number,
  percentualeOrdinaria: number = PERCENTUALE_MANUTENZIONE_ORDINARIA_DEFAULT,
  percentualeStraordinaria: number = PERCENTUALE_MANUTENZIONE_STRAORDINARIA_DEFAULT
): Manutenzione {
  const ordinaria = arrotonda(valoreImmobile * percentualeOrdinaria);
  const straordinaria = arrotonda(valoreImmobile * percentualeStraordinaria);
  return { ordinaria, straordinaria, totale: arrotonda(ordinaria + straordinaria) };
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
