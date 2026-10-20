import type { Metadata } from "next";
import { requirePage } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { ImportWizard } from "./import-wizard";

export const metadata: Metadata = { title: "Importer des produits" };

export default async function ImportPage() {
  await requirePage("products.manage");
  return (
    <>
      <PageHeader
        title="Importer des produits"
        back={{ href: "/produits", label: "Produits" }}
        description="Fichier CSV (séparateur ; ou ,). Les lignes portant le même nom deviennent les variantes d'un même produit. Rien n'est enregistré avant votre confirmation, et l'import est annulé en entier si une ligne pose problème."
      />
      <ImportWizard />
    </>
  );
}
