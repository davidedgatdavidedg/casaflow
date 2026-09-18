// components/pulsante-indietro.tsx
"use client";

import { useRouter } from "next/navigation";

/** Pulsante "indietro" che usa la cronologia di navigazione del browser
 * invece di un link a destinazione fissa. Necessario per pagine come
 * /documentazione, raggiungibili da più punti dell'app (home,
 * calcolatore, flussi di cassa): un link fisso a una sola di queste
 * destinazioni riporta l'utente nel posto sbagliato se è arrivato da
 * un'altra. */
export default function PulsanteIndietro({
  etichetta = "← Indietro",
  className,
}: {
  etichetta?: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.back()} className={className}>
      {etichetta}
    </button>
  );
}
