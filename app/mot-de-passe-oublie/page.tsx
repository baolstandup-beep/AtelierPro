import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl">Mot de passe oublié</h1>
        <p className="mt-1.5 text-sm text-muted">Saisissez votre e-mail : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
        <ResetForm />
        <Link href="/connexion" className="mt-6 block text-center text-sm text-muted hover:text-ink">
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
