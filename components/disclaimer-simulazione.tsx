import Link from "next/link";

type TipoSimulazione = "investimento" | "prima-casa";

const contenuti = {
  investimento: {
    titolo: "Come interpretare questa stima",
    testo: "I rendimenti sono stime basate sui dati inseriti e sulle ipotesi di calcolo. I risultati effettivi possono differire, anche significativamente. CasaFlow non fornisce consulenza finanziaria o fiscale personalizzata.",
  },
  "prima-casa": {
    titolo: "Come interpretare questa valutazione",
    testo: "La sostenibilità dell’acquisto è valutata sulla base dei dati inseriti e di ipotesi semplificate. Non costituisce una garanzia sulla capacità di sostenere tutte le spese future né sull’ottenimento di un mutuo.",
  },
} as const;

export default function DisclaimerSimulazione({ tipo, className = "" }: { tipo: TipoSimulazione; className?: string }) {
  const contenuto = contenuti[tipo];
  return (
    <aside aria-label="Limiti della simulazione" className={`border-t border-[var(--rule)] pt-3 text-xs leading-relaxed text-[var(--muted)] ${className}`}>
      <p className="font-medium text-[var(--ink-text)]">{contenuto.titolo}</p>
      <p className="mt-1">{contenuto.testo}</p>
      <Link href="/disclaimer" className="mt-2 inline-block text-[var(--brass)] hover:underline">Limiti delle simulazioni</Link>
    </aside>
  );
}
