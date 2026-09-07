// proxy.ts (alla RADICE del progetto — sostituisce middleware.ts)
//
// Da Next.js 16 il file va chiamato proxy.ts invece di middleware.ts
// (il "Middleware" è stato rinominato "Proxy"). Il codice di Clerk resta
// identico — cambia solo il nome del file.
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
