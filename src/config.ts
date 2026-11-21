export const config = {
  // Same site title in both language versions; interface copy is localized.
  name: { zh: "Xiang's Blog", en: "Xiang's Blog" },
  description: {
    zh: '关于阅读、思考，以及其他值得记录的事情。',
    en: 'Thoughts, reading notes, and whatever else seems worth writing down.',
  },
  footer: { zh: '一个个人博客。', en: 'A personal weblog.' },
} as const;

export type Lang = 'zh' | 'en';
export const langs: Lang[] = ['zh', 'en'];
export const otherLang = (lang: Lang): Lang => (lang === 'zh' ? 'en' : 'zh');

export const text = {
  zh: {
    home: '文章', archive: '归档', tags: '标签', search: '搜索', about: '关于',
    recent: '最近文章', allPosts: '查看全部文章', empty: '这里还没有文章。',
    back: '返回文章列表', older: '更多文章', reading: '阅读文章',
    comments: '讨论', translated: '阅读英文版', missing: '这篇文章暂时没有英文译文。',
    originallyChinese: '中文原文', originallyEnglish: '英文原文',
    searchHint: '搜索中文文章的标题与正文。', searchPlaceholder: '搜索中文文章…',
    searchDev: '搜索索引将在 npm run build 之后生成。',
    giscusPending: '评论区尚未启用。站长需要先设置 GitHub Discussions 和 Giscus。',
    demo: '演示文章：正式发布前请删除或替换。',
  },
  en: {
    home: 'Posts', archive: 'Archive', tags: 'Topics', search: 'Search', about: 'About',
    recent: 'Recent writing', allPosts: 'All posts', empty: 'No posts yet.',
    back: 'Back to posts', older: 'More posts', reading: 'Read post',
    comments: 'Discussion', translated: 'Read in Chinese', missing: 'No Chinese version has been published yet.',
    originallyChinese: 'Originally written in Chinese', originallyEnglish: 'Originally written in English',
    searchHint: 'Search titles and the full text of English posts.', searchPlaceholder: 'Search English posts…',
    searchDev: 'The search index is created by npm run build.',
    giscusPending: 'Comments have not been enabled yet. The owner must configure GitHub Discussions and Giscus.',
    demo: 'Demo article: replace or delete before publishing.',
  },
} as const;
