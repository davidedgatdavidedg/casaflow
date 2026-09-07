// lib/calcolo/detrazioneMobili.test.ts
import { describe, it, expect } from "vitest";
import { calcolaDetrazioneMobili } from "./detrazioneMobili";

describe("calcolaDetrazioneMobili", () => {
  it("nessuna detrazione senza una ristrutturazione collegata", () => {
    const risultato = calcolaDetrazioneMobili(3000, false);
    expect(risultato.importoTotale).toBe(0);
    expect(risultato.rataAnnua).toBe(0);
  });

  it("applica il 50% sotto il tetto di spesa, con ristrutturazione collegata", () => {
    const risultato = calcolaDetrazioneMobili(3000, true);
    expect(risultato.spesaAmmessa).toBe(3000);
    expect(risultato.importoTotale).toBeCloseTo(1500, 2);
    expect(risultato.rataAnnua).toBeCloseTo(150, 2);
  });

  it("applica il tetto di spesa di 5.000€ anche con una spesa maggiore", () => {
    const risultato = calcolaDetrazioneMobili(8000, true);
    expect(risultato.spesaAmmessa).toBe(5000);
    expect(risultato.importoTotale).toBeCloseTo(2500, 2);
    expect(risultato.rataAnnua).toBeCloseTo(250, 2);
  });
});
