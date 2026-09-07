// lib/calcolo/benchmarkBtp.test.ts
import { describe, it, expect } from "vitest";
import { stimaRendimentoBtpNetto } from "./benchmarkBtp";

describe("stimaRendimentoBtpNetto", () => {
  it("restituisce il valore esatto per una scadenza censita (10 anni)", () => {
    const risultato = stimaRendimentoBtpNetto(10);
    expect(risultato.rendimentoNetto).toBeCloseTo(0.0335, 4);
    expect(risultato.interpolato).toBe(false);
  });

  it("interpola linearmente tra due punti noti (es. 8 anni, tra 7 e 10)", () => {
    const risultato = stimaRendimentoBtpNetto(8);
    expect(risultato.interpolato).toBe(true);
    // Tra 7 (3,1%) e 10 (3,35%): a 8 anni ci si aspetta circa 3,183%
    expect(risultato.rendimentoNetto).toBeGreaterThan(0.031);
    expect(risultato.rendimentoNetto).toBeLessThan(0.0335);
  });

  it("con un orizzonte sotto il minimo censito, usa il primo punto disponibile", () => {
    const risultato = stimaRendimentoBtpNetto(1);
    expect(risultato.scadenzaRiferimento).toBe(3);
    expect(risultato.interpolato).toBe(false);
  });

  it("con un orizzonte sopra il massimo censito, usa l'ultimo punto disponibile", () => {
    const risultato = stimaRendimentoBtpNetto(60);
    expect(risultato.scadenzaRiferimento).toBe(50);
    expect(risultato.rendimentoNetto).toBeCloseTo(0.042, 4);
  });
});
