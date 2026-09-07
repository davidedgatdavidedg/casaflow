// lib/actions/immobili.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { immobiliUtente } from "@/lib/db/schema";

/**
 * Salva un nuovo immobile, o aggiorna uno esistente se viene passato un id.
 * Ogni Server Action verifica l'autenticazione autonomamente — è qui,
 * non nel database, che vive il controllo di sicurezza (vedi nota in
 * schema.ts sul perché non usiamo Row Level Security).
 */
export async function salvaImmobile(
  nome: string,
  dati: unknown,
  id?: string
): Promise<{ id: string }> {
  
  const { userId } = await auth();
  console.log("DEBUG auth():", await auth());
  if (!userId) {
    throw new Error("Devi accedere per salvare un immobile.");
  }
  if (!nome.trim()) {
    throw new Error("Serve un nome per salvare l'immobile.");
  }

  if (id) {
    const [aggiornato] = await db
      .update(immobiliUtente)
      .set({ nome: nome.trim(), dati, aggiornatoIl: new Date() })
      .where(and(eq(immobiliUtente.id, id), eq(immobiliUtente.userId, userId)))
      .returning({ id: immobiliUtente.id });

    if (!aggiornato) {
      throw new Error("Immobile non trovato o non tuo.");
    }
    return { id: aggiornato.id };
  }

  const [nuovo] = await db
    .insert(immobiliUtente)
    .values({ userId, nome: nome.trim(), dati })
    .returning({ id: immobiliUtente.id });

  return { id: nuovo.id };
}

/** Elenca gli immobili salvati dall'utente autenticato (solo i suoi). */
export async function elencaImmobiliUtente() {
  const { userId } = await auth();
  if (!userId) return [];

  return db
    .select({
      id: immobiliUtente.id,
      nome: immobiliUtente.nome,
      aggiornatoIl: immobiliUtente.aggiornatoIl,
    })
    .from(immobiliUtente)
    .where(eq(immobiliUtente.userId, userId))
    .orderBy(immobiliUtente.aggiornatoIl);
}

/** Recupera i dati completi di un immobile salvato (per caricarlo nel form). */
export async function caricaImmobileUtente(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Devi accedere.");

  const [immobile] = await db
    .select()
    .from(immobiliUtente)
    .where(and(eq(immobiliUtente.id, id), eq(immobiliUtente.userId, userId)));

  if (!immobile) throw new Error("Immobile non trovato o non tuo.");
  return immobile;
}

export async function eliminaImmobile(id: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Devi accedere.");

  await db
    .delete(immobiliUtente)
    .where(and(eq(immobiliUtente.id, id), eq(immobiliUtente.userId, userId)));
}
