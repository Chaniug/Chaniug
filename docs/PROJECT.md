# Chaniug 个人主页 — 项目文档

> **当前版本：2026 编辑式 Bento 改版（2026-11-12）**
> 旧版深色科技风页面已存档为 `index.legacy.html`；旧 CSS 模块与压缩脚本保留在仓库中，但**新页面不再引用**。

---

## 1. 概览

| 属性 | 值 |
|------|-----|
| 类型 | 纯静态单页网站，零框架、零运行时依赖 |
| 设计方向 | 编辑式排版 + Bento Grid + 暖白 / 墨黑双主题 |
| 强调色 | 珊瑚朱红 `#e8543f`（浅色）/ `#ff6b4f`（深色） |
| 字体 | Instrument Serif（英文衬线）+ Inter / 系统中文字体 |
| 部署 | GitHub Pages，`.github/workflows/jekyll-gh-pages.yml` |
| 许可证 | MIT |

---

## 2. 当前生效的文件

```
index.html              页面结构 + 全部文案 + 内联签名 SVG
css/app.css             唯一生效的样式表（设计令牌 / 双主题 / Bento / 响应式）
js/app.js               唯一生效的脚本（主题 / 签名 / 揭示 / 进度 / 导航 / 弹窗）
img/projects/*.webp     4 张项目封面（AI 生成，已裁除水印，每张 12–51 KB）
img/og-card.png         1200×630 社交分享卡
media/inspiration.mp4   5 秒静音循环装饰视频（142 KB，960×548，H.264，已去音轨 + faststart）
img/valkjin.svg         签名源文件（已内联进 index.html）
img/avatar.webp         头像 / apple-touch-icon
data/modals.json        旧版弹窗数据，新页面未使用
index.legacy.html       2025 深色科技风旧版存档，可随时回滚
```

旧版链路 `css/modules/*` → `css/personal.css` → `css/personal.min.css`、`js/personal.min.js` 仍保留，仅作历史参考。CI 里的 `npm run build:css` 仍会生成旧样式，不影响新页面。

---

## 3. 设计系统要点

- **令牌集中在 `css/app.css` 的 `:root` 与 `:root[data-theme="dark"]`**：颜色、阴影、圆角、字体、间距、容器宽度。
- **主题切换**：`localStorage` 持久化，首次访问跟随 `prefers-color-scheme`；支持 View Transitions，尊重 `prefers-reduced-motion`。
- **版式**：`clamp()` 流式字号、12 列 Bento Grid、`container-type: inline-size` 卡片容器查询、`text-wrap: balance`。
- **动效克制**：入场只用独立 `translate` 属性做 14px 位移，内容始终可见；卡片 hover 用 `transform` 微位移，两者互不冲突。
- **可访问性**：skip link、语义标签、`focus-visible`、`aria-*`、原生 `<dialog>`、对比度 ≥ 4.5:1、reduced-motion 与 print 样式。
- **SEO**：canonical、JSON-LD Person、OG/Twitter 大图、静态可见的项目文案（不依赖运行时 API 或图片）。

---

## 4. 内容与隐私约定

- Projects 区的项目名、描述、语言、star 均取自 `github.com/Chaniug` 公开仓库，静态写入 HTML，**不依赖 GitHub API 运行时请求**（避免限流与空白卡片）。
- 数字区（14 仓库 / 2,000+ 公开提交 / 6 个活跃 / 2018 起）为 2026-11 用 `gh api` 核对的结果：`search/commits?q=author:Chaniug` = 2049，非 fork 仓库本人贡献合计 1949，两者交叉印证，页面取 2,000+ 的量级表述。**fork 仓库的提交属于上游作者，不得计入**（全部仓库 contributors 简单相加会得到虚高的 3428）。改动时需重新核对。
- **页面不含城市、公司、任职信息、微信、QQ 等私人信息**；联系方式只保留 README 里已公开的 GitHub / X / Telegram / 邮箱。JSON-LD 同样不含 location / worksFor。
- **Off duty 板块（04）**：王者荣耀多赛季百星王者、王者营地稷下学社认证作者、公开笔名「车神不开车」、6 万+ 读者，以及阅读引文、音乐偏好与写作习惯。只写公开笔名与认证身份，**不放游戏账号、公众号名称与任何外链**；「国际局势」仅作中性兴趣描述，不展开立场。
- 隐藏彩蛋（页脚 `※`）保留旧版疼痛文学文案，用原生 `<dialog>` 呈现。

---

## 5. 交互清单（js/app.js）

| 功能 | 说明 |
|------|------|
| 主题切换 | 深浅切换 + 持久化 + 同步 `theme-color` 与签名渐变 |
| 动态签名 | 内联 SVG，逐条 path 用 mask + `stroke-dashoffset` 描绘；渐变随主题变化 |
| 入场位移 | IntersectionObserver 加 `.is-in`，只改变 `translate` |
| 滚动进度 | 顶部 2px 进度条，`requestAnimationFrame` 节流 |
| 导航高亮 | IntersectionObserver 设置 `aria-current` |
| 移动端菜单 | 汉堡按钮 + `aria-expanded`，点链接或 ESC 收起 |
| 复制邮箱 | Clipboard API，失败回退 `execCommand`，带 toast |
| 彩蛋弹窗 | `dialog.showModal()`，ESC / 点遮罩 / 关闭按钮均可退出 |

---

## 6. 维护指南

| 想改什么 | 改哪里 |
|----------|--------|
| 文案、项目、导航、SEO | `index.html` |
| 配色、圆角、间距、断点 | `css/app.css` 顶部令牌与响应式区块 |
| 项目封面 | 替换 `img/projects/*.webp`（建议 1200px 宽、3:2、WebP） |
| 签名图形 | 改 `img/valkjin.svg` 后，重新内联进 `index.html` 的 `.signature-inner` |
| 分享卡 | 重新生成 `img/og-card.png`（1200×630） |
| 主题 / 交互 | `js/app.js` |

**验证方式**：本地直接打开 `index.html`，或 `python -m http.server 8080` 后访问。无需构建步骤。

---

## 7. 部署

推送 `main` 后 GitHub Actions 自动构建 CSS 并部署到 Pages。新页面只依赖 `index.html`、`css/app.css`、`js/app.js` 与本地图片，构建产物不参与渲染，因此部署失败风险低。每日 `snake.yml` 仍向 `output` 分支写入贡献动画 SVG，与新页面相互独立。
