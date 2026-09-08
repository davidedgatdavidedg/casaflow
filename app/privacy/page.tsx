// app/privacy/page.tsx
import Link from "next/link";

export default function PaginaPrivacy() {
  return (
    <div className="min-h-screen bg-[var(--ink)] text-[var(--ink-text)]">
      <header className="border-b border-[var(--rule)] px-6 py-5 lg:px-10">
        <h1 className="font-[var(--font-display)] text-2xl tracking-tight">
          <Link href="/">CasaFlow</Link>
        </h1>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10 lg:px-10">
        <Link href="/" className="text-sm text-[var(--brass)] hover:underline">
          ← Torna al portafoglio
        </Link>

        <h2 className="mb-6 mt-4 font-[var(--font-display)] text-2xl tracking-tight">
          Informativa sulla privacy
        </h2>

        <div className="space-y-6 text-sm leading-relaxed text-[var(--ink-text)]">
          <p className="text-[var(--muted)]">
            Ultimo aggiornamento: {new Date().toLocaleDateString("it-IT")}
          </p>

          <section>
            <h3 className="mb-2 font-medium text-[var(--brass)]">
              Cosa fa CasaFlow
            </h3>
            <p>
              CasaFlow è uno strumento di simulazione per valutare la
              redditività di investimenti immobiliari. Ti permette di
              inserire i dati di un immobile (prezzo, mutuo, affitto, costi)
              e calcola indicatori come l&apos;IRR (tasso di rendimento
              interno), oltre a salvare le tue simulazioni per ritrovarle
              in seguito.
            </p>
          </section>

          <section>
            <h3 className="mb-2 font-medium text-[var(--brass)]">
              Quali dati raccogliamo
            </h3>
            <p className="mb-2">
              <strong>Dati di accesso.</strong> Per accedere a CasaFlow usi
              il tuo account Google. Riceviamo da Google il tuo nome,
              indirizzo email e immagine del profilo, tramite il nostro
              fornitore di autenticazione (Clerk). Non riceviamo né
              richiediamo l&apos;accesso ad altri dati del tuo account
              Google (email, Drive, Calendar, ecc.).
            </p>
            <p>
              <strong>Dati degli immobili.</strong> Le simulazioni che
              inserisci e salvi (prezzo, dati del mutuo, affitto, costi e
              così via) vengono memorizzate in modo da essere associate al
              tuo account, così puoi ritrovarle nelle sessioni successive.
            </p>
          </section>

          <section>
            <h3 className="mb-2 font-medium text-[var(--brass)]">
              Come usiamo questi dati
            </h3>
            <p>
              Esclusivamente per far funzionare il servizio: farti
              accedere, calcolare le simulazioni, e mostrarti i tuoi
              immobili salvati quando torni sul sito. Non vendiamo né
              condividiamo i tuoi dati con terzi per finalità pubblicitarie
              o di marketing.
            </p>
          </section>

          <section>
            <h3 className="mb-2 font-medium text-[var(--brass)]">
              Chi conserva i dati per noi
            </h3>
            <p>
              Ci appoggiamo a due fornitori di servizi per far funzionare
              CasaFlow:
            </p>
            <ul className="ml-5 mt-2 list-disc space-y-1">
              <li>
                <strong>Clerk</strong> — gestisce l&apos;accesso tramite
                Google in modo sicuro
              </li>
              <li>
                <strong>Neon</strong> — ospita il database dove sono
                salvate le tue simulazioni
              </li>
            </ul>
          </section>

          <section>
            <h3 className="mb-2 font-medium text-[var(--brass)]">
              I tuoi diritti
            </h3>
            <p>
              Puoi chiedere in qualsiasi momento la cancellazione del tuo
              account e di tutti i dati associati, scrivendo all&apos;indirizzo
              indicato sotto.
            </p>
          </section>

          <section>
            <h3 className="mb-2 font-medium text-[var(--brass)]">
              Contatti
            </h3>
            <p>
              Per qualsiasi domanda su questa informativa o sui tuoi dati,
              scrivi a: <strong>[pier.dellavigna90@gmail.com]</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
