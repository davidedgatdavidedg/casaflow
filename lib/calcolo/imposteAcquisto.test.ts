// lib/calcolo/imposteAcquisto.test.ts
import { describe, it, expect } from "vitest";
import { calcolaImposteAcquisto } from "./imposteAcquisto";
import { IMMOBILI_REALI } from "./__fixtures__/immobili-reali";
import type { Immobile } from "./tipi";

describe("calcolaImposteAcquisto — casi sintetici", () => {
  const baseImmobile: Immobile = {
    prezzoAcquisto: 420000,
    renditaCatastale: 538.09,
    categoriaCatastale: "A/2",
    comune: "Milano",
    primaCasa: true,
    affittoLordoAnnuo: 10800,
    acquistoDa: "privato",
  };

  it("seconda casa da privato: registro al 9%, moltiplicatore diverso", () => {
    const secondaCasa: Immobile = { ...baseImmobile, primaCasa: false };
    const imposte = calcolaImposteAcquisto(secondaCasa);
    // 538.09 * 1.05 * 120 * 0.09 = 6101.94
    expect(imposte.registro).toBeCloseTo(6101.94, 1);
  });

  it("rispetta l'importo minimo di registro (1000€) su rendite basse", () => {
    const renditaBassa: Immobile = { ...baseImmobile, renditaCatastale: 50 };
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

describe("calcolaImposteAcquisto — dati reali", () => {
  const conDatiAcquisto = IMMOBILI_REALI.filter(
    (immobile) => immobile.registroAtteso !== undefined
  );

  it.each(conDatiAcquisto)("$etichetta", (immobile) => {
    const datiAcquisto: Immobile = {
      prezzoAcquisto: immobile.prezzoAcquisto ?? 0,
      renditaCatastale: immobile.renditaCatastale,
      categoriaCatastale: immobile.categoriaCatastale,
      comune: immobile.comune,
      primaCasa: immobile.primaCasa ?? false,
      affittoLordoAnnuo: 0, // non rilevante per questo calcolo
      acquistoDa: immobile.acquistoDa ?? "privato",
    };

    const imposte = calcolaImposteAcquisto(datiAcquisto);

    expect(imposte.registro).toBeCloseTo(immobile.registroAtteso!, 1);
    expect(imposte.ipotecaria).toBeCloseTo(immobile.ipotecariaAttesa!, 1);
    expect(imposte.catastale).toBeCloseTo(immobile.catastaleAttesa!, 1);
    expect(imposte.totale).toBeCloseTo(immobile.totaleAtteso!, 1);
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
