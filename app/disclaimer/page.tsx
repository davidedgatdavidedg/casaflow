import Link from "next/link";
import LogoCasaFlow from "@/components/logo-casaflow";

const headingClass = "mb-2 font-medium text-[var(--brass)]";

export default function PaginaDisclaimer() {
  return (
    <div className="min-h-screen bg-[var(--ink)] text-[var(--ink-text)]">
      <header className="border-b border-[var(--rule)] px-6 py-5 lg:px-10">
        <h1><LogoCasaFlow /></h1>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-10 lg:px-10">
        <Link href="/" className="text-sm text-[var(--brass)] hover:underline">← Torna al portafoglio</Link>
        <h2 className="mb-6 mt-4 font-[var(--font-display)] text-2xl tracking-tight">Limiti delle simulazioni</h2>
        <div className="space-y-6 text-sm leading-relaxed text-[var(--ink-text)]">
          <section>
            <h3 className={headingClass}>1. Finalità dello strumento</h3>
            <p>CasaFlow è uno strumento informativo di simulazione e supporto alla valutazione di operazioni immobiliari. I risultati non costituiscono raccomandazioni personalizzate di acquisto o vendita, né consulenza finanziaria, fiscale, legale o creditizia.</p>
          </section>
          <section>
            <h3 className={headingClass}>2. Ipotesi e incertezza dei risultati</h3>
            <p>Le stime dipendono dai dati inseriti dall&apos;utente, dalle ipotesi iniziali e dai modelli di calcolo adottati. Rendimenti, prezzi di rivendita, canoni, spese, tassi di interesse, imposte e agevolazioni fiscali effettivi possono essere diversi da quelli simulati. Il confronto con titoli di Stato è indicativo e non rende equivalenti investimenti con rischi, liquidità e caratteristiche differenti.</p>
          </section>
          <section>
            <h3 className={headingClass}>3. Valutazioni per la prima casa</h3>
            <p>Le valutazioni di sostenibilità economica utilizzano indicatori e ipotesi semplificati: non comprendono necessariamente tutte le spese familiari, le esigenze future o gli imprevisti. Non costituiscono una valutazione bancaria del merito creditizio e non garantiscono la concessione di un mutuo né la sostenibilità dell&apos;acquisto nel tempo.</p>
          </section>
          <section>
            <h3 className={headingClass}>4. Verifiche prima delle decisioni</h3>
            <p>Prima di assumere impegni economici, è opportuno verificare dati, condizioni contrattuali, costi, disciplina fiscale e scenari alternativi con fonti aggiornate e, quando necessario, con professionisti qualificati. Le valutazioni di CasaFlow non sostituiscono tali verifiche.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
