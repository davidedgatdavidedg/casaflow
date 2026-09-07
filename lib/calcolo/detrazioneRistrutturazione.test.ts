// lib/calcolo/detrazioneRistrutturazione.test.ts
import { describe, it, expect } from "vitest";
import { calcolaDetrazioneRistrutturazione } from "./detrazioneRistrutturazione";

describe("calcolaDetrazioneRistrutturazione", () => {
  it("applica il 50% per l'abitazione principale, sotto il tetto di spesa", () => {
    const risultato = calcolaDetrazioneRistrutturazione(20000, true);
    expect(risultato.spesaAmmessa).toBe(20000);
    expect(risultato.aliquota).toBe(0.5);
    expect(risultato.importoTotale).toBeCloseTo(10000, 2);
    expect(risultato.rataAnnua).toBeCloseTo(1000, 2);
  });

  it("applica il 36% per gli altri immobili (investimento/affitto)", () => {
    const risultato = calcolaDetrazioneRistrutturazione(20000, false);
    expect(risultato.aliquota).toBe(0.36);
    expect(risultato.importoTotale).toBeCloseTo(7200, 2);
    expect(risultato.rataAnnua).toBeCloseTo(720, 2);
  });

  it("applica il tetto di spesa di 96.000€ anche con una spesa maggiore", () => {
    const risultato = calcolaDetrazioneRistrutturazione(150000, true);
    expect(risultato.spesaAmmessa).toBe(96000);
    expect(risultato.importoTotale).toBeCloseTo(48000, 2);
    expect(risultato.rataAnnua).toBeCloseTo(4800, 2);
  });

  it("con spesa zero, la detrazione è zero", () => {
    const risultato = calcolaDetrazioneRistrutturazione(0, true);
    expect(risultato.importoTotale).toBe(0);
    expect(risultato.rataAnnua).toBe(0);
  });
});
