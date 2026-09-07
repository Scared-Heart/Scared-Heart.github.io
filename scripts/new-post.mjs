import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const reserved = new Set([
  'about',
  'archives',
  'categories',
  'tags',
  'search',
  '404',
  'index',
  'img',
  'image',
  'rss',
  'robots',
  'search-index',
  'sitemap-index',
]);
export async function createPost({
  title,
  slug,
  directory = resolve('source/_posts'),
  publish = false,
  now = new Date(),
}) {
  if (!title?.trim()) throw new Error('请提供文章标题。');
  if (!slug || !/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(slug) || reserved.has(slug)) {
    throw new Error(
      '请用小写英文、数字和连字符指定唯一 slug，例如 nas-backup；不能使用 about 等站点路径。',
    );
  }
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(now);
  const content = `---\ntitle: ${JSON.stringify(title.trim())}\ndate: ${date}\ndescription: ""\ncategories: []\ntags: []\ndraft: ${!publish}\ncomments: true\n---\n\n从这里开始记录。\n`;
  await mkdir(directory, { recursive: true });
  const file = join(directory, `${slug}.md`);
  // Exclusive creation: a repeated command must never overwrite an existing article.
  await writeFile(file, content, { flag: 'wx' });
  return file;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log(
      '用法：npm run new -- "文章标题" --slug my-post [--publish]\n默认创建草稿。写完后将 draft 改为 false，再提交即可发布。',
    );
  } else {
    try {
      const slugIndex = args.indexOf('--slug');
      const file = await createPost({
        title: args[0],
        slug: slugIndex >= 0 ? args[slugIndex + 1] : undefined,
        publish: args.includes('--publish'),
      });
      console.log(
        `已创建：${file}\n${args.includes('--publish') ? '提交后会随站点自动发布。' : '这是草稿，不会出现在公开页面、搜索或 RSS 中。发布前将 draft 改为 false。'}`,
      );
    } catch (error) {
      console.error(
        error.code === 'EEXIST' ? '同名文章已存在，请换一个 slug。原文章未被修改。' : error.message,
      );
      process.exitCode = 1;
    }
  }
}
