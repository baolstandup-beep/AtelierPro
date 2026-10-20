import { LinkButton } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="font-display text-3xl">Accès refusé</h1>
      <p className="mt-2 text-sm text-muted">Votre compte n&apos;a pas la permission d&apos;ouvrir cette page. Si vous en avez besoin, demandez-la à la gérante.</p>
      <LinkButton href="/" className="mt-6">Retour à l&apos;accueil</LinkButton>
    </div>
  );
}
