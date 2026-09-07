// lib/calcolo/tari.ts

export interface Tari {
  totale: number;
}

/**
 * Tariffa TARI stimata, in €/mq/anno (quota fissa + variabile
 * indicativamente incluse) — usata SOLO per proporre una stima di
 * default, mai come unità di misura esposta all'utente (che inserisce
 * sempre un importo assoluto annuo, stessa logica di condominio e
 * utenze). NON è un dato normato a livello nazionale: ogni Comune
 * delibera la propria tariffa (quota fissa per mq + quota variabile per
 * numero di occupanti/tipologia di utenza — DPR 158/1999), quindi questo
 * è un valore medio di mercato per un'utenza domestica tipica,
 * verificato il 30/08/2026 su fonti aggregate (range osservato
 * 2-3,5€/mq/anno per abitazioni).
 */
export const TARIFFA_TARI_DEFAULT_PER_MQ = 2.5;

/**
 * Stima la TARI annua.
 *
 * @param metriQuadri Superficie dell'unità catastale, usata solo per
 *   proporre una stima di default se non specificato un importo assoluto
 * @param totaleAnnuoPersonalizzato Importo ASSOLUTO annuo in €, se noto
 *   con precisione (es. dall'ultimo avviso di pagamento reale)
 */
export function calcolaTari(
  metriQuadri: number,
  totaleAnnuoPersonalizzato?: number
): Tari {
  const totale =
    totaleAnnuoPersonalizzato ?? metriQuadri * TARIFFA_TARI_DEFAULT_PER_MQ;
  return { totale: arrotonda(totale) };
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
