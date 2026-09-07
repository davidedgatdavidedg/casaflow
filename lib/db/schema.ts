// lib/db/schema.ts
//
// Schema Drizzle per la tabella degli immobili salvati dagli utenti.
// Ogni riga contiene l'intero stato del form serializzato in JSON —
// non modelliamo colonna per colonna ogni campo (prezzo, mutuo, unità,
// ecc.): sarebbe fragile ad ogni modifica del form. Il JSON blob si
// evolve insieme al form senza bisogno di migrazioni ad ogni campo
// nuovo.

import { pgTable, text, uuid, jsonb, timestamp } from "drizzle-orm/pg-core";

export const immobiliUtente = pgTable("immobili_utente", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** ID utente Clerk (es. "user_2abc..."). Il filtro per userId avviene
   * nel codice applicativo (Server Actions), non tramite Row Level
   * Security del database — a differenza di Supabase, Clerk non si
   * integra nativamente con RLS di Postgres. È una scelta di design
   * consapevole: la sicurezza dipende dal fatto che OGNI query passi
   * sempre da queste Server Actions, mai da accesso diretto al DB. */
  userId: text("user_id").notNull(),
  nome: text("nome").notNull(),
  dati: jsonb("dati").notNull(),
  creatoIl: timestamp("creato_il").defaultNow().notNull(),
  aggiornatoIl: timestamp("aggiornato_il").defaultNow().notNull(),
});

export type ImmobileUtente = typeof immobiliUtente.$inferSelect;
export type NuovoImmobileUtente = typeof immobiliUtente.$inferInsert;
