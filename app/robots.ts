import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/', '/orders/', '/customers/', '/dashboard/', '/settings/'],
    },
    sitemap: 'https://atelier-pro-rose.vercel.app/sitemap.xml',
  };
}
