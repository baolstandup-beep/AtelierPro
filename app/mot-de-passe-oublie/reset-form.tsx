"use client";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { requestPasswordReset } from "@/lib/actions/auth";

export function ResetForm() {
  return (
    <ActionForm action={requestPasswordReset} resetOnSuccess className="mt-6 flex flex-col gap-4">
      <FormField label="Adresse e-mail" htmlFor="email" name="email">
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </FormField>
      <SubmitButton className="w-full">Envoyer le lien</SubmitButton>
    </ActionForm>
  );
}
