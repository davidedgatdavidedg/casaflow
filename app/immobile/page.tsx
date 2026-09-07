// app/immobile/page.tsx
import { Suspense } from "react";
import CalcolatoreQuickMode from "@/components/calcolatore-quick-mode";

export default function PaginaImmobile() {
  return (
    <Suspense fallback={null}>
      <CalcolatoreQuickMode />
    </Suspense>
  );
}
