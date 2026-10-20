import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: PageProps<"/connexion">) {
  const sp = await searchParams;
  const suite = typeof sp.suite === "string" ? sp.suite : undefined;
  const linkError = sp.erreur === "lien";
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(26rem,32rem)]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-ivory lg:flex">
        <div>
          <p className="font-display text-6xl leading-none font-medium tracking-tight xl:text-7xl">Élégance</p>
          <p className="mt-3 text-lg text-gold">by Aicha</p>
        </div>
        <div className="max-w-md">
          <div className="mb-6 h-px w-16 bg-gold" aria-hidden />
          <p className="font-display text-2xl leading-snug">Mode, parfums et accessoires.</p>
          <p className="mt-2 text-sm text-ivory/60">Caisse, stock et suivi de la boutique.</p>
        </div>
      </section>
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <p className="font-display text-4xl font-medium">Élégance</p>
            <p className="mt-1 text-sm text-gold-deep">by Aicha</p>
          </div>
          <h1 className="font-display text-3xl">Connexion</h1>
          <p className="mt-1.5 text-sm text-muted">Accès réservé au personnel de la boutique.</p>
          {linkError ? (
            <p role="alert" className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              Ce lien a expiré ou a déjà été utilisé. Demandez un nouveau lien.
            </p>
          ) : null}
          <LoginForm suite={suite} />
        </div>
      </section>
    </div>
  );
}
