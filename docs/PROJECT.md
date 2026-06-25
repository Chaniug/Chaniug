# Chaniug 个人主页 — 项目技术文档

> 面向 AI 智能体及开发者，快速理解项目结构、技术栈、构建流程与维护方式。

---

## 1. 项目概览

| 属性 | 值 |
|------|-----|
| **项目名称** | Chaniug（Valkjin 个人主页） |
| **类型** | 纯静态单页网站（SPA） |
| **作者** | Valkjin（GitHub: [Chaniug](https://github.com/Chaniug)） |
| **许可证** | MIT |
| **线上地址** | `https://valk.ccwu.cc/` |
| **部署方式** | GitHub Pages（通过 `.github/workflows/jekyll-gh-pages.yml` 自动部署） |
| **设计风格** | 深色科技风 + 玻璃拟态 + 星空粒子背景 |
| **技术栈** | HTML5 + CSS3 + 原生 JavaScript（无框架） |

---

## 2. 目录结构

```
Chaniug/
├── index.html                    # ★ 唯一 HTML 页面，SPA 入口
├── package.json                  # Node.js 项目配置（仅用于 CSS 构建）
├── README.md                     # GitHub Profile README
├── CNAME                         # 自定义域名：valk.ccwu.cc
├── LICENSE                       # MIT 许可证
├── .nojekyll                     # 禁用 GitHub Pages Jekyll 处理
│
├── css/                          # ★ 样式系统
│   ├── build.js                  # CSS 模块合并脚本（核心构建工具）
│   ├── personal.css              # 合并后的主样式表（自动生成，勿手动编辑）
│   ├── personal.min.css          # 压缩版（生产环境引用）
│   └── modules/                  # ★ CSS 模块源文件（14个，编辑入口）
│       ├── variables.css         # CSS 自定义属性 / 设计令牌
│       ├── reset.css             # CSS Reset + 基础样式
│       ├── animations.css        # 滚动渐显动画
│       ├── layout.css            # 布局 + Canvas 背景 + 纹理叠加 + Footer
│       ├── navigation.css        # 顶部固定导航条
│       ├── hero.css              # Hero 首屏区域
│       ├── signature.css         # SVG 手写签名动画
│       ├── about.css             # About 区域（含轮播 + 折叠卡片）
│       ├── tech-stack.css        # 技术栈卡片 + 技能星图
│       ├── explore.css           # 探索方向 + 创造与分享
│       ├── modal.css             # 技术栈详情弹窗
│       ├── stats.css             # 统计数据展示区
│       ├── contact.css           # 联系方式区域
│       └── responsive.css        # 响应式媒体查询
│
├── js/
│   ├── personal.js               # ★ 所有前端逻辑（IIFE 模式）
│   └── personal.min.js           # 压缩版（生产环境引用）
│
├── img/
│   ├── icons/                    # 技能星座图标（12 个本地 SVG）
│   ├── avatar.jpg / avatar.webp  # 头像（WebP 优先，JPG 回退）
│   ├── 02~04.jpg / 02~04.webp    # About 卡片配图（WebP 优先，JPG 回退）
│   ├── slide1~3.png / slide1~3.webp  # 轮播幻灯片（WebP 优先，PNG 回退）
│   └── valkjin.svg               # 手写签名 SVG
│
├── data/
│   └── modals.json               # 弹窗内容数据（技术栈 + 探索方向）
│
├── docs/
│   └── PROJECT.md                # 项目技术文档
│
└── .github/workflows/
    ├── jekyll-gh-pages.yml       # GitHub Pages 自动部署 CI
    └── snake.yml                 # 每日生成贪吃蛇动画 CI（产物提交到 dist/）
```

---

## 3. HTML 页面结构（index.html）

单页应用，所有区块通过 `<section>` + `id` 组织：

| 序号 | 区块 | 选择器 | 内容描述 |
|------|------|--------|---------|
| 1 | 背景层 | 3 个 `<canvas>` | 星空 `#starfield` + 星云 `#nebula` + 星尘 `#starDust` |
| 2 | 纹理叠加 | `.bg-noise` 等 | SVG 噪点 + 网格 + 扫描线 + 蜂窝纹理 |
| 3 | 导航条 | `#siteNav` | 固定顶部，Logo + 锚点链接 + 汉堡菜单 |
| 4 | Hero | `#hero` | 头像 + SVG 签名 + 技能标签 + 社交链接 |
| 5 | 滚动字幕 | `.marquee-section` | 关键词跑马灯 |
| 6 | About | `#about` | 4 张玻璃卡片（含轮播、折叠卡片） |
| 7 | Skills | `#skills` | 技能星座星图（14 个可拖拽节点） |
| 8 | Stats | `#stats` | 数字计数器 + GitHub 统计图 + 项目卡片 |
| 9 | Contact | `#contact` | 7 个联系方式卡片 |
| 10 | Footer | `.site-footer` | 页脚标语 + 版权 |

---

## 4. CSS 架构

### 4.1 设计令牌（variables.css）

```css
--bg-primary: #0a0a14;        /* 深蓝黑背景 */
--glass-bg: rgba(255,255,255,0.03);  /* 玻璃拟态 */
--accent-blue: #4f8cff;      /* 蓝色强调 */
--accent-purple: #a855f7;    /* 紫色强调 */
--accent-cyan: #22d3ee;      /* 青色强调 */
```

### 4.2 模块化工作流

```
编辑 modules/*.css → npm run build:css → 生成 personal.css
```

- **编辑入口**：`css/modules/` 下的 14 个模块文件
- **构建命令**：`npm run build:css`（单次）或 `npm run dev:css`（监听模式）
- **合并脚本**：`css/build.js` 按固定顺序合并并添加分隔注释
- **压缩**：`npx clean-css-cli` 压缩 CSS、`npx terser` 压缩 JS，生成 `.min` 版本
- **不要直接编辑** `css/personal.css`，它会被构建覆盖

### 4.3 CSS 模块顺序（加载/合并顺序很重要）

1. `variables.css` — 设计令牌，被后续所有模块引用
2. `reset.css` — 基础重置
3. `layout.css` — 全局布局 + Canvas 背景 + 纹理
4. `animations.css` — 通用动画
5. `navigation.css` — 导航
6. `hero.css` — 首屏
7. `signature.css` — 签名动画
8. `about.css` — About 区域
9. `tech-stack.css` — 技术栈
10. `explore.css` — 探索方向
11. `modal.css` — 弹窗
12. `stats.css` — 统计
13. `contact.css` — 联系方式
14. `responsive.css` — 响应式（必须最后）

---

## 5. JavaScript 架构（personal.js）

采用 **IIFE（立即执行函数）** 模式，约 1965 行，无外部依赖。

### 5.1 模块功能清单

| 模块 | 行号区域 | 功能 |
|------|---------|------|
| 工具函数 | 开头 | `debounce()`、设备检测、`prefers-reduced-motion` 检测 |
| Hero Slideshow | ~200-450 | 3 张幻灯片自动轮播（8-9s/张），逐行文字动画，毛玻璃/拼图揭示 |
| About Observer | ~450-500 | IntersectionObserver 控制轮播播放/暂停 |
| Starfield Canvas | ~500-700 | 200 颗星星，三频正弦闪烁，十字星芒，色温变化 |
| Nebula Canvas | ~700-850 | 25 个星云粒子，径向渐变 + 生命值渐隐 |
| Star Dust Canvas | ~850-950 | 120 个微尘粒子，底部升起 + 淡出 |
| Spotlight | ~950-1000 | 鼠标聚光灯（桌面端），60fps 节流 |
| Reveal on Scroll | ~1000-1050 | IntersectionObserver 滚动渐显 |
| Lazy Load | ~1050-1100 | 图片懒加载 |
| Skills Constellation | ~1100-1450 | 14 个技能节点，拖拽 + 大爆炸展开/坍塌 + 连线粒子 |
| Stats Counters | ~1450-1550 | 数字滚动动画（easeOutCubic） |
| Contact Copy | ~1550-1650 | 一键复制 + Toast 提示 |
| Navigation | ~1650-1800 | 滚动高亮 + 指示器 + 汉堡菜单 |
| Glass Card Glow | ~1800-1900 | 卡片鼠标光晕跟随（CSS 变量 `--mouse-x/y`） |

### 5.2 性能优化策略

- 页面不可见时（`visibilitychange`）暂停所有 Canvas 动画
- 移动端减少粒子数量（50%）
- 移动端禁用 `backdrop-filter` 和浮动光球
- Canvas 尺寸限制最大 1920×1080
- `resize` 事件 250ms 防抖
- 尊重系统 `prefers-reduced-motion` 设置

---

## 6. 数据文件

### 6.1 `data/modals.json`

包含两个数据分组，用于弹窗内容：

- **techStack**：`frontend` / `backend` / `infra` 三个技术栈的详细说明（HTML 格式）
- **explore**：`multimodal` / `reasoning` / `explainability` 三个探索方向的详细说明

弹窗 HTML 由 `index.html` 底部的内联脚本动态加载渲染。

---

## 7. 构建与部署

### 7.1 本地开发

```bash
# 安装依赖（仅需 Node.js）
npm install

# CSS 开发（监听模式，自动合并）
npm run dev:css

# CSS 单次构建
npm run build:css
```

### 7.2 部署流程

推送到 `main` 分支后，GitHub Actions 自动部署到 GitHub Pages：

- `.github/workflows/jekyll-gh-pages.yml` — 负责页面部署
- `.github/workflows/snake.yml` — 每日生成贪吃蛇动画 SVG 到 `dist/`

### 7.3 本地预览

直接用浏览器打开 `index.html` 即可（纯静态，无需服务器）。也可使用：

```bash
npx serve .
# 或
python -m http.server 8080
```

---

## 8. 常见修改指南

### 修改样式

1. 编辑 `css/modules/` 下对应的模块文件
2. 运行 `npm run build:css`
3. 刷新浏览器查看效果

### 修改 JavaScript 逻辑

直接编辑 `js/personal.js`，刷新即可。

### 修改弹窗内容

编辑 `data/modals.json`，注意 `details` 字段是 HTML 字符串。

### 添加新图片

放入 `img/` 目录，在 `index.html` 中引用。

### 修改签名 SVG

替换 `img/valkjin.svg`，签名路径动画由 `signature.css` + `personal.js` 驱动。

---

## 9. 兼容性说明

- **桌面端**：Chrome / Firefox / Edge / Safari 最新版（完整效果）
- **移动端**：基本兼容，部分动效降级（减少粒子、禁用 backdrop-filter）
- **辅助功能**：尊重 `prefers-reduced-motion` 系统设置
- **SEO**：配置了 Open Graph / Twitter Card meta 标签

---

## 10. 注意事项

1. **`css/personal.css` 由构建生成**，不要直接编辑，所有修改应在 `css/modules/` 中进行
2. **图片已优化**：轮播图/配图均有 WebP 版本（优先加载）+ 压缩后的 PNG/JPG 回退
3. **生产环境引用 `.min` 版本**：`index.html` 引用 `personal.min.css` 和 `personal.min.js`
4. **无框架依赖**，纯原生 JS + CSS，零运行时开销
5. **Canvas 动画较多**，已做多层性能优化（页面不可见暂停、滚动跳帧、移动端降级、backdrop-filter 滚动降级）
