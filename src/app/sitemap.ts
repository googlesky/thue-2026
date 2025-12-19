import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://thue.1devops.io';
  const lastModified = new Date();

  return [
    // Main pages - these are crawlable
    {
      url: `${baseUrl}/`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/tinh-thue/`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
  ];
}
