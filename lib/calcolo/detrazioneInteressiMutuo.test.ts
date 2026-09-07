// lib/calcolo/detrazioneInteressiMutuo.test.ts
import { describe, it, expect } from "vitest";
import { calcolaDetrazioneInteressiMutuo } from "./detrazioneInteressiMutuo";

describe("calcolaDetrazioneInteressiMutuo", () => {
  it("nessuna detrazione se l'immobile non è abitazione principale", () => {
    const risultato = calcolaDetrazioneInteressiMutuo(5000, false);
    expect(risultato.importo).toBe(0);
  });

  it("applica il tetto di 4.000€/anno anche con interessi maggiori", () => {
    const risultato = calcolaDetrazioneInteressiMutuo(9252.43, true); // anno 1 di Strambio
    expect(risultato.spesaAmmessa).toBe(4000);
    expect(risultato.importo).toBeCloseTo(760, 2); // 4000 * 19%
  });

  it("sotto il tetto, la detrazione si calcola sugli interessi reali", () => {
    const risultato = calcolaDetrazioneInteressiMutuo(1200, true);
    expect(risultato.spesaAmmessa).toBe(1200);
    expect(risultato.importo).toBeCloseTo(228, 2); // 1200 * 19%
  });
});
