// components/lista-salvati-dropdown.tsx
//
// Il menu a tendina con l'elenco degli immobili salvati dall'utente —
// estratto da calcolatore-quick-mode.tsx. Non ha stato proprio: riceve
// l'elenco e le due azioni (carica/elimina) via props.

export interface ImmobileSalvato {
  id: string;
  nome: string;
  aggiornatoIl: Date;
}

export default function ListaSalvatiDropdown({
  immobili,
  onCarica,
  onElimina,
}: {
  immobili: ImmobileSalvato[];
  onCarica: (id: string) => void;
  onElimina: (id: string) => void;
}) {
  return (
    <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-2 shadow-lg">
      {immobili.length === 0 ? (
        <p className="p-2 text-xs text-[var(--muted)]">
          Nessun immobile salvato ancora.
        </p>
      ) : (
        immobili.map((im) => (
          <div
            key={im.id}
            className="flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 hover:bg-white/5"
          >
            <button
              type="button"
              onClick={() => onCarica(im.id)}
              className="flex-1 truncate text-left text-sm"
              title={im.nome}
            >
              {im.nome}
            </button>
            <button
              type="button"
              onClick={() => onElimina(im.id)}
              className="shrink-0 text-xs text-[var(--brick)] hover:underline"
            >
              Elimina
            </button>
          </div>
        ))
      )}
    </div>
  );
}
