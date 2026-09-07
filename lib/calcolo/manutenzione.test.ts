// lib/calcolo/manutenzione.test.ts
import { describe, it, expect } from "vitest";
import { calcolaManutenzione } from "./manutenzione";

describe("calcolaManutenzione", () => {
  it("calcola ordinaria e straordinaria con le percentuali di default", () => {
    const risultato = calcolaManutenzione(200000);
    expect(risultato.ordinaria).toBeCloseTo(2000, 2); // 1%
    expect(risultato.straordinaria).toBeCloseTo(600, 2); // 0.3%
    expect(risultato.totale).toBeCloseTo(2600, 2);
  });

  it("permette di personalizzare le percentuali", () => {
    const risultato = calcolaManutenzione(200000, 0.02, 0.005);
    expect(risultato.ordinaria).toBeCloseTo(4000, 2);
    expect(risultato.straordinaria).toBeCloseTo(1000, 2);
  });
});
