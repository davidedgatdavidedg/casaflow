import { describe, expect, it } from "vitest";
import {
  calcolaStimaPrimaCasa,
  SOGLIA_LIQUIDITA_QUASI_ASSORBITA,
  SOGLIE_RAPPORTO_RATE_REDDITO,
  type ParametriStimaPrimaCasa,
} from "./stimaPrimaCasa";
import { TASSO_MUTUO_STIMATO_DEFAULT } from "./stimaRapida";

const base: ParametriStimaPrimaCasa = {
  prezzoAcquisto: 300000,
  ristrutturazione: 10000,
  liquiditaDisponibile: 140000,
  mutuoRichiesto: true,
  percentualeMutuo: 80,
  durataMutuoAnni: 25,
  redditoNettoMensileFamiliare: 5000,
  altreRateMensili: 0,
};

describe("calcolaStimaPrimaCasa — calcoli base", () => {
  const r = calcolaStimaPrimaCasa(base);

  it("calcola importo del mutuo e anticipo", () => {
    expect(r.mutuo.importo).toBe(240000);
    expect(r.capitale.anticipoPrezzo).toBe(60000);
  });

  it("usa il tasso di default comune al ramo investitore", () => {
    expect(r.mutuo.tassoStimato).toBe(TASSO_MUTUO_STIMATO_DEFAULT);
  });

  it("calcola una rata mensile positiva", () => {
    expect(r.mutuo.rataMensile).toBeGreaterThan(0);
  });

  it("include le altre rate negli impegni mensili", () => {
    const conRate = calcolaStimaPrimaCasa({ ...base, altreRateMensili: 300 });
    expect(conRate.sostenibilitaMensile!.impegniMensiliTotali).toBeCloseTo(
      conRate.mutuo.rataMensile + 300,
      2
    );
  });

  it("calcola correttamente il rapporto impegni/reddito", () => {
    expect(r.sostenibilitaMensile!.rapportoImpegniReddito).toBeCloseTo(
      r.sostenibilitaMensile!.impegniMensiliTotali / base.redditoNettoMensileFamiliare,
      8
    );
  });

  it("usa la funzione fiscale esistente con rendita zero: imposte minime", () => {
    expect(r.ipotesi.imposteAcquistoStimate).toBeCloseTo(1100, 1);
  });

  it("include notaio, agenzia e spese mutuo nei costi iniziali", () => {
    expect(r.ipotesi.notaioStimato).toBeGreaterThan(0);
    expect(r.ipotesi.agenziaStimata).toBeGreaterThan(0);
    expect(r.ipotesi.speseMutuoStimate).toBeGreaterThan(0);
    expect(r.capitale.costiAcquistoStimati).toBeCloseTo(
      r.ipotesi.imposteAcquistoStimate +
        r.ipotesi.notaioStimato +
        r.ipotesi.agenziaStimata +
        r.ipotesi.speseMutuoStimate,
      2
    );
  });

  it("include la ristrutturazione nel capitale necessario", () => {
    const senza = calcolaStimaPrimaCasa({ ...base, ristrutturazione: 0 });
    expect(r.capitale.capitaleNecessario - senza.capitale.capitaleNecessario).toBe(10000);
  });
});

describe("calcolaStimaPrimaCasa — fasce rata/reddito", () => {
  it("<= 30% è generalmente compatibile", () => {
    const r = calcolaStimaPrimaCasa({
      ...base,
      redditoNettoMensileFamiliare: 10000,
    });
    expect(r.sostenibilitaMensile!.rapportoImpegniReddito).toBeLessThanOrEqual(
      SOGLIE_RAPPORTO_RATE_REDDITO.generalmenteCompatibile
    );
    expect(r.sostenibilitaMensile!.giudizio).toBe("generalmenteCompatibile");
  });

  it("tra 30% e 40% è da valutare con attenzione", () => {
    const rata = calcolaStimaPrimaCasa(base).mutuo.rataMensile;
    const reddito = rata / 0.35;
    const r = calcolaStimaPrimaCasa({ ...base, redditoNettoMensileFamiliare: reddito });
    expect(r.sostenibilitaMensile!.giudizio).toBe("daValutareConAttenzione");
  });

  it("> 40% produce peso elevato", () => {
    const rata = calcolaStimaPrimaCasa(base).mutuo.rataMensile;
    const reddito = rata / 0.5;
    const r = calcolaStimaPrimaCasa({ ...base, redditoNettoMensileFamiliare: reddito });
    expect(r.sostenibilitaMensile!.giudizio).toBe("pesoElevato");
  });
});

describe("calcolaStimaPrimaCasa — scenari", () => {
  it("liquidità insufficiente produce gap positivo", () => {
    const r = calcolaStimaPrimaCasa({ ...base, liquiditaDisponibile: 10000 });
    expect(r.capitale.liquiditaResidua).toBeLessThan(0);
    expect(r.capitale.gapLiquidita).toBeGreaterThan(0);
    expect(["liquiditaInsufficiente", "criticitaMultiple"]).toContain(r.scenario);
  });

  it("rata elevata senza criticità patrimoniale produce scenario rataElevata", () => {
    const rata = calcolaStimaPrimaCasa(base).mutuo.rataMensile;
    const r = calcolaStimaPrimaCasa({
      ...base,
      redditoNettoMensileFamiliare: rata / 0.5,
      liquiditaDisponibile: 250000,
    });
    expect(r.scenario).toBe("rataElevata");
  });

  it("rata elevata + liquidità quasi assorbita produce criticità multiple", () => {
    const preliminare = calcolaStimaPrimaCasa(base);
    const capitale = preliminare.capitale.capitaleNecessario;
    const liquidita = capitale / (1 - SOGLIA_LIQUIDITA_QUASI_ASSORBITA / 2);
    const rata = preliminare.mutuo.rataMensile;
    const r = calcolaStimaPrimaCasa({
      ...base,
      liquiditaDisponibile: liquidita,
      redditoNettoMensileFamiliare: rata / 0.5,
    });
    expect(r.scenario).toBe("criticitaMultiple");
  });

  it("scenario favorevole richiede rapporto contenuto e cuscinetto >10%", () => {
    const r = calcolaStimaPrimaCasa({
      ...base,
      redditoNettoMensileFamiliare: 10000,
      liquiditaDisponibile: 250000,
    });
    expect(r.scenario).toBe("primeIndicazioniFavorevoli");
  });

  it("nessun mutuo: rata zero, nessuna ipotesi di tasso, nessuna sostenibilità mensile calcolata", () => {
    const r = calcolaStimaPrimaCasa({
      ...base,
      mutuoRichiesto: false,
      percentualeMutuo: 80,
      durataMutuoAnni: 25,
    });
    expect(r.mutuo.importo).toBe(0);
    expect(r.mutuo.rataMensile).toBe(0);
    expect(r.mutuo.tassoStimato).toBeNull();
    expect(r.mutuo.durataAnni).toBeNull();
    // Senza mutuo un rapporto impegni/reddito non avrebbe significato:
    // non viene calcolato affatto, non semplicemente azzerato.
    expect(r.sostenibilitaMensile).toBeNull();
  });
});

describe("calcolaStimaPrimaCasa — scenari senza mutuo (solo liquidità)", () => {
  const senzaMutuo = { ...base, mutuoRichiesto: false };

  it("liquidità insufficiente, anche con reddito/altre rate valorizzate (ignorati)", () => {
    const r = calcolaStimaPrimaCasa({
      ...senzaMutuo,
      liquiditaDisponibile: 10000,
      redditoNettoMensileFamiliare: 500, // irrilevante senza mutuo: non deve influenzare lo scenario
    });
    expect(r.scenario).toBe("liquiditaInsufficiente");
  });

  it("liquidità quasi interamente assorbita ma non negativa", () => {
    const preliminare = calcolaStimaPrimaCasa(senzaMutuo);
    const capitale = preliminare.capitale.capitaleNecessario;
    const liquidita = capitale / (1 - SOGLIA_LIQUIDITA_QUASI_ASSORBITA / 2);
    const r = calcolaStimaPrimaCasa({ ...senzaMutuo, liquiditaDisponibile: liquidita });
    expect(r.capitale.liquiditaResidua).toBeGreaterThanOrEqual(0);
    expect(r.scenario).toBe("liquiditaQuasiAssorbita");
  });

  it("scenario favorevole con liquidità ampiamente sufficiente", () => {
    const r = calcolaStimaPrimaCasa({ ...senzaMutuo, liquiditaDisponibile: 250000 });
    expect(r.scenario).toBe("primeIndicazioniFavorevoli");
  });

  it("non produce mai rataElevata o criticitaMultiple, qualunque sia il reddito dichiarato", () => {
    const r = calcolaStimaPrimaCasa({
      ...senzaMutuo,
      liquiditaDisponibile: 10000, // liquidità insufficiente
      redditoNettoMensileFamiliare: 1, // reddito bassissimo: irrilevante senza mutuo
    });
    expect(r.scenario).not.toBe("rataElevata");
    expect(r.scenario).not.toBe("criticitaMultiple");
  });
});
