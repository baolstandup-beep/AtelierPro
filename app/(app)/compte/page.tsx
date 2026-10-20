import type { Metadata } from "next";
import { requirePage } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const user = await requirePage();
  return (
    <>
      <PageHeader title="Mon compte" description={`${user.fullName} · ${ROLE_LABELS[user.role]} · ${user.email ?? ""}`} />
      <div className="grid max-w-3xl gap-6 md:grid-cols-2">
        <Panel>
          <PanelHeader title="Changer de mot de passe" />
          <PasswordForm />
        </Panel>
        <Panel>
          <PanelHeader title="Mes permissions" />
          <ul className="flex flex-wrap gap-1.5 p-5">
            {[...user.permissions].sort().map((p) => <li key={p} className="rounded-full bg-sand/70 px-2 py-0.5 text-xs">{p}</li>)}
          </ul>
        </Panel>
      </div>
    </>
  );
}
