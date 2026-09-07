// lib/calcolo/tari.test.ts
import { describe, it, expect } from "vitest";
import { calcolaTari } from "./tari";

describe("calcolaTari", () => {
  it("senza importo personalizzato, stima dalla metratura col default di mercato", () => {
    const risultato = calcolaTari(80);
    expect(risultato.totale).toBeCloseTo(200, 2); // 80 * 2.5€/mq
  });

  it("un importo assoluto personalizzato ha sempre la precedenza sulla stima", () => {
    const risultato = calcolaTari(80, 340);
    expect(risultato.totale).toBe(340);
  });

  it("restituisce zero se la superficie non è nota e nessun importo è specificato", () => {
    expect(calcolaTari(0).totale).toBe(0);
  });
});
