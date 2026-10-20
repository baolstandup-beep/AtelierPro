"use client";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { startInventory } from "@/lib/actions/stock";
import { formatDate, todayInShop } from "@/lib/format";

export function StartInventoryForm({ categories }: { categories: { id: string; name: string }[] }) {
  return (
    <ActionForm action={startInventory} redirectTo={(d) => `/stock/inventaires/${(d as { id: string }).id}`} className="flex flex-col gap-4 p-5">
      <FormField label="Nom" htmlFor="inv-name" name="name" required>
        <Input id="inv-name" name="name" defaultValue={`Inventaire du ${formatDate(todayInShop())}`} required />
      </FormField>
      <FormField label="Périmètre" htmlFor="inv-cat" name="category_id">
        <Select id="inv-cat" name="category_id" defaultValue="">
          <option value="">Tout le catalogue</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </FormField>
      <SubmitButton>Démarrer</SubmitButton>
    </ActionForm>
  );
}
