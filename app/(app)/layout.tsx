import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/format";
import { can, NAV_ITEMS } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  const items = NAV_ITEMS.filter((item) => can(user.permissions, ...item.any));
  return (
    <AppShell items={items} user={{ fullName: user.fullName, roleLabel: ROLE_LABELS[user.role] ?? user.role }}>
      {children}
    </AppShell>
  );
}
