import type { Metadata } from "next";
import { requirePage } from "@/lib/auth";
import { getShopSettings } from "@/lib/data/sale";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Réglages" };

export default async function SettingsPage() {
  await requirePage("settings.manage");
  const settings = await getShopSettings();
  return (
    <>
      <PageHeader title="Réglages de la boutique" description="Coordonnées imprimées sur les tickets et règles de la caisse. Chaque modification est journalisée." />
      {settings ? <SettingsForm settings={settings} /> : null}
    </>
  );
}
