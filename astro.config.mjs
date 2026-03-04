// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://zro2.one',
  integrations: [
    sitemap({
      serialize(item) {
        const url = item.url;

        // Homepage
        if (url === 'https://zro2.one/' || url === 'https://zro2.one') {
          item.priority = 1.0;
          item.changefreq = 'daily';
          return item;
        }

        // /learn index
        if (url === 'https://zro2.one/learn/' || url === 'https://zro2.one/learn') {
          item.priority = 0.9;
          item.changefreq = 'daily';
          return item;
        }

        // Article pages: /learn/[slug]
        if (url.includes('/learn/') && !url.includes('/learn/topic/')) {
          item.priority = 0.8;
          item.changefreq = 'weekly';
          return item;
        }

        // Everything else
        item.priority = 0.5;
        item.changefreq = 'monthly';
        return item;
      }
    }),
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
