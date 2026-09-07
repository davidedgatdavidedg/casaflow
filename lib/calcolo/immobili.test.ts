// lib/calcolo/immobili.test.ts
//
// Test orientati all'immobile: per ogni immobile elencato in DA_TESTARE,
// verifica IMU (per unità), imposte di acquisto, spese di agenzia, spese
// di attivazione mutuo e costi notarili — ciascuno solo se la fixture
// definisce i relativi valori attesi.
//
// Per includere o escludere un immobile da questo giro di test, commenta
// o decommenta la riga corrispondente qui sotto. I dati e i valori attesi
// si definiscono in __fixtures__/immobili.ts, non qui.
//
// Ammortamento mutuo e detrazioni restano in file di test separati
// (ammortamento.test.ts, detrazioni.test.ts): dipendono dal mutuo scelto
// o dalle spese sostenute, non dall'identità di un immobile.

import { describe, it, expect } from "vitest";
import { calcolaImu } from "./imu";
import { calcolaImposteAcquisto } from "./imposteAcquisto";
import { calcolaSpeseAgenzia } from "./speseAgenzia";
import { calcolaSpeseMutuo } from "./speseMutuo";
import { calcolaCostiNotaio } from "./costiNotaio";
import type { Immobile, UnitaCatastale } from "./tipi";
import { IMMOBILI, type ImmobileTest } from "./__fixtures__/immobili";

const DA_TESTARE: ImmobileTest[] = [
  // --- Reali ---
  IMMOBILI.moggioViaProvinciale,
  IMMOBILI.strambio,
  IMMOBILI.viaDiaz,
  IMMOBILI.pescKing,
  IMMOBILI.pescLiberazione,

  // --- Fittizi: casi limite IMU ---
  IMMOBILI.fittizioLussoAbitazionePrincipale,
  IMMOBILI.fittizioLussoRenditaBassa,
  IMMOBILI.fittizioLussoAffittata,
  IMMOBILI.fittizioNegozioC1,
  IMMOBILI.fittizioOpificioD1,
  IMMOBILI.fittizioAliquotaPersonalizzata,
  IMMOBILI.fittizioCoefficienteRivalutazione,
  IMMOBILI.fittizioAbitazionePrincipaleEsente,
  IMMOBILI.fittizioSecondaCasaNonLocata,

  // --- Fittizi: casi limite imposte di acquisto ---
  IMMOBILI.fittizioPrimaCasaRegistroBase,
  IMMOBILI.fittizioSecondaCasaRegistro9,
  IMMOBILI.fittizioImportoMinimoRegistro,
  IMMOBILI.fittizioAcquistoDaImpresa,

  // --- Fittizi: spese di agenzia ---
  IMMOBILI.fittizioAgenziaDefault,
  IMMOBILI.fittizioAgenziaPersonalizzata,

  // --- Fittizi: spese di attivazione mutuo ---
  IMMOBILI.fittizioSpeseMutuoPrimaCasa,
  IMMOBILI.fittizioSpeseMutuoSecondaCasa,

  // --- Fittizi: costi notarili ---
  IMMOBILI.fittizioNotaioDefault,
  IMMOBILI.fittizioNotaioPersonalizzato,
];

describe.each(DA_TESTARE)("$etichetta", (immobile) => {
  immobile.unita.forEach((unita, indice) => {
    if (unita.imuAtteso === undefined) return;

    const nomeTest =
      immobile.unita.length > 1
        ? `IMU — ${unita.etichetta ?? `unità ${indice + 1}`}`
        : "IMU";

    it(nomeTest, () => {
      const risultato = calcolaImu(
        unita.renditaCatastale,
        unita.categoriaCatastale,
        unita.statoAbitativoImu ?? "affittata",
        unita.comune,
        unita.aliquotaImuPersonalizzata,
        unita.coefficienteRivalutazionePersonalizzato
      );
      expect(risultato).toBeCloseTo(unita.imuAtteso!, 1);
    });
  });

  if (immobile.registroAtteso !== undefined) {
    it("Imposte di acquisto", () => {
      const unitaComplete: UnitaCatastale[] = immobile.unita.map((u) => ({
        comune: u.comune,
        categoriaCatastale: u.categoriaCatastale,
        renditaCatastale: u.renditaCatastale,
        statoAbitativoImu: u.statoAbitativoImu ?? "affittata",
      }));

      const datiAcquisto: Immobile = {
        prezzoAcquisto: immobile.prezzoAcquisto ?? 0,
        primaCasa: immobile.primaCasa ?? false,
        acquistoDa: immobile.acquistoDa ?? "privato",
        affittoLordoAnnuo: 0, // non rilevante per questo calcolo
        unita: unitaComplete,
      };
      const imposte = calcolaImposteAcquisto(datiAcquisto);

      expect(imposte.registro).toBeCloseTo(immobile.registroAtteso!, 1);
      expect(imposte.ipotecaria).toBeCloseTo(immobile.ipotecariaAttesa!, 1);
      expect(imposte.catastale).toBeCloseTo(immobile.catastaleAttesa!, 1);
      expect(imposte.totale).toBeCloseTo(
        immobile.registroAtteso! +
          immobile.ipotecariaAttesa! +
          immobile.catastaleAttesa!,
        1
      );
    });
  }

  if (immobile.agenziaTotaleAtteso !== undefined) {
    it("Spese di agenzia", () => {
      const spese = calcolaSpeseAgenzia(
        immobile.prezzoAcquisto ?? 0,
        immobile.percentualeAgenzia
      );
      expect(spese.imponibile).toBeCloseTo(immobile.agenziaImponibileAtteso!, 1);
      expect(spese.iva).toBeCloseTo(immobile.agenziaIvaAttesa!, 1);
      expect(spese.totale).toBeCloseTo(immobile.agenziaTotaleAtteso!, 1);
    });
  }

  if (immobile.speseMutuoTotaleAtteso !== undefined) {
    it("Spese di attivazione mutuo", () => {
      const spese = calcolaSpeseMutuo(
        immobile.importoMutuo ?? 0,
        immobile.primaCasa ?? false,
        immobile.percentualeIstruttoria
      );
      expect(spese.istruttoria).toBeCloseTo(immobile.istruttoriaAttesa!, 1);
      expect(spese.impostaSostitutiva).toBeCloseTo(
        immobile.impostaSostitutivaAttesa!,
        1
      );
      expect(spese.totale).toBeCloseTo(immobile.speseMutuoTotaleAtteso!, 1);
    });
  }

  if (immobile.notaioTotaleAtteso !== undefined) {
    it("Costi notarili", () => {
      const costi = calcolaCostiNotaio(
        immobile.prezzoAcquisto ?? 0,
        immobile.onorarioNotaioPersonalizzato,
        immobile.visureNotaio,
        immobile.tassaArchivioNotaio
      );
      expect(costi.onorario).toBeCloseTo(immobile.notaioOnorarioAtteso!, 1);
      expect(costi.visure).toBeCloseTo(immobile.notaioVisureAtteso!, 1);
      expect(costi.tassaArchivio).toBeCloseTo(
        immobile.notaioTassaArchivioAtteso!,
        1
      );
      expect(costi.totale).toBeCloseTo(immobile.notaioTotaleAtteso!, 1);
    });
  }
});
