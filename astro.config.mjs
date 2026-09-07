import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import rehypeImages from './src/lib/rehype-images.mjs';

export default defineConfig({
  site: 'https://scared-heart.github.io',
  output: 'static',
  publicDir: './static',
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !page.endsWith('/404/') })],
  markdown: {
    processor: unified({ rehypePlugins: [rehypeImages] }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: false,
    },
  },
});
