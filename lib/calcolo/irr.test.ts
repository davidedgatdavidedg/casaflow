// lib/calcolo/irr.test.ts
//
// Valori attesi verificati indipendentemente con bisezione in Python
// prima di scrivere l'implementazione, per non fidarsi ciecamente dello
// stesso algoritmo che si sta testando.

import { describe, it, expect } from "vitest";
import { calcolaIRR, calcolaVAN, calcolaXIRR, calcolaVANDate } from "./irr";

describe("calcolaVAN", () => {
  it("a tasso di sconto zero, il VAN è la semplice somma dei flussi", () => {
    const flussi = [-1000, 300, 300, 300, 300];
    expect(calcolaVAN(flussi, 0)).toBeCloseTo(200, 6);
  });

  it("scontando flussi futuri, il VAN diminuisce all'aumentare del tasso", () => {
    const flussi = [-1000, 1100];
    const vanBasso = calcolaVAN(flussi, 0.05);
    const vanAlto = calcolaVAN(flussi, 0.15);
    expect(vanAlto).toBeLessThan(vanBasso);
  });
});

describe("calcolaIRR", () => {
  it("caso semplice a un anno: -1000 oggi, +1100 tra un anno → 10%", () => {
    const irr = calcolaIRR([-1000, 1100]);
    expect(irr).not.toBeNull();
    expect(irr!).toBeCloseTo(0.1, 6);
  });

  it("caso a tre anni con flussi costanti", () => {
    const irr = calcolaIRR([-1000, 500, 500, 500]);
    expect(irr).not.toBeNull();
    expect(irr!).toBeCloseTo(0.233752, 5);
  });

  it("caso stile investimento immobiliare: esborso, affitti, rivendita finale", () => {
    const irr = calcolaIRR([-50000, 3000, 3000, 3000, 3000, 55000]);
    expect(irr).not.toBeNull();
    expect(irr!).toBeCloseTo(0.066997, 5);
  });

  it("il VAN calcolato all'IRR trovato è (quasi) zero — verifica di coerenza interna", () => {
    const flussi = [-50000, 3000, 3000, 3000, 3000, 55000];
    const irr = calcolaIRR(flussi);
    expect(irr).not.toBeNull();
    expect(calcolaVAN(flussi, irr!)).toBeCloseTo(0, 2);
  });

  it("restituisce null se tutti i flussi sono positivi (nessuna radice)", () => {
    expect(calcolaIRR([100, 200, 300])).toBeNull();
  });

  it("restituisce null se tutti i flussi sono negativi (nessuna radice)", () => {
    expect(calcolaIRR([-100, -200, -300])).toBeNull();
  });

  it("restituisce null con un solo flusso (serie insufficiente)", () => {
    expect(calcolaIRR([-1000])).toBeNull();
  });
});

describe("calcolaIRR — flussi con più di un'inversione di segno", () => {
  it("trova l'IRR anche con un flusso negativo dopo il picco positivo finale (es. detrazione fiscale oltre l'orizzonte)", () => {
    // Caso reale segnalato: rivendita fortemente positiva, seguita da un
    // ultimo flusso negativo (detrazione/tassazione differita oltre
    // l'orizzonte di investimento) — due inversioni di segno, non una.
    const flussi = [
      -54181.25, -4904.52, -6248.56, -6248.54, -6248.53, -6248.52, -6248.55,
      -6248.54, -6248.56, -6248.52, -6248.56, -6248.54, -6248.55, -6248.54,
      -6248.55, -6248.52, -6248.56, -6248.54, -6248.53, -6248.52, 180547.98,
      -2016,
    ];

    const irr = calcolaIRR(flussi);
    expect(irr).not.toBeNull();
    // La radice attesa è vicina allo zero (VAN a tasso 0% è positivo,
    // a tasso 5% è già ampiamente negativo — la vera radice sta nel mezzo).
    expect(irr!).toBeCloseTo(0.00304, 3);
    expect(calcolaVAN(flussi, irr!)).toBeCloseTo(0, 1);
  });

  it("un semplice caso a doppia inversione (positivo, negativo, positivo) trova comunque una radice reale", () => {
    const flussi = [-1000, 2500, -2000, 1000];
    const irr = calcolaIRR(flussi);
    expect(irr).not.toBeNull();
    expect(calcolaVAN(flussi, irr!)).toBeCloseTo(0, 2);
  });
});

describe("calcolaXIRR — su date reali (equivalente a TIR.X/XIRR di Excel)", () => {
  it("coincide con calcolaIRR quando le date cadono a esattamente un anno di distanza", () => {
    const flussi = [-100000, 3000, 3000, 110000];
    const irrClassico = calcolaIRR(flussi);

    const transazioni = [
      { data: new Date(2020, 0, 1), importo: -100000 },
      { data: new Date(2021, 0, 1), importo: 3000 },
      { data: new Date(2022, 0, 1), importo: 3000 },
      { data: new Date(2023, 0, 1), importo: 110000 },
    ];
    const xirr = calcolaXIRR(transazioni);

    // Piccola differenza attesa per via degli anni bisestili (365 vs
    // 365.25 giorni reali) — non identico all'ultimo decimale, ma molto
    // vicino.
    expect(xirr).not.toBeNull();
    expect(xirr!).toBeCloseTo(irrClassico!, 2);
  });

  it("differisce da calcolaIRR quando i flussi cadono infrannuali (es. rate mensili, acquisto a metà anno)", () => {
    const transazioni = [
      { data: new Date(2024, 8, 3), importo: -50000 }, // acquisto a settembre
      { data: new Date(2024, 11, 31), importo: 1000 },
      { data: new Date(2025, 5, 30), importo: 1000 },
      { data: new Date(2025, 11, 31), importo: 60000 },
    ];
    const xirr = calcolaXIRR(transazioni);

    // Lo stesso importo trattato come se fosse a scadenze annuali esatte
    // (indice intero) darebbe un risultato diverso: la data reale del
    // primo flusso (settembre, non gennaio) sposta il risultato.
    const irrClassico = calcolaIRR([-50000, 1000, 1000, 60000]);

    expect(xirr).not.toBeNull();
    expect(irrClassico).not.toBeNull();
    expect(Math.abs(xirr! - irrClassico!)).toBeGreaterThan(0.001);
  });

  it("non dipende dall'ordine delle transazioni nell'array in ingresso", () => {
    const transazioni = [
      { data: new Date(2024, 0, 1), importo: -10000 },
      { data: new Date(2025, 0, 1), importo: 5000 },
      { data: new Date(2026, 0, 1), importo: 7000 },
    ];
    const transazioniMescolate = [transazioni[2], transazioni[0], transazioni[1]];

    const xirrOrdinato = calcolaXIRR(transazioni);
    const xirrMescolato = calcolaXIRR(transazioniMescolate);

    expect(xirrOrdinato).not.toBeNull();
    expect(xirrMescolato).toBeCloseTo(xirrOrdinato!, 6);
  });

  it("calcolaVANDate a tasso 0 è semplicemente la somma algebrica degli importi", () => {
    const transazioni = [
      { data: new Date(2024, 0, 1), importo: -10000 },
      { data: new Date(2024, 5, 1), importo: 4000 },
      { data: new Date(2025, 0, 1), importo: 7000 },
    ];
    expect(calcolaVANDate(transazioni, 0)).toBeCloseTo(1000, 6);
  });
});
