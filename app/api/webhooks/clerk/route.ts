// app/api/webhooks/clerk/route.ts
//
// Riceve da Clerk l'evento "user.deleted" e cancella dal database Neon
// tutte le simulazioni salvate da quell'utente.
//
// Sicurezza: la richiesta è accettata solo se la firma Svix è valida
// (verifyWebhook usa il segreto CLERK_WEBHOOK_SIGNING_SECRET). Chiunque
// altro chiami questo URL riceve 400 e non viene cancellato nulla.

import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { immobiliUtente } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("Webhook Clerk: firma non valida", err);
    return new Response("Firma non valida", { status: 400 });
  }

  if (evt.type === "user.deleted") {
    const userId = evt.data.id;
    if (!userId) {
      return new Response("Evento senza id utente", { status: 400 });
    }
    try {
      await db.delete(immobiliUtente).where(eq(immobiliUtente.userId, userId));
    } catch (err) {
      console.error("Webhook Clerk: errore nella cancellazione", err);
      // 500 => Clerk riprova più tardi
      return new Response("Errore nella cancellazione", { status: 500 });
    }
  }

  return new Response("OK", { status: 200 });
}
