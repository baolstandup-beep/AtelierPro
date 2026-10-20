import { formatFCFA } from "@/lib/format";

/** Barres horizontales simples : lisibles sur mobile, imprimables, sans bibliothèque. */
export function BarList({ items, emptyLabel = "Aucune donnée" }: { items: { label: string; value: number; hint?: string }[]; emptyLabel?: string }) {
  const max = Math.max(...items.map((i) => i.value), 0);
  if (!items.length || max <= 0) return <p className="px-5 py-8 text-center text-sm text-muted">{emptyLabel}</p>;
  return (
    <ul className="flex flex-col gap-3 p-5">
      {items.map((i) => (
        <li key={i.label} className="text-sm">
          <div className="mb-1 flex justify-between gap-3">
            <span className="truncate">{i.label}{i.hint ? <span className="text-muted"> · {i.hint}</span> : null}</span>
            <span className="shrink-0 font-medium tabular">{formatFCFA(i.value)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-sand/60">
            <div className="h-1.5 rounded-full bg-ink" style={{ width: `${Math.max(2, (i.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Histogramme vertical des ventes par jour. */
export function DayColumns({ days }: { days: { day: string; value: number }[] }) {
  const max = Math.max(...days.map((d) => d.value), 0);
  if (!days.length || max <= 0) return <p className="px-5 py-8 text-center text-sm text-muted">Aucune vente sur la période.</p>;
  return (
    <div className="flex h-40 items-end gap-1 px-5 pt-4 pb-2" role="img" aria-label="Ventes par jour">
      {days.map((d) => (
        <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end">
          <div className="min-h-px rounded-t-sm bg-ink group-hover:bg-gold" style={{ height: `${(d.value / max) * 100}%` }} title={`${d.day.split("-").reverse().join("/")} : ${formatFCFA(d.value)}`} />
        </div>
      ))}
    </div>
  );
}
