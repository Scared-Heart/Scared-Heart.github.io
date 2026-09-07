import sharp from 'sharp';
import { stat, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const input = new URL('../static/img/banner.jpg', import.meta.url);
const output = new URL('../static/img/banner-preview.webp', import.meta.url);
const original = await stat(input);
const generated = await stat(output).catch(() => null);
if (!generated || generated.mtimeMs < original.mtimeMs) {
  await sharp(await readFile(input))
    .rotate()
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(fileURLToPath(output));
}
