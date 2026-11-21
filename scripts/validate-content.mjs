import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
const root = new URL('../src/content/posts/', import.meta.url);
const seen = new Set();
let total = 0;
for (const lang of ['zh','en']) {
  for (const file of await readdir(new URL(`${lang}/`, root))) {
    if (!file.endsWith('.md')) continue;
    const contents = await readFile(new URL(`${lang}/${file}`, root), 'utf8');
    const [, frontmatter] = /^---\s*\n([\s\S]*?)\n---/m.exec(contents) || [];
    if (!frontmatter) throw new Error(`${lang}/${file}: missing YAML frontmatter`);
    const field = (key) => frontmatter.match(new RegExp(`^${key}:\\s*["']?([^\\n"']+)`, 'm'))?.[1]?.trim();
    if (field('lang') !== lang) throw new Error(`${lang}/${file}: lang must be ${lang}`);
    for (const required of ['title', 'description', 'date', 'translationKey']) {
      if (!field(required)) throw new Error(`${lang}/${file}: missing ${required}`);
    }
    const key = `${lang}/${field('translationKey')}`;
    if (seen.has(key)) throw new Error(`Duplicate translationKey in ${lang}: ${key}`);
    seen.add(key);
    total++;
  }
}
console.log(`Verified ${total} Markdown articles and unique language-specific translation keys.`);
