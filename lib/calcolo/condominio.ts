// lib/calcolo/condominio.ts

export interface SpeseCondominio {
  totale: number;
}

/**
 * Costo annuo stimato delle spese condominiali a carico del
 * proprietario, in €/mq/anno — usato SOLO per proporre una stima di
 * default, mai come unità di misura esposta all'utente (che inserisce
 * sempre un importo assoluto annuo). Valore prudenziale di mercato — NON
 * normato per legge. Per un affitto standard, le spese condominiali
 * ORDINARIE (pulizie scale, portineria, ascensore) sono per legge a
 * carico dell'inquilino (art. 9, Legge 27 luglio 1978, n. 392); solo le
 * STRAORDINARIE (facciata, tetto, impianti comuni) restano a carico del
 * proprietario. Questo default rappresenta una stima prudenziale della
 * sola quota straordinaria media annua, non l'intera spesa condominiale.
 */
export const COSTO_CONDOMINIO_DEFAULT_PER_MQ = 5;

/**
 * Calcola le spese condominiali annue a carico del proprietario.
 *
 * @param metriQuadri Superficie dell'unità catastale, usata solo per
 *   proporre una stima di default se non specificato un importo assoluto
 * @param totaleAnnuoPersonalizzato Importo ASSOLUTO annuo in €, se noto
 *   con precisione. Se assente, si stima automaticamente dalla metratura.
 */
export function calcolaSpeseCondominio(
  metriQuadri: number,
  totaleAnnuoPersonalizzato?: number
): SpeseCondominio {
  const totale =
    totaleAnnuoPersonalizzato ?? metriQuadri * COSTO_CONDOMINIO_DEFAULT_PER_MQ;
  return { totale: arrotonda(totale) };
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
