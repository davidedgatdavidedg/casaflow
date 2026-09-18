// app/nuovo/page.tsx
import Link from "next/link";
import LogoCasaFlow from "@/components/logo-casaflow";
import { auth } from "@clerk/nextjs/server";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import SceltaValutazione from "@/components/scelta-valutazione";

export default async function NuovaValutazionePage() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-[var(--ink)] text-[var(--ink-text)]">
      <header className="border-b border-[var(--rule)] px-6 py-5 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-baseline gap-3">
              {userId && (
                <Link href="/" className="text-sm text-[var(--brass)] hover:underline">
                  ← Portafoglio
                </Link>
              )}
              <h1>
                <LogoCasaFlow />
              </h1>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Simulatore di redditività per investimenti immobiliari
              {" — "}
              <Link href="/documentazione" className="text-[var(--brass)] hover:underline">
                Come funziona
              </Link>
            </p>
          </div>

          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                type="button"
                className="rounded-sm border border-[var(--brass)]/50 px-3 py-2 text-sm text-[var(--brass)] transition-colors hover:bg-[var(--brass)]/10"
              >
                Accedi con Google
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </header>

      <SceltaValutazione />
    </div>
  );
}
