// lib/calcolo/utenze.test.ts
import { describe, it, expect } from "vitest";
import { calcolaUtenze } from "./utenze";

describe("calcolaUtenze", () => {
  it("stima energia elettrica e gas dalla metratura, internet come importo fisso", () => {
    const risultato = calcolaUtenze(80);
    expect(risultato.energiaElettrica.totale).toBeCloseTo(120, 2); // 80 * 1.5
    expect(risultato.gas.totale).toBeCloseTo(96, 2); // 80 * 1.2
    expect(risultato.internet.totale).toBeCloseTo(240, 2); // fisso
    expect(risultato.totale).toBeCloseTo(456, 2);
  });

  it("un totale annuo esplicito ha sempre la precedenza sulla stima da mq", () => {
    const risultato = calcolaUtenze(80, 500, 300, 200);
    expect(risultato.energiaElettrica.totale).toBe(500);
    expect(risultato.gas.totale).toBe(300);
    expect(risultato.internet.totale).toBe(200);
    expect(risultato.totale).toBe(1000);
  });

  it("permette di specificare solo alcune voci, lasciando le altre al default", () => {
    const risultato = calcolaUtenze(80, 600);
    expect(risultato.energiaElettrica.totale).toBe(600);
    expect(risultato.gas.totale).toBeCloseTo(96, 2); // default
    expect(risultato.internet.totale).toBeCloseTo(240, 2); // default
  });

  it("con metratura zero e nessun override, tutte le stime (incluso internet) risultano zero", () => {
    // Nessuna metratura inserita = nessun immobile ancora definito
    // davvero: anche il costo fisso dell'internet, che normalmente non
    // dipende dai mq, non deve comparire come "costo fantasma".
    const risultato = calcolaUtenze(0);
    expect(risultato.energiaElettrica.totale).toBe(0);
    expect(risultato.gas.totale).toBe(0);
    expect(risultato.internet.totale).toBe(0);
  });

  it("con metratura zero ma un internet esplicito, l'override resta valido", () => {
    const risultato = calcolaUtenze(0, undefined, undefined, 180);
    expect(risultato.internet.totale).toBe(180);
  });
});
