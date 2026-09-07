import { getCollection, type CollectionEntry } from 'astro:content';
import { plainText, isPublished } from './content-utils.mjs';
export { readingMinutes, postUrl, taxonomyUrl } from './content-utils.mjs';
export type Post = CollectionEntry<'posts'>;

export async function getPosts() {
  return (await getCollection('posts', ({ data }) => isPublished(data))).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id),
  );
}

export function excerpt(post: Post) {
  return post.data.description || plainText(post.body).slice(0, 120);
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(date);
}

export function groups(posts: Post[], kind: 'categories' | 'tags') {
  const map = new Map<string, Post[]>();
  for (const post of posts) {
    for (const name of post.data[kind]) map.set(name, [...(map.get(name) || []), post]);
  }
  return [...map].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'zh-CN'));
}
