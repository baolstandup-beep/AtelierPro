export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { isConfigured } from "@/lib/env";

export default function ConfigurationPage() {
  if (isConfigured()) redirect("/");
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="font-display text-3xl">Configuration requise</h1>
      <p className="mt-3 text-sm text-muted">
        Les variables <code>NEXT_PUBLIC_SUPABASE_URL</code> et <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> ne sont pas définies. Copiez
        <code> .env.example</code> en <code>.env.local</code> (ou renseignez-les dans Vercel), puis redémarrez l&apos;application. Le guide
        complet est dans <code>docs/INSTALLATION.md</code>.
      </p>
    </div>
  );
}
