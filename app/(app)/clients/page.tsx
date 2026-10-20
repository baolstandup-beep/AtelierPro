import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Money } from "@/components/ui/money";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, SearchForm } from "@/components/ui/filters";
import { Select } from "@/components/ui/field";
import { CustomerDialog } from "@/components/forms/entity-forms";

export const metadata: Metadata = { title: "Clients" };
const PAGE_SIZE = 40;

export default async function CustomersPage({ searchParams }: PageProps<"/clients">) {
  const user = await requirePage("customers.view");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().replace(/[,()%]/g, " ") : "";
  const filter = sp.filtre === "creances" ? "creances" : "tous";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();

  const { data: receivables } = await supabase.rpc("report_customer_receivables");
  const dueById = new Map(((receivables ?? []) as { customer_id: string; balance_due: number }[]).map((r) => [r.customer_id, Number(r.balance_due)]));

  let query = supabase.from("customers").select("id, first_name, last_name, phone, store_credit, created_at").order("first_name").range((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  if (q) {
    const digits = q.replace(/\D/g, "");
    query = query.or([`first_name.ilike.%${q}%`, `last_name.ilike.%${q}%`, digits.length >= 3 ? `phone.ilike.%${digits}%` : null].filter(Boolean).join(","));
  }
  if (filter === "creances") query = query.in("id", [...dueById.keys()].length ? [...dueById.keys()] : ["00000000-0000-0000-0000-000000000000"]);
  const { data } = await query;
  let rows = data ?? [];
  const hasNext = rows.length > PAGE_SIZE;
  rows = rows.slice(0, PAGE_SIZE);
  const totalDue = [...dueById.values()].reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader
        title="Clients"
        description={<>Créances clients en cours : <Money value={totalDue} className="font-medium text-ink" /></>}
        actions={can(user.permissions, "customers.manage") ? <CustomerDialog /> : null}
      />
      <Panel>
        <div className="border-b border-sand p-4">
          <SearchForm action="/clients" defaultValue={q} placeholder="Nom ou téléphone">
            <label htmlFor="filtre" className="sr-only">Filtre</label>
            <Select id="filtre" name="filtre" defaultValue={filter} className="w-auto">
              <option value="tous">Tous les clients</option>
              <option value="creances">Avec créance</option>
            </Select>
          </SearchForm>
        </div>
        {rows.length === 0 ? (
          <EmptyState title="Aucun client" description={q ? "Aucun client ne correspond." : "Les clients créés en caisse ou ici apparaîtront dans cette liste."} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Client</Th>
                <Th>Téléphone</Th>
                <Th align="right">Avoir</Th>
                <Th align="right">Doit</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <Tr key={c.id}>
                  <Td><Link href={`/clients/${c.id}`} className="font-medium hover:underline">{[c.first_name, c.last_name].filter(Boolean).join(" ")}</Link></Td>
                  <Td className="tabular text-muted">{c.phone ?? "—"}</Td>
                  <Td align="right">{c.store_credit ? <Money value={c.store_credit} /> : "—"}</Td>
                  <Td align="right" className={dueById.get(c.id) ? "font-medium text-warning" : undefined}>{dueById.get(c.id) ? <Money value={dueById.get(c.id)} /> : "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination basePath="/clients" page={page} hasNext={hasNext} params={{ q, filtre: filter }} />
      </Panel>
    </>
  );
}
