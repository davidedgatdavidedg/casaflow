// lib/calcolo/valorizzazioneRistrutturazione.ts
//
// Punto unico in cui si stima il prezzo di vendita futuro di un
// immobile — usato sia dal calcolatore completo (simulazione.ts) sia
// dalla stima rapida del wizard investimento (stimaRapida.ts). Prima
// di questo modulo, la formula viveva duplicata (e leggermente diversa)
// in entrambi i punti.

/**
 * Quota della spesa di ristrutturazione che si assume si rifletta sul
 * valore di rivendita dell'immobile. Un euro speso in lavori non
 * diventa necessariamente un euro di valore di mercato in più — è
 * un'ipotesi semplificata, non una stima di mercato: 75% è il default,
 * modificabile in modalità avanzata nel calcolatore completo (mai nei
 * due wizard guidati, che lo usano fisso).
 */
export const COEFFICIENTE_VALORIZZAZIONE_RISTRUTTURAZIONE_DEFAULT = 0.75;

export interface RisultatoPrezzoVenditaStimato {
  /** Quota della spesa di ristrutturazione attribuita al valore
   * dell'immobile (costoRistrutturazione * coefficiente) — NON un
   * flusso di cassa autonomo, solo una componente del valore base da
   * cui parte la rivalutazione. Il costo pieno della ristrutturazione
   * resta comunque un'uscita di cassa al 100%, contabilizzata altrove
   * (flussiCassa.ts) — vedi la nota nel corpo della funzione sotto. */
  valoreRistrutturazione: number;
  /** prezzoAcquisto + valoreRistrutturazione: la base su cui si
   * applica la rivalutazione annua composta. */
  valoreBaseVendita: number;
  /** valoreBaseVendita rivalutato sull'orizzonte di anni scelto. */
  prezzoVenditaStimato: number;
}

/**
 * Stima il prezzo di vendita futuro di un immobile.
 *
 * IMPORTANTE — evitare il doppio conteggio: questa funzione calcola
 * SOLO l'effetto della ristrutturazione sul valore di realizzo finale.
 * Il costo della ristrutturazione resta SEMPRE un'uscita di cassa al
 * 100% al momento della spesa (in flussiCassa.ts, indipendente da
 * questa funzione) — il coefficiente qui non riduce né sostituisce
 * quell'uscita, si limita ad aggiungere un effetto sul valore finale
 * che prima non esisteva affatto.
 *
 * @param prezzoAcquisto Prezzo di acquisto dell'immobile
 * @param ristrutturazione Costo della ristrutturazione (0 se assente)
 * @param coefficienteValorizzazioneRistrutturazione Quota (0-1, es.
 *   0.75) della spesa di ristrutturazione attribuita al valore
 *   dell'immobile. Passare COEFFICIENTE_VALORIZZAZIONE_RISTRUTTURAZIONE_DEFAULT
 *   se non personalizzato.
 * @param rivalutazioneAnnua Frazione (es. 0.015 per 1,5%), non percentuale
 * @param anni Orizzonte di anni su cui si applica la rivalutazione composta
 */
export function calcolaPrezzoVenditaStimato(
  prezzoAcquisto: number,
  ristrutturazione: number,
  coefficienteValorizzazioneRistrutturazione: number,
  rivalutazioneAnnua: number,
  anni: number
): RisultatoPrezzoVenditaStimato {
  const valoreRistrutturazione = arrotonda(
    Math.max(ristrutturazione, 0) * coefficienteValorizzazioneRistrutturazione
  );
  const valoreBaseVendita = arrotonda(prezzoAcquisto + valoreRistrutturazione);
  const prezzoVenditaStimato = arrotonda(
    valoreBaseVendita * Math.pow(1 + rivalutazioneAnnua, Math.max(anni, 0))
  );

  return { valoreRistrutturazione, valoreBaseVendita, prezzoVenditaStimato };
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
