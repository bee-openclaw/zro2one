import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

export async function GET(context: APIContext) {
  const articles = await getCollection('learn', ({ data }) => !data.draft);

  return rss({
    title: 'Zro2One — Learn AI from Zero to One',
    description: 'Practical AI education across essential, applied, technical, and research depths.',
    site: context.site ?? 'https://zro2.one',
    items: articles.map((article) => ({
      title: String(article.data.title),
      description: String(article.data.description),
      pubDate: new Date(String(article.data.date)),
      link: `/learn/${article.id}`,
      categories: [String(article.data.depth), String(article.data.pillar), ...article.data.tags.map((tag) => String(tag))],
    })),
    customData: '<language>en-us</language>',
  });
}
