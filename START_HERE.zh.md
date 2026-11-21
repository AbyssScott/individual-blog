# Xiang's Blog：私人开发阶段

仓库：`AbyssScott/individual-blog`（Private）。**此阶段只保存和调试代码，不公开网站。**

## 现状

- 旧仓库 `AbyssScott/abyssscott.github.io` 不受影响。
- 新博客名称：Xiang's Blog，技术框架：Astro。
- 主题：浅色蓝白，深色纯黑。
- 中文与英文首页、归档、标签、搜索和 RSS 分离。
- 中文原创，英文版本由站长自行翻译。无自动翻译功能。
- 示例文章均为草稿，`draft: true`。
- GitHub Pages 尚未启用；发布工作流为 `deployment/deploy.yml.template`，不会执行。

## 本地测试

需要 Node.js 24。在项目根目录运行：

```bash
npm install
npm run validate
npm run check
npm run build
npm run dev
```

Pagefind 的全文检索文件由 `npm run build` 在 `dist/pagefind/` 下生成。

## 发表新文章

中文文章：`src/content/posts/zh/my-article.md`；英文翻译：`src/content/posts/en/my-article.md`。
两种语言的版本需要同一个 `translationKey`。暂时不想公开的文章设置 `draft: true`；网站公开后再设置 `draft: false`。

## 评论区

Giscus 需要 GitHub Discussions 和 giscus.app 配置。由于你不打算现在公开网站，先不启用评论服务。

## 未来正式发布

**必须等你明确同意。** 届时启用或修改部署工作流，确认 GitHub Pages 的访问可见性，完成构建、搜索与评论区验证，才正式上线。

注意：**Private GitHub 仓库不能保证 GitHub Pages 也仅本人可见**。因此私人开发阶段不要打开 Pages。
