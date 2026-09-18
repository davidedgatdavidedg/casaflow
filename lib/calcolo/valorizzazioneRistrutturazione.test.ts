// lib/calcolo/valorizzazioneRistrutturazione.test.ts
import { describe, it, expect } from "vitest";
import {
  calcolaPrezzoVenditaStimato,
  COEFFICIENTE_VALORIZZAZIONE_RISTRUTTURAZIONE_DEFAULT,
} from "./valorizzazioneRistrutturazione";

describe("calcolaPrezzoVenditaStimato", () => {
  it("con lavori a zero, il risultato è identico al modello precedente (solo prezzo rivalutato)", () => {
    const r = calcolaPrezzoVenditaStimato(200000, 0, 0.75, 0.02, 10);
    expect(r.valoreRistrutturazione).toBe(0);
    expect(r.valoreBaseVendita).toBe(200000);
    expect(r.prezzoVenditaStimato).toBeCloseTo(200000 * Math.pow(1.02, 10), 2);
  });

  it("acquisto 200k + lavori 40k, coefficiente 75%: base rivalutabile 230k", () => {
    const r = calcolaPrezzoVenditaStimato(200000, 40000, 0.75, 0.02, 10);
    expect(r.valoreRistrutturazione).toBe(30000);
    expect(r.valoreBaseVendita).toBe(230000);
  });

  it("coefficiente 0%: i lavori non aumentano il valore base", () => {
    const r = calcolaPrezzoVenditaStimato(200000, 40000, 0, 0.02, 10);
    expect(r.valoreRistrutturazione).toBe(0);
    expect(r.valoreBaseVendita).toBe(200000);
  });

  it("coefficiente 100%: equivalente all'ipotesi \"un euro speso è un euro di valore\"", () => {
    const r = calcolaPrezzoVenditaStimato(200000, 40000, 1, 0.02, 10);
    expect(r.valoreRistrutturazione).toBe(40000);
    expect(r.valoreBaseVendita).toBe(240000);
  });

  it("coefficiente 75%: il prezzo di vendita è la base composta correttamente nel tempo", () => {
    const r = calcolaPrezzoVenditaStimato(200000, 40000, 0.75, 0.02, 10);
    expect(r.prezzoVenditaStimato).toBeCloseTo(230000 * Math.pow(1.02, 10), 2);
  });

  it("con rivalutazione zero e orizzonte zero, il prezzo di vendita coincide con la base", () => {
    const r = calcolaPrezzoVenditaStimato(200000, 40000, 0.75, 0, 0);
    expect(r.prezzoVenditaStimato).toBe(r.valoreBaseVendita);
  });

  it("il coefficiente di default è 75%", () => {
    expect(COEFFICIENTE_VALORIZZAZIONE_RISTRUTTURAZIONE_DEFAULT).toBe(0.75);
  });

  it("una ristrutturazione negativa (dato malformato) viene trattata come zero", () => {
    const r = calcolaPrezzoVenditaStimato(200000, -1000, 0.75, 0.02, 10);
    expect(r.valoreRistrutturazione).toBe(0);
  });
});
