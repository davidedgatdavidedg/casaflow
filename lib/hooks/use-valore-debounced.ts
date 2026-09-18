// lib/hooks/use-valore-debounced.ts
"use client";

import { useEffect, useState } from "react";

/**
 * Restituisce una versione "ritardata" del valore passato: si aggiorna
 * solo dopo che il valore è rimasto invariato per `ritardoMs`
 * millisecondi. Ogni cambiamento nel frattempo riazzera il timer
 * (debounce classico, non throttle).
 *
 * Pensato per disaccoppiare un input reattivo (che deve rispondere
 * subito ad ogni tasto premuto) da un calcolo costoso che ne dipende
 * (che invece deve aspettare che l'utente si fermi, non ripartire ad
 * ogni carattere): il campo di testo resta legato allo stato "vero"
 * (immediato), mentre il calcolo pesante usa la versione debounced
 * dello stesso stato.
 */
export function useValoreDebounced<T>(valore: T, ritardoMs: number): T {
  const [valoreDebounced, setValoreDebounced] = useState(valore);

  useEffect(() => {
    const timer = setTimeout(() => setValoreDebounced(valore), ritardoMs);
    return () => clearTimeout(timer);
  }, [valore, ritardoMs]);

  return valoreDebounced;
}
