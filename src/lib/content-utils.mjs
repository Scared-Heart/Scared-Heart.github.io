export function plainText(markdown = '') {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[[^\]]*\]\([^\n]*?\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^\n]*?\)/g, '$1')
    .replace(/^[\s>#*\-]+/gm, '')
    .replace(/[*_`~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function readingMinutes(markdown = '') {
  const text = markdown.replace(/```[\s\S]*?```/g, ' ');
  const chinese = (text.match(/[\u3400-\u9fff]/g) || []).length;
  const words = (text.match(/[A-Za-z0-9]+/g) || []).length;
  return Math.max(1, Math.ceil(chinese / 350 + words / 200));
}

export function isPublished(data, now = new Date()) {
  return !data.draft && new Date(data.date).getTime() <= now.getTime();
}

export function postUrl(id) {
  return `/${id.split('/').map(encodeURIComponent).join('/')}/`;
}

export function taxonomyUrl(kind, name) {
  return `/${kind}/${encodeURIComponent(name)}/`;
}
