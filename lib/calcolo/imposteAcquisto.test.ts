// lib/calcolo/imposteAcquisto.test.ts
import { describe, it, expect } from "vitest";
import { calcolaImposteAcquisto } from "./imposteAcquisto";
import type { Immobile } from "./tipi";

describe("calcolaImposteAcquisto — casi sintetici", () => {
  const baseImmobile: Immobile = {
    prezzoAcquisto: 420000,
    primaCasa: true,
    affittoLordoAnnuo: 10800,
    acquistoDa: "privato",
    unita: [
      {
        comune: "Milano",
        categoriaCatastale: "A/2",
        renditaCatastale: 538.09,
        statoAbitativoImu: "affittata",
      },
    ],
  };

  it("seconda casa da privato: registro al 9%, moltiplicatore diverso", () => {
    const secondaCasa: Immobile = { ...baseImmobile, primaCasa: false };
    const imposte = calcolaImposteAcquisto(secondaCasa);
    // 538.09 * 1.05 * 120 * 0.09 = 6101.94
    expect(imposte.registro).toBeCloseTo(6101.94, 1);
  });

  it("rispetta l'importo minimo di registro (1000€) su rendite basse", () => {
    const renditaBassa: Immobile = {
      ...baseImmobile,
      unita: [{ ...baseImmobile.unita[0], renditaCatastale: 50 }],
    };
    const imposte = calcolaImposteAcquisto(renditaBassa);
    expect(imposte.registro).toBe(1000);
  });

  it("acquisto da impresa: tutte e tre le imposte fisse a 200€", () => {
    const daImpresa: Immobile = { ...baseImmobile, acquistoDa: "impresa" };
    const imposte = calcolaImposteAcquisto(daImpresa);
    expect(imposte.registro).toBe(200);
    expect(imposte.ipotecaria).toBe(200);
    expect(imposte.catastale).toBe(200);
    expect(imposte.totale).toBe(600);
  });

  it("il totale è la somma delle tre componenti", () => {
    const imposte = calcolaImposteAcquisto(baseImmobile);
    expect(imposte.totale).toBeCloseTo(
      imposte.registro + imposte.ipotecaria + imposte.catastale,
      2
    );
  });
});

describe("calcolaImposteAcquisto — form vuoto", () => {
  it("con prezzo di acquisto a zero, tutte le imposte sono zero (nessun minimo di legge applicato)", () => {
    const risultato = calcolaImposteAcquisto({
      prezzoAcquisto: 0,
      primaCasa: true,
      affittoLordoAnnuo: 0,
      acquistoDa: "privato",
      unita: [
        {
          comune: "Milano",
          categoriaCatastale: "A/2",
          renditaCatastale: 0,
          statoAbitativoImu: "affittata",
        },
      ],
    });
    expect(risultato.registro).toBe(0);
    expect(risultato.ipotecaria).toBe(0);
    expect(risultato.catastale).toBe(0);
    expect(risultato.totale).toBe(0);
  });

  it("con prezzo a zero, resta zero anche per l'acquisto da impresa (niente importi fissi fantasma)", () => {
    const risultato = calcolaImposteAcquisto({
      prezzoAcquisto: 0,
      primaCasa: true,
      affittoLordoAnnuo: 0,
      acquistoDa: "impresa",
      unita: [],
    });
    expect(risultato.totale).toBe(0);
  });
});
