// components/tabella-movimenti.tsx
"use client";

import { useMemo, useState } from "react";
import ExcelJS from "exceljs";
import type { CategoriaVoce, VoceFlusso } from "@/lib/calcolo/flussiCassa";

const formatoEuroColonna = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const formatoData = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Converte una data JS nel numero seriale che Excel usa internamente
 * per rappresentare le date, usando SEMPRE l'ora locale (anno/mese/
 * giorno "intesi" dall'app) per l'interpretazione — mai UTC. Bypassa
 * del tutto la conversione automatica di ExcelJS, che interpreta gli
 * oggetti Date in UTC: con un fuso orario avanti rispetto a UTC (come
 * l'Italia, UTC+1/+2), la mezzanotte locale di un giorno finisce per
 * essere letta come le ore serali del giorno PRIMA in UTC — scrivendo
 * sistematicamente una data sbagliata di un giorno nel file. */
function dataAExcelSerial(data: Date): number {
  const anno = data.getFullYear();
  const mese = data.getMonth();
  const giorno = data.getDate();
  const epocaExcel = Date.UTC(1899, 11, 30); // giorno 0 del sistema data di Excel
  const giornoUtc = Date.UTC(anno, mese, giorno);
  return Math.round((giornoUtc - epocaExcel) / 86400000);
}

const ETICHETTE_CATEGORIA: Record<CategoriaVoce, string> = {
  investimenti: "Investimento",
  ricavi: "Ricavo",
  costi: "Costo",
  oneri: "Onere",
  imposte: "Imposta",
};

type Colonna = "anno" | "data" | "categoria" | "descrizione" | "importo";

const classiInput =
  "rounded-sm border border-[var(--rule)] bg-[var(--ink)] px-3 py-1.5 text-xs text-[var(--ink-text)] outline-none transition-colors focus:border-[var(--brass)]";

export default function TabellaMovimenti({
  transazioni,
  anniInvestimento,
  nomeImmobile,
}: {
  transazioni: VoceFlusso[];
  anniInvestimento: number;
  nomeImmobile: string | null;
}) {
  const [ordinamento, setOrdinamento] = useState<{
    colonna: Colonna;
    direzione: "asc" | "desc";
  }>({ colonna: "data", direzione: "asc" });
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaVoce | "">("");
  const [filtroAnno, setFiltroAnno] = useState("");
  const [filtroTesto, setFiltroTesto] = useState("");

  const anniDisponibili = useMemo(
    () =>
      Array.from(new Set(transazioni.map((t) => t.annoCalendario))).sort(
        (a, b) => a - b
      ),
    [transazioni]
  );

  const righeFiltrate = useMemo(() => {
    let righe = transazioni;
    if (filtroCategoria) righe = righe.filter((r) => r.categoria === filtroCategoria);
    if (filtroAnno)
      righe = righe.filter((r) => String(r.annoCalendario) === filtroAnno);
    if (filtroTesto) {
      const testo = filtroTesto.toLowerCase();
      righe = righe.filter((r) => r.descrizione.toLowerCase().includes(testo));
    }

    const { colonna, direzione } = ordinamento;
    const ordinate = [...righe].sort((a, b) => {
      let confronto = 0;
      switch (colonna) {
        case "anno":
          confronto = a.annoCalendario - b.annoCalendario;
          break;
        case "data":
          confronto = a.data.getTime() - b.data.getTime();
          break;
        case "categoria":
          confronto = ETICHETTE_CATEGORIA[a.categoria].localeCompare(
            ETICHETTE_CATEGORIA[b.categoria]
          );
          break;
        case "descrizione":
          confronto = a.descrizione.localeCompare(b.descrizione);
          break;
        case "importo":
          confronto = a.importo - b.importo;
          break;
      }
      return direzione === "asc" ? confronto : -confronto;
    });

    return ordinate;
  }, [transazioni, filtroCategoria, filtroAnno, filtroTesto, ordinamento]);

  function cambiaOrdinamento(colonna: Colonna) {
    setOrdinamento((prev) =>
      prev.colonna === colonna
        ? { colonna, direzione: prev.direzione === "asc" ? "desc" : "asc" }
        : { colonna, direzione: "asc" }
    );
  }

  /** Nome del file secondo il formato richiesto:
   * CasaFlow_(nome salvataggio o "unsaved")_(data di download AAAAMMGG).xlsx */
  function costruisciNomeFile(): string {
    const oggi = new Date();
    const dataDownload = `${oggi.getFullYear()}${String(oggi.getMonth() + 1).padStart(2, "0")}${String(oggi.getDate()).padStart(2, "0")}`;
    const nomeSanificato = (nomeImmobile ?? "unsaved")
      .trim()
      .replace(/[\\/:*?"<>|]/g, "-") // caratteri non validi nei nomi file
      .replace(/\s+/g, "_") || "unsaved";
    return `CasaFlow_${nomeSanificato}_${dataDownload}.xlsx`;
  }

  async function esportaExcel() {
    // Esporta SEMPRE tutti i dati, indipendentemente da eventuali filtri
    // attivi nella tabella a schermo — l'utente filtra per leggere più
    // comodamente, non per limitare cosa esportare. Ordine cronologico
    // (l'ordine naturale di `transazioni`), non l'ordinamento a schermo.
    const cartella = new ExcelJS.Workbook();
    const foglio = cartella.addWorksheet("Movimenti");

    const primaRigaDati = 4;
    const ultimaRigaDati = primaRigaDati + transazioni.length - 1;

    const formatoValutaExcel =
      '_-* #,##0\\ "€"_-;\\-* #,##0\\ "€"_-;_-* "-"??\\ "€"_-;_-@_-';

    // Riga 1: IRR (formula XIRR — coerente con il motore dell'app, che
    // usa lo stesso metodo su date reali, non un IRR a indice intero).
    foglio.getCell("D1").value = "IRR:";
    foglio.getCell("D1").alignment = { horizontal: "right" };
    const cellaIrr = foglio.getCell("E1");
    cellaIrr.value = {
      formula: `XIRR(E${primaRigaDati}:E${ultimaRigaDati},B${primaRigaDati}:B${ultimaRigaDati})`,
    };
    cellaIrr.numFmt = "0.00%";
    cellaIrr.font = { bold: true };

    // Riga 2: Subtotale (formula SUBTOTAL — si aggiorna automaticamente
    // se in Excel filtri ulteriormente le righe visibili).
    foglio.getCell("D2").value = "SUBTOTALE:";
    foglio.getCell("D2").alignment = { horizontal: "right" };
    const cellaSubtotale = foglio.getCell("E2");
    cellaSubtotale.value = {
      formula: `SUBTOTAL(9,E${primaRigaDati}:E${ultimaRigaDati})`,
    };
    cellaSubtotale.numFmt = formatoValutaExcel;
    cellaSubtotale.font = { bold: true };

    // Riga 3: intestazioni colonna.
    const intestazioni = ["Anno", "Data", "Tipo", "Voce", "Importo (€)"];
    intestazioni.forEach((testo, indice) => {
      foglio.getRow(3).getCell(indice + 1).value = testo;
    });

    // Righe 4+: dati, TUTTE le transazioni. La data è una VERA data Excel
    // (non testo), così XIRR funziona in modo affidabile indipendentemente
    // dalle impostazioni regionali di chi apre il file.
    transazioni.forEach((voce, indice) => {
      const riga = foglio.getRow(primaRigaDati + indice);
      riga.getCell(1).value = voce.annoCalendario;
      riga.getCell(2).value = dataAExcelSerial(voce.data);
      riga.getCell(2).numFmt = "dd/mm/yyyy";
      riga.getCell(3).value = ETICHETTE_CATEGORIA[voce.categoria];
      riga.getCell(4).value = voce.descrizione;
      riga.getCell(5).value = voce.importo;
      riga.getCell(5).numFmt = formatoValutaExcel;
    });

    foglio.columns = [
      { width: 9 }, // Anno
      { width: 13 }, // Data
      { width: 15 }, // Tipo
      { width: 46 }, // Voce
      { width: 15 }, // Importo
    ];

    foglio.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: ultimaRigaDati, column: 5 },
    };

    const buffer = await cartella.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = costruisciNomeFile();
    link.click();
    URL.revokeObjectURL(url);
  }

  function IntestazioneOrdinabile({
    colonna,
    etichetta,
    allineaDestra = false,
  }: {
    colonna: Colonna;
    etichetta: string;
    allineaDestra?: boolean;
  }) {
    const attiva = ordinamento.colonna === colonna;
    return (
      <th
        onClick={() => cambiaOrdinamento(colonna)}
        className={`cursor-pointer select-none px-3 py-2 transition-colors hover:text-[var(--brass)] ${
          allineaDestra ? "text-right" : "text-left"
        }`}
      >
        {etichetta}
        {attiva && (
          <span className="ml-1 text-[var(--brass)]">
            {ordinamento.direzione === "asc" ? "▲" : "▼"}
          </span>
        )}
      </th>
    );
  }

  const filtriAttivi = filtroCategoria !== "" || filtroAnno !== "" || filtroTesto !== "";

  const subtotaleFiltrato = useMemo(
    () => righeFiltrate.reduce((somma, v) => somma + v.importo, 0),
    [righeFiltrate]
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          className={classiInput}
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value as CategoriaVoce | "")}
        >
          <option value="">Tutte le categorie</option>
          <option value="investimenti">Investimento</option>
          <option value="ricavi">Ricavo</option>
          <option value="costi">Costo</option>
          <option value="oneri">Onere</option>
          <option value="imposte">Imposta</option>
        </select>

        <select
          className={classiInput}
          value={filtroAnno}
          onChange={(e) => setFiltroAnno(e.target.value)}
        >
          <option value="">Tutti gli anni</option>
          {anniDisponibili.map((anno) => (
            <option key={anno} value={anno}>
              {anno}
            </option>
          ))}
        </select>

        <input
          className={classiInput}
          type="text"
          placeholder="Cerca nella voce…"
          value={filtroTesto}
          onChange={(e) => setFiltroTesto(e.target.value)}
        />

        {filtriAttivi && (
          <button
            type="button"
            onClick={() => {
              setFiltroCategoria("");
              setFiltroAnno("");
              setFiltroTesto("");
            }}
            className="text-xs text-[var(--brass)] hover:underline"
          >
            Azzera filtri
          </button>
        )}

        <button
          type="button"
          onClick={esportaExcel}
          disabled={transazioni.length === 0}
          className="rounded-sm border border-[var(--brass)]/50 px-3 py-1.5 text-xs text-[var(--brass)] transition-colors hover:bg-[var(--brass)]/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Esporta in Excel
        </button>

        <span className="ml-auto text-xs text-[var(--muted)]">
          {righeFiltrate.length} di {transazioni.length} transazioni
        </span>
      </div>

      <div className="max-h-[36rem] overflow-auto rounded-sm border border-[var(--rule)] bg-[var(--surface)]">
        <table className="w-full min-w-[720px] border-collapse font-[var(--font-mono)] text-xs">
          <thead className="sticky top-0 bg-[var(--surface)] text-[var(--muted)]">
            <tr className="border-b border-[var(--rule)]">
              <IntestazioneOrdinabile colonna="anno" etichetta="Anno" />
              <IntestazioneOrdinabile colonna="data" etichetta="Data" />
              <IntestazioneOrdinabile colonna="categoria" etichetta="Tipo" />
              <IntestazioneOrdinabile colonna="descrizione" etichetta="Voce" />
              <IntestazioneOrdinabile
                colonna="importo"
                etichetta="Importo"
                allineaDestra
              />
            </tr>
            <tr className="border-b border-[var(--rule)] bg-[var(--surface)]">
              <td colSpan={3} />
              <td className="px-3 py-1.5 text-right text-[10px] uppercase tracking-wide text-[var(--muted)]">
                {filtriAttivi ? "Subtotale (filtro attivo)" : "Subtotale"}
              </td>
              <td
                className={`px-3 py-1.5 text-right font-medium ${
                  subtotaleFiltrato >= 0
                    ? "text-[var(--brass)]"
                    : "text-[var(--brick)]"
                }`}
              >
                {formatoEuroColonna.format(subtotaleFiltrato)}
              </td>
            </tr>
          </thead>
          <tbody>
            {righeFiltrate.map((voce, indice) => (
              <tr
                key={indice}
                className={`border-b border-[var(--rule)]/40 ${
                  voce.anno > anniInvestimento ? "bg-white/5" : ""
                }`}
              >
                <td className="px-3 py-1.5">
                  {voce.annoCalendario}
                  {voce.anno > anniInvestimento && (
                    <span className="ml-1 text-[10px] text-[var(--muted)]">*</span>
                  )}
                </td>
                <td className="px-3 py-1.5">{formatoData.format(voce.data)}</td>
                <td className="px-3 py-1.5 text-[var(--muted)]">
                  {ETICHETTE_CATEGORIA[voce.categoria]}
                </td>
                <td className="px-3 py-1.5">{voce.descrizione}</td>
                <td
                  className={`px-3 py-1.5 text-right ${
                    voce.importo >= 0
                      ? "text-[var(--brass)]"
                      : "text-[var(--brick)]"
                  }`}
                >
                  {formatoEuroColonna.format(voce.importo)}
                </td>
              </tr>
            ))}
            {righeFiltrate.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[var(--muted)]">
                  Nessuna transazione corrisponde ai filtri selezionati.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
