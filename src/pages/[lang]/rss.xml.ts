import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { config, langs, type Lang } from '../../config';
import { postPath, publishedPosts } from '../../lib/posts';

export function getStaticPaths() { return langs.map((lang) => ({ params: { lang } })); }

export async function GET(context: APIContext) {
  const lang = context.params.lang as Lang;
  const posts = await publishedPosts(lang);
  return rss({
    title: config.name[lang],
    description: config.description[lang],
    site: context.site ?? 'https://abyssscott.github.io',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: postPath(post),
    })),
    customData: `<language>${lang === 'zh' ? 'zh-CN' : 'en'}</language>`,
  });
}
