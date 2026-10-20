import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { requirePage } from "@/lib/auth";
import { isReportKey, loadReport, REPORTS, type ReportKey } from "@/lib/reports";
import { resolvePeriod } from "@/lib/periods";
import { formatFCFA, formatNumber } from "@/lib/format";
import { dbErrorMessage } from "@/lib/errors";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PeriodFilter } from "@/components/ui/filters";
import { buttonClass } from "@/components/ui/button";
import { PrintButton } from "@/components/print/print-button";
import { cn } from "@/components/ui/cn";

export const metadata: Metadata = { title: "Rapports" };

function cell(value: unknown, kind?: string) {
  if (value === null || value === undefined || value === "") return "—";
  if (kind === "money") return formatFCFA(Number(value));
  if (kind === "number") return formatNumber(Number(value));
  if (kind === "percent") return `${String(value).replace(".", ",")} %`;
  return String(value);
}

export default async function ReportsPage({ searchParams }: PageProps<"/rapports">) {
  await requirePage("reports.view");
  const sp = await searchParams;
  const tab: ReportKey = typeof sp.onglet === "string" && isReportKey(sp.onglet) ? sp.onglet : "ventes-jour";
  const period = resolvePeriod({ period: (sp.period as string) ?? "month", from: sp.from as string, to: sp.to as string });
  let data: Awaited<ReturnType<typeof loadReport>> | null = null;
  let error: string | null = null;
  try {
    data = await loadReport(tab, period);
  } catch (e) {
    error = dbErrorMessage(e);
  }
  const qs = new URLSearchParams({ period: period.key, from: period.fromDate, to: period.toDate });

  return (
    <>
      <PageHeader title="Rapports" description="Calculs documentés dans docs/CALCULS.md. Export CSV compatible Excel ; PDF via « Imprimer »." />
      <nav aria-label="Rapports" className="no-print mb-4 flex gap-1 overflow-x-auto pb-1">
        {(Object.entries(REPORTS) as [ReportKey, string][]).map(([key, label]) => (
          <Link
            key={key}
            href={`/rapports?onglet=${key}&${qs.toString()}`}
            aria-current={tab === key ? "page" : undefined}
            className={cn("rounded-md px-3 py-1.5 text-sm whitespace-nowrap", tab === key ? "bg-ink text-ivory" : "border border-sand bg-paper hover:bg-sand/50")}
          >
            {label}
          </Link>
        ))}
      </nav>
      {data?.usesPeriod !== false ? <div className="mb-4"><PeriodFilter basePath="/rapports" period={period} extra={{ onglet: tab }} /></div> : null}
      <Panel>
        <PanelHeader
          title={`${REPORTS[tab]}${data?.usesPeriod ? ` — ${period.label}` : ""}`}
          description={data?.description}
          actions={
            <>
              <a href={`/api/exports/${tab}?${qs.toString()}`} className={buttonClass("secondary")}><Download aria-hidden /> CSV / Excel</a>
              <PrintButton label="PDF" />
            </>
          }
        />
        {error ? (
          <EmptyState title="Rapport indisponible" description={error} />
        ) : !data || data.rows.length === 0 ? (
          <EmptyState title="Aucune donnée" description="Rien à afficher pour cette période." />
        ) : (
          <Table>
            <thead>
              <tr>{data.columns.map((c) => <Th key={c.key} align={c.kind && c.kind !== "text" ? "right" : undefined}>{c.label}</Th>)}</tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <Tr key={i}>{data!.columns.map((c) => <Td key={c.key} align={c.kind && c.kind !== "text" ? "right" : undefined}>{cell(r[c.key], c.kind)}</Td>)}</Tr>
              ))}
              {data.totals ? (
                <tr className="bg-ivory/70 font-semibold">
                  {data.columns.map((c, i) => (
                    <Td key={c.key} align={c.kind && c.kind !== "text" ? "right" : undefined}>{i === 0 ? "Total" : c.key in data!.totals! ? cell(data!.totals![c.key], c.kind) : ""}</Td>
                  ))}
                </tr>
              ) : null}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
