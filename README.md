# Xiang's Blog

A personal, bilingual (Chinese/English) Astro blog. The Chinese and English sections display posts separately; translations are authored manually.

## Current status: Private development

**This repository is private, and the blog has NOT been published.** The GitHub Pages deployment workflow is deliberately disabled at `deployment/deploy.yml.template`. Do not enable GitHub Pages or change the repository to public until the owner explicitly chooses to publish.

## Design and features

- Blue-and-white light theme; pure black dark theme
- Independent Chinese and English home pages, tags, and archives
- Linked translations using `translationKey` (no automatic translation)
- Markdown and KaTeX mathematics
- Responsive layout, bilingual RSS, Pagefind search, Giscus integration (requires setup)

## Develop locally

Requires Node.js 24 (recommended):

```bash
npm install
npm run validate
npm run check
npm run build
npm run dev
```

Demo posts in `src/content/posts/` are drafts (`draft: true`) and do not appear as published posts.

See [`GETTING_STARTED.zh.md`](GETTING_STARTED.zh.md) for content authoring instructions. Deployment to GitHub Pages must be explicitly enabled **after** the site is ready to be public.
