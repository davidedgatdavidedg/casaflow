// lib/calcolo/detrazioneMediazione.test.ts
import { describe, it, expect } from "vitest";
import { calcolaDetrazioneMediazione } from "./detrazioneMediazione";

describe("calcolaDetrazioneMediazione", () => {
  it("nessuna detrazione se l'immobile non è abitazione principale", () => {
    const risultato = calcolaDetrazioneMediazione(7320, false);
    expect(risultato.importo).toBe(0);
    expect(risultato.spesaAmmessa).toBe(0);
  });

  it("applica il tetto di spesa di 1.000€ anche se la spesa reale è maggiore", () => {
    const risultato = calcolaDetrazioneMediazione(7320, true);
    expect(risultato.spesaAmmessa).toBe(1000);
    expect(risultato.importo).toBeCloseTo(190, 2); // 1000 * 19%
  });

  it("sotto il tetto, la detrazione si calcola sulla spesa reale", () => {
    const risultato = calcolaDetrazioneMediazione(600, true);
    expect(risultato.spesaAmmessa).toBe(600);
    expect(risultato.importo).toBeCloseTo(114, 2); // 600 * 19%
  });
});
