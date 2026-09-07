// components/pannelli-risultati.tsx
//
// I pannelli della colonna risultati (destra) del calcolatore —
// estratti da calcolatore-quick-mode.tsx. Ricevono tutti `risultati`
// (l'output di calcolaSimulazione) come prop principale, più qualche
// valore minimo aggiuntivo quando il dato non è già dentro `risultati`.

import type { RisultatiSimulazione } from "@/lib/calcolo/simulazione";
import type { RisultatoObiettivoIrr, LevaObiettivo } from "@/lib/calcolo/obiettivoIrr";
import { ETICHETTE_LEVA_OBIETTIVO } from "@/lib/calcolo/obiettivoIrr";
import { RigaDati, classiInput, formatoEuroColonna } from "@/components/form-ui";

export function PannelloCostiUnaTantum({
  risultati,
  ristrutturazione,
  arredamento,
}: {
  risultati: RisultatiSimulazione;
  ristrutturazione: number;
  arredamento: number;
}) {
  return (
    <div className="rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-5">
      <h2 className="font-[var(--font-display)] text-sm uppercase tracking-wide text-[var(--muted)]">
        Costi una tantum
      </h2>
      <dl className="mt-4 space-y-3 font-[var(--font-mono)] text-sm">
        <RigaDati
          etichetta="Imposte di acquisto"
          valore={formatoEuroColonna.format(risultati.imposteAcquisto.totale)}
        />
        <span className="-mt-2 block text-[10px] leading-relaxed text-[var(--muted)]">
          Registro + ipotecaria + catastale, su tutte le unità.
        </span>

        <RigaDati
          etichetta="Notaio"
          valore={formatoEuroColonna.format(risultati.notaio.totale)}
        />

        <RigaDati
          etichetta="Intermediazione immobiliare"
          valore={formatoEuroColonna.format(risultati.agenzia.totale)}
        />

        {risultati.speseMutuo && (
          <>
            <RigaDati
              etichetta="Attivazione mutuo"
              valore={formatoEuroColonna.format(risultati.speseMutuo.totale)}
            />
            <span className="-mt-2 block text-[10px] leading-relaxed text-[var(--muted)]">
              Istruttoria bancaria + imposta sostitutiva (0,25% prima
              casa / 2% altri casi).
            </span>
          </>
        )}

        {(ristrutturazione > 0 || arredamento > 0) && (
          <>
            {ristrutturazione > 0 && (
              <RigaDati
                etichetta="Ristrutturazione"
                valore={formatoEuroColonna.format(ristrutturazione)}
              />
            )}
            {arredamento > 0 && (
              <RigaDati
                etichetta="Arredamento"
                valore={formatoEuroColonna.format(arredamento)}
              />
            )}
          </>
        )}

        {risultati.altriCostiAcquisto > 0 && (
          <RigaDati
            etichetta="Altri costi non detraibili"
            valore={formatoEuroColonna.format(risultati.altriCostiAcquisto)}
          />
        )}

        {risultati.detrazioneMediazione.importo > 0 && (
          <RigaDati
            etichetta="Detrazione mediazione (19%)"
            valore={`+ ${formatoEuroColonna.format(
              risultati.detrazioneMediazione.importo
            )}`}
          />
        )}

        <div className="border-t border-[var(--rule)] pt-3">
          <RigaDati
            etichetta="Totale costi una tantum"
            valore={formatoEuroColonna.format(risultati.totaleCostiUnaTantum)}
            enfasi
          />
        </div>
      </dl>
    </div>
  );
}

export function PannelloDettaglioAnnuale({
  risultati,
  affittoLordoAnnuo,
  etichettaRegimeAffitto,
}: {
  risultati: RisultatiSimulazione;
  affittoLordoAnnuo: number;
  etichettaRegimeAffitto: string;
}) {
  return (
    <div className="rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-5">
      <h2 className="font-[var(--font-display)] text-sm uppercase tracking-wide text-[var(--muted)]">
        Dettaglio annuale
      </h2>
      <dl className="mt-4 space-y-3 font-[var(--font-mono)] text-sm">
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
          Affitto
        </p>
        <RigaDati
          etichetta="Totale annuo"
          valore={formatoEuroColonna.format(affittoLordoAnnuo)}
        />
        <RigaDati
          etichetta={`Imposte (${etichettaRegimeAffitto})`}
          valore={`− ${formatoEuroColonna.format(risultati.tassazioneAffitto.imposta)}`}
          negativo
        />
        <RigaDati
          etichetta="Saldo netto"
          valore={formatoEuroColonna.format(risultati.tassazioneAffitto.affittoNetto)}
          enfasi
        />

        <p className="pt-2 text-xs uppercase tracking-wide text-[var(--muted)]">
          Mutuo
        </p>
        <RigaDati
          etichetta="Quota dell'anno"
          valore={formatoEuroColonna.format(risultati.rataAnnua)}
        />
        <RigaDati
          etichetta="Rimborso capitale"
          valore={`− ${formatoEuroColonna.format(risultati.capitaleAnno1)}`}
          negativo
        />
        <RigaDati
          etichetta="Interessi passivi"
          valore={`− ${formatoEuroColonna.format(risultati.interessiAnno1)}`}
          negativo
        />
        {risultati.detrazioneInteressiAnno1.importo > 0 && (
          <RigaDati
            etichetta="Detrazione interessi (19%)"
            valore={`+ ${formatoEuroColonna.format(
              risultati.detrazioneInteressiAnno1.importo
            )}`}
          />
        )}
      </dl>
    </div>
  );
}

export function PannelloCostiRicorrenti({
  risultati,
}: {
  risultati: RisultatiSimulazione;
}) {
  return (
    <div className="rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-5">
      <h2 className="font-[var(--font-display)] text-sm uppercase tracking-wide text-[var(--muted)]">
        Costi ricorrenti
      </h2>
      <dl className="mt-4 space-y-3 font-[var(--font-mono)] text-sm">
        <RigaDati
          etichetta="IMU"
          valore={formatoEuroColonna.format(risultati.imu)}
        />
        <RigaDati
          etichetta="TARI"
          valore={formatoEuroColonna.format(risultati.tari.totale)}
        />
        {risultati.addizionali && (
          <RigaDati
            etichetta="Addizionali IRPEF"
            valore={formatoEuroColonna.format(risultati.addizionali.importo)}
          />
        )}
        <RigaDati
          etichetta="Energia elettrica"
          valore={formatoEuroColonna.format(risultati.utenze.energiaElettrica.totale)}
        />
        <RigaDati
          etichetta="Gas"
          valore={formatoEuroColonna.format(risultati.utenze.gas.totale)}
        />
        <RigaDati
          etichetta="Internet"
          valore={formatoEuroColonna.format(risultati.utenze.internet.totale)}
        />
        <RigaDati
          etichetta="Spese condominiali"
          valore={formatoEuroColonna.format(risultati.condominio.totale)}
        />
        <RigaDati
          etichetta="Manutenzione (ord. + straord.)"
          valore={formatoEuroColonna.format(risultati.manutenzione.totale)}
        />
        <RigaDati
          etichetta="Assicurazione"
          valore={formatoEuroColonna.format(risultati.assicurazione.totale)}
        />
        <div className="border-t border-[var(--rule)] pt-3">
          <RigaDati
            etichetta="Totale costi ricorrenti"
            valore={formatoEuroColonna.format(risultati.totaleCostiRicorrenti)}
            enfasi
          />
        </div>
      </dl>
    </div>
  );
}

export function PannelloRivenditaStimata({
  risultati,
  anniInvestimento,
}: {
  risultati: RisultatiSimulazione;
  anniInvestimento: number;
}) {
  return (
    <div className="rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-5">
      <h2 className="font-[var(--font-display)] text-sm uppercase tracking-wide text-[var(--muted)]">
        Rivendita stimata
      </h2>
      <dl className="mt-4 space-y-3 font-[var(--font-mono)] text-sm">
        <RigaDati
          etichetta={`Valore dopo ${anniInvestimento} anni`}
          valore={formatoEuroColonna.format(risultati.valoreStimatoRivendita)}
          enfasi
        />
        <RigaDati
          etichetta="Rivalutazione del capitale"
          valore={`${
            risultati.rivalutazioneCapitaleTotale >= 0 ? "+" : ""
          }${formatoEuroColonna.format(
            risultati.rivalutazioneCapitaleTotale
          )} (${risultati.rivalutazioneCapitalePercentuale >= 0 ? "+" : ""}${risultati.rivalutazioneCapitalePercentuale.toFixed(1)}%)`}
        />
      </dl>
    </div>
  );
}

export function PannelloInterpretazione({
  risultati,
}: {
  risultati: RisultatiSimulazione;
}) {
  return (
    <div className="rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-5">
      <h2 className="font-[var(--font-display)] text-sm uppercase tracking-wide text-[var(--muted)]">
        Interpretazione
      </h2>
      <div className="mt-4">
        <span
          className={`inline-block rounded-sm px-2 py-1 text-xs font-medium ${
            risultati.interpretazioneRisultato.fascia === "negativo"
              ? "bg-[var(--brick)]/15 text-[var(--brick)]"
              : risultati.interpretazioneRisultato.fascia === "basso"
              ? "bg-white/10 text-[var(--muted)]"
              : risultati.interpretazioneRisultato.fascia === "medio"
              ? "bg-[var(--brass)]/10 text-[var(--brass)]"
              : "bg-[var(--brass)]/20 text-[var(--brass)]"
          }`}
        >
          {risultati.interpretazioneRisultato.etichetta}
        </span>
        <p className="mt-3 text-xs leading-relaxed text-[var(--ink-text)]">
          {risultati.interpretazioneRisultato.descrizione}
        </p>
      </div>
    </div>
  );
}

export function PannelloConfrontoBtp({
  risultati,
  tassoBenchmarkPersonalizzato,
  onCambiaTassoBenchmark,
}: {
  risultati: RisultatiSimulazione;
  tassoBenchmarkPersonalizzato: string;
  onCambiaTassoBenchmark: (valore: string) => void;
}) {
  return (
    <div className="rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-5">
      <h2 className="font-[var(--font-display)] text-sm uppercase tracking-wide text-[var(--muted)]">
        Confronto con un BTP
      </h2>
      <dl className="mt-4 space-y-3 font-[var(--font-mono)] text-sm">
        <RigaDati
          etichetta="IRR di questo investimento"
          valore={risultati.irr !== null ? `${(risultati.irr * 100).toFixed(2)}%` : "n/d"}
          enfasi
        />
        <RigaDati
          etichetta={`BTP ~${risultati.benchmarkBtp.scadenzaRiferimento} anni (netto)`}
          valore={`${(risultati.tassoBenchmarkEffettivo * 100).toFixed(2)}%`}
        />
        {risultati.irr !== null && (
          <div className="border-t border-[var(--rule)] pt-3">
            <RigaDati
              etichetta="Differenza"
              valore={`${
                risultati.irr - risultati.tassoBenchmarkEffettivo >= 0 ? "+" : ""
              }${((risultati.irr - risultati.tassoBenchmarkEffettivo) * 100).toFixed(2)} punti`}
              enfasi
            />
          </div>
        )}
      </dl>
      <label className="mt-4 block text-xs">
        <span className="mb-1.5 block text-[var(--muted)]">
          Correggi il tasso BTP (se hai un dato più preciso)
        </span>
        <input
          className={classiInput}
          type="number"
          step={0.01}
          placeholder={`stima: ${(risultati.benchmarkBtp.rendimentoNetto * 100).toFixed(2)}%`}
          value={tassoBenchmarkPersonalizzato}
          onChange={(e) => onCambiaTassoBenchmark(e.target.value)}
        />
      </label>
      <p className="mt-2 text-[10px] leading-relaxed text-[var(--muted)]">
        Stima indicativa (netta da tasse 12,5% + bollo 0,20%), verificata
        il 05/09/2026 — non un dato di mercato in tempo reale. I
        rendimenti BTP cambiano quotidianamente: verifica il dato
        aggiornato prima di usarlo per decidere.
      </p>
    </div>
  );
}

export function PannelloLeve({
  risultati,
}: {
  risultati: RisultatiSimulazione;
}) {
  if (risultati.leveOrdinate.length === 0) return null;

  return (
    <div className="rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-5">
      <h2 className="font-[var(--font-display)] text-sm uppercase tracking-wide text-[var(--muted)]">
        Leve principali
      </h2>
      <dl className="mt-4 space-y-3 font-[var(--font-mono)] text-sm">
        {risultati.leveOrdinate.map((leva) => (
          <div key={leva.nome}>
            <RigaDati
              etichetta={leva.nome}
              valore={
                leva.irrBasso !== null && leva.irrAlto !== null
                  ? `${(leva.irrBasso * 100).toFixed(1)}% → ${(leva.irrAlto * 100).toFixed(1)}%`
                  : "n/d"
              }
            />
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[10px] leading-relaxed text-[var(--muted)]">
        Per ciascuna leva, l&apos;IRR risultante variando solo
        quella voce (a parità delle altre) — ordinate per impatto
        decrescente. Semplificazione: perturbando il prezzo di
        acquisto, le imposte proporzionali (registro, notaio,
        agenzia) non vengono ricalcolate.
      </p>
    </div>
  );
}

export function PannelloObiettivo({
  risultatoObiettivo,
  levaObiettivo,
  onCambiaLeva,
  targetIrrPersonalizzato,
  onCambiaTargetIrr,
  targetIrrEffettivo,
  mutuoRichiesto,
}: {
  risultatoObiettivo: RisultatoObiettivoIrr;
  levaObiettivo: LevaObiettivo;
  onCambiaLeva: (leva: LevaObiettivo) => void;
  targetIrrPersonalizzato: string;
  onCambiaTargetIrr: (valore: string) => void;
  targetIrrEffettivo: number;
  mutuoRichiesto: boolean;
}) {
  const leveDisponibili = (
    Object.keys(ETICHETTE_LEVA_OBIETTIVO) as LevaObiettivo[]
  ).filter((l) => l !== "tassoMutuoPercentuale" || mutuoRichiesto);

  function formattaValoreLeva(leva: LevaObiettivo, valore: number): string {
    if (leva === "tassoMutuoPercentuale" || leva === "rivalutazioneAnnuaPercentuale") {
      return `${valore.toFixed(2)}%`;
    }
    return formatoEuroColonna.format(valore);
  }

  return (
    <div className="rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-5">
      <h2 className="font-[var(--font-display)] text-sm uppercase tracking-wide text-[var(--muted)]">
        Decisione
      </h2>
      <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">
        A quali condizioni questo investimento raggiunge il rendimento
        che cerchi?
      </p>
      <label className="mt-4 block text-xs">
        <span className="mb-1.5 block text-[var(--muted)]">Leva da verificare</span>
        <select
          className={classiInput}
          value={levaObiettivo}
          onChange={(e) => onCambiaLeva(e.target.value as LevaObiettivo)}
        >
          {leveDisponibili.map((leva) => (
            <option key={leva} value={leva}>
              {ETICHETTE_LEVA_OBIETTIVO[leva]}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-xs">
        <span className="mb-1.5 block text-[var(--muted)]">Obiettivo di IRR (%)</span>
        <input
          className={classiInput}
          type="number"
          step={0.01}
          placeholder={`benchmark: ${(targetIrrEffettivo * 100).toFixed(2)}%`}
          value={targetIrrPersonalizzato}
          onChange={(e) => onCambiaTargetIrr(e.target.value)}
        />
      </label>
      <div className="mt-4 rounded-sm border border-[var(--rule)] bg-white/5 p-3 text-xs leading-relaxed text-[var(--ink-text)]">
        {risultatoObiettivo.trovato && risultatoObiettivo.valoreTrovato !== null ? (
          <>
            Con <strong>{ETICHETTE_LEVA_OBIETTIVO[levaObiettivo]}</strong> a{" "}
            <strong className="text-[var(--brass)]">
              {formattaValoreLeva(levaObiettivo, risultatoObiettivo.valoreTrovato)}
            </strong>{" "}
            (oggi: {formattaValoreLeva(levaObiettivo, risultatoObiettivo.valoreAttuale)}
            ), l&apos;IRR raggiunge il {(targetIrrEffettivo * 100).toFixed(2)}%
            target.
          </>
        ) : (
          <>
            Anche portando <strong>{ETICHETTE_LEVA_OBIETTIVO[levaObiettivo]}</strong>{" "}
            agli estremi ragionevoli, l&apos;obiettivo del{" "}
            {(targetIrrEffettivo * 100).toFixed(2)}% non si raggiunge — il
            vincolo è altrove, non in questa sola leva.
          </>
        )}
      </div>
    </div>
  );
}
