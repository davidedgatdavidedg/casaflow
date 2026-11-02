import type { Metadata } from "next";
import Link from "next/link";
import { ClerkProvider } from "@clerk/nextjs";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "CasaFlow",
  description: "Simulatore di redditività per investimenti immobiliari",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="it" className="h-full">
        <body
          className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} antialiased`}
        >
          {children}
          <footer className="border-t border-[var(--rule)] bg-[var(--ink)] px-6 py-4 text-center text-xs text-[var(--muted)]">
            <Link href="/privacy" className="hover:text-[var(--brass)] hover:underline">
              Informativa sulla privacy
            </Link>
            <span className="mx-3" aria-hidden="true">·</span>
            <Link href="/disclaimer" className="hover:text-[var(--brass)] hover:underline">
              Limiti delle simulazioni
            </Link>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
