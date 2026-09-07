// components/calcolatore-quick-mode.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Show, SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import {
  salvaImmobile,
  elencaImmobiliUtente,
  caricaImmobileUtente,
  eliminaImmobile,
} from "@/lib/actions/immobili";
import {
  type RegimeFiscaleAffitto,
  type TipoCedolare,
  ALIQUOTE_MARGINALI_IRPEF_2026,
} from "@/lib/calcolo/tassazioneAffitti";
import IconaInfo from "@/components/icona-info";
import {
  classiInput,
  formatoEuroColonna,
  identificativoValido,
  BoxAvanzato,
  SezioneForm,
  Campo,
  InputNumero,
  ToggleSiNo,
  RigaDati,
} from "@/components/form-ui";
import TimbroRendimento from "@/components/timbro-rendimento";
import { calcolaSimulazione } from "@/lib/calcolo/simulazione";
import {
  trovaValorePerTargetIrr,
  ETICHETTE_LEVA_OBIETTIVO,
  type LevaObiettivo,
} from "@/lib/calcolo/obiettivoIrr";
import { TARIFFA_TARI_DEFAULT_PER_MQ } from "@/lib/calcolo/tari";
import { COSTO_CONDOMINIO_DEFAULT_PER_MQ } from "@/lib/calcolo/condominio";
import type { TipoVenditore } from "@/lib/calcolo/tipi";
import { IMMOBILI, type UnitaCatastaleTest } from "@/lib/calcolo/__fixtures__/immobili";
import type { UnitaForm } from "@/lib/tipi-form";
import { nuovaUnitaVuota, unitaCompletamenteVuota } from "@/lib/tipi-form";
import UnitaCard from "@/components/unita-card";
import DialogoSalva from "@/components/dialogo-salva";
import ListaSalvatiDropdown from "@/components/lista-salvati-dropdown";
import {
  PannelloCostiUnaTantum,
  PannelloDettaglioAnnuale,
  PannelloCostiRicorrenti,
  PannelloRivenditaStimata,
  PannelloInterpretazione,
  PannelloConfrontoBtp,
  PannelloLeve,
  PannelloObiettivo,
} from "@/components/pannelli-risultati";
import { primoDelMeseSuccessivo, formatoISO } from "@/lib/date-utils";

const PERCENTUALE_NOTAIO_DEFAULT_UI = 2;
const VISURE_NOTAIO_DEFAULT_UI = 150;
const TASSA_ARCHIVIO_DEFAULT_UI = 35;
const PERCENTUALE_MANUTENZIONE_ORDINARIA_UI = 1;
const PERCENTUALE_MANUTENZIONE_STRAORDINARIA_UI = 0.3;

type ChiaveImmobile = keyof typeof IMMOBILI;

const OPZIONI_IMMOBILE_DEBUG: { chiave: ChiaveImmobile; etichetta: string }[] =
  Object.entries(IMMOBILI).map(([chiave, immobile]) => ({
    chiave: chiave as ChiaveImmobile,
    etichetta: immobile.etichetta,
  }));

interface DefaultDaImmobile {
  prezzoAcquisto?: number;
  primaCasaRegistro?: boolean;
  acquistoDa?: TipoVenditore;
  importoMutuo?: number;
  tassoMutuoPercentuale?: number;
  durataMutuoAnni?: number;
  dataAcquisto?: string;
  speseIncassoPerRata?: number;
}

const formatoEuro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const formatoEuroPreciso = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

const formatoDataOra = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const OGGI_ISO = new Date().toISOString().slice(0, 10);

/** Selettore "Carica immobile di prova (debug)": nascosto ora che il
 * salvataggio personale (Clerk + Neon) copre lo stesso bisogno in modo
 * più completo. Logica e funzione caricaImmobileDebug restano intatte
 * — basta rimettere questa a true per farlo ricomparire. */
const SELETTORE_DEBUG_VISIBILE = false;

export default function CalcolatoreQuickMode() {
  const [prezzoAcquisto, setPrezzoAcquisto] = useState(0);
  const [primaCasaRegistro, setPrimaCasaRegistro] = useState(false);
  const [acquistoDa, setAcquistoDa] = useState<TipoVenditore>("privato");

  const [unitaList, setUnitaList] = useState<UnitaForm[]>([unitaCompletamenteVuota()]);
  const [unitaCompresse, setUnitaCompresse] = useState<Set<string>>(
    () => new Set()
  );

  function toggleCompressioneUnita(id: string) {
    setUnitaCompresse((prev) => {
      const nuovo = new Set(prev);
      if (nuovo.has(id)) {
        nuovo.delete(id);
      } else {
        nuovo.add(id);
      }
      return nuovo;
    });
  }
  const [defaultUnita, setDefaultUnita] = useState<UnitaCatastaleTest[] | null>(
    null
  );

  function aggiungiUnita() {
    setUnitaList((elenco) => [...elenco, nuovaUnitaVuota()]);
  }

  function rimuoviUnita(id: string) {
    setUnitaList((elenco) =>
      elenco.length > 1 ? elenco.filter((u) => u.id !== id) : elenco
    );
    setUnitaCompresse((prev) => {
      const nuovo = new Set(prev);
      nuovo.delete(id);
      return nuovo;
    });
  }

  function aggiornaUnita(id: string, patch: Partial<UnitaForm>) {
    setUnitaList((elenco) =>
      elenco.map((u) => (u.id === id ? { ...u, ...patch } : u))
    );
  }

  function unitaModificata(indice: number, unita: UnitaForm): boolean {
    const def = defaultUnita?.[indice];
    if (!def) return false;
    return (
      def.comune !== unita.comune ||
      def.categoriaCatastale !== unita.categoriaCatastale ||
      def.renditaCatastale !== unita.renditaCatastale ||
      (def.statoAbitativoImu ?? "affittata") !== unita.statoAbitativoImu ||
      (def.metriQuadri ?? 0) !== unita.metriQuadri ||
      String(def.aliquotaImuPersonalizzata ?? "") !==
        unita.aliquotaImuPersonalizzata ||
      (def.foglio ?? "") !== unita.foglio ||
      (def.particella ?? "") !== unita.particella ||
      (def.subalterno ?? "") !== unita.subalterno
    );
  }

  const [importoMutuo, setImportoMutuo] = useState(0);
  const [tassoMutuoPercentuale, setTassoMutuoPercentuale] = useState(0);
  const [durataMutuoAnni, setDurataMutuoAnni] = useState(0);
  const [dataAcquisto, setDataAcquisto] = useState(OGGI_ISO);
  const [tassoBenchmarkPersonalizzato, setTassoBenchmarkPersonalizzato] =
    useState<string>("");
  const mutuoRichiesto = importoMutuo > 0;

  const [levaObiettivo, setLevaObiettivo] = useState<LevaObiettivo>("prezzoAcquisto");
  const [targetIrrPersonalizzato, setTargetIrrPersonalizzato] = useState<string>("");

  const [affittoLordoAnnuo, setAffittoLordoAnnuo] = useState(0);
  const [oneriAccessoriAnnui, setOneriAccessoriAnnui] = useState(0);
  const [renditaFigurativaAnnua, setRenditaFigurativaAnnua] = useState(0);
  const [regimeFiscaleAffitto, setRegimeFiscaleAffitto] =
    useState<RegimeFiscaleAffitto>("cedolareSecca");
  const [tipoCedolare, setTipoCedolare] = useState<TipoCedolare>("standard");
  const [aliquotaMarginaleIrpef, setAliquotaMarginaleIrpef] = useState<number>(
    ALIQUOTE_MARGINALI_IRPEF_2026[0]
  );

  const [anniInvestimento, setAnniInvestimento] = useState(0);
  const [rivalutazioneAnnuaPercentuale, setRivalutazioneAnnuaPercentuale] =
    useState(0);

  const [modalitaAvanzata, setModalitaAvanzata] = useState(false);
  const [speseIncassoPerRata, setSpeseIncassoPerRata] = useState(0);
  const [tariffaTariPersonalizzata, setTariffaTariPersonalizzata] = useState<string>("");
  const [energiaElettricaPersonalizzata, setEnergiaElettricaPersonalizzata] =
    useState<string>("");
  const [gasPersonalizzato, setGasPersonalizzato] = useState<string>("");
  const [internetPersonalizzato, setInternetPersonalizzato] = useState<string>("");
  const [condominioAnnuoPersonalizzato, setCondominioAnnuoPersonalizzato] =
    useState<string>("");
  const [manutenzioneOrdinariaPersonalizzata, setManutenzioneOrdinariaPersonalizzata] =
    useState<string>("");
  const [
    manutenzioneStraordinariaPersonalizzata,
    setManutenzioneStraordinariaPersonalizzata,
  ] = useState<string>("");
  const [onorarioNotaioPersonalizzato, setOnorarioNotaioPersonalizzato] =
    useState<string>("");
  const [agenziaPersonalizzata, setAgenziaPersonalizzata] = useState<string>("");
  const [visureNotaioPersonalizzate, setVisureNotaioPersonalizzate] =
    useState<string>("");
  const [tassaArchivioPersonalizzata, setTassaArchivioPersonalizzata] =
    useState<string>("");
  const [altriCostiAcquistoPersonalizzato, setAltriCostiAcquistoPersonalizzato] =
    useState<string>("");
  const [assicurazionePersonalizzata, setAssicurazionePersonalizzata] =
    useState<string>("");

  // ─── Costi di avviamento (base mode, valori assoluti, default 0) ────
  const [ristrutturazione, setRistrutturazione] = useState(0);
  const [arredamento, setArredamento] = useState(0);

  const [immobileSelezionato, setImmobileSelezionato] = useState<
    ChiaveImmobile | ""
  >("");
  const [defaultDaImmobile, setDefaultDaImmobile] =
    useState<DefaultDaImmobile>({});

  // ─── Immobili salvati dall'utente (Neon + Clerk) ─────────────────────
  const [immobiliSalvati, setImmobiliSalvati] = useState<
    { id: string; nome: string; aggiornatoIl: Date }[]
  >([]);
  const [idImmobileCorrente, setIdImmobileCorrente] = useState<string | null>(
    null
  );
  const [nomeSalvataggio, setNomeSalvataggio] = useState("");
  const [ultimoSalvataggio, setUltimoSalvataggio] = useState<Date | null>(null);
  const [mostraDialogoSalva, setMostraDialogoSalva] = useState(false);
  const [mostraListaSalvati, setMostraListaSalvati] = useState(false);
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);
  const [erroreSalvataggio, setErroreSalvataggio] = useState<string | null>(
    null
  );

  async function aggiornaElencoSalvati() {
    try {
      const elenco = await elencaImmobiliUtente();
      setImmobiliSalvati(elenco);
    } catch {
      // Non autenticato o errore di rete: lista vuota, nessun blocco della UI.
      setImmobiliSalvati([]);
    }
  }

  useEffect(() => {
    aggiornaElencoSalvati();
  }, []);

  function costruisciStatoSalvabile() {
    return {
      prezzoAcquisto,
      primaCasaRegistro,
      acquistoDa,
      unitaList: unitaList.map(({ id: _id, ...resto }) => resto),
      importoMutuo,
      tassoMutuoPercentuale,
      durataMutuoAnni,
      dataAcquisto,
      speseIncassoPerRata,
      affittoLordoAnnuo,
      oneriAccessoriAnnui,
      renditaFigurativaAnnua,
      regimeFiscaleAffitto,
      tipoCedolare,
      aliquotaMarginaleIrpef,
      anniInvestimento,
      rivalutazioneAnnuaPercentuale,
      onorarioNotaioPersonalizzato,
      agenziaPersonalizzata,
      visureNotaioPersonalizzate,
      tassaArchivioPersonalizzata,
      altriCostiAcquistoPersonalizzato,
      tariffaTariPersonalizzata,
      energiaElettricaPersonalizzata,
      gasPersonalizzato,
      internetPersonalizzato,
      condominioAnnuoPersonalizzato,
      manutenzioneOrdinariaPersonalizzata,
      manutenzioneStraordinariaPersonalizzata,
      assicurazionePersonalizzata,
      ristrutturazione,
      arredamento,
    };
  }

  function applicaStatoSalvato(dati: ReturnType<typeof costruisciStatoSalvabile>) {
    setPrezzoAcquisto(dati.prezzoAcquisto);
    setPrimaCasaRegistro(dati.primaCasaRegistro);
    setAcquistoDa(dati.acquistoDa);
    const unitaCaricate = dati.unitaList.map((u) => ({ ...u, id: crypto.randomUUID() }));
    setUnitaList(unitaCaricate);
    setUnitaCompresse(new Set(unitaCaricate.map((u) => u.id))); // parti con tutte le card compresse, espandi solo quelle da controllare
    setDefaultUnita(null); // uno stato salvato non ha un "default fixture" di confronto
    setImportoMutuo(dati.importoMutuo);
    setTassoMutuoPercentuale(dati.tassoMutuoPercentuale);
    setDurataMutuoAnni(dati.durataMutuoAnni);
    // Fallback a oggi: un salvataggio fatto prima dell'introduzione di
    // questo campo (quando si chiamava ancora decorrenzaMutuo) non lo
    // conterrebbe, e senza fallback produrrebbe una data non valida.
    setDataAcquisto(dati.dataAcquisto ?? OGGI_ISO);
    setSpeseIncassoPerRata(dati.speseIncassoPerRata);
    setAffittoLordoAnnuo(dati.affittoLordoAnnuo);
    setOneriAccessoriAnnui(dati.oneriAccessoriAnnui ?? 0);
    setRenditaFigurativaAnnua(dati.renditaFigurativaAnnua ?? 0);
    setRegimeFiscaleAffitto(dati.regimeFiscaleAffitto);
    setTipoCedolare(dati.tipoCedolare);
    setAliquotaMarginaleIrpef(dati.aliquotaMarginaleIrpef);
    setAnniInvestimento(dati.anniInvestimento);
    setRivalutazioneAnnuaPercentuale(dati.rivalutazioneAnnuaPercentuale);
    setOnorarioNotaioPersonalizzato(dati.onorarioNotaioPersonalizzato);
    setAgenziaPersonalizzata(dati.agenziaPersonalizzata ?? "");
    setVisureNotaioPersonalizzate(dati.visureNotaioPersonalizzate);
    setTassaArchivioPersonalizzata(dati.tassaArchivioPersonalizzata);
    setAltriCostiAcquistoPersonalizzato(dati.altriCostiAcquistoPersonalizzato ?? "");
    setTariffaTariPersonalizzata(dati.tariffaTariPersonalizzata);
    setEnergiaElettricaPersonalizzata(dati.energiaElettricaPersonalizzata);
    setGasPersonalizzato(dati.gasPersonalizzato);
    setInternetPersonalizzato(dati.internetPersonalizzato);
    setCondominioAnnuoPersonalizzato(dati.condominioAnnuoPersonalizzato);
    setManutenzioneOrdinariaPersonalizzata(dati.manutenzioneOrdinariaPersonalizzata);
    setManutenzioneStraordinariaPersonalizzata(
      dati.manutenzioneStraordinariaPersonalizzata
    );
    setAssicurazionePersonalizzata(dati.assicurazionePersonalizzata ?? "");
    setRistrutturazione(dati.ristrutturazione ?? 0);
    setArredamento(dati.arredamento ?? 0);
    // Un immobile caricato dai tuoi salvataggi non è un "immobile di prova":
    // disattivo il selettore di debug per evitare confusione tra le due fonti.
    setImmobileSelezionato("");
    setDefaultDaImmobile({});
  }

  /** Riporta l'intero form ai valori di default — usata sia dal bottone
   * "Svuota tutto" sia in automatico al logout (vedi useEffect più sotto).
   * Non tocca modalitaAvanzata: è una preferenza di interfaccia, non un
   * dato dell'immobile. */
  function svuotaForm() {
    setPrezzoAcquisto(0);
    setPrimaCasaRegistro(false);
    setAcquistoDa("privato"); // scelta categorica, "0" non è un'opzione valida

    // Unità davvero vuota — non riuso nuovaUnitaVuota(), che contiene
    // valori di esempio pensati per chi aggiunge una nuova unità a un
    // form già avviato, non per una pagina bianca da compilare da zero.
    setUnitaList([unitaCompletamenteVuota()]);
    setUnitaCompresse(new Set()); // parte espansa, essendo vuota non c'è nulla da "controllare"
    setDefaultUnita(null);

    setImportoMutuo(0);
    setTassoMutuoPercentuale(0);
    setDurataMutuoAnni(0);
    setDataAcquisto(OGGI_ISO); // una data non ha un equivalente di "0", resta oggi
    setSpeseIncassoPerRata(0);

    setAffittoLordoAnnuo(0);
    setOneriAccessoriAnnui(0);
    setRenditaFigurativaAnnua(0);
    setRegimeFiscaleAffitto("cedolareSecca"); // scelta categorica
    setTipoCedolare("standard"); // scelta categorica
    setAliquotaMarginaleIrpef(ALIQUOTE_MARGINALI_IRPEF_2026[0]); // scelta da un elenco fisso, "0" non è un'opzione

    setAnniInvestimento(0);
    setRivalutazioneAnnuaPercentuale(0);

    setOnorarioNotaioPersonalizzato("");
    setAgenziaPersonalizzata("");
    setVisureNotaioPersonalizzate("");
    setTassaArchivioPersonalizzata("");
    setAltriCostiAcquistoPersonalizzato("");
    setTariffaTariPersonalizzata("");
    setEnergiaElettricaPersonalizzata("");
    setGasPersonalizzato("");
    setInternetPersonalizzato("");
    setCondominioAnnuoPersonalizzato("");
    setManutenzioneOrdinariaPersonalizzata("");
    setManutenzioneStraordinariaPersonalizzata("");
    setAssicurazionePersonalizzata("");
    setTassoBenchmarkPersonalizzato("");

    setRistrutturazione(0);
    setArredamento(0);

    setImmobileSelezionato("");
    setDefaultDaImmobile({});

    setIdImmobileCorrente(null);
    setNomeSalvataggio("");
    setUltimoSalvataggio(null);
  }

  // Al logout, applica automaticamente la stessa pulizia del bottone
  // "Svuota tutto" — reagisce al CAMBIO di stato di autenticazione
  // (da loggato a non loggato), non a un singolo pulsante di logout:
  // funziona indipendentemente da come avviene l'uscita (menu utente,
  // scadenza sessione, ecc.).
  const { isLoaded: autenticazioneCaricata, userId } = useAuth();
  const userIdPrecedente = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!autenticazioneCaricata) return;
    if (userIdPrecedente.current && !userId) {
      svuotaForm();
    }
    userIdPrecedente.current = userId;
  }, [autenticazioneCaricata, userId]);

  async function gestisciSalva() {
    setErroreSalvataggio(null);
    setSalvataggioInCorso(true);
    try {
      const dati = costruisciStatoSalvabile();
      const risultato = await salvaImmobile(
        nomeSalvataggio,
        dati,
        idImmobileCorrente ?? undefined
      );
      setIdImmobileCorrente(risultato.id);
      setUltimoSalvataggio(new Date());
      await aggiornaElencoSalvati();
      setMostraDialogoSalva(false);
    } catch (errore) {
      setErroreSalvataggio(
        errore instanceof Error ? errore.message : "Errore nel salvataggio."
      );
    } finally {
      setSalvataggioInCorso(false);
    }
  }

  async function gestisciCaricaSalvato(id: string) {
    const immobile = await caricaImmobileUtente(id);
    applicaStatoSalvato(
      immobile.dati as ReturnType<typeof costruisciStatoSalvabile>
    );
    setIdImmobileCorrente(immobile.id);
    setNomeSalvataggio(immobile.nome);
    setUltimoSalvataggio(new Date(immobile.aggiornatoIl));
    setMostraListaSalvati(false);
  }

  // Se si arriva da /immobile?id=X (cliccando un immobile dal
  // portafoglio), carica automaticamente quel salvataggio all'apertura
  // — stessa logica di gestisciCaricaSalvato, innescata dall'URL invece
  // che da un click sul menu a tendina.
  const searchParams = useSearchParams();
  useEffect(() => {
    const idDaUrl = searchParams.get("id");
    if (idDaUrl) {
      gestisciCaricaSalvato(idDaUrl);
    }
    // Intenzionalmente solo al mount: non vogliamo ricaricare se l'id
    // nell'URL cambia per altri motivi durante la sessione.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function gestisciEliminaSalvato(id: string) {
    await eliminaImmobile(id);
    if (idImmobileCorrente === id) {
      setIdImmobileCorrente(null);
      setNomeSalvataggio("");
      setUltimoSalvataggio(null);
    }
    await aggiornaElencoSalvati();
  }

  function apriDialogoSalva() {
    setErroreSalvataggio(null);
    setMostraDialogoSalva(true);
  }

  function caricaImmobileDebug(chiave: ChiaveImmobile | "") {
    setImmobileSelezionato(chiave);
    // Un esempio caricato dal debug non è un tuo salvataggio personale.
    setIdImmobileCorrente(null);
    setNomeSalvataggio("");
    setUltimoSalvataggio(null);

    if (!chiave) {
      setDefaultDaImmobile({});
      setDefaultUnita(null);
      return;
    }

    const fixture = IMMOBILI[chiave];
    const nuoviDefault: DefaultDaImmobile = {};

    if (fixture.prezzoAcquisto !== undefined) {
      setPrezzoAcquisto(fixture.prezzoAcquisto);
      nuoviDefault.prezzoAcquisto = fixture.prezzoAcquisto;
    }
    if (fixture.primaCasa !== undefined) {
      setPrimaCasaRegistro(fixture.primaCasa);
      nuoviDefault.primaCasaRegistro = fixture.primaCasa;
    }
    if (fixture.acquistoDa !== undefined) {
      setAcquistoDa(fixture.acquistoDa);
      nuoviDefault.acquistoDa = fixture.acquistoDa;
    }

    const unitaCaricate = fixture.unita.map((u) => ({
      id: crypto.randomUUID(),
      etichetta: u.etichetta ?? "",
      comune: u.comune,
      categoriaCatastale: u.categoriaCatastale,
      renditaCatastale: u.renditaCatastale,
      statoAbitativoImu: u.statoAbitativoImu ?? "affittata",
      metriQuadri: u.metriQuadri ?? 0,
      aliquotaImuPersonalizzata:
        u.aliquotaImuPersonalizzata !== undefined
          ? String(u.aliquotaImuPersonalizzata * 100)
          : "",
      foglio: u.foglio ?? "",
      particella: u.particella ?? "",
      subalterno: u.subalterno ?? "",
    }));
    setUnitaList(unitaCaricate);
    setUnitaCompresse(new Set(unitaCaricate.map((u) => u.id))); // parti con tutte le card compresse, espandi solo quelle da controllare
    setDefaultUnita(fixture.unita);

    if (fixture.importoMutuo !== undefined) {
      setImportoMutuo(fixture.importoMutuo);
      nuoviDefault.importoMutuo = fixture.importoMutuo;
      if (fixture.tassoMutuoPercentuale !== undefined) {
        setTassoMutuoPercentuale(fixture.tassoMutuoPercentuale);
        nuoviDefault.tassoMutuoPercentuale = fixture.tassoMutuoPercentuale;
      }
      if (fixture.durataMutuoAnni !== undefined) {
        setDurataMutuoAnni(fixture.durataMutuoAnni);
        nuoviDefault.durataMutuoAnni = fixture.durataMutuoAnni;
      }
      if (fixture.speseIncassoPerRataMutuo !== undefined) {
        setSpeseIncassoPerRata(fixture.speseIncassoPerRataMutuo);
        nuoviDefault.speseIncassoPerRata = fixture.speseIncassoPerRataMutuo;
      }
    } else {
      setImportoMutuo(0);
      nuoviDefault.importoMutuo = 0;
    }

    // La data di acquisto è indipendente dal mutuo (che potrebbe non
    // esserci affatto) — se la fixture ha una decorrenzaMutuo la usiamo
    // come proxy della data di acquisto reale (storicamente coincidevano
    // nelle fixture esistenti), altrimenti resta il default.
    if (fixture.decorrenzaMutuo !== undefined) {
      setDataAcquisto(fixture.decorrenzaMutuo);
      nuoviDefault.dataAcquisto = fixture.decorrenzaMutuo;
    }

    setDefaultDaImmobile(nuoviDefault);
  }

  const modificato = {
    prezzoAcquisto:
      defaultDaImmobile.prezzoAcquisto !== undefined &&
      defaultDaImmobile.prezzoAcquisto !== prezzoAcquisto,
    primaCasaRegistro:
      defaultDaImmobile.primaCasaRegistro !== undefined &&
      defaultDaImmobile.primaCasaRegistro !== primaCasaRegistro,
    acquistoDa:
      defaultDaImmobile.acquistoDa !== undefined &&
      defaultDaImmobile.acquistoDa !== acquistoDa,
    importoMutuo:
      defaultDaImmobile.importoMutuo !== undefined &&
      defaultDaImmobile.importoMutuo !== importoMutuo,
    tassoMutuoPercentuale:
      defaultDaImmobile.tassoMutuoPercentuale !== undefined &&
      defaultDaImmobile.tassoMutuoPercentuale !== tassoMutuoPercentuale,
    durataMutuoAnni:
      defaultDaImmobile.durataMutuoAnni !== undefined &&
      defaultDaImmobile.durataMutuoAnni !== durataMutuoAnni,
    dataAcquisto:
      defaultDaImmobile.dataAcquisto !== undefined &&
      defaultDaImmobile.dataAcquisto !== dataAcquisto,
    speseIncassoPerRata:
      defaultDaImmobile.speseIncassoPerRata !== undefined &&
      defaultDaImmobile.speseIncassoPerRata !== speseIncassoPerRata,
  };

  const etichettaRegimeAffitto =
    regimeFiscaleAffitto === "cedolareSecca"
      ? `Cedolare secca ${tipoCedolare === "concordato" ? "10%" : "21%"}`
      : `Ordinaria, aliquota marginale ${(aliquotaMarginaleIrpef * 100).toFixed(0)}%`;

  const parametriSimulazione = useMemo(
    () => ({
      unitaList,
      prezzoAcquisto,
      primaCasaRegistro,
      acquistoDa,
      importoMutuo,
      tassoMutuoPercentuale,
      durataMutuoAnni,
      dataAcquisto,
      speseIncassoPerRata,
      affittoLordoAnnuo,
      oneriAccessoriAnnui,
      renditaFigurativaAnnua,
      regimeFiscaleAffitto,
      tipoCedolare,
      aliquotaMarginaleIrpef,
      anniInvestimento,
      rivalutazioneAnnuaPercentuale,
      onorarioNotaioPersonalizzato,
      agenziaPersonalizzata,
      visureNotaioPersonalizzate,
      tassaArchivioPersonalizzata,
      tariffaTariPersonalizzata,
      energiaElettricaPersonalizzata,
      gasPersonalizzato,
      internetPersonalizzato,
      condominioAnnuoPersonalizzato,
      manutenzioneOrdinariaPersonalizzata,
      manutenzioneStraordinariaPersonalizzata,
      assicurazionePersonalizzata,
      altriCostiAcquistoPersonalizzato,
      ristrutturazione,
      arredamento,
      tassoBenchmarkPersonalizzato,
    }),
    [
      unitaList,
      prezzoAcquisto,
      primaCasaRegistro,
      acquistoDa,
      importoMutuo,
      tassoMutuoPercentuale,
      durataMutuoAnni,
      dataAcquisto,
      speseIncassoPerRata,
      affittoLordoAnnuo,
      oneriAccessoriAnnui,
      renditaFigurativaAnnua,
      regimeFiscaleAffitto,
      tipoCedolare,
      aliquotaMarginaleIrpef,
      anniInvestimento,
      rivalutazioneAnnuaPercentuale,
      onorarioNotaioPersonalizzato,
      agenziaPersonalizzata,
      visureNotaioPersonalizzate,
      tassaArchivioPersonalizzata,
      tariffaTariPersonalizzata,
      energiaElettricaPersonalizzata,
      gasPersonalizzato,
      internetPersonalizzato,
      condominioAnnuoPersonalizzato,
      manutenzioneOrdinariaPersonalizzata,
      manutenzioneStraordinariaPersonalizzata,
      assicurazionePersonalizzata,
      altriCostiAcquistoPersonalizzato,
      ristrutturazione,
      arredamento,
      tassoBenchmarkPersonalizzato,
    ]
  );

  const risultati = useMemo(
    () => calcolaSimulazione(parametriSimulazione),
    [parametriSimulazione]
  );

  // Target di default: il rendimento BTP già mostrato nel pannello
  // Confronto — risponde direttamente a "a quali condizioni batto
  // l'alternativa più semplice?". Sovrascrivibile se l'utente vuole un
  // obiettivo diverso.
  const targetIrrEffettivo = targetIrrPersonalizzato
    ? parseFloat(targetIrrPersonalizzato) / 100
    : risultati.tassoBenchmarkEffettivo;

  const risultatoObiettivo = useMemo(
    () => trovaValorePerTargetIrr(parametriSimulazione, levaObiettivo, targetIrrEffettivo),
    [parametriSimulazione, levaObiettivo, targetIrrEffettivo]
  );

  const linkPianoAmmortamento = useMemo(() => {
    const decorrenzaCalcolata = formatoISO(primoDelMeseSuccessivo(new Date(dataAcquisto)));
    const parametri = new URLSearchParams({
      importo: String(importoMutuo),
      tasso: String(tassoMutuoPercentuale),
      durata: String(durataMutuoAnni),
      decorrenza: decorrenzaCalcolata,
      spese: String(speseIncassoPerRata),
    });
    return `/piano-ammortamento?${parametri.toString()}`;
  }, [
    importoMutuo,
    tassoMutuoPercentuale,
    durataMutuoAnni,
    dataAcquisto,
    speseIncassoPerRata,
  ]);

  const linkFlussiCassa = useMemo(() => {
    const parametri = new URLSearchParams({
      dataAcquisto: dataAcquisto,
      prezzo: String(prezzoAcquisto),
      registro: String(risultati.imposteAcquisto.registro),
      ipotecaria: String(risultati.imposteAcquisto.ipotecaria),
      catastale: String(risultati.imposteAcquisto.catastale),
      notaioOnorario: String(risultati.notaio.onorario),
      notaioVisure: String(risultati.notaio.visure),
      notaioTassaArchivio: String(risultati.notaio.tassaArchivio),
      agenziaTotale: String(risultati.agenzia.totale),
      importoMutuo: String(importoMutuo),
      tassoMutuo: String(tassoMutuoPercentuale),
      durataMutuo: String(durataMutuoAnni),
      decorrenzaMutuo: formatoISO(primoDelMeseSuccessivo(new Date(dataAcquisto))),
      speseMutuo: String(speseIncassoPerRata),
      speseMutuoIstruttoria: String(risultati.speseMutuo?.istruttoria ?? 0),
      speseMutuoImpostaSostitutiva: String(
        risultati.speseMutuo?.impostaSostitutiva ?? 0
      ),
      affittoLordo: String(affittoLordoAnnuo),
      oneriAccessori: String(oneriAccessoriAnnui),
      renditaFigurativa: String(renditaFigurativaAnnua),
      tassazioneImporto: String(risultati.tassazioneAffitto.imposta),
      tassazioneEtichetta: etichettaRegimeAffitto,
      imu: String(risultati.imu),
      tari: String(risultati.tari.totale),
      addizionali: String(risultati.addizionali?.importo ?? 0),
      energiaElettrica: String(risultati.utenze.energiaElettrica.totale),
      gas: String(risultati.utenze.gas.totale),
      internet: String(risultati.utenze.internet.totale),
      condominio: String(risultati.condominio.totale),
      manutenzioneOrdinaria: String(risultati.manutenzione.ordinaria),
      manutenzioneStraordinaria: String(risultati.manutenzione.straordinaria),
      assicurazione: String(risultati.assicurazione.totale),
      altriCosti: String(risultati.altriCostiAcquisto),
      ristrutturazione: String(ristrutturazione),
      arredamento: String(arredamento),
      abitazionePrincipale: risultati.immobileAbitazionePrincipale ? "1" : "0",
      anni: String(anniInvestimento),
      rivendita: String(risultati.valoreStimatoRivendita),
    });
    if (idImmobileCorrente && nomeSalvataggio) {
      parametri.set("nome", nomeSalvataggio);
      parametri.set("idImmobile", idImmobileCorrente);
      if (ultimoSalvataggio) {
        parametri.set("ultimoSalvataggio", ultimoSalvataggio.toISOString());
      }
    }
    return `/flussi-cassa?${parametri.toString()}`;
  }, [
    prezzoAcquisto,
    risultati.imposteAcquisto,
    risultati.notaio,
    risultati.agenzia,
    importoMutuo,
    tassoMutuoPercentuale,
    durataMutuoAnni,
    dataAcquisto,
    speseIncassoPerRata,
    risultati.speseMutuo,
    affittoLordoAnnuo,
    oneriAccessoriAnnui,
    renditaFigurativaAnnua,
    risultati.tassazioneAffitto,
    etichettaRegimeAffitto,
    risultati.imu,
    risultati.tari,
    risultati.addizionali,
    risultati.utenze,
    risultati.condominio,
    risultati.manutenzione,
    risultati.assicurazione,
    risultati.altriCostiAcquisto,
    ristrutturazione,
    arredamento,
    risultati.immobileAbitazionePrincipale,
    anniInvestimento,
    risultati.valoreStimatoRivendita,
    idImmobileCorrente,
    nomeSalvataggio,
    ultimoSalvataggio,
  ]);

  return (
    <div className="min-h-screen bg-[var(--ink)] text-[var(--ink-text)]">
      <div className="sticky top-0 z-20 bg-[var(--ink)]">
        <header className="border-b border-[var(--rule)] px-6 py-5 lg:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-[var(--font-display)] text-2xl tracking-tight">
                <Link href="/">CasaFlow</Link>
              </h1>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Simulatore di redditività per investimenti immobiliari
                {" — "}
                <Link href="/documentazione" className="text-[var(--brass)] hover:underline">
                  Come funziona
                </Link>
              </p>
            </div>

            {/* Cruscotto minimo: sempre in vista, indipendentemente da
                quanto scorri il form o i pannelli risultati sotto. */}
            <div className="flex items-center gap-2 rounded-sm border border-[var(--rule)] bg-[var(--surface)] px-3 py-2 font-[var(--font-mono)] text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    risultati.interpretazioneRisultato.fascia === "negativo"
                      ? "var(--brick)"
                      : risultati.interpretazioneRisultato.fascia === "basso"
                      ? "var(--muted)"
                      : "var(--brass)",
                }}
                title={risultati.interpretazioneRisultato.etichetta}
              />
              <span className="text-[var(--muted)]">IRR</span>
              <span className="text-base font-medium text-[var(--ink-text)]">
                {risultati.irr !== null ? `${(risultati.irr * 100).toFixed(1)}%` : "n/d"}
              </span>
              <span className="hidden text-[var(--muted)] sm:inline">
                — {risultati.interpretazioneRisultato.etichetta}
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {SELETTORE_DEBUG_VISIBILE && process.env.NODE_ENV !== "production" && (
              <label className="block text-sm sm:w-72">
                <span className="mb-1.5 block text-[var(--muted)]">
                  Carica immobile di prova (debug)
                </span>
                <select
                  className={classiInput}
                  value={immobileSelezionato}
                  onChange={(e) =>
                    caricaImmobileDebug(e.target.value as ChiaveImmobile | "")
                  }
                >
                  <option value="">— nessuno —</option>
                  {OPZIONI_IMMOBILE_DEBUG.map((opzione) => (
                    <option key={opzione.chiave} value={opzione.chiave}>
                      {opzione.etichetta}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex items-center gap-2 whitespace-nowrap pb-2 text-sm">
              <input
                type="checkbox"
                checked={modalitaAvanzata}
                onChange={(e) => setModalitaAvanzata(e.target.checked)}
                className="h-4 w-4 accent-[var(--brass)]"
              />
              Modalità avanzata
            </label>

            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Svuotare tutti i campi e tornare ai valori di default? L'operazione non è reversibile."
                  )
                ) {
                  svuotaForm();
                }
              }}
              className="whitespace-nowrap rounded-sm border border-[var(--rule)] px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:border-[var(--brick)]/50 hover:text-[var(--brick)]"
            >
              Svuota tutto
            </button>

            <Show when="signed-out">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="rounded-sm border border-[var(--brass)]/50 px-3 py-2 text-sm text-[var(--brass)] transition-colors hover:bg-[var(--brass)]/10"
                >
                  Accedi con Google
                </button>
              </SignInButton>
            </Show>

            <Show when="signed-in">
              <div className="relative flex items-center gap-2">
                <button
                  type="button"
                  onClick={apriDialogoSalva}
                  className="rounded-sm border border-[var(--brass)]/50 px-3 py-2 text-sm text-[var(--brass)] transition-colors hover:bg-[var(--brass)]/10"
                >
                  Salva
                </button>

                <button
                  type="button"
                  onClick={() => setMostraListaSalvati((v) => !v)}
                  className="rounded-sm border border-[var(--rule)] px-3 py-2 text-sm text-[var(--ink-text)] transition-colors hover:bg-white/5"
                >
                  I miei immobili ({immobiliSalvati.length})
                </button>

                {mostraListaSalvati && (
                  <ListaSalvatiDropdown
                    immobili={immobiliSalvati}
                    onCarica={gestisciCaricaSalvato}
                    onElimina={gestisciEliminaSalvato}
                  />
                )}

                <UserButton />
              </div>
            </Show>
          </div>
        </div>
      </header>

      {idImmobileCorrente && (
        <div className="border-b border-[var(--rule)] bg-[var(--brass)]/5 px-6 py-2.5 lg:px-10">
          <p className="text-sm text-[var(--brass)]">
            Stai lavorando su:{" "}
            <span className="font-medium">{nomeSalvataggio}</span>
            {ultimoSalvataggio && (
              <span className="ml-2 text-xs text-[var(--muted)]">
                (ultimo salvataggio {formatoDataOra.format(ultimoSalvataggio)})
              </span>
            )}
          </p>
        </div>
      )}
      </div>

      {mostraDialogoSalva && (
        <DialogoSalva
          aggiornamento={!!idImmobileCorrente}
          nome={nomeSalvataggio}
          onCambiaNome={setNomeSalvataggio}
          errore={erroreSalvataggio}
          salvataggioInCorso={salvataggioInCorso}
          onAnnulla={() => setMostraDialogoSalva(false)}
          onSalva={gestisciSalva}
        />
      )}

      <main className="grid grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-[1fr_380px] lg:px-10">
        <div className="space-y-10">
          <SezioneForm numero="01" titolo="Immobile">
            <Campo
              label="Prezzo di acquisto" infoId="prezzo-acquisto"
              unita="€"
              modificato={modificato.prezzoAcquisto}
            >
              <InputNumero valore={prezzoAcquisto} onChange={setPrezzoAcquisto} />
            </Campo>
            <Campo
              label="Data di acquisto" infoId="data-acquisto"
              modificato={modificato.dataAcquisto}
            >
              <input
                className={classiInput}
                type="date"
                value={dataAcquisto}
                onChange={(e) => setDataAcquisto(e.target.value)}
              />
              <span className="mt-1.5 block text-[10px] text-[var(--muted)]">
                Se c&apos;è un mutuo, la sua decorrenza si calcola in
                automatico: 1° del mese successivo.
              </span>
            </Campo>
            <Campo
              label="Prima casa (ai fini registro)" infoId="prima-casa"
              modificato={modificato.primaCasaRegistro}
            >
              <ToggleSiNo valore={primaCasaRegistro} onChange={setPrimaCasaRegistro} />
            </Campo>
            <Campo label="Acquisto da" infoId="acquisto-da" modificato={modificato.acquistoDa}>
              <select
                className={classiInput}
                value={acquistoDa}
                onChange={(e) => setAcquistoDa(e.target.value as TipoVenditore)}
              >
                <option value="privato">Privato</option>
                <option value="impresa">Impresa costruttrice</option>
              </select>
            </Campo>

            {modalitaAvanzata && (
              <BoxAvanzato>
                <Campo label="Intermediazione immobiliare" infoId="spese-agenzia-personalizzata" unita="€">
                  <input
                    className={classiInput}
                    type="number"
                    step={10}
                    placeholder="auto (3% + IVA del prezzo)"
                    value={agenziaPersonalizzata}
                    onChange={(e) => setAgenziaPersonalizzata(e.target.value)}
                  />
                  <span className="mt-1.5 block text-[10px] text-[var(--muted)]">
                    Valore assoluto (es. dalla fattura reale) — se vuoto,
                    si stima al 3% + IVA del prezzo.
                  </span>
                </Campo>
                <Campo label="Onorario notaio" infoId="onorario-notaio-personalizzato" unita="€">
                  <input
                    className={classiInput}
                    type="number"
                    step={10}
                    placeholder={`auto (${PERCENTUALE_NOTAIO_DEFAULT_UI}% del prezzo)`}
                    value={onorarioNotaioPersonalizzato}
                    onChange={(e) =>
                      setOnorarioNotaioPersonalizzato(e.target.value)
                    }
                  />
                  <span className="mt-1.5 block text-[10px] text-[var(--muted)]">
                    Valore assoluto (es. dal preventivo reale) — se vuoto,
                    si stima come {PERCENTUALE_NOTAIO_DEFAULT_UI}% del
                    prezzo.
                  </span>
                </Campo>
                <Campo label="Visure ipotecarie/catastali" infoId="visure-notarili-personalizzate" unita="€">
                  <input
                    className={classiInput}
                    type="number"
                    step={1}
                    placeholder={`auto (${VISURE_NOTAIO_DEFAULT_UI}€)`}
                    value={visureNotaioPersonalizzate}
                    onChange={(e) => setVisureNotaioPersonalizzate(e.target.value)}
                  />
                </Campo>
                <Campo label="Tassa archivio notarile" infoId="tassa-archivio-personalizzata" unita="€">
                  <input
                    className={classiInput}
                    type="number"
                    step={1}
                    placeholder={`auto (${TASSA_ARCHIVIO_DEFAULT_UI}€)`}
                    value={tassaArchivioPersonalizzata}
                    onChange={(e) =>
                      setTassaArchivioPersonalizzata(e.target.value)
                    }
                  />
                </Campo>
              </BoxAvanzato>
            )}

            <div className="sm:col-span-2 mt-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--ink-text)]">
                  Unità catastali
                </h3>
                <button
                  type="button"
                  onClick={aggiungiUnita}
                  className="rounded-sm border border-[var(--brass)]/50 px-3 py-1.5 text-xs text-[var(--brass)] transition-colors hover:bg-[var(--brass)]/10"
                >
                  + Aggiungi unità
                </button>
              </div>

              {unitaList.map((unita, indice) => (
                <UnitaCard
                  key={unita.id}
                  numero={indice + 1}
                  unita={unita}
                  modificata={unitaModificata(indice, unita)}
                  rimovibile={unitaList.length > 1}
                  mostraElencoCompleto={modalitaAvanzata}
                  compressa={unitaCompresse.has(unita.id)}
                  onChange={(patch) => aggiornaUnita(unita.id, patch)}
                  onRimuovi={() => rimuoviUnita(unita.id)}
                  onToggleCompressione={() => toggleCompressioneUnita(unita.id)}
                />
              ))}
            </div>
          </SezioneForm>

          <SezioneForm numero="02" titolo="Costi di avviamento">
            <Campo label="Ristrutturazione" infoId="ristrutturazione" unita="€">
              <InputNumero valore={ristrutturazione} onChange={setRistrutturazione} />
            </Campo>
            <Campo label="Arredamento" infoId="arredamento" unita="€">
              <InputNumero valore={arredamento} onChange={setArredamento} />
            </Campo>
            <Campo label="Altri costi non detraibili" infoId="altri-costi" unita="€">
              <input
                className={classiInput}
                type="number"
                step={10}
                placeholder="es. spese minori non catalogate"
                value={altriCostiAcquistoPersonalizzato}
                onChange={(e) =>
                  setAltriCostiAcquistoPersonalizzato(e.target.value)
                }
              />
            </Campo>
            <span className="sm:col-span-2 -mt-2 block text-[10px] text-[var(--muted)]">
              Costi una tantum, a carico tuo (0€ di default — inserisci solo
              quanto prevedi di spendere davvero).
            </span>
            {risultati.detrazioneRistrutturazione.rataAnnua > 0 && (
              <span className="sm:col-span-2 block text-[10px] text-[var(--brass)]">
                Genera una detrazione fiscale di circa{" "}
                {formatoEuroColonna.format(risultati.detrazioneRistrutturazione.rataAnnua)}
                /anno per 10 anni ({(risultati.detrazioneRistrutturazione.aliquota * 100).toFixed(0)}
                % della spesa, spalmata).
              </span>
            )}
            {risultati.detrazioneMobili.rataAnnua > 0 && (
              <span className="sm:col-span-2 block text-[10px] text-[var(--brass)]">
                L&apos;arredamento genera un&apos;ulteriore detrazione di
                circa {formatoEuroColonna.format(risultati.detrazioneMobili.rataAnnua)}/anno
                per 10 anni (50% della spesa, spalmata).
              </span>
            )}
            {arredamento > 0 && ristrutturazione === 0 && (
              <span className="sm:col-span-2 block text-[10px] text-[var(--muted)]">
                Il bonus mobili richiede una ristrutturazione collegata —
                senza, l&apos;arredamento resta un costo puro, senza detrazione.
              </span>
            )}
          </SezioneForm>

          <SezioneForm numero="03" titolo="Mutuo">
            <Campo
              label="Importo finanziato" infoId="importo-mutuo"
              unita="€ — 0 se non richiesto"
              modificato={modificato.importoMutuo}
            >
              <InputNumero valore={importoMutuo} onChange={setImportoMutuo} />
            </Campo>

            {mutuoRichiesto ? (
              <>
                <Campo
                  label="Tasso annuo" infoId="tasso-mutuo"
                  unita="%"
                  modificato={modificato.tassoMutuoPercentuale}
                >
                  <InputNumero
                    valore={tassoMutuoPercentuale}
                    onChange={setTassoMutuoPercentuale}
                    step={0.01}
                  />
                  <span className="mt-1.5 block text-[10px] text-[var(--muted)]">
                    ≈ {formatoEuroPreciso.format(risultati.interessiAnno1)} di
                    interessi nel primo anno
                  </span>
                </Campo>
                <Campo
                  label="Durata" infoId="durata-mutuo"
                  unita="anni"
                  modificato={modificato.durataMutuoAnni}
                >
                  <InputNumero
                    valore={durataMutuoAnni}
                    onChange={setDurataMutuoAnni}
                  />
                </Campo>
                <Campo label="Decorrenza (calcolata)">
                  <div className={`${classiInput} flex items-center bg-white/5 text-[var(--muted)]`}>
                    {formatoISO(primoDelMeseSuccessivo(new Date(dataAcquisto)))}
                  </div>
                  <span className="mt-1.5 block text-[10px] text-[var(--muted)]">
                    1° del mese successivo alla data di acquisto (Sezione 01)
                    — non modificabile qui.
                  </span>
                </Campo>

                {modalitaAvanzata && (
                  <BoxAvanzato>
                    <Campo
                      label="Spese incasso mutuo" infoId="spese-incasso-mutuo"
                      unita="€/rata"
                      modificato={modificato.speseIncassoPerRata}
                    >
                      <InputNumero
                        valore={speseIncassoPerRata}
                        onChange={setSpeseIncassoPerRata}
                        step={0.01}
                      />
                    </Campo>
                  </BoxAvanzato>
                )}

                <div className="sm:col-span-2">
                  <Link
                    href={linkPianoAmmortamento}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-sm text-[var(--brass)] hover:underline"
                  >
                    Vedi il piano di ammortamento completo →
                  </Link>
                </div>
              </>
            ) : (
              <p className="sm:col-span-2 text-xs text-[var(--muted)]">
                Nessun mutuo — inserisci un importo maggiore di zero per
                configurare tasso, durata e decorrenza.
              </p>
            )}
          </SezioneForm>

          <SezioneForm numero="04" titolo="Affitto">
            <Campo label="Affitto lordo annuo atteso" infoId="affitto-lordo" unita="€/anno">
              <InputNumero
                valore={affittoLordoAnnuo}
                onChange={setAffittoLordoAnnuo}
              />
            </Campo>

            <Campo label="Oneri accessori" infoId="oneri-accessori" unita="€/anno">
              <InputNumero
                valore={oneriAccessoriAnnui}
                onChange={setOneriAccessoriAnnui}
              />
              <span className="mt-1.5 block text-[10px] text-[var(--muted)]">
                Quota del canone per spese fisse (es. condominio) — non è
                reddito da locazione, quindi non subisce alcuna
                trattenuta fiscale, a differenza dell&apos;affitto.
              </span>
            </Campo>

            {affittoLordoAnnuo === 0 && (
              <Campo label="Rendita figurativa" infoId="rendita-figurativa" unita="€/anno">
                <InputNumero
                  valore={renditaFigurativaAnnua}
                  onChange={setRenditaFigurativaAnnua}
                />
                <span className="mt-1.5 block text-[10px] text-[var(--muted)]">
                  Il beneficio di usare l&apos;immobile tu stesso (prima
                  casa, o vacanza) invece di affittarlo o pagare un
                  alloggio altrove — un ricavo di cassa fittizio, mai
                  tassato. Compilalo solo se non affitti a terzi (con
                  affitto &gt; 0 questo campo non ha senso e resta
                  nascosto).
                </span>
              </Campo>
            )}

            {affittoLordoAnnuo > 0 && (
              <>
                <Campo label="Regime fiscale" infoId="regime-fiscale">
                  <select
                    className={classiInput}
                    value={regimeFiscaleAffitto}
                    onChange={(e) =>
                      setRegimeFiscaleAffitto(e.target.value as RegimeFiscaleAffitto)
                    }
                  >
                    <option value="cedolareSecca">Cedolare secca</option>
                    <option value="ordinaria">
                      Ordinaria (cumulo con il reddito)
                    </option>
                  </select>
                </Campo>

                {regimeFiscaleAffitto === "cedolareSecca" ? (
                  <Campo label="Tipo cedolare" infoId="tipo-cedolare">
                    <select
                      className={classiInput}
                      value={tipoCedolare}
                      onChange={(e) =>
                        setTipoCedolare(e.target.value as TipoCedolare)
                      }
                    >
                      <option value="standard">Standard (21%)</option>
                      <option value="concordato">Canone concordato (10%)</option>
                    </select>
                  </Campo>
                ) : (
                  <Campo label="Aliquota marginale IRPEF" infoId="aliquota-marginale-irpef">
                    <select
                      className={classiInput}
                      value={aliquotaMarginaleIrpef}
                      onChange={(e) =>
                        setAliquotaMarginaleIrpef(parseFloat(e.target.value))
                      }
                    >
                      {ALIQUOTE_MARGINALI_IRPEF_2026.map((aliquota) => (
                        <option key={aliquota} value={aliquota}>
                          {(aliquota * 100).toFixed(0)}%
                        </option>
                      ))}
                    </select>
                    <span className="mt-1.5 block text-[10px] text-[var(--muted)]">
                      Dipende dal tuo reddito complessivo — sceglila tu, il
                      tool non lo conosce.
                    </span>
                  </Campo>
                )}
                <span className="sm:col-span-2 -mt-2 block text-[10px] text-[var(--muted)]">
                  = {formatoEuroPreciso.format(risultati.tassazioneAffitto.affittoNetto)}
                  /anno al netto delle imposte ({etichettaRegimeAffitto})
                </span>
              </>
            )}
          </SezioneForm>

          <SezioneForm numero="05" titolo="Costi ricorrenti">
            <Campo label="Spese condominiali" infoId="condominio" unita="€/anno">
              <input
                className={classiInput}
                type="number"
                step={10}
                placeholder={`stima: ${formatoEuro.format(
                  unitaList.reduce((s, u) => s + (u.metriQuadri || 0), 0) *
                    COSTO_CONDOMINIO_DEFAULT_PER_MQ
                )}`}
                value={condominioAnnuoPersonalizzato}
                onChange={(e) => setCondominioAnnuoPersonalizzato(e.target.value)}
              />
              <span className="mt-1.5 block text-[10px] text-[var(--muted)]">
                Stima della sola quota straordinaria — le spese ordinarie
                sono per legge a carico dell&apos;inquilino.
              </span>
            </Campo>
            <div className="sm:col-span-1" />

            {modalitaAvanzata && (
              <BoxAvanzato>
                <Campo label="TARI" infoId="tari-personalizzata" unita="€/anno">
                  <input
                    className={classiInput}
                    type="number"
                    step={10}
                    placeholder={`stima: ${formatoEuro.format(
                      unitaList.reduce((s, u) => s + (u.metriQuadri || 0), 0) *
                        TARIFFA_TARI_DEFAULT_PER_MQ
                    )}`}
                    value={tariffaTariPersonalizzata}
                    onChange={(e) => setTariffaTariPersonalizzata(e.target.value)}
                  />
                </Campo>
                <Campo label="Energia elettrica" infoId="energia-elettrica" unita="€/anno">
                  <input
                    className={classiInput}
                    type="number"
                    step={10}
                    placeholder="stima automatica"
                    value={energiaElettricaPersonalizzata}
                    onChange={(e) =>
                      setEnergiaElettricaPersonalizzata(e.target.value)
                    }
                  />
                </Campo>
                <Campo label="Gas" infoId="gas" unita="€/anno">
                  <input
                    className={classiInput}
                    type="number"
                    step={10}
                    placeholder="stima automatica"
                    value={gasPersonalizzato}
                    onChange={(e) => setGasPersonalizzato(e.target.value)}
                  />
                </Campo>
                <Campo label="Internet" infoId="internet" unita="€/anno">
                  <input
                    className={classiInput}
                    type="number"
                    step={10}
                    placeholder="stima automatica"
                    value={internetPersonalizzato}
                    onChange={(e) => setInternetPersonalizzato(e.target.value)}
                  />
                </Campo>
                <span className="sm:col-span-2 -mt-2 block text-[10px] text-[var(--muted)]">
                  Utenze: default prudenziali — di norma le paga
                  l&apos;inquilino.
                </span>
                <Campo label="Manutenzione ordinaria" infoId="manutenzione-ordinaria" unita="%/anno">
                  <input
                    className={classiInput}
                    type="number"
                    step={0.1}
                    placeholder={`auto (${PERCENTUALE_MANUTENZIONE_ORDINARIA_UI}%)`}
                    value={manutenzioneOrdinariaPersonalizzata}
                    onChange={(e) =>
                      setManutenzioneOrdinariaPersonalizzata(e.target.value)
                    }
                  />
                  <span className="mt-1.5 block text-[10px] text-[var(--muted)]">
                    = {formatoEuroPreciso.format(risultati.manutenzione.ordinaria)}/anno
                  </span>
                </Campo>
                <Campo label="Manutenzione straordinaria" infoId="manutenzione-straordinaria" unita="%/anno">
                  <input
                    className={classiInput}
                    type="number"
                    step={0.1}
                    placeholder={`auto (${PERCENTUALE_MANUTENZIONE_STRAORDINARIA_UI}%)`}
                    value={manutenzioneStraordinariaPersonalizzata}
                    onChange={(e) =>
                      setManutenzioneStraordinariaPersonalizzata(e.target.value)
                    }
                  />
                  <span className="mt-1.5 block text-[10px] text-[var(--muted)]">
                    = {formatoEuroPreciso.format(risultati.manutenzione.straordinaria)}/anno
                  </span>
                </Campo>
                <Campo label="Assicurazione" infoId="assicurazione" unita="€/anno">
                  <input
                    className={classiInput}
                    type="number"
                    step={10}
                    placeholder="stima automatica"
                    value={assicurazionePersonalizzata}
                    onChange={(e) => setAssicurazionePersonalizzata(e.target.value)}
                  />
                </Campo>
              </BoxAvanzato>
            )}
          </SezioneForm>

          <SezioneForm numero="06" titolo="Orizzonte investimento">
            <Campo label="Anni di investimento" infoId="anni-investimento" unita="anni">
              <InputNumero
                valore={anniInvestimento}
                onChange={setAnniInvestimento}
              />
            </Campo>
            <Campo label="Rivalutazione annua immobile" infoId="rivalutazione-annua" unita="%">
              <InputNumero
                valore={rivalutazioneAnnuaPercentuale}
                onChange={setRivalutazioneAnnuaPercentuale}
                step={0.01}
              />
              <span className="mt-1.5 block text-[10px] text-[var(--muted)]">
                ≈ +{formatoEuroPreciso.format(
                  (prezzoAcquisto * rivalutazioneAnnuaPercentuale) / 100
                )} il primo anno — valore dopo {anniInvestimento} anni:{" "}
                {formatoEuroPreciso.format(risultati.valoreStimatoRivendita)}
              </span>
            </Campo>
          </SezioneForm>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          <Link
            href={linkFlussiCassa}
            target="_blank"
            className="block transition-opacity hover:opacity-80"
          >
            <TimbroRendimento valore={risultati.irr} />
          </Link>

          <PannelloCostiUnaTantum
            risultati={risultati}
            ristrutturazione={ristrutturazione}
            arredamento={arredamento}
          />

          <PannelloDettaglioAnnuale
            risultati={risultati}
            affittoLordoAnnuo={affittoLordoAnnuo}
            etichettaRegimeAffitto={etichettaRegimeAffitto}
          />

          <PannelloCostiRicorrenti risultati={risultati} />

          <PannelloRivenditaStimata
            risultati={risultati}
            anniInvestimento={anniInvestimento}
          />

          {risultati.totaleCostiUnaTantum > 0 &&
            risultati.totaleCostiRicorrenti > 0 &&
            risultati.valoreStimatoRivendita > 0 && (
              <>
                <PannelloInterpretazione risultati={risultati} />

                <PannelloConfrontoBtp
                  risultati={risultati}
                  tassoBenchmarkPersonalizzato={tassoBenchmarkPersonalizzato}
                  onCambiaTassoBenchmark={setTassoBenchmarkPersonalizzato}
                />

                <PannelloLeve risultati={risultati} />

                <PannelloObiettivo
                  risultatoObiettivo={risultatoObiettivo}
                  levaObiettivo={levaObiettivo}
                  onCambiaLeva={setLevaObiettivo}
                  targetIrrPersonalizzato={targetIrrPersonalizzato}
                  onCambiaTargetIrr={setTargetIrrPersonalizzato}
                  targetIrrEffettivo={targetIrrEffettivo}
                  mutuoRichiesto={mutuoRichiesto}
                />
              </>
            )}

          <p className="text-xs leading-relaxed text-[var(--muted)]">
            IRR calcolato sui flussi di cassa reali dell&apos;intero
            orizzonte di investimento (esborso iniziale, affitti netti
            annui, costi ricorrenti, tasse e detrazioni, rivendita finale
            al netto del debito residuo).
          </p>
        </aside>
      </main>
    </div>
  );
}

