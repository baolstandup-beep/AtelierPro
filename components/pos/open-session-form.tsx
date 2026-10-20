"use client";
import { useRouter } from "next/navigation";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { openCashSession } from "@/lib/actions/pos";

export function OpenSessionForm() {
  const router = useRouter();
  return (
    <ActionForm action={openCashSession} onSuccess={() => router.refresh()} className="flex flex-col gap-4 p-5">
      <FormField label="Caisse" htmlFor="register_name" name="register_name">
        <Input id="register_name" name="register_name" defaultValue="Caisse principale" maxLength={60} />
      </FormField>
      <FormField label="Fond de caisse (FCFA)" htmlFor="opening_float" name="opening_float" required>
        <Input id="opening_float" name="opening_float" inputMode="numeric" defaultValue="0" required />
      </FormField>
      <SubmitButton>Ouvrir la caisse</SubmitButton>
    </ActionForm>
  );
}
