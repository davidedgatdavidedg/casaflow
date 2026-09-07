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
 * - Ordinaria (piccole riparazioni, tinteggiature, ecc.): ~1%/anno
 * - Straordinaria (accantonamento medio per interventi maggiori, es.
 *   impianti, infissi): ~0,3%/anno
 */
const PERCENTUALE_ORDINARIA_DEFAULT = 0.01;
const PERCENTUALE_STRAORDINARIA_DEFAULT = 0.003;

/**
 * Stima la manutenzione annua (ordinaria + straordinaria) come
 * percentuale del valore dell'immobile.
 *
 * @param valoreImmobile Prezzo di acquisto o valore corrente dell'immobile
 * @param percentualeOrdinaria Default 1%/anno
 * @param percentualeStraordinaria Default 0,3%/anno
 */
export function calcolaManutenzione(
  valoreImmobile: number,
  percentualeOrdinaria: number = PERCENTUALE_ORDINARIA_DEFAULT,
  percentualeStraordinaria: number = PERCENTUALE_STRAORDINARIA_DEFAULT
): Manutenzione {
  const ordinaria = arrotonda(valoreImmobile * percentualeOrdinaria);
  const straordinaria = arrotonda(valoreImmobile * percentualeStraordinaria);
  return { ordinaria, straordinaria, totale: arrotonda(ordinaria + straordinaria) };
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
