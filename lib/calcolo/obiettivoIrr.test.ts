// lib/calcolo/obiettivoIrr.test.ts
import { describe, it, expect } from "vitest";
import { trovaValorePerTargetIrr } from "./obiettivoIrr";
import { calcolaSimulazione, type ParametriSimulazione } from "./simulazione";

const base: ParametriSimulazione = {
  unitaList: [
    {
      id: "1",
      etichetta: "",
      comune: "Milano",
      categoriaCatastale: "A/2",
      renditaCatastale: 540,
      statoAbitativoImu: "affittata",
      metriQuadri: 60,
      aliquotaImuPersonalizzata: "",
      foglio: "",
      particella: "",
      subalterno: "",
    },
  ],
  prezzoAcquisto: 200000,
  primaCasaRegistro: false,
  acquistoDa: "privato",
  importoMutuo: 0,
  tassoMutuoPercentuale: 0,
  durataMutuoAnni: 0,
  dataAcquisto: "2024-01-01",
  speseIncassoPerRata: 0,
  affittoLordoAnnuo: 9600,
  oneriAccessoriAnnui: 0,
  renditaFigurativaAnnua: 0,
  regimeFiscaleAffitto: "cedolareSecca",
  tipoCedolare: "standard",
  aliquotaMarginaleIrpef: 0.23,
  anniInvestimento: 5,
  rivalutazioneAnnuaPercentuale: 2,
  onorarioNotaioPersonalizzato: "",
  agenziaPersonalizzata: "",
  visureNotaioPersonalizzate: "",
  tassaArchivioPersonalizzata: "",
  tariffaTariPersonalizzata: "",
  energiaElettricaPersonalizzata: "",
  gasPersonalizzato: "",
  internetPersonalizzato: "",
  condominioAnnuoPersonalizzato: "",
  manutenzioneOrdinariaPersonalizzata: "",
  manutenzioneStraordinariaPersonalizzata: "",
  assicurazionePersonalizzata: "",
  altriCostiAcquistoPersonalizzato: "",
  ristrutturazione: 0,
  arredamento: 0,
  tassoBenchmarkPersonalizzato: "",
};

function irrA(parametri: ParametriSimulazione): number | null {
  return calcolaSimulazione(parametri, { calcolaLeve: false }).irr;
}

describe("trovaValorePerTargetIrr — leva prezzoAcquisto", () => {
  it("trova un prezzo PIÙ ALTO per un target PIÙ BASSO dell'IRR attuale (relazione inversa)", () => {
    const irrAttuale = irrA(base);
    expect(irrAttuale).not.toBeNull();

    const target = irrAttuale! - 0.007; // un target sotto l'attuale
    const risultato = trovaValorePerTargetIrr(base, "prezzoAcquisto", target);

    expect(risultato.trovato).toBe(true);
    expect(risultato.valoreTrovato).toBeGreaterThan(base.prezzoAcquisto);

    // Verifica di round-trip: il valore trovato deve riprodurre il target.
    const irrVerificato = irrA({ ...base, prezzoAcquisto: risultato.valoreTrovato! });
    expect(irrVerificato).toBeCloseTo(target, 3);
  });

  it("non restituisce soluzioni economicamente insensate vicino agli estremi del dominio (regressione)", () => {
    // Caso che in una versione precedente produceva un falso positivo:
    // un prezzo vicinissimo a zero, con un IRR "trovato" di centinaia
    // di punti percentuale, per un target moderato più basso
    // dell'attuale.
    const risultato = trovaValorePerTargetIrr(base, "prezzoAcquisto", 0.01);
    expect(risultato.trovato).toBe(true);
    // Il valore deve restare un prezzo plausibile, non un artefatto
    // vicino al minimo assoluto dell'intervallo di ricerca.
    expect(risultato.valoreTrovato).toBeGreaterThan(50000);

    const irrVerificato = irrA({ ...base, prezzoAcquisto: risultato.valoreTrovato! });
    expect(irrVerificato).toBeCloseTo(0.01, 2);
  });

  it("dichiara 'non trovato' per un target genuinamente irraggiungibile (1000%)", () => {
    const risultato = trovaValorePerTargetIrr(base, "prezzoAcquisto", 10.0);
    expect(risultato.trovato).toBe(false);
    expect(risultato.valoreTrovato).toBeNull();
  });
});

describe("trovaValorePerTargetIrr — altre leve", () => {
  it("leva 'affittoLordoAnnuo': trova un canone più alto per un target più alto", () => {
    const irrAttuale = irrA(base);
    const target = irrAttuale! + 0.013;
    const risultato = trovaValorePerTargetIrr(base, "affittoLordoAnnuo", target);

    expect(risultato.trovato).toBe(true);
    expect(risultato.valoreTrovato).toBeGreaterThan(base.affittoLordoAnnuo);

    const irrVerificato = irrA({ ...base, affittoLordoAnnuo: risultato.valoreTrovato! });
    expect(irrVerificato).toBeCloseTo(target, 3);
  });

  it("leva 'rivalutazioneAnnuaPercentuale': trova un valore che riproduce il target", () => {
    const irrAttuale = irrA(base);
    const target = irrAttuale! + 0.008;
    const risultato = trovaValorePerTargetIrr(
      base,
      "rivalutazioneAnnuaPercentuale",
      target
    );

    expect(risultato.trovato).toBe(true);
    expect(risultato.valoreTrovato).toBeGreaterThan(base.rivalutazioneAnnuaPercentuale);

    const irrVerificato = irrA({
      ...base,
      rivalutazioneAnnuaPercentuale: risultato.valoreTrovato!,
    });
    expect(irrVerificato).toBeCloseTo(target, 3);
  });

  it("leva 'ristrutturazione': si può risolvere all'indietro anche partendo da zero", () => {
    // Domanda reale: "quanto potrei spendere al massimo in
    // ristrutturazione restando sopra un certo rendimento?" — ha senso
    // anche se oggi il campo è a 0€.
    const irrAttuale = irrA(base);
    const target = irrAttuale! - 0.007;
    const risultato = trovaValorePerTargetIrr(base, "ristrutturazione", target);

    expect(risultato.trovato).toBe(true);
    expect(risultato.valoreAttuale).toBe(0);
    expect(risultato.valoreTrovato).toBeGreaterThan(0);
  });

  it("leva 'tassoMutuoPercentuale': trova un tasso che riproduce il target, con un mutuo attivo", () => {
    const baseConMutuo: ParametriSimulazione = {
      ...base,
      importoMutuo: 140000,
      tassoMutuoPercentuale: 3.5,
      durataMutuoAnni: 20,
    };
    const irrAttuale = irrA(baseConMutuo);
    const target = irrAttuale! - 0.003;
    const risultato = trovaValorePerTargetIrr(baseConMutuo, "tassoMutuoPercentuale", target);

    expect(risultato.trovato).toBe(true);
    // Un IRR più basso richiede un tasso mutuo più ALTO (più oneroso).
    expect(risultato.valoreTrovato).toBeGreaterThan(baseConMutuo.tassoMutuoPercentuale);

    const irrVerificato = irrA({
      ...baseConMutuo,
      tassoMutuoPercentuale: risultato.valoreTrovato!,
    });
    expect(irrVerificato).toBeCloseTo(target, 3);
  });
});

describe("trovaValorePerTargetIrr — riporta sempre irrAttuale e valoreAttuale", () => {
  it("include il valore e l'IRR di partenza nel risultato, trovato o no", () => {
    const risultatoTrovato = trovaValorePerTargetIrr(base, "prezzoAcquisto", 0.01);
    expect(risultatoTrovato.valoreAttuale).toBe(base.prezzoAcquisto);
    expect(risultatoTrovato.irrAttuale).toBeCloseTo(irrA(base)!, 6);

    const risultatoNonTrovato = trovaValorePerTargetIrr(base, "prezzoAcquisto", 10.0);
    expect(risultatoNonTrovato.valoreAttuale).toBe(base.prezzoAcquisto);
    expect(risultatoNonTrovato.irrAttuale).toBeCloseTo(irrA(base)!, 6);
  });
});
