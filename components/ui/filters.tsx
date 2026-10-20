import Link from "next/link";
import { cn } from "./cn";
import { PERIOD_LABELS, type PeriodRange } from "@/lib/periods";
import { buttonClass } from "./button";
import { Input } from "./field";

/** Sélecteur de période par liens (fonctionne sans JavaScript). */
export function PeriodFilter({ basePath, period, extra = {} }: { basePath: string; period: PeriodRange; extra?: Record<string, string> }) {
  const href = (p: string) => {
    const qs = new URLSearchParams({ ...extra, period: p });
    return `${basePath}?${qs.toString()}`;
  };
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <nav aria-label="Période" className="flex flex-wrap gap-1 rounded-[var(--radius-control)] border border-sand bg-paper p-1">
        {Object.entries(PERIOD_LABELS).map(([key, label]) => (
          <Link
            key={key}
            href={href(key)}
            aria-current={period.key === key ? "page" : undefined}
            className={cn(
              "rounded px-2.5 py-1 text-sm",
              period.key === key ? "bg-ink text-ivory" : "text-ink-soft hover:bg-sand/60",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      <form action={basePath} className="flex flex-wrap items-center gap-1.5">
        {Object.entries(extra).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <input type="hidden" name="period" value="custom" />
        <label className="sr-only" htmlFor="from">Du</label>
        <Input id="from" name="from" type="date" defaultValue={period.fromDate} className="h-9 w-auto" />
        <label className="sr-only" htmlFor="to">Au</label>
        <Input id="to" name="to" type="date" defaultValue={period.toDate} className="h-9 w-auto" />
        <button className={buttonClass("secondary", "sm", "h-9")}>Appliquer</button>
      </form>
    </div>
  );
}

export function SearchForm({ action, defaultValue, placeholder, children }: { action: string; defaultValue?: string; placeholder: string; children?: React.ReactNode }) {
  return (
    <form action={action} className="no-print flex flex-wrap items-center gap-2" role="search">
      <label htmlFor="q" className="sr-only">
        Rechercher
      </label>
      <Input id="q" name="q" type="search" defaultValue={defaultValue} placeholder={placeholder} className="w-full sm:w-72" />
      {children}
      <button className={buttonClass("secondary")}>Rechercher</button>
    </form>
  );
}

export function Pagination({ basePath, page, hasNext, params }: { basePath: string; page: number; hasNext: boolean; params: Record<string, string | undefined> }) {
  const href = (p: number) => {
    const qs = new URLSearchParams(Object.entries({ ...params, page: String(p) }).filter(([, v]) => v) as [string, string][]);
    return `${basePath}?${qs.toString()}`;
  };
  if (page <= 1 && !hasNext) return null;
  return (
    <nav className="no-print flex items-center justify-between gap-2 px-4 py-3 text-sm" aria-label="Pagination">
      {page > 1 ? (
        <Link className={buttonClass("secondary", "sm")} href={href(page - 1)}>
          Page précédente
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted">Page {page}</span>
      {hasNext ? (
        <Link className={buttonClass("secondary", "sm")} href={href(page + 1)}>
          Page suivante
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
