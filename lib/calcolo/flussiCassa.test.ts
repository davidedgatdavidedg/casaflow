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

function trova(voci: { descrizione: string }[], sottostringa: string) {
  return voci.find((v) => v.descrizione.includes(sottostringa));
}

describe("calcolaFlussiCassa — acquisto al 1° gennaio (nessun mutuo): anno 0 è già un anno operativo pieno", () => {
  const base: ParametriFlussiCassa = {
    dataAcquisto: new Date(new Date().getFullYear(), 0, 1),
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

  it("l'anno 0 contiene sia i costi di acquisto sia i flussi operativi pieni (acquisto = 1° gennaio)", () => {
    const [annoZero] = calcolaFlussiCassa(base);

    // Costi di acquisto, come prima
    expect(sommaCategoria(annoZero.voci, "investimenti")).toBeCloseTo(-100000, 2);

    // Ora anche l'affitto lordo pieno (acquisto = gennaio → 12/12 mesi)
    const affitto = trova(annoZero.voci, "Affitto lordo");
    expect(affitto).toBeDefined();
    expect(affitto!.descrizione).not.toContain("periodo parziale");
    expect(affitto!.importo).toBeCloseTo(9600, 2);

    // IMU piena, con lo split acconto/saldo (non pro-rata, essendo un anno pieno)
    const imuAcconto = trova(annoZero.voci, "IMU (acconto)");
    expect(imuAcconto).toBeDefined();
    expect(imuAcconto!.importo).toBeCloseTo(-450, 2);
  });

  it("la tassazione affitto dell'anno 0 è differita all'anno 1, non presente nell'anno 0 stesso", () => {
    const righe = calcolaFlussiCassa(base);
    const annoZero = righe[0];
    const annoUno = righe.find((r) => r.anno === 1)!;

    expect(trova(annoZero.voci, "Tassazione affitto")).toBeUndefined();
    const tassazione = trova(annoUno.voci, "Tassazione affitto");
    expect(tassazione).toBeDefined();
    expect(tassazione!.importo).toBeCloseTo(-2016, 2);
  });

  it("genera una riga per ciascun anno operativo, più una oltre l'orizzonte per la tassazione differita dell'ultimo anno", () => {
    const righe = calcolaFlussiCassa(base);
    expect(righe.map((r) => r.anno)).toEqual([0, 1, 2, 3, 4]);
  });

  it("ultimo anno operativo: aggiunge la voce di rivendita in Investimenti", () => {
    const righe = calcolaFlussiCassa(base);
    const ultimoAnnoOperativo = righe.find((r) => r.anno === base.anniInvestimento)!;
    const voceRivendita = trova(ultimoAnnoOperativo.voci, "Valore di rivendita stimato");
    expect(voceRivendita).toBeDefined();
    expect(voceRivendita!.importo).toBeCloseTo(110000, 2);

    // La riga oltre l'orizzonte (anno 4) NON contiene la rivendita: solo
    // la tassazione differita dell'anno 3.
    const rigaOltreOrizzonte = righe.find((r) => r.anno === 4)!;
    expect(trova(rigaOltreOrizzonte.voci, "Valore di rivendita stimato")).toBeUndefined();
    expect(trova(rigaOltreOrizzonte.voci, "Tassazione affitto")).toBeDefined();
  });

  it("con acquisto esattamente il 1° gennaio, la vendita cade anch'essa il 1° gennaio (coincidenza dell'anniversario) e l'ultimo anno è pro-rata a 1/12, non un anno pieno", () => {
    const righe = calcolaFlussiCassa(base);
    const ultimoAnnoOperativo = righe.find((r) => r.anno === base.anniInvestimento)!;

    const voceRivendita = trova(ultimoAnnoOperativo.voci, "Valore di rivendita stimato")!;
    expect(voceRivendita.data.getMonth()).toBe(0); // gennaio
    expect(voceRivendita.data.getDate()).toBe(1);

    // Prima di questa correzione, l'ultimo anno riceveva un affitto/IMU
    // PIENI pur vendendo il primissimo giorno dell'anno stesso — un
    // controsenso economico. Ora è correttamente pro-rata a 1/12.
    const affitto = trova(ultimoAnnoOperativo.voci, "Affitto lordo")!;
    expect(affitto.descrizione).toContain("periodo parziale");
    expect(affitto.importo).toBeCloseTo(9600 / 12, 2);
  });
});

describe("calcolaFlussiCassa — caso reale segnalato: acquisto 20/04/2023, orizzonte 3 anni", () => {
  it("la vendita cade esattamente il 20/04/2026 (anniversario esatto), non il 1° gennaio 2026", () => {
    const righe = calcolaFlussiCassa({
      dataAcquisto: new Date(2023, 3, 20), // 20 aprile 2023 (mese 0-indexed: 3 = aprile)
      prezzoAcquisto: 215000,
      registro: 7020,
      ipotecaria: 50,
      catastale: 50,
      notaioOnorario: 9800,
      notaioVisure: 0,
      notaioTassaArchivio: 35,
      agenziaTotale: 0,
      mutuo: null,
      speseMutuoIstruttoria: 0,
      speseMutuoImpostaSostitutiva: 0,
      affittoLordoAnnuo: 12000,
      tassazioneAffittoImporto: 2520,
      tassazioneAffittoEtichetta: "Cedolare secca 21%",
      imuAnnua: 1120.56,
      manutenzioneOrdinariaAnnua: 537.5,
      manutenzioneStraordinariaAnnua: 537.5,
      assicurazioneAnnua: 185,
      altriCostiAcquisto: 1650,
      anniInvestimento: 3,
      prezzoRivenditaStimato: 236995.13,
    });

    const ultimoAnnoOperativo = righe.find((r) => r.anno === 3)!;
    const voceRivendita = trova(ultimoAnnoOperativo.voci, "Valore di rivendita stimato")!;

    expect(voceRivendita.data.getFullYear()).toBe(2026);
    expect(voceRivendita.data.getMonth()).toBe(3); // aprile
    expect(voceRivendita.data.getDate()).toBe(20);

    // L'ultimo anno (2026) è pro-rata sui 4 mesi gennaio-aprile (incluso).
    const affittoUltimoAnno = trova(ultimoAnnoOperativo.voci, "Affitto lordo")!;
    expect(affittoUltimoAnno.descrizione).toContain("periodo parziale");
    expect(affittoUltimoAnno.importo).toBeCloseTo(12000 * (4 / 12), 2);
  });
});

describe("calcolaFlussiCassa — acquisto a metà anno (con mutuo): periodo parziale nell'anno 0", () => {
  // Caso segnalato dall'utente: acquisto il 3 settembre. La decorrenza
  // del mutuo NON coincide più con l'acquisto: parte il 1° del mese
  // successivo (1° ottobre 2026), coerentemente con la prassi reale.
  const baseMetaAnno: ParametriFlussiCassa = {
    dataAcquisto: new Date(2026, 8, 3), // 3 settembre 2026 (mese 0-indexed: 8 = settembre)
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
      durataAnni: 20,
      dataDecorrenza: new Date(2026, 9, 1), // 1° ottobre 2026: un mese dopo l'acquisto
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

  it("l'anno 0 contiene esattamente 3 rate di mutuo (ottobre-dicembre 2026, dalla decorrenza del mutuo, non dall'acquisto)", () => {
    const [annoZero] = calcolaFlussiCassa(baseMetaAnno);
    const rateCapitale = annoZero.voci.filter(
      (v) => v.descrizione === "Rimborso capitale mutuo"
    );
    expect(rateCapitale).toHaveLength(3);

    const mesiRate = rateCapitale
      .map((v) => v.data.getFullYear() * 12 + v.data.getMonth())
      .sort((a, b) => a - b);
    // Ottobre, novembre, dicembre 2026 (mesi 9,10,11) — NON settembre,
    // che è il mese di acquisto ma non ancora di decorrenza del mutuo.
    expect(mesiRate).toEqual([2026 * 12 + 9, 2026 * 12 + 10, 2026 * 12 + 11]);
  });

  it("l'anno 1 (2027) contiene le 12 rate di gennaio-dicembre 2027, non un mix a cavallo", () => {
    const righe = calcolaFlussiCassa(baseMetaAnno);
    const annoUno = righe.find((r) => r.anno === 1)!;
    expect(annoUno.annoCalendario).toBe(2027);

    const rateCapitale = annoUno.voci.filter(
      (v) => v.descrizione === "Rimborso capitale mutuo"
    );
    expect(rateCapitale).toHaveLength(12);

    const anniDelleRate = new Set(rateCapitale.map((v) => v.data.getFullYear()));
    expect(anniDelleRate.size).toBe(1);
    expect(anniDelleRate.has(2027)).toBe(true);
  });

  it("l'affitto e l'IMU dell'anno 0 sono pro-rata sui 4 mesi POSSEDUTI (dall'acquisto, non dalla decorrenza mutuo)", () => {
    const [annoZero] = calcolaFlussiCassa(baseMetaAnno);

    const affitto = trova(annoZero.voci, "Affitto lordo");
    expect(affitto).toBeDefined();
    expect(affitto!.descrizione).toContain("periodo parziale");
    expect(affitto!.importo).toBeCloseTo(9600 * (4 / 12), 2); // 3200€ — 4 mesi da settembre, non da ottobre

    const imu = trova(annoZero.voci, "IMU");
    expect(imu).toBeDefined();
    expect(imu!.descrizione).toContain("periodo parziale");
    expect(imu!.importo).toBeCloseTo(-900 * (4 / 12), 2); // -300€
  });

  it("la detrazione sugli interessi pagati nell'anno 0 (periodo parziale) compare nell'anno 1, non nell'anno 0", () => {
    const righe = calcolaFlussiCassa({
      ...baseMetaAnno,
      immobileAbitazionePrincipale: true,
    });
    const annoZero = righe[0];
    const annoUno = righe.find((r) => r.anno === 1)!;

    expect(trova(annoZero.voci, "Detrazione interessi mutuo")).toBeUndefined();
    const detrazione = trova(annoUno.voci, "Detrazione interessi mutuo");
    expect(detrazione).toBeDefined();
    expect(detrazione!.importo).toBeGreaterThan(0);
  });

  it("il capitale residuo a fine dell'ultimo anno operativo tiene conto correttamente della decorrenza mutuo separata dall'acquisto", () => {
    const righe = calcolaFlussiCassa(baseMetaAnno);
    const ultimoAnnoOperativo = righe.find((r) => r.anno === baseMetaAnno.anniInvestimento)!;
    const voceEstinzione = trova(ultimoAnnoOperativo.voci, "Estinzione debito residuo mutuo");
    expect(voceEstinzione).toBeDefined();
    expect(voceEstinzione!.importo).toBeLessThan(0);

    // Vendita esatta: 3 settembre 2026 + 3 anni = 3 settembre 2029.
    // Rate totali fino a quella data: 3 (ott-dic 2026) + 12 (2027) +
    // 12 (2028) + 9 (gen-set 2029, l'ultimo anno è ora parziale fino al
    // mese della vendita, non più un anno pieno) = 36, non più 39.
    const tutteLeVoci = righe.flatMap((r) => r.voci);
    const tutteLeRateCapitale = tutteLeVoci.filter(
      (v) => v.descrizione === "Rimborso capitale mutuo"
    );
    expect(tutteLeRateCapitale).toHaveLength(36);
  });

  it("la vendita cade esattamente all'anniversario dell'acquisto (3 settembre 2029), non al 1° gennaio", () => {
    const righe = calcolaFlussiCassa(baseMetaAnno);
    const ultimoAnnoOperativo = righe.find((r) => r.anno === baseMetaAnno.anniInvestimento)!;
    const voceRivendita = trova(ultimoAnnoOperativo.voci, "Valore di rivendita stimato")!;

    expect(voceRivendita.data.getFullYear()).toBe(2029);
    expect(voceRivendita.data.getMonth()).toBe(8); // settembre (0-indexed)
    expect(voceRivendita.data.getDate()).toBe(3);
  });

  it("l'ultimo anno (2029) ha affitto/IMU pro-rata sui 9 mesi fino alla vendita (gennaio-settembre), non un anno pieno", () => {
    const righe = calcolaFlussiCassa(baseMetaAnno);
    const ultimoAnnoOperativo = righe.find((r) => r.anno === baseMetaAnno.anniInvestimento)!;

    const affitto = trova(ultimoAnnoOperativo.voci, "Affitto lordo")!;
    expect(affitto.descrizione).toContain("periodo parziale");
    expect(affitto.importo).toBeCloseTo(9600 * (9 / 12), 2); // 7200€

    const imu = trova(ultimoAnnoOperativo.voci, "IMU")!;
    expect(imu.descrizione).toContain("periodo parziale");
    expect(imu.importo).toBeCloseTo(-900 * (9 / 12), 2); // -675€
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
      dataAcquisto: new Date(2024, 0, 1),
      mutuo: {
        importo: 50000,
        tasso: 0.04,
        durataAnni: 2,
        dataDecorrenza: new Date(2024, 0, 1),
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

    for (let i = 1; i < transazioni.length; i++) {
      expect(transazioni[i].data.getTime()).toBeGreaterThanOrEqual(
        transazioni[i - 1].data.getTime()
      );
    }

    const totaleAtteso = righe.reduce((s, r) => s + r.voci.length, 0);
    expect(transazioni).toHaveLength(totaleAtteso);
  });
});

describe("estraiFlussiTotali, aggiungiCumulato, trovaAnnoRientro, calcolaIRR — integrazione", () => {
  const base: ParametriFlussiCassa = {
    dataAcquisto: new Date(new Date().getFullYear(), 0, 1),
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

  it("il flusso cumulato resta coerente con la somma progressiva dei flussi totali, riga fuori orizzonte inclusa", () => {
    const righe = calcolaFlussiCassa(base);
    const conCumulato = aggiungiCumulato(righe);
    let atteso = 0;
    conCumulato.forEach((riga, indice) => {
      atteso += righe[indice].flussoTotale;
      expect(riga.flussoCumulato).toBeCloseTo(atteso, 2);
    });
  });

  it("trova l'anno di rientro e calcola l'IRR correttamente, includendo eventuali flussi oltre l'orizzonte", () => {
    const righe = calcolaFlussiCassa(base);
    const annoRientro = trovaAnnoRientro(aggiungiCumulato(righe));
    expect(annoRientro).not.toBeNull();

    const flussiTotali = estraiFlussiTotali(righe);
    expect(flussiTotali).toHaveLength(righe.length);

    const irr = calcolaIRR(flussiTotali);
    expect(irr).not.toBeNull();
  });
});

describe("Detrazioni fiscali (mediazione + interessi mutuo)", () => {
  const baseConMutuo: ParametriFlussiCassa = {
    dataAcquisto: new Date(2024, 0, 1),
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
      dataDecorrenza: new Date(2024, 0, 1),
    },
    speseMutuoIstruttoria: 250,
    speseMutuoImpostaSostitutiva: 1000,
    affittoLordoAnnuo: 9600,
    tassazioneAffittoImporto: 2016,
    tassazioneAffittoEtichetta: "Cedolare secca 21%",
    imuAnnua: 900,
    anniInvestimento: 2,
    prezzoRivenditaStimato: 110000,
  };

  it("nessuna detrazione se l'immobile non è abitazione principale (caso di default)", () => {
    const righe = calcolaFlussiCassa(baseConMutuo);
    const tutteLeVoci = righe.flatMap((r) => r.voci);
    expect(tutteLeVoci.some((v) => v.descrizione.startsWith("Detrazione"))).toBe(
      false
    );
  });

  it("con abitazione principale: mediazione all'anno 1 (fisso), interessi mutuo differiti di un anno rispetto a quando maturano", () => {
    const righe = calcolaFlussiCassa({
      ...baseConMutuo,
      immobileAbitazionePrincipale: true,
    });

    const annoZero = righe[0];
    expect(
      annoZero.voci.some((v) => v.descrizione.startsWith("Detrazione"))
    ).toBe(false);

    // Anno 1: la detrazione mediazione (fissa all'anno 1) — ma non
    // ancora la detrazione sugli interessi dell'anno 1 stesso.
    const annoUno = righe.find((r) => r.anno === 1)!;
    const mediazione = trova(annoUno.voci, "mediazione");
    expect(mediazione).toBeDefined();
    expect(mediazione!.importo).toBeCloseTo(190, 2); // tetto 1000€ * 19%
    expect(trova(annoUno.voci, "interessi mutuo")).toBeUndefined();

    // Anno 2: qui arriva la detrazione sugli interessi PAGATI nell'anno 1.
    const annoDue = righe.find((r) => r.anno === 2)!;
    const interessiAnnoDue = trova(annoDue.voci, "interessi mutuo");
    expect(interessiAnnoDue).toBeDefined();
    expect(interessiAnnoDue!.importo).toBeGreaterThan(0);
    expect(interessiAnnoDue!.importo).toBeLessThanOrEqual(760); // tetto 4000€ * 19%
  });

  it("l'ultimo anno genera una riga oltre anniInvestimento con la tassazione e le detrazioni differite", () => {
    const righe = calcolaFlussiCassa({
      ...baseConMutuo,
      immobileAbitazionePrincipale: true,
    });

    const rigaOltreOrizzonte = righe.find((r) => r.anno === 3);
    expect(rigaOltreOrizzonte).toBeDefined();
    expect(trova(rigaOltreOrizzonte!.voci, "Tassazione affitto")).toBeDefined();
    expect(trova(rigaOltreOrizzonte!.voci, "interessi mutuo")).toBeDefined();
    expect(trova(rigaOltreOrizzonte!.voci, "Valore di rivendita stimato")).toBeUndefined();

    const flussi = estraiFlussiTotali(righe);
    expect(flussi).toHaveLength(righe.length);
    expect(flussi[flussi.length - 1]).toBe(rigaOltreOrizzonte!.flussoTotale);
  });
});

describe("Detrazioni su ristrutturazione e mobili (10 quote annuali)", () => {
  const baseConRistrutturazione: ParametriFlussiCassa = {
    dataAcquisto: new Date(new Date().getFullYear(), 0, 1),
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
    ristrutturazione: 20000,
    arredamento: 3000,
    anniInvestimento: 3, // volutamente più corto delle 10 quote
    prezzoRivenditaStimato: 110000,
  };

  it("genera 10 quote di ristrutturazione (36%, non abitazione principale) e 10 di mobili, distribuite anno per anno", () => {
    const righe = calcolaFlussiCassa(baseConRistrutturazione);
    const tutteLeVoci = righe.flatMap((r) => r.voci);

    const quoteRistrutturazione = tutteLeVoci.filter((v) =>
      v.descrizione.includes("Detrazione ristrutturazione")
    );
    expect(quoteRistrutturazione).toHaveLength(10);
    // 20000 * 36% = 7200 totale, / 10 = 720/anno
    quoteRistrutturazione.forEach((v) => expect(v.importo).toBeCloseTo(720, 2));

    const quoteMobili = tutteLeVoci.filter((v) =>
      v.descrizione.includes("Detrazione mobili")
    );
    expect(quoteMobili).toHaveLength(10);
    // 3000 * 50% = 1500 totale, / 10 = 150/anno
    quoteMobili.forEach((v) => expect(v.importo).toBeCloseTo(150, 2));
  });

  it("con abitazione principale, la ristrutturazione usa il 50% invece del 36%", () => {
    const righe = calcolaFlussiCassa({
      ...baseConRistrutturazione,
      immobileAbitazionePrincipale: true,
    });
    const tutteLeVoci = righe.flatMap((r) => r.voci);
    const primaQuota = tutteLeVoci.find((v) =>
      v.descrizione.includes("Detrazione ristrutturazione (quota 1")
    );
    expect(primaQuota).toBeDefined();
    // 20000 * 50% = 10000 totale, / 10 = 1000/anno
    expect(primaQuota!.importo).toBeCloseTo(1000, 2);
  });

  it("senza ristrutturazione collegata, l'arredamento non genera alcuna detrazione mobili", () => {
    const righe = calcolaFlussiCassa({
      ...baseConRistrutturazione,
      ristrutturazione: 0,
    });
    const tutteLeVoci = righe.flatMap((r) => r.voci);
    expect(
      tutteLeVoci.some((v) => v.descrizione.includes("Detrazione mobili"))
    ).toBe(false);
  });

  it("con anniInvestimento più corto delle 10 quote, le quote residue creano righe oltre l'orizzonte", () => {
    const righe = calcolaFlussiCassa(baseConRistrutturazione); // anniInvestimento: 3
    const anniConQuote = righe
      .filter((r) =>
        r.voci.some((v) => v.descrizione.includes("Detrazione ristrutturazione"))
      )
      .map((r) => r.anno)
      .sort((a, b) => a - b);

    // Le quote vanno dall'anno 1 all'anno 10, indipendentemente da
    // anniInvestimento=3 — quindi devono comparire righe fino all'anno 10.
    expect(anniConQuote).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(Math.max(...righe.map((r) => r.anno))).toBeGreaterThanOrEqual(10);
  });

  it("l'IRR resta calcolabile anche con le 10 quote oltre l'orizzonte originale", () => {
    const righe = calcolaFlussiCassa(baseConRistrutturazione);
    const flussi = estraiFlussiTotali(righe);
    const irr = calcolaIRR(flussi);
    expect(irr).not.toBeNull();
  });
});

describe("Categoria 'oneri': interessi passivi e istruttoria bancaria, separati dai costi operativi", () => {
  it("interessi passivi e istruttoria bancaria sono categorizzati come 'oneri', non 'costi'", () => {
    const righe = calcolaFlussiCassa({
      dataAcquisto: new Date(2024, 0, 1),
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
        dataDecorrenza: new Date(2024, 0, 1),
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

    const tutteLeVoci = righe.flatMap((r) => r.voci);

    const istruttoria = tutteLeVoci.find((v) => v.descrizione === "Istruttoria bancaria mutuo");
    expect(istruttoria).toBeDefined();
    expect(istruttoria!.categoria).toBe("oneri");

    const interessi = tutteLeVoci.filter((v) => v.descrizione === "Interessi passivi mutuo");
    expect(interessi.length).toBeGreaterThan(0);
    interessi.forEach((v) => expect(v.categoria).toBe("oneri"));

    // Manutenzione/utenze/condominio restano "costi" veri e propri.
    expect(
      tutteLeVoci.every((v) => v.descrizione !== "Interessi passivi mutuo" || v.categoria === "oneri")
    ).toBe(true);
  });
});

describe("Rendita figurativa: ricavo non tassato, solo se l'affitto è zero", () => {
  const base: ParametriFlussiCassa = {
    dataAcquisto: new Date(2024, 0, 1),
    prezzoAcquisto: 100000,
    registro: 2000,
    ipotecaria: 50,
    catastale: 50,
    notaioOnorario: 2000,
    notaioVisure: 150,
    notaioTassaArchivio: 35,
    agenziaTotale: 0,
    mutuo: null,
    speseMutuoIstruttoria: 0,
    speseMutuoImpostaSostitutiva: 0,
    affittoLordoAnnuo: 0,
    renditaFigurativaAnnua: 8000,
    tassazioneAffittoImporto: 0,
    tassazioneAffittoEtichetta: "",
    imuAnnua: 0,
    anniInvestimento: 2,
    prezzoRivenditaStimato: 110000,
  };

  it("con affitto a zero, genera una voce di ricavo pari alla rendita figurativa, senza alcuna imposta collegata", () => {
    const righe = calcolaFlussiCassa(base);
    const annoUno = righe.find((r) => r.anno === 1)!;
    const voce = trova(annoUno.voci, "Rendita figurativa")!;

    expect(voce).toBeDefined();
    expect(voce.categoria).toBe("ricavi");
    expect(voce.importo).toBeCloseTo(8000, 2);

    // Nessuna voce di tassazione con importo diverso da zero generata
    // dalla rendita figurativa in nessuna riga.
    const tutteLeVoci = righe.flatMap((r) => r.voci);
    const tassazioni = tutteLeVoci.filter((v) =>
      v.descrizione.startsWith("Tassazione affitto")
    );
    tassazioni.forEach((t) => expect(t.importo).toBe(0));
  });

  it("con affitto > 0, la rendita figurativa NON genera alcuna voce (mutuamente esclusive)", () => {
    const righe = calcolaFlussiCassa({
      ...base,
      affittoLordoAnnuo: 9600,
      tassazioneAffittoImporto: 2016,
      tassazioneAffittoEtichetta: "Cedolare secca 21%",
    });
    const tutteLeVoci = righe.flatMap((r) => r.voci);
    expect(
      tutteLeVoci.some((v) => v.descrizione.includes("Rendita figurativa"))
    ).toBe(false);
  });
});
