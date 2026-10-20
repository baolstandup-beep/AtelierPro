import type { Metadata } from "next";
import { requirePage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, ROLE_LABELS } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateUserForm, EditUserButton } from "./user-forms";

export const metadata: Metadata = { title: "Utilisateurs" };

export default async function UsersPage() {
  const me = await requirePage("users.manage");
  const supabase = await createClient();
  const [{ data: users }, { data: catalog }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, phone, role, permissions, is_active, created_at").order("is_active", { ascending: false }).order("full_name"),
    supabase.from("permission_catalog").select("key, label, module").order("module"),
  ]);
  return (
    <>
      <PageHeader title="Utilisateurs" description="Chaque rôle a des droits par défaut ; vous pouvez en ajouter individuellement. Personne ne peut modifier ses propres droits." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Panel>
          <Table>
            <thead><tr><Th>Nom</Th><Th>Rôle</Th><Th>Statut</Th><Th className="w-0"><span className="sr-only">Actions</span></Th></tr></thead>
            <tbody>
              {(users ?? []).map((u) => (
                <Tr key={u.id} className={u.is_active ? undefined : "opacity-60"}>
                  <Td><span className="font-medium">{u.full_name}</span>{u.id === me.id ? <Badge className="ml-2" tone="gold">Vous</Badge> : null}<span className="block text-xs text-muted">{[u.email, u.phone, `créé le ${formatDate(u.created_at)}`].filter(Boolean).join(" · ")}</span></Td>
                  <Td>{ROLE_LABELS[u.role]}{u.permissions.length ? <span className="block text-xs text-muted">+ {u.permissions.length} permission(s)</span> : null}</Td>
                  <Td>{u.is_active ? <Badge tone="success">Actif</Badge> : <Badge>Désactivé</Badge>}</Td>
                  <Td>{u.id !== me.id ? <EditUserButton user={u} catalog={catalog ?? []} /> : null}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Panel>
        <Panel className="h-fit">
          <PanelHeader title="Nouveau compte" description="Le mot de passe provisoire est à communiquer en main propre ; l'employé le change depuis « Mon compte »." />
          <CreateUserForm catalog={catalog ?? []} />
        </Panel>
      </div>
    </>
  );
}
