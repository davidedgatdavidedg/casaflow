// lib/calcolo/manutenzione.test.ts
import { describe, it, expect } from "vitest";
import { calcolaManutenzione } from "./manutenzione";

describe("calcolaManutenzione", () => {
  it("calcola ordinaria e straordinaria con le percentuali di default (0,1% ciascuna)", () => {
    const risultato = calcolaManutenzione(200000);
    expect(risultato.ordinaria).toBeCloseTo(200, 2); // 0.1%
    expect(risultato.straordinaria).toBeCloseTo(200, 2); // 0.1%
    expect(risultato.totale).toBeCloseTo(400, 2);
  });

  it("permette di personalizzare le percentuali", () => {
    const risultato = calcolaManutenzione(200000, 0.02, 0.005);
    expect(risultato.ordinaria).toBeCloseTo(4000, 2);
    expect(risultato.straordinaria).toBeCloseTo(1000, 2);
  });
});
