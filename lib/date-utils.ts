// lib/date-utils.ts
//
// Piccole utility di data condivise tra il motore di calcolo e il
// componente form — estratte da calcolatore-quick-mode.tsx.

/** La decorrenza del mutuo, nella pratica, non coincide con la data di
 * acquisto: la prima rata parte il 1° del mese successivo al rogito,
 * non lo stesso mese. Derivata sempre da dataAcquisto, mai un campo
 * separato da compilare.
 *
 * Difensiva: se la data ricevuta non è valida (es. un vecchio
 * salvataggio nel database privo di questo campo, da prima che
 * esistesse), usa oggi come ripiego invece di propagare un crash. */
export function primoDelMeseSuccessivo(data: Date): Date {
  const base = Number.isNaN(data.getTime()) ? new Date() : data;
  return new Date(base.getFullYear(), base.getMonth() + 1, 1);
}

export function formatoISO(data: Date): string {
  const valida = Number.isNaN(data.getTime()) ? new Date() : data;
  return valida.toISOString().slice(0, 10);
}
