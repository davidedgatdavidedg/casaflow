// lib/calcolo/costiNotaio.test.ts
import { describe, it, expect } from "vitest";
import { calcolaCostiNotaio } from "./costiNotaio";

describe("calcolaCostiNotaio", () => {
  it("stima onorario 2% del prezzo, visure e tassa archivio ai valori di default", () => {
    const risultato = calcolaCostiNotaio(200000);
    expect(risultato.onorario).toBeCloseTo(4000, 1); // 200000 * 2%
    expect(risultato.visure).toBe(150);
    expect(risultato.tassaArchivio).toBe(35);
    expect(risultato.totale).toBeCloseTo(4185, 1);
  });

  it("un onorario personalizzato ha sempre la precedenza sulla stima", () => {
    const risultato = calcolaCostiNotaio(200000, 3000);
    expect(risultato.onorario).toBe(3000);
  });

  it("visure e tassa archivio personalizzate hanno precedenza sui default", () => {
    const risultato = calcolaCostiNotaio(200000, undefined, 100, 28);
    expect(risultato.visure).toBe(100);
    expect(risultato.tassaArchivio).toBe(28);
  });

  it("con prezzo a zero e nessun override, tutte le voci sono zero (nessuna stima fantasma)", () => {
    const risultato = calcolaCostiNotaio(0);
    expect(risultato.onorario).toBe(0);
    expect(risultato.visure).toBe(0);
    expect(risultato.tassaArchivio).toBe(0);
    expect(risultato.totale).toBe(0);
  });

  it("con prezzo a zero, un override esplicito su una sola voce resta valido, le altre restano zero", () => {
    const soloVisure = calcolaCostiNotaio(0, undefined, 120);
    expect(soloVisure.onorario).toBe(0);
    expect(soloVisure.visure).toBe(120);
    expect(soloVisure.tassaArchivio).toBe(0);
    expect(soloVisure.totale).toBe(120);

    const soloOnorario = calcolaCostiNotaio(0, 1500);
    expect(soloOnorario.onorario).toBe(1500);
    expect(soloOnorario.visure).toBe(0);
    expect(soloOnorario.tassaArchivio).toBe(0);
  });
});
