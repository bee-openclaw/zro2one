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
      title: article.data.title,
      description: article.data.description,
      pubDate: new Date(article.data.date),
      link: `/learn/${article.id}`,
      categories: [article.data.depth, article.data.pillar, ...article.data.tags],
    })),
    customData: '<language>en-us</language>',
  });
}
