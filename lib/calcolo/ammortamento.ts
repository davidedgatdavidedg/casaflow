// src/lib/calcolo/ammortamento.ts
import type { Mutuo, PeriodoTasso } from "./tipi";

export interface RataMutuo {
  numero: number;
  data: Date;
  tassoApplicato: number;
  quotaCapitale: number;
  quotaInteressi: number;
  speseIncasso: number;
  rataTotale: number;
  capitaleResiduo: number;
}

export function calcolaPianoAmmortamento(mutuo: Mutuo): RataMutuo[] {
  const { importo, durataAnni, dataDecorrenza } = mutuo;
  const speseIncassoPerRata = mutuo.speseIncassoPerRata ?? 0;
  const numeroRateTotali = durataAnni * 12;

  const periodi = normalizzaTasso(mutuo.tasso, dataDecorrenza, numeroRateTotali);

  const piano: RataMutuo[] = [];
  let capitaleResiduo = importo;
  let rataNumero = 1;

  for (const periodo of periodi) {
    const tassoMensile = periodo.tassoAnnuo / 12;
    const rateRimanentiTotali = numeroRateTotali - (rataNumero - 1);
    const rateInQuestoPeriodo = periodo.numeroRate;

    // Rata ricalcolata sul capitale residuo e sulle rate rimanenti totali
    const rataCostante =
      (capitaleResiduo * tassoMensile) /
      (1 - Math.pow(1 + tassoMensile, -rateRimanentiTotali));

    for (let i = 0; i < rateInQuestoPeriodo; i++) {
      const quotaInteressi = capitaleResiduo * tassoMensile;
      const quotaCapitale = rataCostante - quotaInteressi;
      capitaleResiduo -= quotaCapitale;

      const data = new Date(dataDecorrenza);
      data.setMonth(data.getMonth() + (rataNumero - 1));

      piano.push({
        numero: rataNumero,
        data,
        tassoApplicato: periodo.tassoAnnuo,
        quotaCapitale: arrotonda(quotaCapitale),
        quotaInteressi: arrotonda(quotaInteressi),
        speseIncasso: speseIncassoPerRata,
        rataTotale: arrotonda(quotaCapitale + quotaInteressi + speseIncassoPerRata),
        capitaleResiduo: arrotonda(Math.max(capitaleResiduo, 0)),
      });

      rataNumero++;
    }
  }

  return piano;
}

/** Converte il campo `tasso` (fisso o a periodi) in una lista di
 *  segmenti con numero di rate esatto per ciascun periodo. */
function normalizzaTasso(
  tasso: number | PeriodoTasso[],
  dataDecorrenza: Date,
  numeroRateTotali: number
): { tassoAnnuo: number; numeroRate: number }[] {
  if (typeof tasso === "number") {
    return [{ tassoAnnuo: tasso, numeroRate: numeroRateTotali }];
  }

  // Ordina i periodi per data di inizio
  const ordinati = [...tasso].sort(
    (a, b) => a.dataInizio.getTime() - b.dataInizio.getTime()
  );

  const segmenti: { tassoAnnuo: number; numeroRate: number }[] = [];
  let rataCorrente = 0;

  for (let idx = 0; idx < ordinati.length; idx++) {
    const p = ordinati[idx];
    const inizioRata = meseDifferenza(dataDecorrenza, p.dataInizio);
    const fineRata = p.dataFine
      ? meseDifferenza(dataDecorrenza, p.dataFine)
      : numeroRateTotali;

    const numeroRate = Math.min(fineRata, numeroRateTotali) - Math.max(inizioRata, rataCorrente);
    if (numeroRate > 0) {
      segmenti.push({ tassoAnnuo: p.tassoAnnuo, numeroRate });
      rataCorrente += numeroRate;
    }
  }

  return segmenti;
}

function meseDifferenza(da: Date, a: Date): number {
  return (
    (a.getFullYear() - da.getFullYear()) * 12 + (a.getMonth() - da.getMonth())
  );
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}