import type { Metadata } from "next";
import { requirePage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { CategoryForm } from "./category-form";
import { deleteCategory } from "@/lib/actions/products";

export const metadata: Metadata = { title: "Catégories" };

export default async function CategoriesPage() {
  await requirePage("products.manage");
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("id, name, description, products(count)").order("name");
  const rows = (data ?? []) as { id: string; name: string; description: string | null; products: { count: number }[] }[];
  return (
    <>
      <PageHeader title="Catégories" back={{ href: "/produits", label: "Produits" }} description="Organisez le catalogue : prêt-à-porter, parfums, sacs, bijoux…" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel>
          {rows.length === 0 ? (
            <EmptyState title="Aucune catégorie" description="Créez votre première catégorie avec le formulaire." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Catégorie</Th>
                  <Th align="right">Produits</Th>
                  <Th className="w-0"><span className="sr-only">Actions</span></Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <span className="font-medium">{c.name}</span>
                      {c.description ? <span className="block text-xs text-muted">{c.description}</span> : null}
                    </Td>
                    <Td align="right">{c.products?.[0]?.count ?? 0}</Td>
                    <Td className="whitespace-nowrap">
                      <div className="flex gap-1">
                        <CategoryForm category={c} />
                        <ConfirmAction
                          action={deleteCategory}
                          hidden={{ id: c.id }}
                          trigger="Supprimer"
                          triggerVariant="ghost"
                          title={`Supprimer « ${c.name} » ?`}
                          description="Les produits concernés resteront au catalogue, sans catégorie."
                          confirmLabel="Supprimer"
                        />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
        <Panel className="h-fit">
          <PanelHeader title="Nouvelle catégorie" />
          <CategoryForm />
        </Panel>
      </div>
    </>
  );
}
