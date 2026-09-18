import { describe, it, expect } from "vitest";
import {
  calcolaStimaRapida,
  TASSO_MUTUO_STIMATO_DEFAULT,
  type ParametriStimaRapida,
} from "./stimaRapida";
import { PERCENTUALE_RIVALUTAZIONE_DEFAULT } from "./tipi";
import { COEFFICIENTE_VALORIZZAZIONE_RISTRUTTURAZIONE_DEFAULT } from "./valorizzazioneRistrutturazione";

const base: ParametriStimaRapida = {
  prezzoAcquisto: 200000,
  ristrutturazione: 0,
  affittoLordoMensile: 800,
  finanziamentoRichiesto: false,
  percentualeFinanziata: 0,
  anniInvestimento: 5,
};

describe("calcolaStimaRapida — caso base, nessun mutuo", () => {
  const r = calcolaStimaRapida(base);

  it("calcola un IRR non nullo", () => {
    expect(r.irr).not.toBeNull();
  });

  it("espone il benchmark BTP coerente con l'orizzonte", () => {
    expect(r.benchmarkBtp.rendimentoNetto).toBeGreaterThan(0);
    expect(r.benchmarkBtp.scadenzaRiferimento).toBe(5);
  });

  it("calcola il differenziale rispetto al BTP", () => {
    expect(r.irr).not.toBeNull();
    expect(r.differenzialeBtp).toBeCloseTo(
      r.irr! - r.benchmarkBtp.rendimentoNetto,
      8
    );
  });

  it("le imposte di acquisto sono il minimo di legge con unità catastale vuota", () => {
    expect(r.ipotesi.impostaAcquistoStimata).toBeCloseTo(1100, 1);
  });

  it("nessun mutuo richiesto: tasso e durata sono null", () => {
    expect(r.ipotesi.tassoMutuoStimato).toBeNull();
    expect(r.ipotesi.durataMutuoAnni).toBeNull();
  });

  it("espone la rivalutazione di default", () => {
    expect(r.ipotesi.rivalutazioneAnnua).toBe(PERCENTUALE_RIVALUTAZIONE_DEFAULT);
  });

  it("espone il costo di intermediazione stimato", () => {
    expect(r.ipotesi.agenziaStimata).toBeGreaterThan(0);
  });

  it("fornisce un giudizio prudente legato al confronto col BTP", () => {
    expect(["Prime indicazioni poco favorevoli", "Margine da valutare"]).toContain(
      r.giudizio.etichetta
    );
    expect(r.giudizio.descrizione).toBeTruthy();
  });
});

describe("calcolaStimaRapida — con mutuo", () => {
  it("riporta tasso di default e durata uguale all'orizzonte", () => {
    const r = calcolaStimaRapida({
      ...base,
      finanziamentoRichiesto: true,
      percentualeFinanziata: 80,
    });
    expect(r.ipotesi.tassoMutuoStimato).toBe(TASSO_MUTUO_STIMATO_DEFAULT);
    expect(r.ipotesi.durataMutuoAnni).toBe(base.anniInvestimento);
  });

  it("la leva modifica l'IRR rispetto al caso tutto contanti", () => {
    const senzaMutuo = calcolaStimaRapida(base);
    const conMutuo = calcolaStimaRapida({
      ...base,
      finanziamentoRichiesto: true,
      percentualeFinanziata: 80,
    });
    expect(conMutuo.irr).not.toBeNull();
    expect(senzaMutuo.irr).not.toBeNull();
    expect(conMutuo.irr).not.toBeCloseTo(senzaMutuo.irr!, 6);
  });
});

describe("calcolaStimaRapida — casi limite", () => {
  it("un rendimento sotto il BTP produce prime indicazioni poco favorevoli", () => {
    const r = calcolaStimaRapida({
      ...base,
      prezzoAcquisto: 500000,
      affittoLordoMensile: 300,
    });
    expect(r.differenzialeBtp).not.toBeNull();
    expect(r.differenzialeBtp!).toBeLessThanOrEqual(0);
    expect(r.giudizio.etichetta).toBe("Prime indicazioni poco favorevoli");
  });

  it("una ristrutturazione modifica l'IRR", () => {
    const senzaRistrutturazione = calcolaStimaRapida(base);
    const conRistrutturazione = calcolaStimaRapida({
      ...base,
      ristrutturazione: 30000,
    });
    expect(conRistrutturazione.irr).not.toBeCloseTo(senzaRistrutturazione.irr!, 6);
  });

  it("espone il coefficiente di valorizzazione ristrutturazione tra le ipotesi", () => {
    const r = calcolaStimaRapida({ ...base, ristrutturazione: 30000 });
    expect(r.ipotesi.coefficienteValorizzazioneRistrutturazione).toBe(
      COEFFICIENTE_VALORIZZAZIONE_RISTRUTTURAZIONE_DEFAULT
    );
  });

  it("con prezzo a zero, le imposte di acquisto sono zero", () => {
    const r = calcolaStimaRapida({ ...base, prezzoAcquisto: 0 });
    expect(r.ipotesi.impostaAcquistoStimata).toBe(0);
  });
});
