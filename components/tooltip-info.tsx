"use client";

import { useState } from "react";

export default function TooltipInfo({ children }: { children: React.ReactNode }) {
  const [aperto, setAperto] = useState(false);

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label="Informazioni"
        aria-expanded={aperto}
        onClick={() => setAperto((v) => !v)}
        onBlur={() => setAperto(false)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--rule)] text-[10px] text-[var(--muted)] transition-colors hover:border-[var(--brass)]/60 hover:text-[var(--brass)]"
      >
        i
      </button>
      {aperto && (
        <span className="absolute left-1/2 top-7 z-20 w-72 -translate-x-1/2 rounded-sm border border-[var(--rule)] bg-[var(--surface)] p-3 text-left text-xs leading-relaxed text-[var(--muted)] shadow-xl">
          {children}
        </span>
      )}
    </span>
  );
}
