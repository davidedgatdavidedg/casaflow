// lib/calcolo/utenze.test.ts
import { describe, it, expect } from "vitest";
import { calcolaUtenze } from "./utenze";

describe("calcolaUtenze", () => {
  it("senza importi personalizzati, tutte le voci sono zero di default (tipicamente a carico dell'inquilino)", () => {
    const risultato = calcolaUtenze(80);
    expect(risultato.energiaElettrica.totale).toBe(0);
    expect(risultato.gas.totale).toBe(0);
    expect(risultato.internet.totale).toBe(0);
    expect(risultato.totale).toBe(0);
  });

  it("un totale annuo esplicito ha sempre la precedenza sul default", () => {
    const risultato = calcolaUtenze(80, 500, 300, 200);
    expect(risultato.energiaElettrica.totale).toBe(500);
    expect(risultato.gas.totale).toBe(300);
    expect(risultato.internet.totale).toBe(200);
    expect(risultato.totale).toBe(1000);
  });

  it("permette di specificare solo alcune voci, lasciando le altre a zero", () => {
    const risultato = calcolaUtenze(80, 600);
    expect(risultato.energiaElettrica.totale).toBe(600);
    expect(risultato.gas.totale).toBe(0);
    expect(risultato.internet.totale).toBe(0);
  });

  it("con metratura zero e nessun override, tutte le voci restano zero", () => {
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
