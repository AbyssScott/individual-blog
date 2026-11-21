import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  // Before deployment, update this to your GitHub Pages URL or custom domain.
  site: 'https://abyssscott.github.io',
  // Publish from a separate individual-blog repository, not the existing MyST website.
  base: '/individual-blog',
  trailingSlash: 'always',
  output: 'static',
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
  },
});
