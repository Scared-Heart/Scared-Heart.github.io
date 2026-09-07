import { readdir, readFile, access } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { load } from 'cheerio';

const root = resolve('dist');
async function files(dir) {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map((entry) =>
        entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)],
      ),
    )
  ).flat();
}
const all = await files(root);
const htmlFiles = all.filter((file) => file.endsWith('.html'));
const pages = new Map();
const problems = [];
const site = 'https://scared-heart.github.io';
for (const file of htmlFiles) pages.set(file, load(await readFile(file, 'utf8')));
let references = 0;
for (const [file, $] of pages) {
  const route = '/' + relative(root, file).replace(/index\.html$/, '');
  assert.equal($('html').attr('lang'), 'zh-CN', `Missing Chinese language: ${route}`);
  assert.equal($('main').length, 1, `Missing main landmark: ${route}`);
  assert.ok($('title').text(), `Missing title: ${route}`);
  assert.ok($('meta[name="description"]').attr('content'), `Missing description: ${route}`);
  for (const element of $('a[href], img[src], script[src], link[href]').toArray()) {
    const raw = $(element).attr('href') || $(element).attr('src');
    if (!raw || /^(mailto:|tel:|data:|javascript:)/i.test(raw)) continue;
    let url;
    try {
      url = new URL(raw, `${site}${route}`);
    } catch {
      problems.push(`${route}: malformed URL ${raw}`);
      continue;
    }
    if (url.origin !== site) continue;
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      problems.push(`${route}: malformed encoding ${raw}`);
      continue;
    }
    const target = join(root, pathname, pathname.endsWith('/') ? 'index.html' : '');
    try {
      await access(target);
    } catch {
      problems.push(`${route}: missing ${raw}`);
      continue;
    }
    references++;
    if (url.hash && pages.has(target)) {
      const id = decodeURIComponent(url.hash.slice(1));
      if (
        !pages
          .get(target)('[id]')
          .toArray()
          .some((el) => pages.get(target)(el).attr('id') === id)
      )
        problems.push(`${route}: missing anchor ${raw}`);
    }
  }
}
const legacy = [
  'aNormalDay',
  'V2ray快速搭建教程(WSS)',
  '树莓派自动挂载新硬盘',
  '修复服务器ssl证书过期',
  'fnos_rootkit_incident_2026',
  'fnos_persistence_backdoor_2026',
];
for (const id of legacy) {
  const $ = pages.get(join(root, id, 'index.html'));
  assert.ok($, `Legacy article missing: ${id}`);
  assert.equal(
    $('#comments').attr('data-giscus-term'),
    `/${id}/`,
    `Unstable comment mapping: ${id}`,
  );
  assert.ok($('.prose').text().trim(), `Missing article content: ${id}`);
}
const index = JSON.parse(await readFile(join(root, 'search-index.json'), 'utf8'));
const feed = load(await readFile(join(root, 'rss.xml'), 'utf8'), { xmlMode: true });
assert.equal(
  feed('item').length,
  index.length,
  'RSS and search index must contain the same published articles',
);
for (const post of index)
  assert.ok(
    pages.has(join(root, decodeURIComponent(post.url), 'index.html')),
    `Search result missing: ${post.url}`,
  );
if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Verified ${pages.size} HTML pages, ${references} local references, ${legacy.length} legacy articles, ${index.length} search/RSS entries and all table-of-contents anchors.`,
  );
