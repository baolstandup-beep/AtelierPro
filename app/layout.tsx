import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { PWAInstallPrompt } from "@/components/pwa/pwa-install-prompt";

export const metadata: Metadata = {
  applicationName: "AtelierPro",
  title: {
    default: "AtelierPro — Gestion d'Atelier de Couture & Haute Confection",
    template: "%s | AtelierPro",
  },
  description: "Gérez vos clients, commandes, mesures, paiements et production depuis une seule plateforme. Conçu pour les tailleurs et ateliers de couture en Afrique.",
  keywords: ["atelier couture", "gestion tailleur", "CRM couture", "Sénégal", "FCFA", "haute confection", "PWA", "Wave", "Orange Money"],
  manifest: "/manifest.json",
  metadataBase: new URL("https://atelier-pro-rose.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_SN",
    url: "https://atelier-pro-rose.vercel.app",
    siteName: "AtelierPro",
    title: "AtelierPro — Gérez votre atelier de couture avec précision",
    description: "La plateforme tout-en-un pour tailleurs et ateliers de couture : clients, mesures, commandes, stocks et paiements Wave/OM.",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "AtelierPro Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "AtelierPro — Gestion d'atelier de couture",
    description: "La plateforme tout-en-un pour tailleurs et ateliers de couture.",
    images: ["/icons/icon-512x512.png"],
  },
  appleWebApp: {
    capable: true,
    title: "AtelierPro",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0F3B32",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;0,800;1,600&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {/* JSON-LD for Google Rich Results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "AtelierPro",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web, iOS, Android",
              "description": "Plateforme SaaS de gestion d'ateliers de couture : clients, mesures, commandes et paiements.",
              "url": "https://atelier-pro-rose.vercel.app",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "XOF",
                "description": "Démarrage gratuit"
              },
              "inLanguage": "fr",
            })
          }}
        />
        <Providers>
          {children}
          <PWAInstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
