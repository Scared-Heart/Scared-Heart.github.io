import { resolve, relative, isAbsolute } from 'node:path';
import sharp from 'sharp';

// Reserve space and defer offscreen images in the generated HTML, before JS runs.
export default function rehypeImages() {
  return async (tree) => {
    const images = [];
    function visit(node) {
      if (node.type === 'element' && node.tagName === 'img') images.push(node);
      for (const child of node.children || []) visit(child);
    }
    visit(tree);
    const root = resolve('static');
    await Promise.all(
      images.map(async (node) => {
        node.properties.loading = 'lazy';
        node.properties.decoding = 'async';
        const src = node.properties.src;
        if (typeof src !== 'string' || !src.startsWith('/') || src.startsWith('//')) return;
        const file = resolve(root, '.' + decodeURIComponent(src));
        const path = relative(root, file);
        if (path.startsWith('..') || isAbsolute(path)) return;
        const { width, height } = await sharp(file).metadata();
        node.properties.width ??= width;
        node.properties.height ??= height;
      }),
    );
  };
}
