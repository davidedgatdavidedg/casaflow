// lib/calcolo/simulazione.ts
//
// Il cuore del calcolo di CasaFlow, come funzione PURA — nessuno stato
// React, nessun useMemo: stessi input, stesso output, sempre. Estratta
// da calcolatore-quick-mode.tsx (dove viveva come un unico useMemo di
// quasi 400 righe) per due motivi:
// 1) è finalmente testabile in isolamento, come lib/calcolo/*.ts;
// 2) rende il componente più piccolo e più sicuro da modificare.
//
// Il componente React resta responsabile SOLO di: tenere lo stato,
// chiamare questa funzione dentro un useMemo (per non ricalcolare a
// ogni render), e mostrare il risultato.

import { calcolaPianoAmmortamento } from "./ammortamento";
import { calcolaImposteAcquisto } from "./imposteAcquisto";
import { calcolaSpeseAgenzia } from "./speseAgenzia";
import { calcolaSpeseMutuo } from "./speseMutuo";
import { calcolaCostiNotaio } from "./costiNotaio";
import { calcolaImu } from "./imu";
import {
  calcolaCedolareSecca,
  calcolaTassazioneOrdinaria,
  type RegimeFiscaleAffitto,
  type TipoCedolare,
} from "./tassazioneAffitti";
import { calcolaFlussiCassa, elencoTransazioni } from "./flussiCassa";
import { stimaRendimentoBtpNetto } from "./benchmarkBtp";
import { interpretaIrr, type InterpretazioneIrr } from "./interpretazioneIrr";
import { calcolaDetrazioneMediazione } from "./detrazioneMediazione";
import { calcolaDetrazioneInteressiMutuo } from "./detrazioneInteressiMutuo";
import { calcolaDetrazioneRistrutturazione } from "./detrazioneRistrutturazione";
import { calcolaDetrazioneMobili } from "./detrazioneMobili";
import { calcolaXIRR } from "./irr";
import { calcolaTari } from "./tari";
import { calcolaAddizionaliIrpef } from "./addizionaliIrpef";
import { calcolaUtenze } from "./utenze";
import { calcolaSpeseCondominio } from "./condominio";
import { calcolaManutenzione } from "./manutenzione";
import { calcolaAssicurazione } from "./assicurazione";
import { primoDelMeseSuccessivo } from "@/lib/date-utils";
import type { Immobile, Mutuo, TipoVenditore, UnitaCatastale } from "./tipi";
import type { UnitaForm } from "@/lib/tipi-form";

export interface ParametriSimulazione {
  unitaList: UnitaForm[];
  prezzoAcquisto: number;
  primaCasaRegistro: boolean;
  acquistoDa: TipoVenditore;
  importoMutuo: number;
  tassoMutuoPercentuale: number;
  durataMutuoAnni: number;
  dataAcquisto: string; // ISO
  speseIncassoPerRata: number;
  affittoLordoAnnuo: number;
  oneriAccessoriAnnui: number;
  renditaFigurativaAnnua: number;
  regimeFiscaleAffitto: RegimeFiscaleAffitto;
  tipoCedolare: TipoCedolare;
  aliquotaMarginaleIrpef: number;
  anniInvestimento: number;
  rivalutazioneAnnuaPercentuale: number;
  // Override "avanzati": stringa vuota = usa la stima automatica.
  onorarioNotaioPersonalizzato: string;
  agenziaPersonalizzata: string;
  visureNotaioPersonalizzate: string;
  tassaArchivioPersonalizzata: string;
  tariffaTariPersonalizzata: string;
  energiaElettricaPersonalizzata: string;
  gasPersonalizzato: string;
  internetPersonalizzato: string;
  condominioAnnuoPersonalizzato: string;
  manutenzioneOrdinariaPersonalizzata: string;
  manutenzioneStraordinariaPersonalizzata: string;
  assicurazionePersonalizzata: string;
  altriCostiAcquistoPersonalizzato: string;
  ristrutturazione: number;
  arredamento: number;
  tassoBenchmarkPersonalizzato: string;
}

export interface LevaSimulazione {
  nome: string;
  irrBasso: number | null;
  irrAlto: number | null;
  ampiezza: number;
}

/**
 * Esegue l'intera simulazione: imposte di acquisto, costi ricorrenti,
 * detrazioni, flussi di cassa, IRR, interpretazione, confronto con BTP
 * e leve principali. Stessi input, stesso output, sempre — nessuna
 * dipendenza da React.
 */
export function calcolaSimulazione(
  input: ParametriSimulazione,
  opzioni: { calcolaLeve?: boolean } = {}
) {
  const { calcolaLeve = true } = opzioni;
  const {
    unitaList,
    prezzoAcquisto,
    primaCasaRegistro,
    acquistoDa,
    importoMutuo,
    tassoMutuoPercentuale,
    durataMutuoAnni,
    dataAcquisto,
    speseIncassoPerRata,
    affittoLordoAnnuo,
    oneriAccessoriAnnui,
    renditaFigurativaAnnua,
    regimeFiscaleAffitto,
    tipoCedolare,
    aliquotaMarginaleIrpef,
    anniInvestimento,
    rivalutazioneAnnuaPercentuale,
    onorarioNotaioPersonalizzato,
    agenziaPersonalizzata,
    visureNotaioPersonalizzate,
    tassaArchivioPersonalizzata,
    tariffaTariPersonalizzata,
    energiaElettricaPersonalizzata,
    gasPersonalizzato,
    internetPersonalizzato,
    condominioAnnuoPersonalizzato,
    manutenzioneOrdinariaPersonalizzata,
    manutenzioneStraordinariaPersonalizzata,
    assicurazionePersonalizzata,
    altriCostiAcquistoPersonalizzato,
    ristrutturazione,
    arredamento,
    tassoBenchmarkPersonalizzato,
  } = input;

  const mutuoRichiesto = importoMutuo > 0;

  const etichettaRegimeAffitto =
    regimeFiscaleAffitto === "cedolareSecca"
      ? `Cedolare secca ${tipoCedolare === "concordato" ? "10%" : "21%"}`
      : `Ordinaria, aliquota marginale ${(aliquotaMarginaleIrpef * 100).toFixed(0)}%`;

  const imu = unitaList.reduce(
    (somma, u) =>
      somma +
      calcolaImu(
        u.renditaCatastale,
        u.categoriaCatastale,
        u.statoAbitativoImu,
        u.comune,
        u.aliquotaImuPersonalizzata
          ? parseFloat(u.aliquotaImuPersonalizzata) / 100
          : undefined
      ),
    0
  );

  // Usato come proxy del "comune di domicilio fiscale" per le
  // addizionali IRPEF — non abbiamo un campo separato per la residenza
  // del proprietario, quindi usiamo il comune della prima unità.
  const comuneUnitaPrincipale = unitaList[0]?.comune ?? "";

  // Condiziona le detrazioni su mediazione e interessi mutuo: spettano
  // solo se l'immobile è (almeno in parte) abitazione principale, non
  // per un acquisto puramente ad uso investimento/affitto.
  const immobileAbitazionePrincipale = unitaList.some(
    (u) => u.statoAbitativoImu === "abitazionePrincipale"
  );

  // La decorrenza del mutuo è sempre derivata dalla data di acquisto
  // (1° del mese successivo), mai un campo separato da compilare.
  const decorrenzaMutuoCalcolata = primoDelMeseSuccessivo(new Date(dataAcquisto));

  let rataMensile = 0;
  let rataAnnua = 0;
  let capitaleAnno1 = 0;
  let interessiAnno1 = 0;
  if (mutuoRichiesto) {
    const mutuo: Mutuo = {
      importo: importoMutuo,
      tasso: tassoMutuoPercentuale / 100,
      durataAnni: Math.max(durataMutuoAnni, 1),
      dataDecorrenza: decorrenzaMutuoCalcolata,
      speseIncassoPerRata,
    };
    const piano = calcolaPianoAmmortamento(mutuo);
    rataMensile = piano[0]?.rataTotale ?? 0;
    const rateAnno1 = piano.slice(0, 12);
    rataAnnua = rateAnno1.reduce((somma, rata) => somma + rata.rataTotale, 0);
    capitaleAnno1 = rateAnno1.reduce((s, r) => s + r.quotaCapitale, 0);
    interessiAnno1 = rateAnno1.reduce((s, r) => s + r.quotaInteressi, 0);
  }

  const tassazioneAffitto =
    regimeFiscaleAffitto === "cedolareSecca"
      ? calcolaCedolareSecca(affittoLordoAnnuo, tipoCedolare)
      : calcolaTassazioneOrdinaria(affittoLordoAnnuo, aliquotaMarginaleIrpef);

  // Le addizionali IRPEF si applicano solo in regime ordinario: la
  // cedolare secca le sostituisce per legge.
  const addizionali =
    regimeFiscaleAffitto === "ordinaria"
      ? calcolaAddizionaliIrpef(tassazioneAffitto.imponibile, comuneUnitaPrincipale)
      : null;

  const metriQuadriTotali = unitaList.reduce(
    (somma, u) => somma + (u.metriQuadri || 0),
    0
  );

  const tariffaTariCustom = tariffaTariPersonalizzata
    ? parseFloat(tariffaTariPersonalizzata)
    : undefined;
  const tari = calcolaTari(metriQuadriTotali, tariffaTariCustom);

  const energiaElettricaCustom = energiaElettricaPersonalizzata
    ? parseFloat(energiaElettricaPersonalizzata)
    : undefined;
  const gasCustom = gasPersonalizzato ? parseFloat(gasPersonalizzato) : undefined;
  const internetCustom = internetPersonalizzato
    ? parseFloat(internetPersonalizzato)
    : undefined;
  const utenze = calcolaUtenze(
    metriQuadriTotali,
    energiaElettricaCustom,
    gasCustom,
    internetCustom
  );

  const costoCondominioCustom = condominioAnnuoPersonalizzato
    ? parseFloat(condominioAnnuoPersonalizzato)
    : undefined;
  const condominio = calcolaSpeseCondominio(metriQuadriTotali, costoCondominioCustom);

  const percentualeManutenzioneOrdinariaCustom = manutenzioneOrdinariaPersonalizzata
    ? parseFloat(manutenzioneOrdinariaPersonalizzata) / 100
    : undefined;
  const percentualeManutenzioneStraordinariaCustom = manutenzioneStraordinariaPersonalizzata
    ? parseFloat(manutenzioneStraordinariaPersonalizzata) / 100
    : undefined;
  const manutenzione = calcolaManutenzione(
    prezzoAcquisto,
    percentualeManutenzioneOrdinariaCustom,
    percentualeManutenzioneStraordinariaCustom
  );

  const assicurazioneCustom = assicurazionePersonalizzata
    ? parseFloat(assicurazionePersonalizzata)
    : undefined;
  const assicurazione = calcolaAssicurazione(metriQuadriTotali, assicurazioneCustom);

  const unitaComplete: UnitaCatastale[] = unitaList.map((u) => ({
    etichetta: u.etichetta || undefined,
    comune: u.comune,
    categoriaCatastale: u.categoriaCatastale,
    renditaCatastale: u.renditaCatastale,
    statoAbitativoImu: u.statoAbitativoImu,
  }));

  const immobile: Immobile = {
    prezzoAcquisto,
    primaCasa: primaCasaRegistro,
    affittoLordoAnnuo,
    acquistoDa,
    unita: unitaComplete,
  };
  const imposteAcquisto = calcolaImposteAcquisto(immobile);
  const agenziaCustom = agenziaPersonalizzata
    ? parseFloat(agenziaPersonalizzata)
    : undefined;
  const agenzia = calcolaSpeseAgenzia(prezzoAcquisto, agenziaCustom);
  const speseMutuo = mutuoRichiesto
    ? calcolaSpeseMutuo(importoMutuo, primaCasaRegistro)
    : null;

  const onorarioNotaioCustom = onorarioNotaioPersonalizzato
    ? parseFloat(onorarioNotaioPersonalizzato)
    : undefined;
  const visureCustom = visureNotaioPersonalizzate
    ? parseFloat(visureNotaioPersonalizzate)
    : undefined;
  const tassaArchivioCustom = tassaArchivioPersonalizzata
    ? parseFloat(tassaArchivioPersonalizzata)
    : undefined;
  const notaio = calcolaCostiNotaio(
    prezzoAcquisto,
    onorarioNotaioCustom,
    visureCustom,
    tassaArchivioCustom
  );

  const altriCostiAcquisto = altriCostiAcquistoPersonalizzato
    ? parseFloat(altriCostiAcquistoPersonalizzato)
    : 0;

  const detrazioneMediazione = calcolaDetrazioneMediazione(
    agenzia.totale,
    immobileAbitazionePrincipale
  );
  const detrazioneInteressiAnno1 = calcolaDetrazioneInteressiMutuo(
    interessiAnno1,
    immobileAbitazionePrincipale
  );
  const detrazioneRistrutturazione = calcolaDetrazioneRistrutturazione(
    ristrutturazione,
    immobileAbitazionePrincipale
  );
  const detrazioneMobili = calcolaDetrazioneMobili(arredamento, ristrutturazione > 0);

  const totaleCostiUnaTantum =
    imposteAcquisto.totale +
    agenzia.totale +
    (speseMutuo?.totale ?? 0) +
    notaio.totale +
    altriCostiAcquisto +
    ristrutturazione +
    arredamento -
    detrazioneMediazione.importo;

  const totaleCostiRicorrenti =
    imu +
    tari.totale +
    (addizionali?.importo ?? 0) +
    utenze.totale +
    condominio.totale +
    manutenzione.totale +
    assicurazione.totale;

  const flussoNettoAnno1 =
    tassazioneAffitto.affittoNetto - rataAnnua - totaleCostiRicorrenti;

  const valoreStimatoRivendita =
    prezzoAcquisto *
    Math.pow(1 + rivalutazioneAnnuaPercentuale / 100, anniInvestimento);

  const rivalutazioneCapitaleTotale = valoreStimatoRivendita - prezzoAcquisto;
  const rivalutazioneCapitalePercentuale =
    prezzoAcquisto > 0 ? (rivalutazioneCapitaleTotale / prezzoAcquisto) * 100 : 0;

  const mutuoPerFlussi: Mutuo | null = mutuoRichiesto
    ? {
        importo: importoMutuo,
        tasso: tassoMutuoPercentuale / 100,
        durataAnni: Math.max(durataMutuoAnni, 1),
        dataDecorrenza: decorrenzaMutuoCalcolata,
        speseIncassoPerRata,
      }
    : null;

  const parametriBaseFlussiCassa = {
    dataAcquisto: new Date(dataAcquisto),
    prezzoAcquisto,
    registro: imposteAcquisto.registro,
    ipotecaria: imposteAcquisto.ipotecaria,
    catastale: imposteAcquisto.catastale,
    notaioOnorario: notaio.onorario,
    notaioVisure: notaio.visure,
    notaioTassaArchivio: notaio.tassaArchivio,
    agenziaTotale: agenzia.totale,
    mutuo: mutuoPerFlussi,
    speseMutuoIstruttoria: speseMutuo?.istruttoria ?? 0,
    speseMutuoImpostaSostitutiva: speseMutuo?.impostaSostitutiva ?? 0,
    affittoLordoAnnuo,
    oneriAccessoriAnnui,
    renditaFigurativaAnnua,
    tassazioneAffittoImporto: tassazioneAffitto.imposta,
    tassazioneAffittoEtichetta: etichettaRegimeAffitto,
    imuAnnua: imu,
    tariAnnua: tari.totale,
    addizionaliAnnue: addizionali?.importo ?? 0,
    energiaElettricaAnnua: utenze.energiaElettrica.totale,
    gasAnnuo: utenze.gas.totale,
    internetAnnuo: utenze.internet.totale,
    condominioAnnuo: condominio.totale,
    manutenzioneOrdinariaAnnua: manutenzione.ordinaria,
    manutenzioneStraordinariaAnnua: manutenzione.straordinaria,
    assicurazioneAnnua: assicurazione.totale,
    altriCostiAcquisto,
    ristrutturazione,
    arredamento,
    immobileAbitazionePrincipale,
    anniInvestimento: Math.max(anniInvestimento, 1),
    prezzoRivenditaStimato: valoreStimatoRivendita,
  };
  const flussiCassa = calcolaFlussiCassa(parametriBaseFlussiCassa);
  const irr = calcolaXIRR(elencoTransazioni(flussiCassa));

  // ─── Interpretazione in linguaggio semplice ───────────────────────
  const interpretazioneRisultato: InterpretazioneIrr = interpretaIrr(irr);

  // ─── Confronto con BTP (costo opportunità) ────────────────────────
  const benchmarkBtp = stimaRendimentoBtpNetto(Math.max(anniInvestimento, 1));
  const tassoBenchmarkCustom = tassoBenchmarkPersonalizzato
    ? parseFloat(tassoBenchmarkPersonalizzato) / 100
    : undefined;
  const tassoBenchmarkEffettivo = tassoBenchmarkCustom ?? benchmarkBtp.rendimentoNetto;

  // ─── Leve principali (sensitivity semplificata) ───────────────────
  // Perturba una variabile alla volta e osserva l'ampiezza di
  // oscillazione dell'IRR. Semplificazione dichiarata: le imposte di
  // acquisto proporzionali al prezzo (registro/notaio/agenzia) NON
  // vengono ricalcolate quando si perturba il prezzo — resterebbero
  // invariate anche in una compravendita reale a prezzo diverso, cosa
  // non esatta, ma sufficiente per una prima classifica di impatto.
  function irrConVariante(
    overrides: Partial<typeof parametriBaseFlussiCassa>
  ): number | null {
    const varianteFlussi = calcolaFlussiCassa({
      ...parametriBaseFlussiCassa,
      ...overrides,
    });
    return calcolaXIRR(elencoTransazioni(varianteFlussi));
  }

  const leve: { nome: string; irrBasso: number | null; irrAlto: number | null }[] = [];

  if (calcolaLeve) {
  if (prezzoAcquisto > 0) {
    const fattoreRivendita =
      prezzoAcquisto > 0 ? valoreStimatoRivendita / prezzoAcquisto : 1;
    leve.push({
      nome: "Prezzo di acquisto (±10%)",
      irrBasso: irrConVariante({
        prezzoAcquisto: prezzoAcquisto * 0.9,
        prezzoRivenditaStimato: prezzoAcquisto * 0.9 * fattoreRivendita,
      }),
      irrAlto: irrConVariante({
        prezzoAcquisto: prezzoAcquisto * 1.1,
        prezzoRivenditaStimato: prezzoAcquisto * 1.1 * fattoreRivendita,
      }),
    });
  }

  if (affittoLordoAnnuo > 0) {
    leve.push({
      nome: "Canone di affitto (±10%)",
      irrBasso: irrConVariante({
        affittoLordoAnnuo: affittoLordoAnnuo * 0.9,
        tassazioneAffittoImporto: tassazioneAffitto.imposta * 0.9,
        addizionaliAnnue: (addizionali?.importo ?? 0) * 0.9,
      }),
      irrAlto: irrConVariante({
        affittoLordoAnnuo: affittoLordoAnnuo * 1.1,
        tassazioneAffittoImporto: tassazioneAffitto.imposta * 1.1,
        addizionaliAnnue: (addizionali?.importo ?? 0) * 1.1,
      }),
    });
  }

  if (ristrutturazione > 0) {
    leve.push({
      nome: "Costo ristrutturazione (±20%)",
      irrBasso: irrConVariante({ ristrutturazione: ristrutturazione * 0.8 }),
      irrAlto: irrConVariante({ ristrutturazione: ristrutturazione * 1.2 }),
    });
  }

  if (mutuoRichiesto && mutuoPerFlussi) {
    // mutuoPerFlussi.tasso è sempre un numero semplice qui (lo abbiamo
    // costruito noi stessi sopra come tassoMutuoPercentuale / 100) — il
    // tipo Mutuo.tasso supporta ANCHE un tasso variabile a periodi
    // (number | PeriodoTasso[]), non ancora sfruttato da questo form,
    // quindi serve un'asserzione esplicita per l'operazione aritmetica.
    const tassoAttuale = mutuoPerFlussi.tasso as number;
    leve.push({
      nome: "Tasso mutuo (±0,5 punti)",
      irrBasso: irrConVariante({
        mutuo: { ...mutuoPerFlussi, tasso: Math.max(tassoAttuale - 0.005, 0.0001) },
      }),
      irrAlto: irrConVariante({
        mutuo: { ...mutuoPerFlussi, tasso: tassoAttuale + 0.005 },
      }),
    });
  }

  if (prezzoAcquisto > 0) {
    const rivalutazioneBassa = Math.max(rivalutazioneAnnuaPercentuale - 0.5, -50) / 100;
    const rivalutazioneAlta = (rivalutazioneAnnuaPercentuale + 0.5) / 100;
    const anniPerRivendita = Math.max(anniInvestimento, 1);
    leve.push({
      nome: "Rivalutazione annua immobile (±0,5 punti)",
      irrBasso: irrConVariante({
        prezzoRivenditaStimato:
          prezzoAcquisto * Math.pow(1 + rivalutazioneBassa, anniPerRivendita),
      }),
      irrAlto: irrConVariante({
        prezzoRivenditaStimato:
          prezzoAcquisto * Math.pow(1 + rivalutazioneAlta, anniPerRivendita),
      }),
    });
  }
  } // fine if (calcolaLeve)

  const leveOrdinate: LevaSimulazione[] = leve
    .map((l) => ({
      ...l,
      ampiezza:
        l.irrBasso !== null && l.irrAlto !== null
          ? Math.abs(l.irrAlto - l.irrBasso)
          : 0,
    }))
    .sort((a, b) => b.ampiezza - a.ampiezza);

  return {
    imu,
    rataMensile,
    rataAnnua,
    capitaleAnno1,
    interessiAnno1,
    tassazioneAffitto,
    addizionali,
    tari,
    utenze,
    condominio,
    manutenzione,
    assicurazione,
    altriCostiAcquisto,
    totaleCostiRicorrenti,
    imposteAcquisto,
    agenzia,
    speseMutuo,
    notaio,
    totaleCostiUnaTantum,
    immobileAbitazionePrincipale,
    detrazioneMediazione,
    detrazioneInteressiAnno1,
    detrazioneRistrutturazione,
    detrazioneMobili,
    flussoNettoAnno1,
    valoreStimatoRivendita,
    rivalutazioneCapitaleTotale,
    rivalutazioneCapitalePercentuale,
    flussiCassa,
    irr,
    interpretazioneRisultato,
    benchmarkBtp,
    tassoBenchmarkEffettivo,
    leveOrdinate,
  };
}

export type RisultatiSimulazione = ReturnType<typeof calcolaSimulazione>;
