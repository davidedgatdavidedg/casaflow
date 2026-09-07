// lib/calcolo/addizionaliIrpef.ts

export interface Addizionali {
  imponibile: number;
  aliquotaApplicata: number;
  importo: number;
}

/**
 * Aliquota combinata (regionale + comunale) di default quando il comune
 * non è censito nella tabella qui sotto — usa solo l'aliquota regionale
 * minima base (1,23%), assumendo nessuna addizionale comunale deliberata
 * (è una facoltà del Comune, non un obbligo).
 * Fonte normativa generale: D.Lgs. 28 settembre 1998, n. 360.
 */
const ALIQUOTA_ADDIZIONALI_DEFAULT = 0.0123;
const SOGLIA_ESENZIONE_DEFAULT = 0;

interface ConfigAddizionaliComune {
  aliquota: number;
  sogliaEsenzione: number;
}

/**
 * Aliquote combinate (regionale + comunale) per comuni specifici.
 * Verificato il 30/08/2026 su fonti aggregate (Portale del Federalismo
 * Fiscale, MEF):
 * - Milano: comunale 0,80% (esenzione fino a 23.000€ di imponibile) +
 *   regionale Lombardia (scaglioni fino a 1,73%) ≈ 2,53% complessivo.
 * Da verificare/aggiornare per altri comuni quando servono.
 */
const ADDIZIONALI_COMUNALI: Record<string, ConfigAddizionaliComune> = {
  Milano: { aliquota: 0.0253, sogliaEsenzione: 23000 },
};

const ADDIZIONALI_NORMALIZZATE: Record<string, ConfigAddizionaliComune> =
  Object.fromEntries(
    Object.entries(ADDIZIONALI_COMUNALI).map(([comune, config]) => [
      normalizzaNomeComune(comune),
      config,
    ])
  );

function normalizzaNomeComune(comune: string): string {
  return comune.trim().toLowerCase();
}

/**
 * Calcola le addizionali IRPEF regionale + comunale su un reddito
 * imponibile. Si applicano SOLO in regime di tassazione ordinaria: la
 * cedolare secca le sostituisce per legge (art. 3, D.Lgs. 14 marzo 2011,
 * n. 23), quindi va invocata solo quando l'affitto è tassato in regime
 * ordinario, non con cedolare secca.
 *
 * @param redditoImponibile Reddito imponibile (stesso imponibile usato per l'IRPEF)
 * @param comune Comune di domicilio fiscale, usato per l'aliquota specifica
 * @param aliquotaPersonalizzata Aliquota combinata da forzare, se nota con precisione
 */
export function calcolaAddizionaliIrpef(
  redditoImponibile: number,
  comune: string,
  aliquotaPersonalizzata?: number
): Addizionali {
  const config = ADDIZIONALI_NORMALIZZATE[normalizzaNomeComune(comune)];
  const aliquota = aliquotaPersonalizzata ?? config?.aliquota ?? ALIQUOTA_ADDIZIONALI_DEFAULT;
  const sogliaEsenzione = config?.sogliaEsenzione ?? SOGLIA_ESENZIONE_DEFAULT;

  if (redditoImponibile <= sogliaEsenzione) {
    return { imponibile: redditoImponibile, aliquotaApplicata: 0, importo: 0 };
  }

  const importo = arrotonda(redditoImponibile * aliquota);
  return { imponibile: redditoImponibile, aliquotaApplicata: aliquota, importo };
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
