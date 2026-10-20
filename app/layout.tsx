import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Hanken_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import "./globals.css";

const bodoni = Bodoni_Moda({ subsets: ["latin"], variable: "--font-bodoni", display: "swap" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Élégance by Aicha", template: "%s · Élégance by Aicha" },
  description: "Caisse, stock et gestion de la boutique Élégance by Aicha.",
  applicationName: "Élégance by Aicha",
  appleWebApp: { capable: true, title: "Élégance", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#171717",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${bodoni.variable} ${hanken.variable}`}>
      <body className="min-h-dvh antialiased">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast: "!rounded-[10px] !border !border-sand !bg-paper !text-ink !font-sans",
              error: "!border-danger/40",
              success: "!border-success/40",
            },
          }}
        />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
