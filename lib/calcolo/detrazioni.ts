// src/lib/calcolo/detrazioni.ts
import type { ParametriDetrazione, RichiestaDetrazione, TipoDetrazione } from "./tipi";

export const PARAMETRI_DETRAZIONE_DEFAULT: Record<TipoDetrazione, ParametriDetrazione> = {
  interessiMutuo: { capDetrazione: 4000, percentuale: 0.19 },
  intermediazione: { capDetrazione: 1000, percentuale: 0.19 },
  ristrutturazione: { capDetrazione: 96000, percentuale: 0.5 },
  mobili: { capDetrazione: 5000, percentuale: 0.5 },
};

export interface RisultatoDetrazione {
  tipo: TipoDetrazione;
  imponibileEffettivo: number; // dopo applicazione del cap
  quotaDetraibile: number;
}

/**
 * Calcola la quota detraibile per una singola richiesta, applicando
 * il cap massimo prima della percentuale, come da normativa italiana.
 * I parametri sono sostituibili (advanced mode) rispetto ai default nazionali.
 */
export function calcolaDetrazione(
  richiesta: RichiestaDetrazione,
  parametriPersonalizzati?: Partial<Record<TipoDetrazione, ParametriDetrazione>>
): RisultatoDetrazione {
  const parametri =
    parametriPersonalizzati?.[richiesta.tipo] ??
    PARAMETRI_DETRAZIONE_DEFAULT[richiesta.tipo];

  const imponibileEffettivo = Math.min(richiesta.imponibile, parametri.capDetrazione);
  const quotaDetraibile = arrotonda(imponibileEffettivo * parametri.percentuale);

  return {
    tipo: richiesta.tipo,
    imponibileEffettivo,
    quotaDetraibile,
  };
}

/** Calcola più detrazioni insieme e restituisce anche il totale. */
export function calcolaDetrazioni(
  richieste: RichiestaDetrazione[],
  parametriPersonalizzati?: Partial<Record<TipoDetrazione, ParametriDetrazione>>
): { dettaglio: RisultatoDetrazione[]; totale: number } {
  const dettaglio = richieste.map((r) => calcolaDetrazione(r, parametriPersonalizzati));
  const totale = arrotonda(dettaglio.reduce((acc, d) => acc + d.quotaDetraibile, 0));

  return { dettaglio, totale };
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}