// lib/calcolo/assicurazione.test.ts
import { describe, it, expect } from "vitest";
import { calcolaAssicurazione } from "./assicurazione";

describe("calcolaAssicurazione", () => {
  it("senza importo personalizzato, stima dalla metratura", () => {
    const risultato = calcolaAssicurazione(80);
    expect(risultato.totale).toBeCloseTo(160, 2); // 80 * 2€/mq
  });

  it("un importo assoluto personalizzato ha sempre la precedenza", () => {
    const risultato = calcolaAssicurazione(80, 250);
    expect(risultato.totale).toBe(250);
  });
});
