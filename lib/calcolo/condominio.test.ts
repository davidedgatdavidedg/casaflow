// lib/calcolo/condominio.test.ts
import { describe, it, expect } from "vitest";
import { calcolaSpeseCondominio } from "./condominio";

describe("calcolaSpeseCondominio", () => {
  it("senza importo personalizzato, stima dalla metratura col default prudenziale", () => {
    const risultato = calcolaSpeseCondominio(80);
    expect(risultato.totale).toBeCloseTo(400, 2); // 80 * 5€/mq
  });

  it("un importo assoluto personalizzato ha sempre la precedenza sulla stima", () => {
    const risultato = calcolaSpeseCondominio(80, 650);
    expect(risultato.totale).toBe(650);
  });

  it("un importo personalizzato può anche essere inferiore alla stima automatica", () => {
    const risultato = calcolaSpeseCondominio(80, 100);
    expect(risultato.totale).toBe(100);
  });
});
