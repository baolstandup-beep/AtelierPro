"use client";
import { useState } from "react";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveCategory } from "@/lib/actions/products";

function Fields({ category }: { category?: { id: string; name: string; description: string | null } }) {
  const suffix = category?.id ?? "new";
  return (
    <>
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <FormField label="Nom" htmlFor={`cat-name-${suffix}`} name="name" required>
        <Input id={`cat-name-${suffix}`} name="name" defaultValue={category?.name} required maxLength={80} />
      </FormField>
      <FormField label="Description" htmlFor={`cat-desc-${suffix}`} name="description">
        <Input id={`cat-desc-${suffix}`} name="description" defaultValue={category?.description ?? ""} maxLength={300} />
      </FormField>
    </>
  );
}

export function CategoryForm({ category }: { category?: { id: string; name: string; description: string | null } }) {
  const [open, setOpen] = useState(false);
  if (!category) {
    return (
      <ActionForm action={saveCategory} resetOnSuccess className="flex flex-col gap-4 p-5">
        <Fields />
        <SubmitButton>Créer la catégorie</SubmitButton>
      </ActionForm>
    );
  }
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>Modifier</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Modifier la catégorie">
        <ActionForm action={saveCategory} onSuccess={() => setOpen(false)} className="flex flex-col gap-4">
          <Fields category={category} />
          <div className="flex justify-end"><SubmitButton>Enregistrer</SubmitButton></div>
        </ActionForm>
      </Dialog>
    </>
  );
}
