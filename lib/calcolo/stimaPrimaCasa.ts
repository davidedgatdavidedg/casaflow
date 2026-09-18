// lib/calcolo/stimaPrimaCasa.ts
//
// Prima valutazione per il percorso guidato "prima casa". Riusa le
// stesse funzioni e gli stessi default del ramo investimento quando i
// dati non sono ancora stati chiesti all'utente, cambiando soltanto le
// assunzioni intrinsecamente legate al caso d'uso prima casa.

import { calcolaImposteAcquisto } from "./imposteAcquisto";
import { calcolaCostiNotaio } from "./costiNotaio";
import { calcolaSpeseAgenzia } from "./speseAgenzia";
import { calcolaSpeseMutuo } from "./speseMutuo";
import { calcolaPianoAmmortamento } from "./ammortamento";
import { primoDelMeseSuccessivo } from "@/lib/date-utils";
import type { Immobile, Mutuo } from "./tipi";
import { TASSO_MUTUO_STIMATO_DEFAULT } from "./stimaRapida";

export const SOGLIE_RAPPORTO_RATE_REDDITO = {
  generalmenteCompatibile: 0.3,
  attenzione: 0.4,
} as const;

/** Una liquidità residua positiva ma <= 10% di quella iniziale viene
 * considerata "quasi interamente assorbita" solo per individuare uno
 * scenario di criticità multiple. Non è un giudizio di sufficienza. */
export const SOGLIA_LIQUIDITA_QUASI_ASSORBITA = 0.1;

export interface ParametriStimaPrimaCasa {
  prezzoAcquisto: number;
  ristrutturazione: number;
  liquiditaDisponibile: number;
  mutuoRichiesto: boolean;
  /** Percentuale 0-100. Ignorata se mutuoRichiesto è false. */
  percentualeMutuo: number;
  durataMutuoAnni: number;
  redditoNettoMensileFamiliare: number;
  altreRateMensili: number;
}

export type GiudizioRata =
  | "generalmenteCompatibile"
  | "daValutareConAttenzione"
  | "pesoElevato";

export type ScenarioPrimaCasa =
  | "ordinario"
  | "liquiditaInsufficiente"
  /** Solo nel ramo senza mutuo (vedi calcolaStimaPrimaCasa): liquidità
   * residua positiva ma sotto SOGLIA_LIQUIDITA_QUASI_ASSORBITA. Nel
   * ramo con mutuo la stessa condizione confluisce invece in
   * "criticitaMultiple" quando combinata con una rata pesante, o
   * altrimenti resta implicita in "ordinario" — qui invece merita un
   * proprio esito perché, senza rata, è l'unica vera criticità
   * "morbida" rimasta da segnalare. */
  | "liquiditaQuasiAssorbita"
  | "rataElevata"
  | "criticitaMultiple"
  | "primeIndicazioniFavorevoli";

export interface SostenibilitaMensile {
  redditoNettoMensile: number;
  altreRateMensili: number;
  impegniMensiliTotali: number;
  rapportoImpegniReddito: number | null;
  giudizio: GiudizioRata;
}

export interface RisultatoStimaPrimaCasa {
  mutuo: {
    importo: number;
    percentuale: number;
    durataAnni: number | null;
    tassoStimato: number | null;
    rataMensile: number;
  };
  /** null quando non è stato richiesto un mutuo: senza una rata da
   * pagare, un rapporto impegni/reddito non avrebbe alcun significato
   * — non lo calcoliamo forzando la rata a zero, semplicemente non
   * esiste per questo scenario (vedi calcolaStimaPrimaCasa). */
  sostenibilitaMensile: SostenibilitaMensile | null;
  capitale: {
    anticipoPrezzo: number;
    ristrutturazione: number;
    costiAcquistoStimati: number;
    capitaleNecessario: number;
    liquiditaDisponibile: number;
    liquiditaResidua: number;
    gapLiquidita: number;
    quotaLiquiditaResidua: number | null;
  };
  ipotesi: {
    imposteAcquistoStimate: number;
    notaioStimato: number;
    agenziaStimata: number;
    speseMutuoStimate: number;
    tassoMutuoStimato: number | null;
  };
  scenario: ScenarioPrimaCasa;
}

export function calcolaStimaPrimaCasa(
  parametri: ParametriStimaPrimaCasa
): RisultatoStimaPrimaCasa {
  const prezzoAcquisto = Math.max(parametri.prezzoAcquisto, 0);
  const ristrutturazione = Math.max(parametri.ristrutturazione, 0);
  const liquiditaDisponibile = Math.max(parametri.liquiditaDisponibile, 0);

  const percentualeMutuo = parametri.mutuoRichiesto
    ? limita(parametri.percentualeMutuo, 0, 100)
    : 0;
  const durataMutuoAnni = parametri.mutuoRichiesto
    ? Math.max(Math.round(parametri.durataMutuoAnni), 1)
    : 0;

  const importoMutuo = parametri.mutuoRichiesto
    ? arrotonda(prezzoAcquisto * (percentualeMutuo / 100))
    : 0;
  const anticipoPrezzo = arrotonda(prezzoAcquisto - importoMutuo);

  // Stesse assunzioni sintetiche del ramo investitore: acquisto da
  // privato, A/2, rendita catastale 0. Qui cambiano solo primaCasa e
  // stato abitativo, coerenti con questo percorso.
  const immobileSintetico: Immobile = {
    prezzoAcquisto,
    primaCasa: true,
    acquistoDa: "privato",
    affittoLordoAnnuo: 0,
    unita: [
      {
        comune: "",
        categoriaCatastale: "A/2",
        renditaCatastale: 0,
        statoAbitativoImu: "abitazionePrincipale",
      },
    ],
  };

  const imposteAcquisto = calcolaImposteAcquisto(immobileSintetico);
  const notaio = calcolaCostiNotaio(prezzoAcquisto);
  const agenzia = calcolaSpeseAgenzia(prezzoAcquisto);
  const speseMutuo =
    importoMutuo > 0 ? calcolaSpeseMutuo(importoMutuo, true) : null;

  const mutuo: Mutuo | null =
    importoMutuo > 0
      ? {
          importo: importoMutuo,
          durataAnni: durataMutuoAnni,
          dataDecorrenza: primoDelMeseSuccessivo(new Date()),
          tasso: TASSO_MUTUO_STIMATO_DEFAULT,
        }
      : null;

  const piano = mutuo ? calcolaPianoAmmortamento(mutuo) : [];
  const rataMensile = piano.length > 0 ? piano[0].rataTotale : 0;

  const costiAcquistoStimati = arrotonda(
    imposteAcquisto.totale +
      notaio.totale +
      agenzia.totale +
      (speseMutuo?.totale ?? 0)
  );
  const capitaleNecessario = arrotonda(
    anticipoPrezzo + ristrutturazione + costiAcquistoStimati
  );
  const liquiditaResidua = arrotonda(liquiditaDisponibile - capitaleNecessario);
  const gapLiquidita = liquiditaResidua < 0 ? Math.abs(liquiditaResidua) : 0;
  const quotaLiquiditaResidua =
    liquiditaDisponibile > 0 ? liquiditaResidua / liquiditaDisponibile : null;

  const liquiditaInsufficiente = liquiditaResidua < 0;
  const liquiditaQuasiAssorbita =
    liquiditaResidua >= 0 &&
    quotaLiquiditaResidua !== null &&
    quotaLiquiditaResidua <= SOGLIA_LIQUIDITA_QUASI_ASSORBITA;

  let sostenibilitaMensile: SostenibilitaMensile | null = null;
  let scenario: ScenarioPrimaCasa;

  if (parametri.mutuoRichiesto) {
    // Con un mutuo, la rata è un vincolo reale sul bilancio mensile: ha
    // senso chiedere reddito e altri impegni e valutarne il peso.
    const altreRateMensili = Math.max(parametri.altreRateMensili, 0);
    const redditoNettoMensileFamiliare = Math.max(
      parametri.redditoNettoMensileFamiliare,
      0
    );
    const impegniMensiliTotali = arrotonda(rataMensile + altreRateMensili);
    const rapportoImpegniReddito =
      redditoNettoMensileFamiliare > 0
        ? impegniMensiliTotali / redditoNettoMensileFamiliare
        : null;
    const giudizio = costruisciGiudizioRata(rapportoImpegniReddito);

    sostenibilitaMensile = {
      redditoNettoMensile: redditoNettoMensileFamiliare,
      altreRateMensili,
      impegniMensiliTotali,
      rapportoImpegniReddito,
      giudizio,
    };

    const rataElevata = giudizio === "pesoElevato";
    if (rataElevata && (liquiditaInsufficiente || liquiditaQuasiAssorbita)) {
      scenario = "criticitaMultiple";
    } else if (liquiditaInsufficiente) {
      scenario = "liquiditaInsufficiente";
    } else if (rataElevata) {
      scenario = "rataElevata";
    } else if (
      giudizio === "generalmenteCompatibile" &&
      quotaLiquiditaResidua !== null &&
      quotaLiquiditaResidua > SOGLIA_LIQUIDITA_QUASI_ASSORBITA
    ) {
      scenario = "primeIndicazioniFavorevoli";
    } else {
      scenario = "ordinario";
    }
  } else {
    // Senza mutuo la rata è zero per definizione: un rapporto
    // impegni/reddito non avrebbe alcun significato, quindi non lo si
    // calcola affatto (né si chiede il reddito — vedi il wizard). Le
    // uniche criticità possibili restano quelle di liquidità.
    if (liquiditaInsufficiente) {
      scenario = "liquiditaInsufficiente";
    } else if (liquiditaQuasiAssorbita) {
      scenario = "liquiditaQuasiAssorbita";
    } else {
      scenario = "primeIndicazioniFavorevoli";
    }
  }

  return {
    mutuo: {
      importo: importoMutuo,
      percentuale: percentualeMutuo,
      durataAnni: mutuo ? durataMutuoAnni : null,
      tassoStimato: mutuo ? TASSO_MUTUO_STIMATO_DEFAULT : null,
      rataMensile: arrotonda(rataMensile),
    },
    sostenibilitaMensile,
    capitale: {
      anticipoPrezzo,
      ristrutturazione,
      costiAcquistoStimati,
      capitaleNecessario,
      liquiditaDisponibile,
      liquiditaResidua,
      gapLiquidita,
      quotaLiquiditaResidua,
    },
    ipotesi: {
      imposteAcquistoStimate: imposteAcquisto.totale,
      notaioStimato: notaio.totale,
      agenziaStimata: agenzia.totale,
      speseMutuoStimate: speseMutuo?.totale ?? 0,
      tassoMutuoStimato: mutuo ? TASSO_MUTUO_STIMATO_DEFAULT : null,
    },
    scenario,
  };
}

function costruisciGiudizioRata(
  rapporto: number | null
): GiudizioRata {
  if (rapporto === null || rapporto <= SOGLIE_RAPPORTO_RATE_REDDITO.generalmenteCompatibile) {
    return "generalmenteCompatibile";
  }
  if (rapporto <= SOGLIE_RAPPORTO_RATE_REDDITO.attenzione) {
    return "daValutareConAttenzione";
  }
  return "pesoElevato";
}

function limita(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
