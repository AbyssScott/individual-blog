# Xiang's Blog：写作和开发指南

目前博客保存在 Private GitHub 仓库中，GitHub Pages 未启用。

## 文章写作

- 中文：在 `src/content/posts/zh/` 新建 `.md` 文件。
- 英文：在 `src/content/posts/en/` 新建 `.md` 文件，手动完成翻译。
- 中英文版本使用相同的 `translationKey`；同一语言不能有重复的关联键。
- 每个版本可以独立修改、独立发布；未翻译时只保留中文版。

Markdown 头部示例：

```yaml
---
title: "文章标题"
description: "可选的一句话摘要"
date: 2026-11-21
lang: zh
translationKey: sample-title
tags: ["随笔"]
draft: true
---
```

若暂无公开意向，建议统一设置 `draft: true`。

## 本地运行

```bash
npm install
npm run validate
npm run check
npm run build
npm run dev
```

正式构建后生成的静态文件位于 `dist/`；不要提交 `dist/` 或 `node_modules/`。

## 公开发布前的检查

GitHub Pages 在私人开发阶段禁止启用。
计划正式发布时，先复核所有文章及隐私内容，验证搜索与 RSS，然后再激活 `deployment/deploy.yml.template`。
Giscus 需要额外的仓库 Discussions 设置和 Giscus 应用配置。
