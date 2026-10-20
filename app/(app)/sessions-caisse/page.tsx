import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { Pagination } from "@/components/ui/filters";

export const metadata: Metadata = { title: "Sessions de caisse" };
const PAGE_SIZE = 30;

export default async function CashSessionsPage({ searchParams }: PageProps<"/sessions-caisse">) {
  await requirePage("cash.operate", "cash.close", "reports.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  const { data } = await supabase
    .from("cash_sessions")
    .select("id, register_name, status, opened_at, closed_at, opening_float, expected_cash, counted_cash, difference, opener:profiles!cash_sessions_opened_by_fkey(full_name), closer:profiles!cash_sessions_closed_by_fkey(full_name)")
    .order("opened_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  let rows = (data ?? []) as unknown as { id: string; register_name: string; status: string; opened_at: string; closed_at: string | null; opening_float: number; expected_cash: number | null; counted_cash: number | null; difference: number | null; opener: { full_name: string } | null; closer: { full_name: string } | null }[];
  const hasNext = rows.length > PAGE_SIZE;
  rows = rows.slice(0, PAGE_SIZE);
  return (
    <>
      <PageHeader title="Sessions de caisse" description="Ouverture, encaissements, clôture et écarts de chaque caisse." actions={<LinkButton href="/caisse">Aller à la caisse</LinkButton>} />
      <Panel>
        {rows.length === 0 ? <EmptyState title="Aucune session" description="Ouvrez la caisse depuis l'écran Caisse." /> : (
          <Table>
            <thead><tr><Th>Session</Th><Th>État</Th><Th align="right">Fond</Th><Th align="right">Théorique</Th><Th align="right">Compté</Th><Th align="right">Écart</Th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <Link href={`/sessions-caisse/${s.id}`} className="font-medium hover:underline">{s.register_name}</Link>
                    <span className="block text-xs text-muted">{formatDateTime(s.opened_at)} · {s.opener?.full_name}{s.closed_at ? ` → ${formatDateTime(s.closed_at)}` : ""}</span>
                  </Td>
                  <Td>{s.status === "open" ? <Badge tone="gold">Ouverte</Badge> : <Badge>Clôturée</Badge>}</Td>
                  <Td align="right"><Money value={s.opening_float} /></Td>
                  <Td align="right">{s.expected_cash != null ? <Money value={s.expected_cash} /> : "—"}</Td>
                  <Td align="right">{s.counted_cash != null ? <Money value={s.counted_cash} /> : "—"}</Td>
                  <Td align="right" className={s.difference ? "font-medium text-danger" : undefined}>{s.difference != null ? <Money value={s.difference} signed /> : "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination basePath="/sessions-caisse" page={page} hasNext={hasNext} params={{}} />
      </Panel>
    </>
  );
}
