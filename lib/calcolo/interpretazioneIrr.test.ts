// lib/calcolo/interpretazioneIrr.test.ts
import { describe, it, expect } from "vitest";
import { interpretaIrr } from "./interpretazioneIrr";

describe("interpretaIrr", () => {
  it("null → non calcolabile", () => {
    expect(interpretaIrr(null).fascia).toBe("negativo");
    expect(interpretaIrr(null).etichetta).toBe("Non calcolabile");
  });

  it("negativo → fascia negativo", () => {
    expect(interpretaIrr(-0.05).fascia).toBe("negativo");
  });

  it("0.01 (1%) → fascia basso", () => {
    expect(interpretaIrr(0.01).fascia).toBe("basso");
  });

  it("0.035 (3,5%) → fascia medio", () => {
    expect(interpretaIrr(0.035).fascia).toBe("medio");
  });

  it("0.07 (7%) → fascia buono", () => {
    expect(interpretaIrr(0.07).fascia).toBe("buono");
  });

  it("0.15 (15%) → fascia alto", () => {
    expect(interpretaIrr(0.15).fascia).toBe("alto");
  });
});
