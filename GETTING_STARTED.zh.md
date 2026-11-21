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


## 在 Private 仓库中预览真实网站（无需公开）

网站目前只在 GitHub Actions 中构建，**不启用 GitHub Pages**。你可以下载私人预览包，在自己电脑浏览：

1. 打开 GitHub 仓库 → **Actions** → **Validate and package private Astro preview (no publishing)**。
2. 打开最新一次状态为绿色 **Success** 的运行记录。
3. 在页面最下面的 **Artifacts** 找到并下载 **xiangs-blog-private-preview**。
4. 解压整个 ZIP，保持 \`individual-blog\` 文件夹和启动脚本在同一级目录。
5. **Windows：**双击 \`START_PRIVATE_PREVIEW.bat\`，浏览器将打开中文首页。需要电脑安装 Python 3。
6. **macOS/Linux：**在解压后的目录运行 \`python3 private-preview-server.py\`。
7. 也可以在浏览器的页面顶部切换到英文、浅色/深色模式，检查归档、公式、全文搜索。关闭终端窗口即停止本地预览。

启动器只监听 \`127.0.0.1\`（本机），不会将网站上传到服务器。预览包包含标注为草稿的演示文章，方便检查文章页、双语译文切换和搜索；一般构建仍会过滤这些草稿。**不要把该 ZIP 分享给不希望看到私人内容的人。**

预览包是每次提交自动生成的 GitHub Actions artifact，保留 7 天。评论区 Giscus 仍未正式启用，因此在私人预览中不会出现真实评论。将来上线前，还应重新检查文章、隐私内容和部署设置。
