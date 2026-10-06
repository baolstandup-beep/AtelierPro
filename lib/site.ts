// URL publique canonique du site (metadata, sitemap, robots, JSON-LD).
// Définir NEXT_PUBLIC_SITE_URL lors du passage sur un domaine personnalisé.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://atelier-pro-rose.vercel.app'
).replace(/\/+$/, '');
