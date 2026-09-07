// drizzle.config.ts — usato da drizzle-kit per generare le migrazioni
//
// drizzle-kit è un tool a riga di comando separato da Next.js: non legge
// .env.local automaticamente come fa Next.js. Va caricato esplicitamente.
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL non trovata. Verifica che .env.local esista alla radice del progetto e contenga DATABASE_URL."
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
