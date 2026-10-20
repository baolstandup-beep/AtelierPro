import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6 text-center">
      <div>
        <h1 className="font-display text-4xl">Page introuvable</h1>
        <p className="mt-2 text-sm text-muted">Cet élément n&apos;existe pas ou vous n&apos;y avez pas accès.</p>
        <Link href="/" className="mt-6 inline-block text-sm underline underline-offset-4">Retour à l&apos;accueil</Link>
      </div>
    </div>
  );
}
