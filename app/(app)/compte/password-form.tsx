"use client";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { updatePassword } from "@/lib/actions/auth";

export function PasswordForm() {
  return (
    <ActionForm action={updatePassword} resetOnSuccess className="flex flex-col gap-4 p-5">
      <FormField label="Nouveau mot de passe" htmlFor="password" name="password" hint="10 caractères minimum."><Input id="password" name="password" type="password" autoComplete="new-password" required /></FormField>
      <FormField label="Confirmation" htmlFor="confirm" name="confirm"><Input id="confirm" name="confirm" type="password" autoComplete="new-password" required /></FormField>
      <SubmitButton>Enregistrer</SubmitButton>
    </ActionForm>
  );
}
