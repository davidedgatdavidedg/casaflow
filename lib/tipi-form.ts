// lib/tipi-form.ts
//
// Tipi dello stato del form (distinti dai tipi "puliti" del motore di
// calcolo in lib/calcolo/tipi.ts): qui vivono anche i campi
// UI-specifici, come le stringhe di override che possono essere vuote.
// Vive fuori sia da calcolatore-quick-mode.tsx sia da
// components/unita-card.tsx per evitare un ciclo di importazione tra i
// due (entrambi useranno questo tipo).

import type { CategoriaCatastale, StatoAbitativoImu } from "@/lib/calcolo/tipi";

export interface UnitaForm {
  id: string;
  etichetta: string;
  comune: string;
  categoriaCatastale: CategoriaCatastale;
  renditaCatastale: number;
  statoAbitativoImu: StatoAbitativoImu;
  metriQuadri: number;
  aliquotaImuPersonalizzata: string;
  // Puramente identificativi — nessun impatto sui calcoli.
  foglio: string;
  particella: string;
  subalterno: string;
}

export function nuovaUnitaVuota(): UnitaForm {
  return {
    id: crypto.randomUUID(),
    etichetta: "",
    comune: "Milano",
    categoriaCatastale: "A/2",
    renditaCatastale: 540,
    statoAbitativoImu: "affittata",
    metriQuadri: 60,
    aliquotaImuPersonalizzata: "",
    foglio: "",
    particella: "",
    subalterno: "",
  };
}

/** Un'unità DAVVERO vuota — a differenza di nuovaUnitaVuota() (pensata
 * per chi aggiunge una nuova unità a un form già avviato, con valori
 * di esempio ragionevoli), questa serve per l'apertura della pagina e
 * per "Svuota tutto": ogni campo a zero/vuoto, nessun valore demo. */
export function unitaCompletamenteVuota(): UnitaForm {
  return {
    id: crypto.randomUUID(),
    etichetta: "",
    comune: "",
    categoriaCatastale: "A/2", // scelta categorica, serve un valore valido
    renditaCatastale: 0,
    statoAbitativoImu: "affittata", // scelta categorica, serve un valore valido
    metriQuadri: 0,
    aliquotaImuPersonalizzata: "",
    foglio: "",
    particella: "",
    subalterno: "",
  };
}
