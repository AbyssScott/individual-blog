import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../config';
import { withBase } from './urls';

export type Post = CollectionEntry<'posts'>;

export async function publishedPosts(lang?: Lang): Promise<Post[]> {
  // Drafts are excluded from ordinary builds. Private CI preview can opt in.
  const includeDrafts = import.meta.env.BLOG_PREVIEW_DRAFTS === 'true';
  const all = await getCollection('posts', ({ data }) => includeDrafts || !data.draft);
  return all
    .filter((post) => !lang || post.data.lang === lang)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function postPath(post: Post): string {
  // The content ID is e.g. "zh/a-brief-note", determined from the file path.
  const slug = post.id.split('/').slice(1).join('/');
  return withBase(`/${post.data.lang}/posts/${slug}/`);
}

export function uniqueTags(posts: Post[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  posts.forEach((post) => post.data.tags.forEach((tag) =>
    counts.set(tag, (counts.get(tag) || 0) + 1)));
  return Array.from(counts, ([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function tagPath(lang: Lang, tag: string): string {
  return withBase(`/${lang}/tags/${encodeURIComponent(tag)}/`);
}

export function formatDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  }).format(date);
}
