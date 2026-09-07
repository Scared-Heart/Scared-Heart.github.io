import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { postUrl, isPublished, readingMinutes } from '../src/lib/content-utils.mjs';
import { searchPosts } from '../src/lib/search.mjs';
import { createPost } from '../scripts/new-post.mjs';

test('Hexo article URLs preserve Chinese, parentheses, underscores and case', () => {
  for (const id of [
    'aNormalDay',
    'V2ray快速搭建教程(WSS)',
    '树莓派自动挂载新硬盘',
    'fnos_rootkit_incident_2026',
  ]) {
    assert.equal(decodeURIComponent(postUrl(id)), `/${id}/`);
  }
});

test('drafts and future-dated posts are excluded from all published collections', () => {
  const now = new Date('2026-09-05T00:00:00Z');
  assert.equal(isPublished({ date: '2026-09-04', draft: false }, now), true);
  assert.equal(isPublished({ date: '2026-09-04', draft: true }, now), false);
  assert.equal(isPublished({ date: '2026-09-06', draft: false }, now), false);
  assert.equal(isPublished({ date: 'invalid', draft: false }, now), false);
});

test('Chinese reading time counts characters rather than whitespace-delimited words', () => {
  assert.equal(readingMinutes('中'.repeat(1050)), 3);
  assert.equal(readingMinutes(''), 1);
});

const fixture = [
  {
    title: '服务器维护',
    description: '一般维护',
    body: '处理 fnOS 证书',
    tags: [],
    categories: [],
    date: '2026-09-05',
    url: '/maintenance/',
  },
  {
    title: 'fnOS 排障',
    description: '检查证书',
    body: '',
    tags: ['NAS'],
    categories: [],
    date: '2026-01-01',
    url: '/fnos/',
  },
];
test('search matches Chinese and case-insensitive multiple keywords; prioritizes titles', () => {
  assert.equal(searchPosts(fixture, 'FNOS')[0].url, '/fnos/');
  assert.equal(searchPosts(fixture, 'nas 证书').length, 1);
  assert.equal(searchPosts(fixture, '不存在').length, 0);
  assert.equal(searchPosts(fixture, ' ').length, 0);
});

test('new post creates a draft, prevents path traversal/reserved routes and never overwrites', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'apple-pie-test-'));
  try {
    const file = await createPost({
      title: '测试："文章"',
      slug: 'test-post',
      directory,
      now: new Date('2026-09-04T17:00:00Z'),
    });
    const original = await readFile(file, 'utf8');
    assert.match(original, /draft: true/);
    assert.match(original, /date: 2026-09-05/);
    await assert.rejects(createPost({ title: '替换', slug: 'test-post', directory }), {
      code: 'EEXIST',
    });
    assert.equal(await readFile(file, 'utf8'), original);
    await assert.rejects(createPost({ title: '不允许', slug: '../outside', directory }));
    await assert.rejects(createPost({ title: '不允许', slug: 'about', directory }));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
