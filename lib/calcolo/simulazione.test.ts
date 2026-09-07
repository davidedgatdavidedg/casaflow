// lib/calcolo/simulazione.test.ts
import { describe, it, expect } from "vitest";
import { calcolaSimulazione, type ParametriSimulazione } from "./simulazione";

const baseSenzaMutuo: ParametriSimulazione = {
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

describe("calcolaSimulazione — caso base senza mutuo", () => {
  const r = calcolaSimulazione(baseSenzaMutuo);

  it("calcola l'IMU corretta per l'unità (Milano, A/2, rendita 540, affittata)", () => {
    expect(r.imu).toBeCloseTo(1034.21, 1);
  });

  it("calcola le imposte di acquisto e i costi una tantum", () => {
    expect(r.imposteAcquisto.totale).toBeCloseTo(6223.6, 1);
    expect(r.agenzia.totale).toBeCloseTo(7320, 1);
    expect(r.notaio.totale).toBeCloseTo(4185, 1);
    expect(r.totaleCostiUnaTantum).toBeCloseTo(17728.6, 1);
  });

  it("calcola la tassazione affitto con cedolare secca 21%", () => {
    expect(r.tassazioneAffitto.imposta).toBeCloseTo(2016, 1); // 9600 * 21%
    expect(r.tassazioneAffitto.affittoNetto).toBeCloseTo(7584, 1);
  });

  it("nessun costo di mutuo quando non richiesto", () => {
    expect(r.speseMutuo).toBeNull();
    expect(r.rataMensile).toBe(0);
    expect(r.rataAnnua).toBe(0);
    expect(r.capitaleAnno1).toBe(0);
    expect(r.interessiAnno1).toBe(0);
  });

  it("calcola la rivalutazione capitalizzata sull'intero orizzonte", () => {
    // 200000 * 1.02^5
    expect(r.valoreStimatoRivendita).toBeCloseTo(220816.16, 1);
    expect(r.rivalutazioneCapitaleTotale).toBeCloseTo(20816.16, 1);
  });

  it("calcola un IRR coerente e la sua interpretazione", () => {
    expect(r.irr).not.toBeNull();
    expect(r.irr).toBeCloseTo(0.0172, 3);
    expect(r.interpretazioneRisultato.fascia).toBe("basso");
  });

  it("calcola il confronto con il benchmark BTP", () => {
    expect(r.benchmarkBtp.scadenzaRiferimento).toBe(5);
    expect(r.tassoBenchmarkEffettivo).toBeCloseTo(0.029, 4);
  });

  it("produce le leve applicabili (no mutuo, no ristrutturazione: 3 leve)", () => {
    expect(r.leveOrdinate).toHaveLength(3);
    const nomi = r.leveOrdinate.map((l) => l.nome);
    expect(nomi.some((n) => n.includes("Prezzo di acquisto"))).toBe(true);
    expect(nomi.some((n) => n.includes("Canone di affitto"))).toBe(true);
    expect(nomi.some((n) => n.includes("Rivalutazione"))).toBe(true);
    expect(nomi.some((n) => n.includes("Tasso mutuo"))).toBe(false);
    expect(nomi.some((n) => n.includes("ristrutturazione"))).toBe(false);
  });
});

describe("calcolaSimulazione — opzione calcolaLeve: false", () => {
  it("salta il calcolo delle leve ma restituisce lo stesso IRR", () => {
    const conLeve = calcolaSimulazione(baseSenzaMutuo);
    const senzaLeve = calcolaSimulazione(baseSenzaMutuo, { calcolaLeve: false });

    expect(senzaLeve.leveOrdinate).toHaveLength(0);
    expect(senzaLeve.irr).toBe(conLeve.irr);
  });
});

describe("calcolaSimulazione — abitazione principale", () => {
  const baseAbitazionePrincipale: ParametriSimulazione = {
    ...baseSenzaMutuo,
    affittoLordoAnnuo: 0,
    renditaFigurativaAnnua: 6000,
    unitaList: [
      { ...baseSenzaMutuo.unitaList[0], statoAbitativoImu: "abitazionePrincipale" },
    ],
    importoMutuo: 140000,
    tassoMutuoPercentuale: 3.5,
    durataMutuoAnni: 20,
  };
  const r = calcolaSimulazione(baseAbitazionePrincipale);

  it("esenta l'IMU per l'abitazione principale (categoria non di lusso)", () => {
    expect(r.immobileAbitazionePrincipale).toBe(true);
    expect(r.imu).toBe(0);
  });

  it("applica la detrazione mediazione (19%, tetto 1000€ di spesa)", () => {
    // agenzia.totale qui è 3% di 200000 + IVA = 7320 → spesa ammessa
    // limitata al tetto 1000€ → detrazione 190€.
    expect(r.detrazioneMediazione.importo).toBeCloseTo(190, 1);
  });

  it("applica la detrazione interessi mutuo (19%, tetto 4000€/anno)", () => {
    // Con un mutuo di 140000€ al 3,5%, gli interessi del primo anno
    // superano ampiamente 4000€: la detrazione è quindi al tetto (760€).
    expect(r.detrazioneInteressiAnno1.importo).toBeCloseTo(760, 1);
  });

  it("include la leva 'Tasso mutuo' quando c'è un mutuo attivo", () => {
    const nomi = r.leveOrdinate.map((l) => l.nome);
    expect(nomi.some((n) => n.includes("Tasso mutuo"))).toBe(true);
    // Senza affitto (rendita figurativa), la leva "Canone di affitto"
    // non ha senso e non deve comparire.
    expect(nomi.some((n) => n.includes("Canone di affitto"))).toBe(false);
  });
});

describe("calcolaSimulazione — ristrutturazione", () => {
  it("calcola la detrazione ristrutturazione e la include tra le leve", () => {
    const r = calcolaSimulazione({ ...baseSenzaMutuo, ristrutturazione: 20000 });

    // 36% (non abitazione principale) di 20000€ ripartito su 10 anni.
    expect(r.detrazioneRistrutturazione.aliquota).toBe(0.36);
    expect(r.detrazioneRistrutturazione.importoTotale).toBeCloseTo(7200, 1);
    expect(r.detrazioneRistrutturazione.rataAnnua).toBeCloseTo(720, 1);

    const nomi = r.leveOrdinate.map((l) => l.nome);
    expect(nomi.some((n) => n.includes("ristrutturazione"))).toBe(true);
  });
});
