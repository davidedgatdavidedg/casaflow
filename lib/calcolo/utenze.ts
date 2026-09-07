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
 * Costi annui stimati — valori prudenziali di mercato, NON normati per
 * legge. In un affitto standard non arredato le utenze sono quasi sempre
 * intestate e pagate dall'inquilino: questi default rappresentano un
 * margine di sicurezza (es. per periodi di sfitto) più che un costo
 * ricorrente pieno a carico del proprietario.
 *
 * Energia elettrica e gas sono stimati come proxy interno €/mq/anno
 * (consumo tipicamente proporzionale alla superficie); l'internet è un
 * costo fisso per abitazione, non scala con la metratura.
 */
const COSTO_ENERGIA_ELETTRICA_DEFAULT_PER_MQ = 1.5;
const COSTO_GAS_DEFAULT_PER_MQ = 1.2;
const COSTO_INTERNET_DEFAULT_ANNUO = 240; // ~20€/mese

/**
 * Calcola le tre voci di utenze. Ogni voce, se non specificata
 * esplicitamente come totale annuo, viene stimata a partire dalla
 * metratura (solo energia elettrica e gas — l'internet resta un importo
 * fisso indipendente dalla superficie).
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
  // L'internet è un costo fisso indipendente dalla metratura — ma se
  // non c'è ancora nessuna metratura inserita (nessun immobile definito
  // davvero), non ha senso stimarlo comunque: sarebbe un costo
  // "fantasma" che non si azzera mai, a differenza di energia e gas che
  // scalano naturalmente a zero con mq=0.
  const internet = internetAnnuo ?? (metriQuadri > 0 ? COSTO_INTERNET_DEFAULT_ANNUO : 0);

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
