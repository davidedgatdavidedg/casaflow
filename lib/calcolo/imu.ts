// src/lib/calcolo/imu.ts
import type { CategoriaCatastale, StatoAbitativoImu } from "./tipi";

/**
 * Moltiplicatori IMU per categoria catastale.
 * Fonte: art. 1, comma 745, Legge 27 dicembre 2019, n. 160
 * https://www.finanze.gov.it/it/fiscalita/fiscalita-regionale-e-locale/Imposta-municipale-propria-IMU/disciplina-del-tributo/base-imponibile/
 */
const MOLTIPLICATORE_PER_CATEGORIA: Record<CategoriaCatastale, number> = {
  "A/1": 160, "A/2": 160, "A/3": 160, "A/4": 160,
  "A/5": 160, "A/6": 160, "A/7": 160, "A/8": 160, "A/9": 160,
  "A/10": 80,
  "B/1": 140, "B/2": 140, "B/3": 140, "B/4": 140, "B/5": 140, "B/6": 140, "B/7": 140, "B/8": 140,
  "C/1": 55,
  "C/2": 160, "C/6": 160, "C/7": 160,
  "C/3": 140, "C/4": 140, "C/5": 140,
  "D/1": 65, "D/2": 65, "D/3": 65, "D/4": 65, "D/6": 65, "D/7": 65, "D/8": 65, "D/9": 65, "D/10": 65,
  "D/5": 80,
};

/**
 * Categorie "di lusso" per cui l'abitazione principale NON è esente da IMU.
 * Fonte: art. 1, comma 740, Legge 27 dicembre 2019, n. 160
 * https://www.finanze.gov.it/it/fiscalita/fiscalita-regionale-e-locale/Imposta-municipale-propria-IMU/disciplina-del-tributo/presupposto/
 */
const CATEGORIE_LUSSO_NON_ESENTI: CategoriaCatastale[] = ["A/1", "A/8", "A/9"];

/**
 * Detrazione fissa annua per abitazione principale di lusso (A/1, A/8, A/9),
 * da rapportare ai mesi di possesso (non gestito in questa funzione base).
 * Fonte: art. 13, comma 10, D.L. 6 dicembre 2011, n. 201
 */
const DETRAZIONE_ABITAZIONE_LUSSO = 103.29;

/**
 * Coefficiente di rivalutazione della rendita catastale.
 * Fonte: art. 3, comma 48, Legge 23 dicembre 1996, n. 662
 */
const COEFFICIENTE_RIVALUTAZIONE_DEFAULT = 1.05;

/**
 * Aliquota IMU di base in assenza di delibera comunale (minimo legale).
 * Fonte: art. 1, comma 754, Legge 27 dicembre 2019, n. 160
 * Usata come fallback per i comuni non presenti in ALIQUOTE_COMUNALI.
 * Esportata per poterla mostrare nella GUI quando il comune non è censito.
 */
export const ALIQUOTA_IMU_DEFAULT = 0.0086;

/**
 * Aliquote IMU comunali specifiche per "altri fabbricati" (seconda casa,
 * affittata, non locata) — NON per abitazione principale di lusso, che ha
 * una propria aliquota separata deliberata dal comune.
 *
 * Popolata mano a mano che si verificano i prospetti ufficiali dei singoli
 * comuni. Se il comune richiesto non è presente qui, si usa il default
 * nazionale (ALIQUOTA_IMU_DEFAULT).
 *
 * IMPORTANTE: ogni voce va verificata sul prospetto ufficiale del comune,
 * pubblicato sul Portale del Federalismo Fiscale (MEF):
 * https://www.portalefederalismofiscale.gov.it/
 *
 * Aliquote correnti:
 * - Milano: 1,14% — riscontrato da fonti secondarie che citano la delibera
 *   comunale n° 110 del 18/12/2025; non ancora confermato leggendo il testo
 *   integrale del prospetto ufficiale.
 * - Peschiera Borromeo: 1,06% — confermato dall'utente contro fonte esterna
 *   (Riscotel) su un caso reale.
 */
const ALIQUOTE_COMUNALI: Record<string, number> = {
  Milano: 0.0114,
  "Peschiera Borromeo": 0.0106,
  Moggio: 0.0076, // fornita dall'utente, verificata con lui il 30/08/2026
};

/** Tabella di lookup con chiavi normalizzate (minuscolo, spazi puliti),
 * così l'aliquota si trova indipendentemente da come l'utente digita il
 * nome del comune in un form (es. "milano", "MILANO", " Milano "). */
const ALIQUOTE_COMUNALI_NORMALIZZATE: Record<string, number> = Object.fromEntries(
  Object.entries(ALIQUOTE_COMUNALI).map(([comune, aliquota]) => [
    normalizzaNomeComune(comune),
    aliquota,
  ])
);

function normalizzaNomeComune(comune: string): string {
  return comune.trim().toLowerCase();
}

/**
 * Restituisce l'aliquota IMU da usare per il comune indicato.
 * Se il comune non è presente nella tabella, restituisce il default
 * nazionale (minimo legale in assenza di delibera). Il confronto ignora
 * maiuscole/minuscole e spazi iniziali/finali.
 */
export function ottieniAliquotaComunale(comune: string): number {
  return ALIQUOTE_COMUNALI_NORMALIZZATE[normalizzaNomeComune(comune)] ?? ALIQUOTA_IMU_DEFAULT;
}

/**
 * Indica se il comune ha un'aliquota specifica censita nella nostra
 * tabella interna, o se si sta usando il default nazionale. Usata dalla
 * GUI per mostrare l'aliquota come valore fisso (comune censito) oppure
 * come campo modificabile con una nota esplicativa (comune non censito).
 */
export function comuneCensito(comune: string): boolean {
  return normalizzaNomeComune(comune) in ALIQUOTE_COMUNALI_NORMALIZZATE;
}

/**
 * Calcola l'IMU annua dovuta su un immobile.
 *
 * Gestisce tre casi (vedi `StatoAbitativoImu`):
 * - abitazione principale: esente, salvo categorie di lusso (A/1, A/8, A/9),
 *   per le quali l'imposta è dovuta con una detrazione fissa di 103,29€/anno
 * - affittata o seconda casa non locata: sempre soggetta a IMU piena
 *
 * Nota: "abitazione principale" ai fini IMU richiede residenza anagrafica
 * e dimora abituale effettive — è un concetto diverso da "prima casa" ai
 * fini delle imposte d'acquisto (registro), che si basa su una dichiarazione
 * fatta in atto. Un immobile acquistato come "prima casa" ma poi affittato
 * NON è abitazione principale ai fini IMU e sconta l'imposta piena.
 *
 * Se non viene passata esplicitamente un'aliquota, questa funzione la
 * determina automaticamente in base al comune (vedi `ottieniAliquotaComunale`):
 * usa il valore specifico se disponibile, altrimenti il default nazionale.
 *
 * @param renditaCatastale Rendita catastale non rivalutata, da visura
 * @param categoriaCatastale Categoria catastale dell'immobile
 * @param statoAbitativo Come l'immobile è utilizzato ai fini IMU
 * @param comune Comune in cui si trova l'immobile, usato per l'aliquota
 * @param aliquota Aliquota specifica da usare, se si vuole forzare un valore
 *   diverso da quello derivato automaticamente dal comune (advanced mode)
 * @param coefficienteRivalutazione Coefficiente di rivalutazione rendita (default: 1,05)
 */
export function calcolaImu(
  renditaCatastale: number,
  categoriaCatastale: CategoriaCatastale,
  statoAbitativo: StatoAbitativoImu,
  comune: string,
  aliquota?: number,
  coefficienteRivalutazione: number = COEFFICIENTE_RIVALUTAZIONE_DEFAULT
): number {
  const aliquotaEffettiva = aliquota ?? ottieniAliquotaComunale(comune);
  const eLusso = CATEGORIE_LUSSO_NON_ESENTI.includes(categoriaCatastale);

  if (statoAbitativo === "abitazionePrincipale" && !eLusso) {
    return 0;
  }

  const moltiplicatore = MOLTIPLICATORE_PER_CATEGORIA[categoriaCatastale];
  const renditaRivalutata = renditaCatastale * coefficienteRivalutazione;
  const baseImponibile = renditaRivalutata * moltiplicatore;
  let imu = baseImponibile * aliquotaEffettiva;

  if (statoAbitativo === "abitazionePrincipale" && eLusso) {
    imu = Math.max(imu - DETRAZIONE_ABITAZIONE_LUSSO, 0);
  }

  return arrotonda(imu);
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
