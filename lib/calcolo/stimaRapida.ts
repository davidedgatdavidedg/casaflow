// lib/calcolo/stimaRapida.ts
//
// Prima stima per il percorso guidato "investimento". Il modulo riusa
// il motore di calcolo reale e completa i dati non ancora chiesti
// all'utente con ipotesi trasparenti, restituite insieme al risultato.

import { calcolaImposteAcquisto } from "./imposteAcquisto";
import { calcolaImu } from "./imu";
import { calcolaCostiNotaio } from "./costiNotaio";
import { calcolaSpeseAgenzia } from "./speseAgenzia";
import { calcolaSpeseMutuo } from "./speseMutuo";
import { calcolaManutenzione } from "./manutenzione";
import { calcolaCedolareSecca } from "./tassazioneAffitti";
import { calcolaFlussiCassa, elencoTransazioni } from "./flussiCassa";
import { calcolaXIRR } from "./irr";
import { stimaRendimentoBtpNetto, type BenchmarkBtp } from "./benchmarkBtp";
import { primoDelMeseSuccessivo } from "@/lib/date-utils";
import { PERCENTUALE_RIVALUTAZIONE_DEFAULT } from "./tipi";
import type { Immobile, Mutuo } from "./tipi";
import {
  calcolaPrezzoVenditaStimato,
  COEFFICIENTE_VALORIZZAZIONE_RISTRUTTURAZIONE_DEFAULT,
} from "./valorizzazioneRistrutturazione";

/** Tasso fisso usato nella prima stima. Per ora è un default del
 * modello: viene sempre dichiarato all'utente e potrà essere sostituito
 * con il tasso reale nell'analisi approfondita. */
export const TASSO_MUTUO_STIMATO_DEFAULT = 0.035;

export interface ParametriStimaRapida {
  prezzoAcquisto: number;
  /** 0 se nessuna ristrutturazione prevista. */
  ristrutturazione: number;
  affittoLordoMensile: number;
  finanziamentoRichiesto: boolean;
  /** 0-100. Ignorata se finanziamentoRichiesto è false. */
  percentualeFinanziata: number;
  anniInvestimento: number;
}

export interface IpotesiStimaRapida {
  impostaAcquistoStimata: number;
  notaioStimato: number;
  agenziaStimata: number;
  manutenzioneStimataAnnua: number;
  rivalutazioneAnnua: number;
  /** Frazione (0.75 = 75%) di quanto della spesa di ristrutturazione si
   * riflette sul prezzo di vendita stimato — rilevante solo se
   * l'utente ha dichiarato una ristrutturazione, ma sempre presente
   * (è una costante, non dipende dalle risposte). */
  coefficienteValorizzazioneRistrutturazione: number;
  /** null se nessun mutuo richiesto. */
  tassoMutuoStimato: number | null;
  /** null se nessun mutuo richiesto. Nella prima stima coincide con
   * l'orizzonte dell'investimento, per scelta di semplicità. */
  durataMutuoAnni: number | null;
}

export interface GiudizioStimaRapida {
  etichetta: "Prime indicazioni poco favorevoli" | "Margine da valutare";
  descrizione: string;
}

export interface RisultatoStimaRapida {
  irr: number | null;
  benchmarkBtp: BenchmarkBtp;
  differenzialeBtp: number | null;
  giudizio: GiudizioStimaRapida;
  ipotesi: IpotesiStimaRapida;
}

/**
 * Il confronto con il BTP è un riferimento di costo-opportunità, non
 * una soglia che pretende di stabilire quale premio al rischio sia
 * "corretto" per l'immobiliare. Per questo la prima stima usa solo due
 * letture prudenti: sotto/al benchmark oppure sopra al benchmark.
 */
function costruisciGiudizio(differenzialeBtp: number | null): GiudizioStimaRapida {
  if (differenzialeBtp === null || differenzialeBtp <= 0) {
    return {
      etichetta: "Prime indicazioni poco favorevoli",
      descrizione:
        "Con le ipotesi utilizzate, il rendimento stimato non supera quello del BTP di riferimento. Prima di scartare l'investimento, verifichiamo le ipotesi che possono incidere maggiormente sul risultato.",
    };
  }

  return {
    etichetta: "Margine da valutare",
    descrizione:
      "Il rendimento stimato supera quello del BTP di riferimento. Il margine aggiuntivo deve però compensare la minore liquidità, i rischi specifici e l'impegno richiesto dall'investimento immobiliare. Approfondiamo l'analisi.",
  };
}

export function calcolaStimaRapida(
  parametri: ParametriStimaRapida
): RisultatoStimaRapida {
  const {
    prezzoAcquisto,
    ristrutturazione,
    affittoLordoMensile,
    finanziamentoRichiesto,
    percentualeFinanziata,
    anniInvestimento,
  } = parametri;

  const dataAcquisto = new Date();
  const affittoLordoAnnuo = affittoLordoMensile * 12;
  const anni = Math.max(anniInvestimento, 1);

  const immobileSintetico: Immobile = {
    prezzoAcquisto,
    primaCasa: false,
    acquistoDa: "privato",
    affittoLordoAnnuo,
    unita: [
      {
        comune: "",
        categoriaCatastale: "A/2",
        renditaCatastale: 0,
        statoAbitativoImu: "affittata",
      },
    ],
  };

  const imposteAcquisto = calcolaImposteAcquisto(immobileSintetico);
  const imu = calcolaImu(0, "A/2", "affittata", "");
  const notaio = calcolaCostiNotaio(prezzoAcquisto);
  const agenzia = calcolaSpeseAgenzia(prezzoAcquisto);
  const manutenzione = calcolaManutenzione(prezzoAcquisto);

  const importoMutuo = finanziamentoRichiesto
    ? arrotonda(prezzoAcquisto * (percentualeFinanziata / 100))
    : 0;

  const mutuo: Mutuo | null =
    importoMutuo > 0
      ? {
          importo: importoMutuo,
          tasso: TASSO_MUTUO_STIMATO_DEFAULT,
          durataAnni: anni,
          dataDecorrenza: primoDelMeseSuccessivo(dataAcquisto),
        }
      : null;

  const speseMutuo = importoMutuo > 0 ? calcolaSpeseMutuo(importoMutuo, false) : null;
  const tassazioneAffitto = calcolaCedolareSecca(affittoLordoAnnuo, "standard");

  const { prezzoVenditaStimato: valoreStimatoRivendita } = calcolaPrezzoVenditaStimato(
    prezzoAcquisto,
    ristrutturazione,
    COEFFICIENTE_VALORIZZAZIONE_RISTRUTTURAZIONE_DEFAULT,
    PERCENTUALE_RIVALUTAZIONE_DEFAULT,
    anni
  );

  const flussi = calcolaFlussiCassa({
    dataAcquisto,
    prezzoAcquisto,
    registro: imposteAcquisto.registro,
    ipotecaria: imposteAcquisto.ipotecaria,
    catastale: imposteAcquisto.catastale,
    notaioOnorario: notaio.onorario,
    notaioVisure: notaio.visure,
    notaioTassaArchivio: notaio.tassaArchivio,
    agenziaTotale: agenzia.totale,
    mutuo,
    speseMutuoIstruttoria: speseMutuo?.istruttoria ?? 0,
    speseMutuoImpostaSostitutiva: speseMutuo?.impostaSostitutiva ?? 0,
    affittoLordoAnnuo,
    tassazioneAffittoImporto: tassazioneAffitto.imposta,
    tassazioneAffittoEtichetta: "Cedolare secca 21% (stimata)",
    imuAnnua: imu,
    manutenzioneOrdinariaAnnua: manutenzione.ordinaria,
    manutenzioneStraordinariaAnnua: manutenzione.straordinaria,
    ristrutturazione,
    anniInvestimento: anni,
    prezzoRivenditaStimato: valoreStimatoRivendita,
  });

  const irr = calcolaXIRR(elencoTransazioni(flussi));
  const benchmarkBtp = stimaRendimentoBtpNetto(anni);
  const differenzialeBtp = irr !== null ? irr - benchmarkBtp.rendimentoNetto : null;

  return {
    irr,
    benchmarkBtp,
    differenzialeBtp,
    giudizio: costruisciGiudizio(differenzialeBtp),
    ipotesi: {
      impostaAcquistoStimata: imposteAcquisto.totale,
      notaioStimato: notaio.totale,
      agenziaStimata: agenzia.totale,
      manutenzioneStimataAnnua: manutenzione.totale,
      rivalutazioneAnnua: PERCENTUALE_RIVALUTAZIONE_DEFAULT,
      coefficienteValorizzazioneRistrutturazione:
        COEFFICIENTE_VALORIZZAZIONE_RISTRUTTURAZIONE_DEFAULT,
      tassoMutuoStimato: mutuo ? TASSO_MUTUO_STIMATO_DEFAULT : null,
      durataMutuoAnni: mutuo ? anni : null,
    },
  };
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
