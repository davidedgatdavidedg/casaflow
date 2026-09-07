// lib/calcolo/tassazioneAffitti.ts

export type RegimeFiscaleAffitto = "cedolareSecca" | "ordinaria";
export type TipoCedolare = "standard" | "concordato";

export interface TassazioneAffitto {
  regime: RegimeFiscaleAffitto;
  imponibile: number;
  imposta: number;
  affittoNetto: number;
}

/**
 * Aliquote cedolare secca.
 * Fonte: art. 3, D.Lgs. 14 marzo 2011, n. 23. Aliquota standard 21%,
 * ridotta al 10% per i contratti a canone concordato (art. 1, commi 1
 * lett. a-b, D.L. 551/1988) — verificato il 30/08/2026.
 */
const ALIQUOTA_CEDOLARE_STANDARD = 0.21;
const ALIQUOTA_CEDOLARE_CONCORDATO = 0.1;

/**
 * Riduzione forfettaria del canone ai fini IRPEF in regime ordinario
 * (5% per la generalità dei casi; esistono percentuali maggiori per
 * casistiche specifiche — es. Venezia centro storico — non gestite qui).
 * Fonte: art. 37, comma 4-bis, TUIR (DPR 917/1986).
 */
const ABBATTIMENTO_FORFETTARIO_ORDINARIA = 0.05;

/**
 * Scaglioni IRPEF 2026, resi strutturali dalla Legge di Bilancio 2026
 * (L. 30 dicembre 2025, n. 199): 23% fino a 28.000€, 33% da 28.001€ a
 * 50.000€, 43% oltre 50.000€ — verificato il 30/08/2026. Qui usati solo
 * per proporre le opzioni di aliquota marginale nella UI: il tool non
 * conosce il reddito complessivo dell'utente, quindi l'aliquota va scelta
 * direttamente da chi usa lo strumento.
 */
export const ALIQUOTE_MARGINALI_IRPEF_2026 = [0.23, 0.33, 0.43] as const;

/**
 * Calcola l'imposta e il netto di un affitto tassato in cedolare secca.
 */
export function calcolaCedolareSecca(
  affittoLordoAnnuo: number,
  tipo: TipoCedolare = "standard"
): TassazioneAffitto {
  const aliquota =
    tipo === "concordato" ? ALIQUOTA_CEDOLARE_CONCORDATO : ALIQUOTA_CEDOLARE_STANDARD;
  const imposta = arrotonda(affittoLordoAnnuo * aliquota);

  return {
    regime: "cedolareSecca",
    imponibile: affittoLordoAnnuo,
    imposta,
    affittoNetto: arrotonda(affittoLordoAnnuo - imposta),
  };
}

/**
 * Calcola l'imposta e il netto di un affitto tassato in regime ordinario
 * (cumulo con il reddito complessivo, tassato all'aliquota marginale IRPEF).
 *
 * @param affittoLordoAnnuo Canone annuo lordo
 * @param aliquotaMarginaleIrpef Aliquota marginale IRPEF del locatore
 *   (dipende dal suo reddito complessivo, non calcolabile da questo tool)
 */
export function calcolaTassazioneOrdinaria(
  affittoLordoAnnuo: number,
  aliquotaMarginaleIrpef: number
): TassazioneAffitto {
  const imponibile = arrotonda(
    affittoLordoAnnuo * (1 - ABBATTIMENTO_FORFETTARIO_ORDINARIA)
  );
  const imposta = arrotonda(imponibile * aliquotaMarginaleIrpef);

  return {
    regime: "ordinaria",
    imponibile,
    imposta,
    affittoNetto: arrotonda(affittoLordoAnnuo - imposta),
  };
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
