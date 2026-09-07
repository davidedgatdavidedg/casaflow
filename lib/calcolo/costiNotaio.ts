// lib/calcolo/costiNotaio.ts

export interface CostiNotaio {
  onorario: number;
  visure: number;
  tassaArchivio: number;
  totale: number;
}

/**
 * Percentuale usata SOLO per la stima automatica in modalità base
 * dell'onorario notarile (esclude imposte di registro, ipotecaria,
 * catastale — calcolate in imposteAcquisto.ts — e le spese di
 * attivazione mutuo, calcolate in speseMutuo.ts).
 *
 * Valore tipico di mercato — NON normato per legge: gli onorari notarili
 * sono liberamente negoziabili dal 2006 (D.L. 4 luglio 2006, n. 223,
 * "decreto Bersani", art. 2, comma 1, lett. b), quindi variano da notaio
 * a notaio e in base alla complessità dell'atto. In modalità avanzata
 * l'utente inserisce direttamente l'importo assoluto (es. il preventivo
 * reale del proprio notaio), non più questa percentuale.
 */
export const PERCENTUALE_ONORARIO_NOTAIO_DEFAULT = 0.02;

/**
 * Spese per visure ipotecarie e catastali: sono l'anticipazione che il
 * notaio sostiene per interrogare Conservatoria e Catasto e verificare
 * che l'immobile sia libero da ipoteche o altri vincoli prima dell'atto.
 * Non è un'imposta né un onorario, ma un rimborso spese vive.
 * Valore indicativo di mercato (100-150€), verificato il 30/08/2026 su
 * fonti multiple di studi notarili — non è un dato normato in modo
 * uniforme. Configurabile in advanced mode.
 */
const VISURE_DEFAULT = 150;

/**
 * Tassa archivio notarile: tassa erariale dovuta per la conservazione
 * dell'atto presso gli Archivi Notarili Distrettuali. A differenza delle
 * altre voci, NON è un importo fisso standard: più fonti la descrivono
 * come "variabile in funzione del valore" dell'atto, senza una formula
 * uniforme e facilmente verificabile. Il valore di default qui è una
 * stima indicativa (verificato il 30/08/2026); nella pratica può variare
 * sensibilmente da atto ad atto (osservato: 28-40€ su casi reali).
 * Configurabile in advanced mode.
 */
const TASSA_ARCHIVIO_DEFAULT = 35;

/**
 * Stima i costi notarili accessori a una compravendita: onorario,
 * visure ipotecarie/catastali, tassa archivio.
 *
 * Nota: NON include l'imposta di bollo (in alcuni preventivi presente a
 * importo fisso di legge, in altri casi reali risultata assente) — in
 * sospeso fino a chiarimento sulla sua reale applicabilità.
 *
 * @param prezzoAcquisto Prezzo di acquisto dell'immobile
 * @param onorarioPersonalizzato Importo ASSOLUTO in € dell'onorario, se
 *   noto con precisione (es. preventivo reale). Se assente, si stima
 *   automaticamente come 2% del prezzo di acquisto.
 * @param visure Spese per visure ipotecarie/catastali (default: 150€, mercato)
 * @param tassaArchivio Tassa archivio notarile (default: 35€, stima indicativa)
 */
export function calcolaCostiNotaio(
  prezzoAcquisto: number,
  onorarioPersonalizzato?: number,
  visurePersonalizzate?: number,
  tassaArchivioPersonalizzata?: number
): CostiNotaio {
  // Ogni voce usa la propria stima di mercato SOLO se il prezzo è
  // positivo (un acquisto reale in corso) — a prezzo zero (form non
  // ancora compilato), un valore esplicitamente personalizzato resta
  // comunque valido, ma nessuna stima "fantasma" indipendente da
  // qualsiasi dato inserito.
  const onorario = arrotonda(
    onorarioPersonalizzato ??
      (prezzoAcquisto > 0 ? prezzoAcquisto * PERCENTUALE_ONORARIO_NOTAIO_DEFAULT : 0)
  );
  const visure = arrotonda(
    visurePersonalizzate ?? (prezzoAcquisto > 0 ? VISURE_DEFAULT : 0)
  );
  const tassaArchivio = arrotonda(
    tassaArchivioPersonalizzata ?? (prezzoAcquisto > 0 ? TASSA_ARCHIVIO_DEFAULT : 0)
  );

  return {
    onorario,
    visure,
    tassaArchivio,
    totale: arrotonda(onorario + visure + tassaArchivio),
  };
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
