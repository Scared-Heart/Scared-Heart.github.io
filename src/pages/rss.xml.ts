import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts, postUrl, excerpt } from '../lib/posts';
import { site } from '../config';
export async function GET(context: APIContext) {
  return rss({
    title: `${site.title} · ${site.author}`,
    description: site.description,
    site: context.site!,
    items: (await getPosts()).map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: excerpt(post),
      link: postUrl(post.id),
      categories: post.data.categories,
    })),
    customData: '<language>zh-cn</language>',
  });
}
