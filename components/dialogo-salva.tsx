// components/dialogo-salva.tsx
//
// Finestra modale per salvare/aggiornare un immobile — estratta da
// calcolatore-quick-mode.tsx. Non ha stato proprio: riceve tutto via
// props, il componente chiamante resta responsabile dello stato e
// della chiamata di rete effettiva.

import { classiInput } from "@/components/form-ui";

export default function DialogoSalva({
  aggiornamento,
  nome,
  onCambiaNome,
  errore,
  salvataggioInCorso,
  onAnnulla,
  onSalva,
}: {
  aggiornamento: boolean;
  nome: string;
  onCambiaNome: (valore: string) => void;
  errore: string | null;
  salvataggioInCorso: boolean;
  onAnnulla: () => void;
  onSalva: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-5">
        <h3 className="mb-3 font-[var(--font-display)] text-lg">
          {aggiornamento ? "Aggiorna immobile" : "Salva immobile"}
        </h3>
        <label className="block text-sm">
          <span className="mb-1.5 block text-[var(--muted)]">Nome</span>
          <input
            className={classiInput}
            type="text"
            placeholder="es. Il mio bilocale"
            value={nome}
            onChange={(e) => onCambiaNome(e.target.value)}
            autoFocus
          />
        </label>
        {errore && (
          <p className="mt-2 text-xs text-[var(--brick)]">{errore}</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onAnnulla}
            className="rounded-sm border border-[var(--rule)] px-3 py-2 text-sm text-[var(--muted)] hover:bg-white/5"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={onSalva}
            disabled={salvataggioInCorso}
            className="rounded-sm border border-[var(--brass)]/50 px-3 py-2 text-sm text-[var(--brass)] hover:bg-[var(--brass)]/10 disabled:opacity-50"
          >
            {salvataggioInCorso ? "Salvataggio…" : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}
