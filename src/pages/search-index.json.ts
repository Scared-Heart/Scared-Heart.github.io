import { getPosts, excerpt, formatDate, postUrl } from '../lib/posts';
export async function GET() {
  return new Response(
    JSON.stringify(
      (await getPosts()).map((post) => ({
        title: post.data.title,
        url: postUrl(post.id),
        description: excerpt(post),
        date: formatDate(post.data.date),
        categories: post.data.categories,
        tags: post.data.tags,
        body: post.body || '',
      })),
    ),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  );
}
