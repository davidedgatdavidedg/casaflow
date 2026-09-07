// app/piano-ammortamento/page.tsx
import Link from "next/link";
import { calcolaPianoAmmortamento } from "@/lib/calcolo/ammortamento";
import type { Mutuo } from "@/lib/calcolo/tipi";

const formatoEuroPreciso = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

const formatoMeseAnno = new Intl.DateTimeFormat("it-IT", {
  month: "2-digit",
  year: "numeric",
});

interface RigaConCumulati {
  numero: number;
  data: Date;
  tassoApplicato: number;
  rataTotale: number;
  quotaCapitale: number;
  quotaInteressi: number;
  capitaleResiduo: number;
  rataCumulata: number;
  capitaleCumulato: number;
  interessiCumulati: number;
}

interface PageProps {
  searchParams: Promise<{
    importo?: string;
    tasso?: string;
    durata?: string;
    decorrenza?: string;
    spese?: string;
  }>;
}

export default async function PianoAmmortamentoPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const importo = parseFloat(params.importo ?? "0");
  const tassoPercentuale = parseFloat(params.tasso ?? "0");
  const durataAnni = parseInt(params.durata ?? "0", 10);
  const decorrenza = params.decorrenza ?? new Date().toISOString().slice(0, 10);
  const speseIncassoPerRata = parseFloat(params.spese ?? "0");

  const parametriValidi = importo > 0 && tassoPercentuale > 0 && durataAnni > 0;

  const righe: RigaConCumulati[] = [];

  if (parametriValidi) {
    const mutuo: Mutuo = {
      importo,
      tasso: tassoPercentuale / 100,
      durataAnni,
      dataDecorrenza: new Date(decorrenza),
      speseIncassoPerRata,
    };

    let rataCum = 0;
    let capitaleCum = 0;
    let interessiCum = 0;
    for (const r of calcolaPianoAmmortamento(mutuo)) {
      rataCum += r.rataTotale;
      capitaleCum += r.quotaCapitale;
      interessiCum += r.quotaInteressi;
      righe.push({
        numero: r.numero,
        data: r.data,
        tassoApplicato: r.tassoApplicato,
        rataTotale: r.rataTotale,
        quotaCapitale: r.quotaCapitale,
        quotaInteressi: r.quotaInteressi,
        capitaleResiduo: r.capitaleResiduo,
        rataCumulata: rataCum,
        capitaleCumulato: capitaleCum,
        interessiCumulati: interessiCum,
      });
    }
  }

  const ultima = righe[righe.length - 1];

  return (
    <div className="min-h-screen bg-[var(--ink)] px-6 py-8 text-[var(--ink-text)] lg:px-10">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-[var(--brass)] hover:underline"
        >
          ← Torna al calcolatore
        </Link>
      </div>

      <h1 className="font-[var(--font-display)] text-2xl tracking-tight">
        Piano di ammortamento
      </h1>

      {!parametriValidi && (
        <div className="mt-6 rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">
            Nessun mutuo da mostrare. Torna al calcolatore, inserisci i dati
            del mutuo (importo, tasso, durata) e riapri questo link dalla
            sezione Mutuo.
          </p>
        </div>
      )}

      {parametriValidi && (
        <>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Importo {formatoEuroPreciso.format(importo)} — tasso{" "}
            {tassoPercentuale.toFixed(2)}% — durata {durataAnni} anni
          </p>

          {ultima && (
            <p className="mt-4 font-[var(--font-mono)] text-sm text-[var(--muted)]">
              A fine piano: {formatoEuroPreciso.format(ultima.interessiCumulati)}{" "}
              di interessi totali pagati su{" "}
              {formatoEuroPreciso.format(ultima.capitaleCumulato)} di capitale
              rimborsato ({righe.length} rate).
            </p>
          )}

          <div className="mt-6 overflow-x-auto rounded-sm border border-[var(--rule)] bg-[var(--surface)]">
            <table className="w-full min-w-[900px] border-collapse font-[var(--font-mono)] text-xs">
              <thead className="sticky top-0 bg-[var(--surface)]">
                <tr className="border-b border-[var(--rule)] text-left text-[var(--muted)]">
                  <th className="px-3 py-2">Rata</th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Tasso</th>
                  <th className="px-3 py-2">Rata (€)</th>
                  <th className="px-3 py-2">Quota capitale</th>
                  <th className="px-3 py-2">Quota interessi</th>
                  <th className="px-3 py-2">Residuo</th>
                  <th className="px-3 py-2">Rata cumulata</th>
                  <th className="px-3 py-2">Capitale cumulato</th>
                  <th className="px-3 py-2">Interessi cumulati</th>
                </tr>
              </thead>
              <tbody>
                {righe.map((r) => (
                  <tr key={r.numero} className="border-b border-[var(--rule)]/40">
                    <td className="px-3 py-1.5">{r.numero}</td>
                    <td className="px-3 py-1.5">{formatoMeseAnno.format(r.data)}</td>
                    <td className="px-3 py-1.5">
                      {(r.tassoApplicato * 100).toFixed(2)}%
                    </td>
                    <td className="px-3 py-1.5">
                      {formatoEuroPreciso.format(r.rataTotale)}
                    </td>
                    <td className="px-3 py-1.5">
                      {formatoEuroPreciso.format(r.quotaCapitale)}
                    </td>
                    <td className="px-3 py-1.5">
                      {formatoEuroPreciso.format(r.quotaInteressi)}
                    </td>
                    <td className="px-3 py-1.5">
                      {formatoEuroPreciso.format(r.capitaleResiduo)}
                    </td>
                    <td className="px-3 py-1.5">
                      {formatoEuroPreciso.format(r.rataCumulata)}
                    </td>
                    <td className="px-3 py-1.5">
                      {formatoEuroPreciso.format(r.capitaleCumulato)}
                    </td>
                    <td className="px-3 py-1.5">
                      {formatoEuroPreciso.format(r.interessiCumulati)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
