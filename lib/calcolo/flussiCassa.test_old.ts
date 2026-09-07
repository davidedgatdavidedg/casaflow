// lib/calcolo/flussiCassa.test.ts
import { describe, it, expect } from "vitest";
import {
  calcolaFlussiCassa,
  estraiFlussiTotali,
  aggiungiCumulato,
  trovaAnnoRientro,
  elencoTransazioni,
  type ParametriFlussiCassa,
} from "./flussiCassa";
import { calcolaIRR } from "./irr";

function sommaCategoria(
  voci: { categoria: string; importo: number }[],
  categoria: string
): number {
  return voci
    .filter((v) => v.categoria === categoria)
    .reduce((s, v) => s + v.importo, 0);
}

describe("calcolaFlussiCassa — senza mutuo", () => {
  const base: ParametriFlussiCassa = {
    prezzoAcquisto: 100000,
    registro: 2000,
    ipotecaria: 50,
    catastale: 50,
    notaioOnorario: 2000,
    notaioVisure: 150,
    notaioTassaArchivio: 35,
    agenziaTotale: 3660,
    mutuo: null,
    speseMutuoIstruttoria: 0,
    speseMutuoImpostaSostitutiva: 0,
    affittoLordoAnnuo: 9600,
    tassazioneAffittoImporto: 2016,
    tassazioneAffittoEtichetta: "Cedolare secca 21%",
    imuAnnua: 900,
    anniInvestimento: 3,
    prezzoRivenditaStimato: 110000,
  };

  it("genera una riga per l'anno 0, una per ciascun anno operativo, più una oltre l'orizzonte per la tassazione differita dell'ultimo anno", () => {
    const righe = calcolaFlussiCassa(base);
    // anno 3 è l'ultimo anno operativo: la sua tassazione affitto si
    // realizza (tramite dichiarazione) l'anno dopo, quindi compare
    // anche una riga per l'anno 4, anche se fuori dall'orizzonte.
    expect(righe).toHaveLength(5);
    expect(righe.map((r) => r.anno)).toEqual([0, 1, 2, 3, 4]);
  });

  it("anno 0: tutte le voci sono datate 1° gennaio dell'anno corrente (nessun mutuo come ancora)", () => {
    const [annoZero] = calcolaFlussiCassa(base);
    const annoCorrente = new Date().getFullYear();
    annoZero.voci.forEach((v) => {
      expect(v.data.getFullYear()).toBe(annoCorrente);
      expect(v.data.getMonth()).toBe(0);
      expect(v.data.getDate()).toBe(1);
    });
  });

  it("anno 0: le voci sommano al flusso totale corretto", () => {
    const [annoZero] = calcolaFlussiCassa(base);
    const investimenti = sommaCategoria(annoZero.voci, "investimenti");
    const imposte = sommaCategoria(annoZero.voci, "imposte");
    const costi = sommaCategoria(annoZero.voci, "costi");

    expect(investimenti).toBeCloseTo(-100000, 2);
    expect(imposte).toBeCloseTo(-2100, 2);
    expect(costi).toBeCloseTo(-5845, 2);
    expect(annoZero.flussoTotale).toBeCloseTo(-108045, 2);
  });

  it("IMU è spezzata in acconto (16 giugno) e saldo (16 dicembre), metà importo ciascuna", () => {
    const righe = calcolaFlussiCassa(base);
    const annoUno = righe[1];

    const acconto = annoUno.voci.find((v) => v.descrizione === "IMU (acconto)");
    const saldo = annoUno.voci.find((v) => v.descrizione === "IMU (saldo)");

    expect(acconto).toBeDefined();
    expect(acconto!.importo).toBeCloseTo(-450, 2);
    expect(acconto!.data.getMonth()).toBe(5); // giugno
    expect(acconto!.data.getDate()).toBe(16);

    expect(saldo).toBeDefined();
    expect(saldo!.importo).toBeCloseTo(-450, 2);
    expect(saldo!.data.getMonth()).toBe(11); // dicembre
    expect(saldo!.data.getDate()).toBe(16);
  });

  it("ultimo anno operativo: aggiunge la voce di rivendita in Investimenti", () => {
    const righe = calcolaFlussiCassa(base);
    // NON righe[righe.length - 1]: quella potrebbe essere la riga
    // "fuori orizzonte" con la sola tassazione differita — la rivendita
    // avviene nell'anno operativo vero e proprio (anno === anniInvestimento).
    const ultimoAnnoOperativo = righe.find((r) => r.anno === base.anniInvestimento)!;
    const voceRivendita = ultimoAnnoOperativo.voci.find(
      (v) => v.descrizione === "Valore di rivendita stimato"
    );
    expect(voceRivendita).toBeDefined();
    expect(voceRivendita!.importo).toBeCloseTo(110000, 2);
  });
});

describe("calcolaFlussiCassa — con mutuo", () => {
  const baseConMutuo: ParametriFlussiCassa = {
    prezzoAcquisto: 100000,
    registro: 2000,
    ipotecaria: 50,
    catastale: 50,
    notaioOnorario: 2000,
    notaioVisure: 150,
    notaioTassaArchivio: 35,
    agenziaTotale: 3660,
    mutuo: {
      importo: 50000,
      tasso: 0.04,
      durataAnni: 5,
      dataDecorrenza: new Date("2024-03-15"),
    },
    speseMutuoIstruttoria: 250,
    speseMutuoImpostaSostitutiva: 1000,
    affittoLordoAnnuo: 9600,
    tassazioneAffittoImporto: 2016,
    tassazioneAffittoEtichetta: "Cedolare secca 21%",
    imuAnnua: 900,
    anniInvestimento: 3,
    prezzoRivenditaStimato: 110000,
  };

  it("anno 0: le voci legate al rogito sono datate come la decorrenza del mutuo", () => {
    const [annoZero] = calcolaFlussiCassa(baseConMutuo);
    annoZero.voci.forEach((v) => {
      expect(v.data.getTime()).toBe(new Date("2024-03-15").getTime());
    });
  });

  it("anno 0: il mutuo erogato compensa parzialmente il prezzo di acquisto", () => {
    const [annoZero] = calcolaFlussiCassa(baseConMutuo);
    const investimenti = sommaCategoria(annoZero.voci, "investimenti");
    expect(investimenti).toBeCloseTo(-50000, 2); // -100000 + 50000
  });

  it("le rate del mutuo sono righe mensili distinte, datate il primo del mese", () => {
    const righe = calcolaFlussiCassa(baseConMutuo);
    const annoUno = righe[1];

    const vociCapitale = annoUno.voci.filter(
      (v) => v.descrizione === "Rimborso capitale mutuo"
    );
    const vociInteressi = annoUno.voci.filter(
      (v) => v.descrizione === "Interessi passivi mutuo"
    );

    // 12 rate nell'anno 1 dell'investimento = le prime 12 rate del piano
    // di ammortamento, cioè marzo 2024 - febbraio 2025 (il piano segue il
    // proprio calendario dalla decorrenza, non l'anno solare dell'anno 1)
    expect(vociCapitale).toHaveLength(12);
    expect(vociInteressi).toHaveLength(12);

    // Ogni data cade il primo del mese
    vociCapitale.forEach((v) => expect(v.data.getDate()).toBe(1));
    vociInteressi.forEach((v) => expect(v.data.getDate()).toBe(1));

    // Le date sono mesi consecutivi
    const mesiOrdinati = vociCapitale
      .map((v) => v.data.getFullYear() * 12 + v.data.getMonth())
      .sort((a, b) => a - b);
    for (let i = 1; i < mesiOrdinati.length; i++) {
      expect(mesiOrdinati[i]).toBe(mesiOrdinati[i - 1] + 1);
    }
  });

  it("la somma di tutte le rate mensili di capitale e interessi coincide con il totale del piano di ammortamento", () => {
    const righe = calcolaFlussiCassa(baseConMutuo);
    const annoUno = righe[1];

    const capitaleTotale = sommaCategoria(
      annoUno.voci.filter((v) => v.descrizione === "Rimborso capitale mutuo"),
      "investimenti"
    );
    const interessiTotale = sommaCategoria(
      annoUno.voci.filter((v) => v.descrizione === "Interessi passivi mutuo"),
      "costi"
    );

    const rataAnnuaImplicita = -(capitaleTotale + interessiTotale);
    expect(rataAnnuaImplicita).toBeGreaterThan(10000);
    expect(rataAnnuaImplicita).toBeLessThan(12000);
  });

  it("ultimo anno operativo: se il mutuo non è ancora estinto, aggiunge l'estinzione del debito residuo", () => {
    const righe = calcolaFlussiCassa(baseConMutuo);
    const ultimoAnnoOperativo = righe.find(
      (r) => r.anno === baseConMutuo.anniInvestimento
    )!;
    const voceEstinzione = ultimoAnnoOperativo.voci.find(
      (v) => v.descrizione === "Estinzione debito residuo mutuo"
    );
    expect(voceEstinzione).toBeDefined();
    expect(voceEstinzione!.importo).toBeLessThan(0);
  });
});

describe("elencoTransazioni", () => {
  it("appiattisce tutte le voci in un unico elenco ordinato cronologicamente", () => {
    const righe = calcolaFlussiCassa({
      prezzoAcquisto: 100000,
      registro: 2000,
      ipotecaria: 50,
      catastale: 50,
      notaioOnorario: 2000,
      notaioVisure: 150,
      notaioTassaArchivio: 35,
      agenziaTotale: 3660,
      mutuo: {
        importo: 50000,
        tasso: 0.04,
        durataAnni: 2,
        dataDecorrenza: new Date("2024-01-01"),
      },
      speseMutuoIstruttoria: 250,
      speseMutuoImpostaSostitutiva: 1000,
      affittoLordoAnnuo: 9600,
      tassazioneAffittoImporto: 2016,
      tassazioneAffittoEtichetta: "Cedolare secca 21%",
      imuAnnua: 900,
      anniInvestimento: 2,
      prezzoRivenditaStimato: 110000,
    });

    const transazioni = elencoTransazioni(righe);

    // Ordinate cronologicamente
    for (let i = 1; i < transazioni.length; i++) {
      expect(transazioni[i].data.getTime()).toBeGreaterThanOrEqual(
        transazioni[i - 1].data.getTime()
      );
    }

    // Il numero totale di transazioni corrisponde alla somma delle voci per anno
    const totaleAtteso = righe.reduce((s, r) => s + r.voci.length, 0);
    expect(transazioni).toHaveLength(totaleAtteso);
  });
});

describe("estraiFlussiTotali, aggiungiCumulato, trovaAnnoRientro, calcolaIRR — integrazione", () => {
  const base: ParametriFlussiCassa = {
    prezzoAcquisto: 100000,
    registro: 2000,
    ipotecaria: 50,
    catastale: 50,
    notaioOnorario: 2000,
    notaioVisure: 150,
    notaioTassaArchivio: 35,
    agenziaTotale: 3660,
    mutuo: null,
    speseMutuoIstruttoria: 0,
    speseMutuoImpostaSostitutiva: 0,
    affittoLordoAnnuo: 40000,
    tassazioneAffittoImporto: 8400,
    tassazioneAffittoEtichetta: "Cedolare secca 21%",
    imuAnnua: 900,
    anniInvestimento: 3,
    prezzoRivenditaStimato: 110000,
  };

  it("il flusso totale per anno resta corretto anche con la maggiore granularità delle voci", () => {
    const righe = calcolaFlussiCassa(base);
    const conCumulato = aggiungiCumulato(righe);
    let atteso = 0;
    conCumulato.forEach((riga, indice) => {
      atteso += righe[indice].flussoTotale;
      expect(riga.flussoCumulato).toBeCloseTo(atteso, 2);
    });
  });

  it("trova l'anno di rientro e calcola l'IRR correttamente", () => {
    const righe = calcolaFlussiCassa(base);
    const annoRientro = trovaAnnoRientro(aggiungiCumulato(righe));
    expect(annoRientro).not.toBeNull();

    const irr = calcolaIRR(estraiFlussiTotali(righe));
    expect(irr).not.toBeNull();
  });
});

describe("Detrazioni fiscali (mediazione + interessi mutuo)", () => {
  it("nessuna detrazione se l'immobile non è abitazione principale (caso di default)", () => {
    const righe = calcolaFlussiCassa({
      prezzoAcquisto: 100000,
      registro: 2000,
      ipotecaria: 50,
      catastale: 50,
      notaioOnorario: 2000,
      notaioVisure: 150,
      notaioTassaArchivio: 35,
      agenziaTotale: 3660,
      mutuo: {
        importo: 50000,
        tasso: 0.04,
        durataAnni: 5,
        dataDecorrenza: new Date("2024-01-01"),
      },
      speseMutuoIstruttoria: 250,
      speseMutuoImpostaSostitutiva: 1000,
      affittoLordoAnnuo: 9600,
      tassazioneAffittoImporto: 2016,
      tassazioneAffittoEtichetta: "Cedolare secca 21%",
      imuAnnua: 900,
      anniInvestimento: 2,
      prezzoRivenditaStimato: 110000,
      // immobileAbitazionePrincipale omesso: default false
    });

    const tutteLeVoci = righe.flatMap((r) => r.voci);
    expect(tutteLeVoci.some((v) => v.descrizione.startsWith("Detrazione"))).toBe(
      false
    );
  });

  it("con abitazione principale: mediazione all'anno 1 (fisso), interessi mutuo differiti di un anno rispetto a quando maturano", () => {
    const righe = calcolaFlussiCassa({
      prezzoAcquisto: 100000,
      registro: 2000,
      ipotecaria: 50,
      catastale: 50,
      notaioOnorario: 2000,
      notaioVisure: 150,
      notaioTassaArchivio: 35,
      agenziaTotale: 3660,
      mutuo: {
        importo: 50000,
        tasso: 0.04,
        durataAnni: 5,
        dataDecorrenza: new Date("2024-01-01"),
      },
      speseMutuoIstruttoria: 250,
      speseMutuoImpostaSostitutiva: 1000,
      affittoLordoAnnuo: 9600,
      tassazioneAffittoImporto: 2016,
      tassazioneAffittoEtichetta: "Cedolare secca 21%",
      imuAnnua: 900,
      anniInvestimento: 2,
      prezzoRivenditaStimato: 110000,
      immobileAbitazionePrincipale: true,
    });

    // Anno 0: nessuna detrazione (mai, per costruzione)
    const annoZero = righe[0];
    expect(
      annoZero.voci.some((v) => v.descrizione.startsWith("Detrazione"))
    ).toBe(false);

    // Anno 1: SOLO la detrazione mediazione (fissa all'anno 1) — non
    // ancora la detrazione sugli interessi dell'anno 1 stesso, che si
    // realizza solo l'anno dopo.
    const annoUno = righe[1];
    const mediazioneAnnoUno = annoUno.voci.find((v) =>
      v.descrizione.includes("mediazione")
    );
    expect(mediazioneAnnoUno).toBeDefined();
    expect(mediazioneAnnoUno!.importo).toBeCloseTo(190, 2); // tetto 1000€ * 19%
    expect(
      annoUno.voci.some((v) => v.descrizione.includes("interessi mutuo"))
    ).toBe(false);

    // Anno 2 (ultimo anno operativo, anniInvestimento=2): qui arriva la
    // detrazione sugli interessi PAGATI nell'anno 1 (differita di un anno).
    const annoDue = righe.find((r) => r.anno === 2)!;
    const interessiAnnoDue = annoDue.voci.find((v) =>
      v.descrizione.includes("interessi mutuo")
    );
    expect(interessiAnnoDue).toBeDefined();
    expect(interessiAnnoDue!.importo).toBeGreaterThan(0);
    expect(interessiAnnoDue!.importo).toBeLessThanOrEqual(760); // tetto 4000€ * 19%
  });

  it("l'ultimo anno genera una riga oltre anniInvestimento con la tassazione e le detrazioni differite", () => {
    const righe = calcolaFlussiCassa({
      prezzoAcquisto: 100000,
      registro: 2000,
      ipotecaria: 50,
      catastale: 50,
      notaioOnorario: 2000,
      notaioVisure: 150,
      notaioTassaArchivio: 35,
      agenziaTotale: 3660,
      mutuo: {
        importo: 50000,
        tasso: 0.04,
        durataAnni: 5,
        dataDecorrenza: new Date("2024-01-01"),
      },
      speseMutuoIstruttoria: 250,
      speseMutuoImpostaSostitutiva: 1000,
      affittoLordoAnnuo: 9600,
      tassazioneAffittoImporto: 2016,
      tassazioneAffittoEtichetta: "Cedolare secca 21%",
      imuAnnua: 900,
      anniInvestimento: 2, // vendita nell'anno 2
      prezzoRivenditaStimato: 110000,
      immobileAbitazionePrincipale: true,
    });

    // Riga extra oltre l'orizzonte: anno 3 (= anniInvestimento + 1)
    const rigaOltreOrizzonte = righe.find((r) => r.anno === 3);
    expect(rigaOltreOrizzonte).toBeDefined();

    // Contiene la tassazione affitto dell'anno 2 (l'ultimo anno operativo,
    // quello della vendita) e la detrazione interessi dell'anno 2 —
    // entrambe realizzate l'anno dopo, quando l'immobile non è più tuo,
    // ma il beneficio/costo fiscale resta comunque dovuto.
    expect(
      rigaOltreOrizzonte!.voci.some((v) =>
        v.descrizione.startsWith("Tassazione affitto")
      )
    ).toBe(true);
    expect(
      rigaOltreOrizzonte!.voci.some((v) =>
        v.descrizione.includes("interessi mutuo")
      )
    ).toBe(true);

    // Non contiene voci di rivendita/estinzione debito: quelle restano
    // nell'anno 2, l'anno operativo reale della vendita.
    expect(
      rigaOltreOrizzonte!.voci.some(
        (v) => v.descrizione === "Valore di rivendita stimato"
      )
    ).toBe(false);

    // L'IRR deve comunque tenere conto di questa riga: la somma dei
    // flussi totali usata da calcolaIRR include tutte le righe restituite,
    // riga extra compresa.
    const flussi = estraiFlussiTotali(righe);
    expect(flussi).toHaveLength(righe.length);
    expect(flussi[flussi.length - 1]).toBe(rigaOltreOrizzonte!.flussoTotale);
  });
});

describe("Differimento della tassazione affitto all'anno successivo", () => {
  it("la tassazione affitto dell'anno N compare nella riga dell'anno N+1, non nella riga N", () => {
    const righe = calcolaFlussiCassa({
      prezzoAcquisto: 100000,
      registro: 2000,
      ipotecaria: 50,
      catastale: 50,
      notaioOnorario: 2000,
      notaioVisure: 150,
      notaioTassaArchivio: 35,
      agenziaTotale: 3660,
      mutuo: null,
      speseMutuoIstruttoria: 0,
      speseMutuoImpostaSostitutiva: 0,
      affittoLordoAnnuo: 9600,
      tassazioneAffittoImporto: 2016,
      tassazioneAffittoEtichetta: "Cedolare secca 21%",
      imuAnnua: 900,
      anniInvestimento: 3,
      prezzoRivenditaStimato: 110000,
    });

    const annoUno = righe.find((r) => r.anno === 1)!;
    const annoDue = righe.find((r) => r.anno === 2)!;

    expect(
      annoUno.voci.some((v) => v.descrizione.startsWith("Tassazione affitto"))
    ).toBe(false);
    expect(
      annoDue.voci.some((v) => v.descrizione.startsWith("Tassazione affitto"))
    ).toBe(true);

    const voceTassazione = annoDue.voci.find((v) =>
      v.descrizione.startsWith("Tassazione affitto")
    )!;
    expect(voceTassazione.importo).toBeCloseTo(-2016, 2);
  });

  it("IMU e TARI restano nell'anno di competenza (non differite)", () => {
    const righe = calcolaFlussiCassa({
      prezzoAcquisto: 100000,
      registro: 2000,
      ipotecaria: 50,
      catastale: 50,
      notaioOnorario: 2000,
      notaioVisure: 150,
      notaioTassaArchivio: 35,
      agenziaTotale: 3660,
      mutuo: null,
      speseMutuoIstruttoria: 0,
      speseMutuoImpostaSostitutiva: 0,
      affittoLordoAnnuo: 9600,
      tassazioneAffittoImporto: 2016,
      tassazioneAffittoEtichetta: "Cedolare secca 21%",
      imuAnnua: 900,
      tariAnnua: 240,
      anniInvestimento: 2,
      prezzoRivenditaStimato: 110000,
    });

    const annoUno = righe.find((r) => r.anno === 1)!;
    expect(
      annoUno.voci.some((v) => v.descrizione === "IMU (acconto)")
    ).toBe(true);
    expect(
      annoUno.voci.some((v) => v.descrizione === "TARI (acconto)")
    ).toBe(true);
  });
});
