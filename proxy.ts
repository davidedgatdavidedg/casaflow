// proxy.ts (alla RADICE del progetto — sostituisce middleware.ts)
//
// Da Next.js 16 il file va chiamato proxy.ts invece di middleware.ts
// (il "Middleware" è stato rinominato "Proxy"). Il codice di Clerk resta
// identico — cambia solo il nome del file.
//
// IMPORTANTE: il pattern "/__clerk/(.*)" è necessario perché le
// versioni recenti di @clerk/nextjs caricano lo script clerk-js
// passando dal nostro stesso dominio (richieste a /__clerk/npm/...),
// non da un CDN esterno. Senza questo pattern nel matcher, quelle
// richieste non passano dal middleware e Vercel risponde 404 — il
// login smette di funzionare silenziosamente (il pulsante non fa
// nulla, senza errori visibili se non si apre la console del browser).
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
