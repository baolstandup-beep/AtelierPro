"use client";
import Link from "next/link";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { signIn } from "@/lib/actions/auth";

export function LoginForm({ suite }: { suite?: string }) {
  return (
    <ActionForm action={signIn} className="mt-8 flex flex-col gap-4">
      {suite ? <input type="hidden" name="suite" value={suite} /> : null}
      <FormField label="Adresse e-mail" htmlFor="email" name="email">
        <Input id="email" name="email" type="email" autoComplete="username" inputMode="email" required autoFocus />
      </FormField>
      <FormField label="Mot de passe" htmlFor="password" name="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </FormField>
      <SubmitButton size="lg" className="mt-2 w-full" pendingLabel="Connexion…">
        Se connecter
      </SubmitButton>
      <Link href="/mot-de-passe-oublie" className="text-center text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
        Mot de passe oublié
      </Link>
    </ActionForm>
  );
}
