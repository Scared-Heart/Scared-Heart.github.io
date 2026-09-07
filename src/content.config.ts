import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const labels = z
  .union([z.string(), z.array(z.string())])
  .nullish()
  .transform((value) => [
    ...new Set((Array.isArray(value) ? value : value ? [value] : []).filter(Boolean)),
  ]);

const posts = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './source/_posts',
    // Hexo used filenames as URLs. Keep case, Chinese characters and parentheses.
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string().min(1),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    description: z.string().optional(),
    categories: labels,
    tags: labels,
    draft: z.boolean().default(false),
    comments: z.boolean().default(true),
  }),
});

export const collections = { posts };
