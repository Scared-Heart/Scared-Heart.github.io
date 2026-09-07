export function searchPosts(posts, query) {
  const terms = query.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return posts
    .map((post) => {
      const title = post.title.normalize('NFKC').toLocaleLowerCase();
      const tags = [...post.categories, ...post.tags]
        .join(' ')
        .normalize('NFKC')
        .toLocaleLowerCase();
      const description = post.description.normalize('NFKC').toLocaleLowerCase();
      const body = post.body.normalize('NFKC').toLocaleLowerCase();
      const fields = `${title} ${tags} ${description} ${body}`;
      if (!terms.every((term) => fields.includes(term))) return null;
      const score = terms.reduce(
        (total, term) =>
          total +
          (title.includes(term) ? 8 : 0) +
          (tags.includes(term) ? 4 : 0) +
          (description.includes(term) ? 2 : 0),
        0,
      );
      return { post, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || b.post.date.localeCompare(a.post.date))
    .map((item) => item.post);
}
