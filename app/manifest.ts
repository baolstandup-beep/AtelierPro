import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Élégance by Aicha",
    short_name: "Élégance",
    description: "Caisse, stock et gestion de la boutique.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#171717",
    theme_color: "#171717",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Caisse", url: "/caisse" },
      { name: "Produits", url: "/produits" },
    ],
  };
}
