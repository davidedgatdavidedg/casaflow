// lib/calcolo/benchmarkBtp.ts
//
// Stima del rendimento netto di un BTP a scadenza comparabile
// all'orizzonte di investimento — usata come benchmark "costo
// opportunità" nella fase di Confronto del percorso decisionale.
//
// Non esiste un'API pubblica gratuita per la curva dei rendimenti BTP
// (solo provider commerciali senza API libera). Questa è quindi una
// tabella di riferimento statica, aggiornata manualmente, non un dato
// live — l'utente può sempre sovrascriverla con un valore più preciso.

export interface BenchmarkBtp {
  rendimentoNetto: number; // frazione, es. 0.033 = 3,3%
  scadenzaRiferimento: number; // anni del punto (o media dei due punti) usato
  interpolato: boolean;
}

/**
 * Rendimenti netti di riferimento per scadenza, già al netto della
 * tassazione agevolata sui titoli di Stato (12,5%, art. 31 D.L. 461/1997)
 * e dell'imposta di bollo (0,20% annuo sul controvalore).
 * Verificato il 05/09/2026 su fonti aggregate — indicativo, non un dato
 * di mercato in tempo reale: i rendimenti BTP cambiano quotidianamente.
 */
const CURVA_RENDIMENTI_NETTI: [anni: number, rendimento: number][] = [
  [3, 0.025],
  [5, 0.029],
  [7, 0.031],
  [10, 0.0335],
  [15, 0.037],
  [20, 0.039],
  [30, 0.04],
  [50, 0.042],
];

/**
 * Stima il rendimento netto di un BTP con scadenza pari (o più vicina
 * possibile) all'orizzonte di investimento richiesto, interpolando
 * linearmente tra i due punti noti più vicini.
 *
 * @param anniOrizzonte Orizzonte di investimento dichiarato dall'utente
 */
export function stimaRendimentoBtpNetto(anniOrizzonte: number): BenchmarkBtp {
  const punti = CURVA_RENDIMENTI_NETTI;

  if (anniOrizzonte <= punti[0][0]) {
    return { rendimentoNetto: punti[0][1], scadenzaRiferimento: punti[0][0], interpolato: false };
  }
  if (anniOrizzonte >= punti[punti.length - 1][0]) {
    const ultimo = punti[punti.length - 1];
    return { rendimentoNetto: ultimo[1], scadenzaRiferimento: ultimo[0], interpolato: false };
  }

  for (let i = 0; i < punti.length - 1; i++) {
    const [annoBasso, rendimentoBasso] = punti[i];
    const [annoAlto, rendimentoAlto] = punti[i + 1];

    if (anniOrizzonte === annoBasso) {
      return { rendimentoNetto: rendimentoBasso, scadenzaRiferimento: annoBasso, interpolato: false };
    }

    if (anniOrizzonte > annoBasso && anniOrizzonte < annoAlto) {
      const frazione = (anniOrizzonte - annoBasso) / (annoAlto - annoBasso);
      const rendimentoInterpolato =
        rendimentoBasso + frazione * (rendimentoAlto - rendimentoBasso);
      return {
        rendimentoNetto: arrotonda(rendimentoInterpolato),
        scadenzaRiferimento: anniOrizzonte,
        interpolato: true,
      };
    }
  }

  // Non dovrebbe mai arrivare qui, ma un fallback sicuro non guasta.
  const ultimo = punti[punti.length - 1];
  return { rendimentoNetto: ultimo[1], scadenzaRiferimento: ultimo[0], interpolato: false };
}

function arrotonda(n: number): number {
  return Math.round(n * 10000) / 10000;
}
