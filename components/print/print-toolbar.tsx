"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintToolbar({ backHref, formats }: { backHref: string; formats?: { key: string; label: string }[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const auto = params.get("imprimer") === "1";
  const current = params.get("format") ?? formats?.[0]?.key;
  useEffect(() => {
    if (auto) setTimeout(() => window.print(), 300);
  }, [auto]);
  return (
    <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-sand bg-ivory px-4 py-3">
      <Link href={backHref} className="text-sm text-muted hover:text-ink">Retour</Link>
      <div className="flex flex-wrap items-center gap-2">
        {formats?.map((f) => (
          <Button key={f.key} size="sm" variant={current === f.key ? "primary" : "secondary"} onClick={() => router.replace(`?format=${f.key}`)}>
            {f.label}
          </Button>
        ))}
        <Button size="sm" onClick={() => window.print()}>
          <Printer aria-hidden /> Imprimer / PDF
        </Button>
      </div>
    </div>
  );
}
