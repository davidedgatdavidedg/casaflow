// components/unita-card.tsx
//
// Card di una singola unità catastale nel form — estratta da
// calcolatore-quick-mode.tsx per renderlo più piccolo e più facile da
// modificare in sicurezza.

import type { UnitaForm } from "@/lib/tipi-form";
import type { CategoriaCatastale, StatoAbitativoImu } from "@/lib/calcolo/tipi";
import {
  CATEGORIE_CATASTALI_QUICK_MODE,
  DESCRIZIONE_CATEGORIA_CATASTALE,
} from "@/lib/calcolo/tipi";
import { calcolaImu, ottieniAliquotaComunale, comuneCensito, ALIQUOTA_IMU_DEFAULT } from "@/lib/calcolo/imu";
import { classiInput, identificativoValido, Campo, BoxAvanzato } from "@/components/form-ui";
import IconaInfo from "@/components/icona-info";

const TUTTE_LE_CATEGORIE_CATASTALI = Object.keys(
  DESCRIZIONE_CATEGORIA_CATASTALE
) as CategoriaCatastale[];

const ETICHETTE_STATO_IMU: Record<StatoAbitativoImu, string> = {
  abitazionePrincipale: "Abitazione principale (ci risiedo)",
  affittata: "Affittata a terzi",
  secondaCasaNonLocata: "A disposizione, non affittata",
};

const formatoEuroPreciso = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

export default function UnitaCard({
  numero,
  unita,
  modificata,
  rimovibile,
  mostraElencoCompleto,
  compressa,
  onChange,
  onRimuovi,
  onToggleCompressione,
}: {
  numero: number;
  unita: UnitaForm;
  modificata: boolean;
  rimovibile: boolean;
  mostraElencoCompleto: boolean;
  compressa: boolean;
  onChange: (patch: Partial<UnitaForm>) => void;
  onRimuovi: () => void;
  onToggleCompressione: () => void;
}) {
  const categorie = mostraElencoCompleto
    ? TUTTE_LE_CATEGORIE_CATASTALI
    : CATEGORIE_CATASTALI_QUICK_MODE;

  const riepilogo = [
    unita.etichetta || null,
    unita.comune || null,
    unita.categoriaCatastale,
    unita.renditaCatastale > 0
      ? `rendita ${formatoEuroPreciso.format(unita.renditaCatastale)}`
      : null,
    unita.metriQuadri > 0 ? `${unita.metriQuadri} mq` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-sm border border-[var(--rule)] p-4">
      <div className={compressa ? "flex items-center justify-between" : "mb-3 flex items-center justify-between"}>
        <button
          type="button"
          onClick={onToggleCompressione}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span className="text-[var(--muted)] transition-transform" style={{ display: "inline-block", transform: compressa ? "rotate(-90deg)" : "rotate(0deg)" }}>
            ▾
          </span>
          <span className="text-xs font-medium text-[var(--muted)]">
            Unità {numero}
          </span>
          {modificata && (
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--brass)]"
              title="Questa unità è stata modificata rispetto all'immobile di prova caricato"
            />
          )}
          {compressa && riepilogo && (
            <span className="truncate text-xs text-[var(--ink-text)]">
              — {riepilogo}
            </span>
          )}
        </button>
        {rimovibile && (
          <button
            type="button"
            onClick={onRimuovi}
            className="ml-2 shrink-0 text-xs text-[var(--brick)] hover:underline"
          >
            Rimuovi
          </button>
        )}
      </div>

      {!compressa && (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 flex items-end gap-2">
          <label className="flex-1 text-sm">
            <span className="mb-1.5 block text-[var(--muted)]">
              Etichetta (opzionale)
            </span>
            <input
              className={classiInput}
              type="text"
              placeholder="es. Appartamento, Box"
              value={unita.etichetta}
              onChange={(e) => onChange({ etichetta: e.target.value })}
            />
          </label>

          {mostraElencoCompleto && (
            <div className="flex shrink-0 gap-2 rounded-sm border border-white/10 bg-white/5 p-2">
              <label className="w-16 shrink-0 text-sm">
                <span
                  className="mb-1.5 block truncate text-[var(--muted)]"
                  title="Foglio"
                >
                  Foglio
                </span>
                <input
                  className={`${classiInput} px-2 text-center ${
                    !identificativoValido(unita.foglio)
                      ? "border-[var(--brick)]"
                      : ""
                  }`}
                  type="text"
                  inputMode="numeric"
                  value={unita.foglio}
                  onChange={(e) => onChange({ foglio: e.target.value })}
                />
              </label>
              <label className="w-16 shrink-0 text-sm">
                <span
                  className="mb-1.5 block truncate text-[var(--muted)]"
                  title="Particella"
                >
                  Part.
                </span>
                <input
                  className={`${classiInput} px-2 text-center ${
                    !identificativoValido(unita.particella)
                      ? "border-[var(--brick)]"
                      : ""
                  }`}
                  type="text"
                  inputMode="numeric"
                  value={unita.particella}
                  onChange={(e) => onChange({ particella: e.target.value })}
                />
              </label>
              <label className="w-16 shrink-0 text-sm">
                <span
                  className="mb-1.5 block truncate text-[var(--muted)]"
                  title="Subalterno"
                >
                  Sub.
                </span>
                <input
                  className={`${classiInput} px-2 text-center ${
                    !identificativoValido(unita.subalterno)
                      ? "border-[var(--brick)]"
                      : ""
                  }`}
                  type="text"
                  inputMode="numeric"
                  value={unita.subalterno}
                  onChange={(e) => onChange({ subalterno: e.target.value })}
                />
              </label>
            </div>
          )}
        </div>

        {mostraElencoCompleto &&
          (!identificativoValido(unita.foglio) ||
            !identificativoValido(unita.particella) ||
            !identificativoValido(unita.subalterno)) && (
            <span className="sm:col-span-2 -mt-2 block text-[10px] text-[var(--brick)]">
              Foglio, particella e subalterno, se compilati, devono essere
              numeri interi maggiori di 0.
            </span>
          )}

        <label className="block text-sm">
          <span className="mb-1.5 flex items-center gap-1.5 text-[var(--muted)]">
            Rendita catastale (€)
            <IconaInfo campoId="rendita-catastale" />
          </span>
          <input
            className={classiInput}
            type="number"
            step={0.01}
            value={unita.renditaCatastale}
            onChange={(e) =>
              onChange({ renditaCatastale: parseFloat(e.target.value) || 0 })
            }
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 flex items-center gap-1.5 text-[var(--muted)]">
            Superficie (mq)
            <IconaInfo campoId="metri-quadri" />
          </span>
          <input
            className={classiInput}
            type="number"
            step={1}
            value={unita.metriQuadri}
            onChange={(e) =>
              onChange({ metriQuadri: parseFloat(e.target.value) || 0 })
            }
          />
          <span className="mt-1.5 block text-[10px] text-[var(--muted)]">
            Usata per stimare TARI, utenze e spese condominiali.
          </span>
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 flex items-center gap-1.5 text-[var(--muted)]">
            Categoria catastale
            <IconaInfo campoId="categoria-catastale" />
          </span>
          <select
            className={classiInput}
            value={unita.categoriaCatastale}
            onChange={(e) =>
              onChange({ categoriaCatastale: e.target.value as CategoriaCatastale })
            }
          >
            {categorie.map((cat) => (
              <option key={cat} value={cat}>
                {cat} — {DESCRIZIONE_CATEGORIA_CATASTALE[cat]}
              </option>
            ))}
          </select>
          {!mostraElencoCompleto && (
            <span className="mt-1.5 block text-[10px] text-[var(--muted)]">
              Non trovi la categoria? Attiva la modalità avanzata.
            </span>
          )}
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 flex items-center gap-1.5 text-[var(--muted)]">
            Comune
            <IconaInfo campoId="comune" />
          </span>
          <input
            className={classiInput}
            type="text"
            placeholder="es. Milano"
            value={unita.comune}
            onChange={(e) => {
              const nuovoComune = e.target.value;
              // Se il nuovo comune è censito, l'aliquota diventa un
              // valore fisso non modificabile: eventuali override scritti
              // in precedenza (per un comune diverso, non censito) vanno
              // ripuliti per evitare che restino attivi "in silenzio".
              if (comuneCensito(nuovoComune) && unita.aliquotaImuPersonalizzata) {
                onChange({ comune: nuovoComune, aliquotaImuPersonalizzata: "" });
              } else {
                onChange({ comune: nuovoComune });
              }
            }}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 flex items-center gap-1.5 text-[var(--muted)]">
            Utilizzo ai fini IMU
            <IconaInfo campoId="stato-imu" />
          </span>
          <select
            className={classiInput}
            value={unita.statoAbitativoImu}
            onChange={(e) =>
              onChange({ statoAbitativoImu: e.target.value as StatoAbitativoImu })
            }
          >
            {Object.entries(ETICHETTE_STATO_IMU).map(([valore, etichetta]) => (
              <option key={valore} value={valore}>
                {etichetta}
              </option>
            ))}
          </select>
        </label>

        {mostraElencoCompleto && (
          <BoxAvanzato>
            {comuneCensito(unita.comune) ? (
              <Campo label="Aliquota IMU applicata" infoId="aliquota-imu-personalizzata" unita="%">
                <div
                  className={`${classiInput} flex items-center bg-white/5 text-[var(--muted)]`}
                >
                  {(ottieniAliquotaComunale(unita.comune) * 100).toFixed(2)}
                </div>
                <span className="mt-1.5 block text-[10px] text-[var(--muted)]">
                  = {formatoEuroPreciso.format(
                    calcolaImu(
                      unita.renditaCatastale,
                      unita.categoriaCatastale,
                      unita.statoAbitativoImu,
                      unita.comune
                    )
                  )}
                  /anno — aliquota specifica del comune, censita nel nostro
                  database, non modificabile.
                </span>
              </Campo>
            ) : (
              <Campo label="Aliquota IMU personalizzata" infoId="aliquota-imu-personalizzata" unita="%">
                <input
                  className={classiInput}
                  type="number"
                  step={0.01}
                  placeholder={`auto (${(ALIQUOTA_IMU_DEFAULT * 100).toFixed(2)}%)`}
                  value={unita.aliquotaImuPersonalizzata}
                  onChange={(e) =>
                    onChange({ aliquotaImuPersonalizzata: e.target.value })
                  }
                />
                <span className="mt-1.5 block text-[10px] text-[var(--muted)]">
                  = {formatoEuroPreciso.format(
                    calcolaImu(
                      unita.renditaCatastale,
                      unita.categoriaCatastale,
                      unita.statoAbitativoImu,
                      unita.comune,
                      unita.aliquotaImuPersonalizzata
                        ? parseFloat(unita.aliquotaImuPersonalizzata) / 100
                        : undefined
                    )
                  )}
                  /anno. Aliquota non presente nel nostro database. Stiamo
                  usando il minimo di legge (
                  {(ALIQUOTA_IMU_DEFAULT * 100).toFixed(2)}%, in assenza di
                  delibera comunale nota). Se conosci l&apos;aliquota reale
                  del tuo comune, inseriscila qui per un calcolo più
                  preciso.
                </span>
              </Campo>
            )}
          </BoxAvanzato>
        )}
      </div>
      )}
    </div>
  );
}
