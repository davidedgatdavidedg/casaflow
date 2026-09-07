// lib/calcolo/obiettivoIrr.ts
//
// "A quali condizioni questo investimento raggiunge il rendimento che
// cerco?" — l'inverso esatto delle Leve: invece di "se cambio X del
// ±10%, quanto si muove l'IRR?", qui la domanda è "quale valore di X fa
// sì che l'IRR raggiunga un obiettivo?". Stesso principio dell'IRR
// stesso (bisezione), applicato a un parametro di input anziché al
// tasso di sconto.

import { calcolaSimulazione, type ParametriSimulazione } from "./simulazione";

/** Le sole leve che ha senso "risolvere all'indietro" — le stesse
 * cinque già mostrate nel pannello Leve, qui usate come chiave diretta
 * di ParametriSimulazione (il vantaggio di lavorare a questo livello,
 * non a livello di flussiCassa: variare uno di questi campi fa
 * ricalcolare automaticamente tutto ciò che ne dipende — tassazione,
 * detrazioni, rivendita — senza bisogno di aggiustamenti manuali). */
export type LevaObiettivo =
  | "prezzoAcquisto"
  | "affittoLordoAnnuo"
  | "ristrutturazione"
  | "tassoMutuoPercentuale"
  | "rivalutazioneAnnuaPercentuale";

export const ETICHETTE_LEVA_OBIETTIVO: Record<LevaObiettivo, string> = {
  prezzoAcquisto: "Prezzo di acquisto",
  affittoLordoAnnuo: "Canone di affitto",
  ristrutturazione: "Costo ristrutturazione",
  tassoMutuoPercentuale: "Tasso del mutuo",
  rivalutazioneAnnuaPercentuale: "Rivalutazione annua immobile",
};

export interface RisultatoObiettivoIrr {
  trovato: boolean;
  /** Il valore della leva che raggiunge l'IRR obiettivo, se esiste
   * nell'intervallo di ricerca. */
  valoreTrovato: number | null;
  valoreAttuale: number;
  irrTarget: number;
  irrAttuale: number | null;
}

/** Intervallo di ricerca per ciascuna leva — ampio ma economicamente
 * sensato, per evitare di scandagliare zone assurde (es. un tasso
 * mutuo del 500%). */
function intervalloRicerca(
  base: ParametriSimulazione,
  leva: LevaObiettivo
): [number, number] {
  switch (leva) {
    case "prezzoAcquisto":
      return [1000, Math.max(base.prezzoAcquisto * 3, 200000)];
    case "affittoLordoAnnuo":
      return [0, Math.max(base.affittoLordoAnnuo * 3, 30000)];
    case "ristrutturazione":
      return [0, Math.max(base.ristrutturazione * 3, 150000)];
    case "tassoMutuoPercentuale":
      return [0.1, 15];
    case "rivalutazioneAnnuaPercentuale":
      return [-10, 10];
  }
}

/**
 * Trova il valore della leva scelta che fa raggiungere all'IRR il
 * target indicato, a parità di tutti gli altri parametri.
 *
 * Usa `calcolaSimulazione` con `calcolaLeve: false`: il goal-seek
 * richiama la simulazione centinaia di volte durante la ricerca, e le
 * Leve interne (che a loro volta fanno ~10 calcoli IRR ciascuna)
 * andrebbero sprecate a ogni iterazione — qui serve solo l'IRR finale.
 */
export function trovaValorePerTargetIrr(
  base: ParametriSimulazione,
  leva: LevaObiettivo,
  irrTarget: number
): RisultatoObiettivoIrr {
  const valoreAttuale = base[leva];
  const irrAttuale = calcolaSimulazione(base, { calcolaLeve: false }).irr;

  function irrConValore(valore: number): number | null {
    return calcolaSimulazione({ ...base, [leva]: valore }, { calcolaLeve: false }).irr;
  }

  const [min, max] = intervalloRicerca(base, leva);
  const NUMERO_CAMPIONI = 150;
  const passo = (max - min) / NUMERO_CAMPIONI;

  // Limite di ragionevolezza economica: un IRR trovato fuori da questo
  // intervallo è quasi certamente un artefatto numerico (l'IRR esplode
  // vicino a certi estremi del dominio, es. un prezzo di acquisto
  // vicinissimo a zero rende l'investimento iniziale trascurabile
  // rispetto ai ritorni, generando IRR di migliaia di punti percentuale
  // privi di significato economico) — non una soluzione vera.
  const IRR_MINIMO_SENSATO = -0.99;
  const IRR_MASSIMO_SENSATO = 5; // 500%

  let bassoX = min;
  let bassoY = scarto(irrConValore(min), irrTarget);

  for (let i = 1; i <= NUMERO_CAMPIONI; i++) {
    const altoXCandidato = min + i * passo;
    const irrCandidato = irrConValore(altoXCandidato);
    const altoYCandidato = scarto(irrCandidato, irrTarget);

    const cambioSegno =
      Number.isFinite(bassoY) &&
      Number.isFinite(altoYCandidato) &&
      bassoY * altoYCandidato <= 0;

    if (cambioSegno) {
      const risultatoBisezione = bisecaEValida(
        bassoX,
        altoXCandidato,
        bassoY,
        irrConValore,
        irrTarget,
        IRR_MINIMO_SENSATO,
        IRR_MASSIMO_SENSATO
      );
      if (risultatoBisezione !== null) {
        return {
          trovato: true,
          valoreTrovato: risultatoBisezione,
          valoreAttuale,
          irrTarget,
          irrAttuale,
        };
      }
      // Cambio di segno trovato ma l'IRR risultante non è economicamente
      // sensato (artefatto numerico) — non ci fermiamo qui, continuiamo
      // a scandagliare oltre questo punto instabile.
    }

    bassoX = altoXCandidato;
    bassoY = altoYCandidato;
  }

  return { trovato: false, valoreTrovato: null, valoreAttuale, irrTarget, irrAttuale };
}

/** Biseca nell'intervallo [a, b] e restituisce il valore trovato SOLO
 * se l'IRR che produce è economicamente sensato — altrimenti null, così
 * il chiamante sa di dover continuare la ricerca oltre questo punto. */
function bisecaEValida(
  a: number,
  b: number,
  ya: number,
  irrConValore: (valore: number) => number | null,
  irrTarget: number,
  irrMinimoSensato: number,
  irrMassimoSensato: number
): number | null {
  let bassoA = a;
  let altoB = b;
  let yBassoA = ya;

  for (let i = 0; i < 60; i++) {
    const m = (bassoA + altoB) / 2;
    const irrM = irrConValore(m);
    const ym = scarto(irrM, irrTarget);
    if (Math.abs(ym) < 1e-5) {
      bassoA = m;
      altoB = m;
      break;
    }
    if (yBassoA * ym < 0) {
      altoB = m;
    } else {
      bassoA = m;
      yBassoA = ym;
    }
  }

  const valoreTrovato = (bassoA + altoB) / 2;
  const irrFinale = irrConValore(valoreTrovato);

  if (
    irrFinale === null ||
    irrFinale < irrMinimoSensato ||
    irrFinale > irrMassimoSensato
  ) {
    return null;
  }

  return valoreTrovato;
}

/** Scarto tra l'IRR calcolato e il target — IRR non calcolabile (null)
 * viene trattato come "-Infinity" ai fini della ricerca del cambio di
 * segno: un valore che rende l'IRR incalcolabile è comunque "lontano"
 * dal target, in direzione negativa. */
function scarto(irr: number | null, target: number): number {
  return (irr ?? -Infinity) - target;
}
