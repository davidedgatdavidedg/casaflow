// lib/calcolo/speseAgenzia.test.ts
import { describe, it, expect } from "vitest";
import { calcolaSpeseAgenzia } from "./speseAgenzia";

describe("calcolaSpeseAgenzia", () => {
  it("senza importo personalizzato, stima al 3% + IVA del prezzo", () => {
    const risultato = calcolaSpeseAgenzia(200000);
    expect(risultato.imponibile).toBeCloseTo(6000, 2); // 200000 * 3%
    expect(risultato.iva).toBeCloseTo(1320, 2); // 6000 * 22%
    expect(risultato.totale).toBeCloseTo(7320, 2);
  });

  it("un importo assoluto personalizzato ha sempre la precedenza sulla stima", () => {
    const risultato = calcolaSpeseAgenzia(200000, 5000);
    expect(risultato.totale).toBe(5000);
    // Scomposizione coerente: 5000 / 1.22 ≈ 4098.36 imponibile
    expect(risultato.imponibile).toBeCloseTo(4098.36, 1);
    expect(risultato.iva).toBeCloseTo(901.64, 1);
  });

  it("la scomposizione di un totale personalizzato somma esattamente al totale dato", () => {
    const risultato = calcolaSpeseAgenzia(200000, 3660);
    expect(risultato.imponibile + risultato.iva).toBeCloseTo(3660, 2);
  });
});
