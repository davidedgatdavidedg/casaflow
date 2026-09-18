// lib/calcolo/utenze.ts
//
// Tre voci separate — energia elettrica, gas, internet — ciascuna
// espressa come TOTALE ANNUO in euro per l'immobile. L'utente specifica
// (o lascia calcolare) un importo totale, mai un costo al mq: la
// metratura è usata solo internamente come proxy di stima quando manca
// un valore esplicito, non è mai un concetto esposto all'utente.

export interface VoceUtenza {
  totale: number;
}

export interface Utenze {
  energiaElettrica: VoceUtenza;
  gas: VoceUtenza;
  internet: VoceUtenza;
  totale: number;
}

/**
 * Default a ZERO per tutte e tre le voci. In un affitto standard non
 * arredato le utenze sono quasi sempre intestate e pagate direttamente
 * dall'inquilino, non dal proprietario: stimare un importo diverso da
 * zero rischierebbe di sovrastimare sistematicamente un costo che, nella
 * maggior parte dei casi reali, non è a carico di chi affitta. L'utente
 * inserisce un importo assoluto solo se, nel proprio caso specifico, le
 * utenze restano effettivamente a proprio carico.
 */
export const COSTO_ENERGIA_ELETTRICA_DEFAULT_PER_MQ = 0;
export const COSTO_GAS_DEFAULT_PER_MQ = 0;
export const COSTO_INTERNET_DEFAULT_ANNUO = 0;

/**
 * Calcola le tre voci di utenze. Ogni voce, se non specificata
 * esplicitamente come totale annuo, viene stimata a partire dalla
 * metratura (default a zero — vedi sopra: energia e gas restano
 * proporzionali ai mq per coerenza con le altre voci al mq, ma con
 * moltiplicatore nullo finché non se ne cambia il default).
 *
 * @param metriQuadri Superficie dell'immobile, usata solo come proxy di stima
 * @param energiaElettricaAnnua Totale annuo esplicito, se noto
 * @param gasAnnuo Totale annuo esplicito, se noto
 * @param internetAnnuo Totale annuo esplicito, se noto
 */
export function calcolaUtenze(
  metriQuadri: number,
  energiaElettricaAnnua?: number,
  gasAnnuo?: number,
  internetAnnuo?: number
): Utenze {
  const energiaElettrica =
    energiaElettricaAnnua ?? arrotonda(metriQuadri * COSTO_ENERGIA_ELETTRICA_DEFAULT_PER_MQ);
  const gas = gasAnnuo ?? arrotonda(metriQuadri * COSTO_GAS_DEFAULT_PER_MQ);
  const internet = internetAnnuo ?? COSTO_INTERNET_DEFAULT_ANNUO;

  return {
    energiaElettrica: { totale: arrotonda(energiaElettrica) },
    gas: { totale: arrotonda(gas) },
    internet: { totale: arrotonda(internet) },
    totale: arrotonda(energiaElettrica + gas + internet),
  };
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
