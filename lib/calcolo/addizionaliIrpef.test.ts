// lib/calcolo/addizionaliIrpef.test.ts
import { describe, it, expect } from "vitest";
import { calcolaAddizionaliIrpef } from "./addizionaliIrpef";

describe("calcolaAddizionaliIrpef", () => {
  it("usa l'aliquota specifica di Milano e la soglia di esenzione", () => {
    const risultato = calcolaAddizionaliIrpef(30000, "Milano");
    expect(risultato.aliquotaApplicata).toBeCloseTo(0.0253, 4);
    expect(risultato.importo).toBeCloseTo(759, 1); // 30000 * 0.0253
  });

  it("sotto la soglia di esenzione di Milano, l'importo è zero", () => {
    const risultato = calcolaAddizionaliIrpef(20000, "Milano");
    expect(risultato.importo).toBe(0);
    expect(risultato.aliquotaApplicata).toBe(0);
  });

  it("usa il default nazionale per un comune non censito", () => {
    const risultato = calcolaAddizionaliIrpef(30000, "PaeseSenzaTabella");
    expect(risultato.aliquotaApplicata).toBeCloseTo(0.0123, 4);
    expect(risultato.importo).toBeCloseTo(369, 1);
  });

  it("un'aliquota personalizzata ha sempre la precedenza", () => {
    const risultato = calcolaAddizionaliIrpef(30000, "Milano", 0.01);
    expect(risultato.aliquotaApplicata).toBeCloseTo(0.01, 4);
    expect(risultato.importo).toBeCloseTo(300, 1);
  });

  it("il confronto del comune ignora maiuscole/minuscole", () => {
    const a = calcolaAddizionaliIrpef(30000, "milano");
    const b = calcolaAddizionaliIrpef(30000, "MILANO");
    expect(a.importo).toBeCloseTo(b.importo, 2);
  });
});
