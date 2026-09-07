# apple pie

Breeze Chan 的个人博客，基于 Astro + Giscus，发布到 GitHub Pages。

- 文章：`source/_posts/`，继续使用 Markdown。
- 图片：`static/image/`，页面路径仍是 `/image/...`。
- 页面与组件：`src/pages/`、`src/components/`。
- 外观：`src/styles/`。
- 站点信息与评论配置：`src/config.ts`。

## 本地运行

使用 Node.js 24（`.node-version` 已固定大版本）。

```sh
npm ci
npm run dev
```

打开终端显示的本地地址。生产预览使用 `npm run build` 后的 `npm run preview`。

## 写文章

```sh
npm run new -- "我的 NAS 备份方案" --slug nas-backup
```

生成 `source/_posts/nas-backup.md`。默认是草稿，避免未完成内容意外出现在页面、搜索、RSS 或站点地图中。

```yaml
---
title: '我的 NAS 备份方案'
date: 2026-09-05
description: '一句话说明这篇文章记录了什么。'
categories:
  - 技术笔记
tags:
  - NAS
draft: false
comments: true
---
```

写完将 `draft` 改为 `false`；本地预览确认后，提交并推送到 `main` 即触发自动发布。`--publish` 可以直接生成可发布文章。未来日期的文章也会隐藏，直到该日期到达后的下一次构建；当前没有定时发布任务。

日期统一按 Asia/Shanghai 展示。需要显示更新时间时添加 `updated: YYYY-MM-DD`。不要使用文件修改时间代替文章更新时间。

**文件名就是永久链接。** 新文章建议用简短英文 slug。已发布后可以修改标题，但不要改文件名，否则文章地址和评论关联会变化。

图片放在 `static/image/nas-backup/`，插入：

```md
![备份任务截图](/image/nas-backup/backup.png)
```

构建时自动填入本地文章图片尺寸并启用懒加载；原文件和旧图片地址保留。首页使用自动生成的轻量 WebP 预览图，保留原始横幅供历史链接和分享预览使用。

也可以在 [GitHub 的 main 分支](https://github.com/Scared-Heart/Scared-Heart.github.io/tree/main/source/_posts) 直接新建或编辑 Markdown；上传图片后提交即可触发发布，无需本地部署命令。这是 GitHub 自带的编辑入口，本项目没有另行安装 CMS 后台。

公开仓库中的草稿文件仍可被访问；`draft` 只控制站点是否展示，不是保密机制。

## 首次上线配置

本次迁移保留原站的在线版本。代码需要先提交到 `main`，并完成以下一次性设置：

1. 在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。原配置是从 `gh-pages` 分支发布。
2. 若 `github-pages` environment 设置了部署分支限制，允许 `main`。
3. 在 **Actions → Build and publish blog** 检查运行结果。之后每次推送 `main` 自动运行测试、构建、检查链接，全部成功才发布。

工作流也校验目标为 `main` 的 PR，但不会发布 PR 内容。手动执行工作流时选择 `main`。

远端仓库当前默认分支是 `gh-pages`，本地源码分支是 `main`。建议首次上线时把默认分支改成 `main`，便于网页编辑与在 Actions 界面手动运行工作流；`push main` 自动构建不依赖默认分支，手动触发入口则要求工作流存在于默认分支。

不要使用旧的 `hexo deploy`。`gh-pages` 中原站的提交历史保留，可作为回退依据。需要回退时，可把 Pages Source 恢复为从 `gh-pages` 分支根目录发布。

## 启用 Giscus

仓库的 Discussions 已开启，`src/config.ts` 已填写真实仓库 ID 和 Announcements 分类 ID。上线前还需要用仓库所有者账号在 [Giscus GitHub App](https://github.com/apps/giscus) 安装/配置应用，仅选择 `Scared-Heart.github.io` 仓库。

评论以 `/<原始文章文件名>/` 这一固定字符串严格匹配讨论，因此：

- 修改文章标题不会丢评论。
- 本地预览和线上使用同一关联，域名或 URL 编码形式不会产生重复讨论。
- 首次留言/回应时，由 Giscus 自动创建对应讨论，无需逐篇初始化。
- 读者使用 GitHub 登录；评论可在仓库 Discussions 中管理。
- 在文章头部设置 `comments: false` 可关闭该文章评论。

评论随阅读位置延迟加载并跟随深浅色切换；网络失败时提供 GitHub 讨论区入口。配置中只有公开 ID，不需要也不应放入 GitHub token、OAuth secret。

## 校验

```sh
npm test
npm run build
npm run verify
```

- 单元测试覆盖旧链接编码、草稿与未来日期过滤、中文搜索与阅读时间、新建文章防覆盖。
- `astro check` 执行类型检查。
- 构建校验检查生成页面中的本地链接、图片、目录锚点，6 篇旧文章及评论关联，以及 RSS/搜索一致性。

## 迁移说明

保留 6 篇原文及其日期、分类、标签、URL，图片迁至 `static/` 后 URL 不变。

旧的 `_config.yml`、`scaffolds/`、`source/css/`、`source/js/` 和 `themes/clean` 仅作为 Hexo 历史参考，不参与 Astro 构建；`public/`、`.deploy_git/`、`db.json` 是旧的本地产物，也不会进入新版部署。主题子模块里原有的本地修改没有被覆盖。

本项目没有更改原文中的技术结论；旧文章的发布时间会明确展示。
