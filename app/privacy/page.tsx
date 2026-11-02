// app/privacy/page.tsx
import Link from "next/link";
import LogoCasaFlow from "@/components/logo-casaflow";

const LAST_UPDATED = "2 novembre 2026";

const headingClass = "mb-2 font-medium text-[var(--brass)]";

export default function PaginaPrivacy() {
  return (
    <div className="min-h-screen bg-[var(--ink)] text-[var(--ink-text)]">
      <header className="border-b border-[var(--rule)] px-6 py-5 lg:px-10">
        <h1><LogoCasaFlow /></h1>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10 lg:px-10">
        <Link href="/" className="text-sm text-[var(--brass)] hover:underline">
          ← Torna al portafoglio
        </Link>
        <h2 className="mb-6 mt-4 font-[var(--font-display)] text-2xl tracking-tight">
          Informativa sulla privacy
        </h2>

        <div className="space-y-6 text-sm leading-relaxed text-[var(--ink-text)]">
          <p className="text-[var(--muted)]">Ultimo aggiornamento: {LAST_UPDATED}</p>

          <section>
            <h3 className={headingClass}>1. Titolare del trattamento</h3>
            <p>
              Il titolare del trattamento dei dati personali raccolti tramite CasaFlow è
              Davide Della Giustina, persona fisica, contattabile all&apos;indirizzo
              email <a className="text-[var(--brass)] hover:underline" href="mailto:davidedg@davidedg.net">davidedg@davidedg.net</a>.
            </p>
          </section>

          <section>
            <h3 className={headingClass}>2. Che cos&apos;è CasaFlow</h3>
            <p>
              CasaFlow è uno strumento digitale che permette di elaborare simulazioni
              relative a investimenti immobiliari e alla sostenibilità economica
              dell&apos;acquisto di un&apos;abitazione. L&apos;utente può inserire
              informazioni, visualizzare risultati e, quando accede al proprio account,
              salvare e consultare le analisi disponibili nel servizio.
            </p>
          </section>

          <section>
            <h3 className={headingClass}>3. Categorie di dati trattati</h3>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong>Dati dell&apos;account:</strong> identificativi dell&apos;utente,
                indirizzo email ed eventuali informazioni del profilo rese disponibili
                dal sistema di autenticazione Clerk, anche in caso di accesso tramite Google.
                CasaFlow non richiede la password dell&apos;account Google né accesso
                ai contenuti di Gmail, Drive o Calendar.
              </li>
              <li>
                <strong>Dati delle simulazioni:</strong> caratteristiche e valori degli
                immobili, prezzi, canoni, spese, investimenti, lavori, finanziamenti,
                ipotesi economiche e altri parametri inseriti dall&apos;utente.
                Per le simulazioni relative alla prima casa possono essere trattati
                anche dati su reddito, risparmi, liquidità e impegni finanziari.
              </li>
              <li>
                <strong>Dati tecnici:</strong> informazioni necessarie per la
                connessione, il funzionamento, la sicurezza e la diagnosi di errori
                del servizio, che possono includere indirizzo IP, dati del browser,
                data e ora delle richieste e registrazioni tecniche.
              </li>
            </ul>
            <p className="mt-2">
              I dati inseriti nelle simulazioni possono essere elaborati durante
              l&apos;utilizzo del servizio; quelli salvati tramite le funzionalità
              disponibili sono associati all&apos;account per consentirne il recupero.
              Si invita a non inserire dati personali di terzi o informazioni non
              necessarie alla simulazione.
            </p>
          </section>

          <section>
            <h3 className={headingClass}>4. Finalità e basi giuridiche</h3>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong>Fornitura del servizio:</strong> autenticazione, elaborazione
                delle simulazioni e gestione dei dati salvati, sulla base
                dell&apos;esecuzione del servizio richiesto dall&apos;utente
                (art. 6, par. 1, lett. b, GDPR).
              </li>
              <li>
                <strong>Sicurezza e funzionamento:</strong> prevenzione di accessi
                abusivi, gestione di malfunzionamenti e protezione dell&apos;applicazione,
                sulla base del legittimo interesse alla sicurezza e affidabilità
                del servizio (art. 6, par. 1, lett. f, GDPR), ove applicabile.
              </li>
              <li>
                <strong>Adempimenti di legge:</strong> gestione delle richieste
                degli interessati e rispetto di eventuali obblighi normativi
                (art. 6, par. 1, lett. c, GDPR, quando applicabile).
              </li>
            </ul>
            <p className="mt-2">
              Attualmente CasaFlow non utilizza i dati per inviare newsletter
              promozionali, effettuare profilazione pubblicitaria o venderli a
              inserzionisti. Eventuali nuove finalità saranno comunicate prima
              dell&apos;avvio dei relativi trattamenti.
            </p>
          </section>

          <section>
            <h3 className={headingClass}>5. Conferimento dei dati</h3>
            <p>
              L&apos;inserimento dei dati nelle simulazioni è volontario, ma
              l&apos;assenza delle informazioni richieste per un calcolo può
              impedire di ottenere il relativo risultato. La creazione di un account
              è necessaria soltanto per le funzionalità che richiedono
              autenticazione, come il salvataggio e il recupero delle analisi.
            </p>
          </section>

          <section>
            <h3 className={headingClass}>6. Fornitori e destinatari</h3>
            <p>Per l&apos;erogazione di CasaFlow vengono utilizzati i seguenti servizi:</p>
            <ul className="ml-5 mt-2 list-disc space-y-1">
              <li><strong>Clerk:</strong> autenticazione e gestione degli account;</li>
              <li><strong>Neon:</strong> infrastruttura database PostgreSQL per i dati salvati;</li>
              <li><strong>Vercel:</strong> hosting e infrastruttura di erogazione dell&apos;applicazione;</li>
              <li><strong>Google:</strong> fornitore di identità, esclusivamente quando l&apos;utente sceglie di autenticarsi tramite Google.</li>
            </ul>
            <p className="mt-2">
              Questi soggetti possono trattare dati personali nei limiti necessari
              alla fornitura dei rispettivi servizi e secondo i ruoli e gli accordi
              applicabili in materia di protezione dei dati. I dati non sono
              comunicati a terzi per finalità pubblicitarie o commerciali proprie
              di CasaFlow.
            </p>
          </section>

          <section>
            <h3 className={headingClass}>7. Trattamenti e trasferimenti internazionali</h3>
            <p>
              Alcuni fornitori tecnologici possono avvalersi di infrastrutture
              o soggetti situati al di fuori dello Spazio economico europeo.
              Qualora avvengano trasferimenti di dati personali verso paesi terzi,
              questi devono essere effettuati nel rispetto del Capo V del GDPR,
              mediante decisioni di adeguatezza o garanzie appropriate,
              quali le clausole contrattuali standard, ove applicabili.
              Per informazioni sulle garanzie pertinenti è possibile contattare
              il titolare all&apos;indirizzo indicato in questa informativa.
            </p>
          </section>

          <section>
            <h3 className={headingClass}>8. Conservazione dei dati</h3>
            <p>
              Le simulazioni salvate sono conservate per consentirne la consultazione
              finché l&apos;utente utilizza il servizio, salvo richiesta di cancellazione
              e salvi eventuali obblighi di legge. I dati dell&apos;account sono
              gestiti tramite Clerk. Quando l&apos;account viene eliminato, le
              simulazioni salvate nel database Neon vengono cancellate
              automaticamente. I dati tecnici e i log sono conservati per il tempo necessario alle
              finalità operative e di sicurezza, in base alle configurazioni e alle
              politiche applicabili ai servizi utilizzati.
            </p>
          </section>

          <section>
            <h3 className={headingClass}>9. Cookie e tecnologie analoghe</h3>
            <p>
              CasaFlow utilizza cookie e strumenti di memorizzazione tecnici
              necessari per l&apos;autenticazione, la sicurezza e il funzionamento
              delle funzionalità richieste dall&apos;utente. In particolare:
            </p>
            <ul className="ml-5 mt-2 list-disc space-y-2">
              <li>
                <strong>Clerk:</strong> cookie di autenticazione e gestione delle
                sessioni, tra cui <code>__session</code>, <code>__client</code>,
                <code>__client_uat</code>, <code>__refresh</code> e relative varianti,
                nonché <code>clerk_active_context</code>. Alcuni cookie sono di
                sessione, altri possono persistere secondo le impostazioni del
                servizio di autenticazione.
              </li>
              <li>
                <strong>Protezione dell&apos;autenticazione:</strong> cookie
                <code> __cf_bm</code> e <code>_cfuvid</code> associati ai sistemi
                di sicurezza impiegati dal servizio Clerk.
              </li>
              <li>
                <strong>SessionStorage:</strong> i dati inseriti nei percorsi
                guidati di simulazione possono essere conservati temporaneamente
                nel browser, per permettere il passaggio tra le schermate e
                il recupero dei dati durante la sessione. Questo spazio è
                normalmente eliminato alla chiusura della scheda o della
                finestra del browser, salvo funzionalità di ripristino del browser.
              </li>
            </ul>
            <p className="mt-2">
              Alla data di aggiornamento dell&apos;informativa, CasaFlow non
              utilizza strumenti di analytics, cookie pubblicitari o di
              profilazione. Per i soli strumenti tecnici sopra descritti non
              viene richiesto un consenso preventivo; resta disponibile questa
              informativa sulle loro finalità.
            </p>
          </section>

          <section>
            <h3 className={headingClass}>10. Diritti dell&apos;interessato</h3>
            <p>
              Nei casi previsti dal GDPR puoi richiedere accesso ai tuoi dati,
              rettifica, cancellazione, limitazione del trattamento, portabilità
              e opposizione ai trattamenti fondati sul legittimo interesse.
              Quando un trattamento è basato sul consenso, puoi revocarlo in
              qualsiasi momento senza pregiudicare la liceità del trattamento
              precedente. Puoi inoltre proporre reclamo al Garante per la
              protezione dei dati personali (<a className="text-[var(--brass)] hover:underline" href="https://www.garanteprivacy.it/">www.garanteprivacy.it</a>).
            </p>
            <p className="mt-2">
              Per esercitare i tuoi diritti, inclusa la cancellazione dell&apos;account
              e delle simulazioni salvate, scrivi a
              {" "}<a className="text-[var(--brass)] hover:underline" href="mailto:davidedg@davidedg.net">davidedg@davidedg.net</a>.
              Alcuni dati potrebbero dover essere conservati nei limiti previsti
              dalla legge.
            </p>
          </section>

          <section>
            <h3 className={headingClass}>11. Modifiche dell&apos;informativa</h3>
            <p>
              Questa informativa può essere aggiornata per riflettere modifiche
              al servizio, ai trattamenti effettuati o alla normativa applicabile.
              La data riportata all&apos;inizio indica l&apos;ultimo aggiornamento
              del testo. Eventuali modifiche che lo richiedano saranno comunicate
              agli interessati con modalità appropriate.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
