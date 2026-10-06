import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const pages: { path: string; changeFrequency: 'weekly' | 'monthly' | 'yearly'; priority: number }[] = [
    { path: '', changeFrequency: 'monthly', priority: 1 },
    { path: '/pricing', changeFrequency: 'monthly', priority: 0.9 },
    { path: '/ateliers', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/blog', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/legal/conditions', changeFrequency: 'yearly', priority: 0.5 },
    { path: '/legal/confidentialite', changeFrequency: 'yearly', priority: 0.5 },
    { path: '/legal/mentions-legales', changeFrequency: 'yearly', priority: 0.5 },
  ];

  return pages.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
