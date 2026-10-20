export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink px-6 text-center text-ivory">
      <div className="max-w-sm">
        <p className="font-display text-4xl">Élégance</p>
        <div className="mx-auto my-6 h-px w-12 bg-gold" aria-hidden />
        <h1 className="text-lg font-medium">Pas de connexion internet</h1>
        <p className="mt-2 text-sm text-ivory/70">
          Les ventes ne peuvent pas être enregistrées hors ligne afin d&apos;éviter les doublons et les stocks faux. Vérifiez le Wi-Fi
          ou les données mobiles, puis rechargez la page.
        </p>
      </div>
    </div>
  );
}
