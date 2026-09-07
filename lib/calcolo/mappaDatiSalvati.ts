// lib/calcolo/mappaDatiSalvati.ts
//
// Trasforma i dati grezzi salvati nel database (JSON, potenzialmente
// incompleti se il salvataggio è vecchio — fatto prima che un certo
// campo esistesse) nei parametri completi richiesti da
// calcolaSimulazione. Stessi fallback usati da applicaStatoSalvato nel
// form (calcolatore-quick-mode.tsx) — se cambia un fallback là, va
// aggiornato anche qui.
//
// Pensata per essere chiamata sia dal client (se in futuro si vorrà
// unificare con applicaStatoSalvato) sia da un Server Component (come
// la pagina di sintesi del portafoglio, che deve calcolare l'IRR di
// ogni immobile salvato senza passare dal form).

import type { ParametriSimulazione } from "./simulazione";
import type { UnitaForm } from "@/lib/tipi-form";

export function mappaDatiSalvatiAParametriSimulazione(
  dati: Record<string, unknown>
): ParametriSimulazione {
  const oggiIso = new Date().toISOString().slice(0, 10);
  const unitaGrezze = Array.isArray(dati.unitaList) ? dati.unitaList : [];

  const unitaList: UnitaForm[] = unitaGrezze.map((u) => {
    const unita = u as Record<string, unknown>;
    return {
      id: crypto.randomUUID(),
      etichetta: (unita.etichetta as string) ?? "",
      comune: (unita.comune as string) ?? "",
      categoriaCatastale: (unita.categoriaCatastale as UnitaForm["categoriaCatastale"]) ?? "A/2",
      renditaCatastale: (unita.renditaCatastale as number) ?? 0,
      statoAbitativoImu: (unita.statoAbitativoImu as UnitaForm["statoAbitativoImu"]) ?? "affittata",
      metriQuadri: (unita.metriQuadri as number) ?? 0,
      aliquotaImuPersonalizzata: (unita.aliquotaImuPersonalizzata as string) ?? "",
      foglio: (unita.foglio as string) ?? "",
      particella: (unita.particella as string) ?? "",
      subalterno: (unita.subalterno as string) ?? "",
    };
  });

  return {
    unitaList,
    prezzoAcquisto: (dati.prezzoAcquisto as number) ?? 0,
    primaCasaRegistro: (dati.primaCasaRegistro as boolean) ?? false,
    acquistoDa: (dati.acquistoDa as ParametriSimulazione["acquistoDa"]) ?? "privato",
    importoMutuo: (dati.importoMutuo as number) ?? 0,
    tassoMutuoPercentuale: (dati.tassoMutuoPercentuale as number) ?? 0,
    durataMutuoAnni: (dati.durataMutuoAnni as number) ?? 0,
    dataAcquisto: (dati.dataAcquisto as string) ?? oggiIso,
    speseIncassoPerRata: (dati.speseIncassoPerRata as number) ?? 0,
    affittoLordoAnnuo: (dati.affittoLordoAnnuo as number) ?? 0,
    oneriAccessoriAnnui: (dati.oneriAccessoriAnnui as number) ?? 0,
    renditaFigurativaAnnua: (dati.renditaFigurativaAnnua as number) ?? 0,
    regimeFiscaleAffitto:
      (dati.regimeFiscaleAffitto as ParametriSimulazione["regimeFiscaleAffitto"]) ??
      "cedolareSecca",
    tipoCedolare: (dati.tipoCedolare as ParametriSimulazione["tipoCedolare"]) ?? "standard",
    aliquotaMarginaleIrpef: (dati.aliquotaMarginaleIrpef as number) ?? 0.23,
    anniInvestimento: (dati.anniInvestimento as number) ?? 0,
    rivalutazioneAnnuaPercentuale: (dati.rivalutazioneAnnuaPercentuale as number) ?? 0,
    onorarioNotaioPersonalizzato: (dati.onorarioNotaioPersonalizzato as string) ?? "",
    agenziaPersonalizzata: (dati.agenziaPersonalizzata as string) ?? "",
    visureNotaioPersonalizzate: (dati.visureNotaioPersonalizzate as string) ?? "",
    tassaArchivioPersonalizzata: (dati.tassaArchivioPersonalizzata as string) ?? "",
    tariffaTariPersonalizzata: (dati.tariffaTariPersonalizzata as string) ?? "",
    energiaElettricaPersonalizzata: (dati.energiaElettricaPersonalizzata as string) ?? "",
    gasPersonalizzato: (dati.gasPersonalizzato as string) ?? "",
    internetPersonalizzato: (dati.internetPersonalizzato as string) ?? "",
    condominioAnnuoPersonalizzato: (dati.condominioAnnuoPersonalizzato as string) ?? "",
    manutenzioneOrdinariaPersonalizzata:
      (dati.manutenzioneOrdinariaPersonalizzata as string) ?? "",
    manutenzioneStraordinariaPersonalizzata:
      (dati.manutenzioneStraordinariaPersonalizzata as string) ?? "",
    assicurazionePersonalizzata: (dati.assicurazionePersonalizzata as string) ?? "",
    altriCostiAcquistoPersonalizzato: (dati.altriCostiAcquistoPersonalizzato as string) ?? "",
    ristrutturazione: (dati.ristrutturazione as number) ?? 0,
    arredamento: (dati.arredamento as number) ?? 0,
    tassoBenchmarkPersonalizzato: "", // mai salvato: l'utente lo corregge di volta in volta
  };
}
