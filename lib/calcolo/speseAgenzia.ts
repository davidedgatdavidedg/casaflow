// lib/calcolo/speseAgenzia.ts

export interface SpeseAgenzia {
  imponibile: number;
  iva: number;
  totale: number;
}

/**
 * Percentuale di provvigione di agenzia immobiliare (lato acquirente),
 * usata SOLO per proporre una stima di default, mai come unità di
 * misura esposta all'utente (che inserisce sempre un importo assoluto
 * totale, stessa logica di notaio/TARI/condominio/utenze). Valore
 * tipico di mercato in Italia (tipicamente 2-4%) — NON è un dato
 * normato per legge.
 */
const PERCENTUALE_AGENZIA_DEFAULT = 0.03;

/** Aliquota IVA standard, applicata sulla provvigione di intermediazione. */
const ALIQUOTA_IVA_STANDARD = 0.22;

/**
 * Calcola le spese di intermediazione immobiliare (provvigione + IVA) a
 * carico dell'acquirente.
 *
 * @param prezzoAcquisto Prezzo di acquisto dell'immobile
 * @param totalePersonalizzato Importo ASSOLUTO totale (già comprensivo
 *   di IVA), se noto con precisione (es. dalla fattura reale
 *   dell'agenzia). Se assente, si stima automaticamente al 3% + IVA.
 * @param aliquotaIva Aliquota IVA sulla provvigione (default: 22%,
 *   usata sia per la stima sia per scomporre un totale personalizzato
 *   in imponibile/IVA)
 */
export function calcolaSpeseAgenzia(
  prezzoAcquisto: number,
  totalePersonalizzato?: number,
  aliquotaIva: number = ALIQUOTA_IVA_STANDARD
): SpeseAgenzia {
  if (totalePersonalizzato !== undefined) {
    const imponibile = arrotonda(totalePersonalizzato / (1 + aliquotaIva));
    return {
      imponibile,
      iva: arrotonda(totalePersonalizzato - imponibile),
      totale: arrotonda(totalePersonalizzato),
    };
  }

  const imponibile = arrotonda(prezzoAcquisto * PERCENTUALE_AGENZIA_DEFAULT);
  const iva = arrotonda(imponibile * aliquotaIva);
  return {
    imponibile,
    iva,
    totale: arrotonda(imponibile + iva),
  };
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
