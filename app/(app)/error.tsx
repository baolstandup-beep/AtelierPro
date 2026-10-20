"use client";
import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="font-display text-3xl">Page indisponible</h1>
      <p className="mt-2 text-sm text-muted">Le chargement a échoué, probablement à cause de la connexion. Aucune donnée n&apos;a été perdue.</p>
      <Button onClick={reset} className="mt-6">Réessayer</Button>
    </div>
  );
}
