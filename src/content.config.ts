import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const learn = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/learn' }),
  schema: z.object({
    title: z.string(),
    depth: z.enum(['essential', 'applied', 'technical', 'research']),
    pillar: z.string(),
    topic: z.string(),
    tags: z.array(z.any()).default([]),
    author: z.string().default('bee'),
    date: z.string(),
    updated: z.string().optional(),
    readTime: z.number(),
    description: z.string(),
    related: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { learn };
