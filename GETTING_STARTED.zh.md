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
4. 解压整个 ZIP，保持 `individual-blog` 文件夹和启动脚本在同一级目录。
5. **Windows：**双击 `START_PRIVATE_PREVIEW.bat`，浏览器将打开中文首页。无需安装 Python 或 Node.js，使用 Windows 自带的 PowerShell。
6. **macOS/Linux：**在解压后的目录运行 `python3 private-preview-server.py`。
7. 也可以在浏览器的页面顶部切换到英文、浅色/深色模式，检查归档、公式、全文搜索。关闭终端窗口即停止本地预览。

Windows 和 macOS/Linux 启动器都只监听 `127.0.0.1`（本机），不会将网站上传到服务器。预览包包含标注为草稿的演示文章，方便检查文章页、双语译文切换和搜索；一般构建仍会过滤这些草稿。**不要把该 ZIP 分享给不希望看到私人内容的人。**

预览包是每次提交自动生成的 GitHub Actions artifact，保留 7 天。评论区 Giscus 仍未正式启用，因此在私人预览中不会出现真实评论。将来上线前，还应重新检查文章、隐私内容和部署设置。

## 从中文开始写一篇新文章

不用修改 Astro 页面代码。直接使用 GitHub 网页编辑器：

1. 打开仓库根目录 `templates/zh-post.md`，复制全文。
2. 进入 `src/content/posts/zh/`，点 **Add file → Create new file**。
3. 文件名用不含空格的英文短名称，例如 `my-first-post.md`，粘贴模板并替换正文。
4. 修改 `title`、`date`（实际日期，格式 `YYYY-MM-DD`）、`translationKey`（独特的英文短标识）以及 `tags`。`description` 可以完全不写。
5. 保持 `draft: true`，点 **Commit changes**。文章只在 Private Actions 预览包中显示，普通构建不会显示草稿。
6. 在 Actions 下载最新的 `xiangs-blog-private-preview`，检查文章、脚注、公式和手机排版。

英文版由你自己翻译完成后再添加：复制 `templates/en-post.md` 到 `src/content/posts/en/`，两种语言使用相同的 `translationKey`，但标题、标签和发布日期可以不同。英文稿也先保持 `draft: true`。

## Markdown 排版

- 段落之间空一行，用 `##` 和 `###` 设置小标题。
- 脚注：正文中写 `[^note]`，文末写 `[^note]: 脚注内容`。
- 引用：行首写 `>`，正式引用请核对并注明原始来源。
- 数学公式：行内 `$...$`，独立 `$$...$$`，由 KaTeX 渲染。
- 表格：使用 Markdown 表格语法，窄屏时可以横向滚动。
- 图片：把图片放在 `public/images/`，正文中引用 `![图片说明](/individual-blog/images/filename.png)`。将来更换域名或部署路径时需要复核图片地址。

根目录 `templates/` 的文件只是写作模板，不会被当作正式文章。即使目前仓库为 Private，将来启用公开发布前也必须逐篇审核 `draft` 状态和隐私内容。
