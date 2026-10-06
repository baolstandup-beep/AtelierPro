import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/', '/orders/', '/customers/', '/dashboard/', '/settings/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
