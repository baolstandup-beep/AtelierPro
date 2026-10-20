import { SHOP_TIME_ZONE, todayInShop } from "./format";

// Dakar est en UTC+0 toute l'année : minuit local = minuit UTC. On garde
// néanmoins le calcul explicite via le fuseau de la boutique.
export type PeriodKey = "today" | "yesterday" | "7d" | "month" | "last_month" | "year" | "custom";

export const PERIOD_LABELS: Record<Exclude<PeriodKey, "custom">, string> = {
  today: "Aujourd'hui",
  yesterday: "Hier",
  "7d": "7 derniers jours",
  month: "Ce mois",
  last_month: "Mois dernier",
  year: "Cette année",
};

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Instant UTC correspondant à minuit (heure de la boutique) du jour donné. */
export function startOfShopDay(isoDate: string): string {
  // Décalage du fuseau à cette date (0 pour Dakar).
  const probe = new Date(`${isoDate}T12:00:00Z`);
  const local = new Date(probe.toLocaleString("en-US", { timeZone: SHOP_TIME_ZONE }));
  const utc = new Date(probe.toLocaleString("en-US", { timeZone: "UTC" }));
  const offsetMs = local.getTime() - utc.getTime();
  return new Date(new Date(`${isoDate}T00:00:00Z`).getTime() - offsetMs).toISOString();
}

export interface PeriodRange {
  key: PeriodKey;
  fromDate: string; // inclus (AAAA-MM-JJ)
  toDate: string; // inclus
  from: string; // instant ISO inclus
  to: string; // instant ISO exclu
  label: string;
}

export function resolvePeriod(params: { period?: string; from?: string; to?: string }, now = new Date()): PeriodRange {
  const today = todayInShop(now);
  const key = (params.period as PeriodKey) ?? "today";
  let fromDate = today;
  let toDate = today;
  switch (key) {
    case "yesterday":
      fromDate = toDate = addDays(today, -1);
      break;
    case "7d":
      fromDate = addDays(today, -6);
      break;
    case "month":
      fromDate = `${today.slice(0, 7)}-01`;
      break;
    case "last_month": {
      const firstThis = `${today.slice(0, 7)}-01`;
      toDate = addDays(firstThis, -1);
      fromDate = `${toDate.slice(0, 7)}-01`;
      break;
    }
    case "year":
      fromDate = `${today.slice(0, 4)}-01-01`;
      break;
    case "custom": {
      const valid = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
      fromDate = valid(params.from) ? params.from! : today;
      toDate = valid(params.to) ? params.to! : fromDate;
      if (toDate < fromDate) [fromDate, toDate] = [toDate, fromDate];
      break;
    }
  }
  const resolvedKey: PeriodKey = key in PERIOD_LABELS || key === "custom" ? key : "today";
  const label =
    resolvedKey === "custom"
      ? `Du ${fromDate.split("-").reverse().join("/")} au ${toDate.split("-").reverse().join("/")}`
      : PERIOD_LABELS[resolvedKey as Exclude<PeriodKey, "custom">];
  return { key: resolvedKey, fromDate, toDate, from: startOfShopDay(fromDate), to: startOfShopDay(addDays(toDate, 1)), label };
}
