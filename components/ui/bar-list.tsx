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

/** Histogramme vertical des ventes par jour (jours sans vente inclus). */
export function DayColumns({ days, fromDate, toDate }: { days: { day: string; value: number }[]; fromDate: string; toDate: string }) {
  const byDay = new Map(days.map((d) => [d.day, d.value]));
  const all: { day: string; value: number }[] = [];
  for (let d = new Date(`${fromDate}T00:00:00Z`); d <= new Date(`${toDate}T00:00:00Z`) && all.length < 92; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    all.push({ day: key, value: byDay.get(key) ?? 0 });
  }
  const max = Math.max(...all.map((d) => d.value), 0);
  if (max <= 0) return <p className="px-5 py-8 text-center text-sm text-muted">Aucune vente sur la période.</p>;
  const label = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
  return (
    <div className="px-5 pt-4 pb-3">
      <div className="flex h-40 items-end justify-center gap-1" role="img" aria-label="Ventes par jour">
        {all.map((d) => (
          <div key={d.day} className="group flex h-full max-w-10 flex-1 flex-col justify-end">
            <div
              className="min-h-px rounded-t-sm bg-ink group-hover:bg-gold"
              style={{ height: `${(d.value / max) * 100}%` }}
              title={`${label(d.day)} : ${formatFCFA(d.value)}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted">
        <span>{label(all[0].day)}</span>
        {all.length > 1 ? <span>{label(all[all.length - 1].day)}</span> : null}
      </div>
    </div>
  );
}
