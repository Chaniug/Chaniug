# 轮播图优化说明

## 已完成的修改

### 1. HTML 修改（index.html）
- 添加了首张轮播图 `slide1.webp` 的 `<link rel="preload">`，优化首屏加载
- 将三张轮播图的 `<img>` 标签改为 `<picture>` 标签，支持 WebP 格式自动降级

### 2. JS 修改（js/personal.js）
- 更新了懒加载逻辑，支持 `<picture>` 标签内的 `<source data-srcset>` 属性
- 提前 `rootMargin` 到 150px，让 WebP 图片更早开始加载

---

## 待完成：生成 WebP 图片

需要在 `img/` 目录下生成以下文件：
- `slide1.webp`（原图 `slide1.png`，约 1.35 MB）
- `slide2.webp`（原图 `slide2.png`，约 805 KB）
- `slide3.webp`（原图 `slide3.png`，约 1.26 MB）

### 方法一：使用 Python（推荐）

```bash
# 1. 安装 Pillow
pip install Pillow

# 2. 运行转换脚本
python convert-images.py
```

### 方法二：使用 Node.js

```bash
# 1. 安装 sharp
npm install sharp

# 2. 运行转换脚本
node convert-to-webp.js
```

### 方法三：使用在线工具

访问以下任意网站，上传 PNG 后下载 WebP：
- https://tinypng.com/（支持 WebP 输出）
- https://convertio.co/zh/png-webp/
- https://cloudconvert.com/png-to-webp

手动将生成的 `.webp` 文件放入 `img/` 目录即可。

---

## 预期效果

| 图片 | 原大小 | 预期 WebP 大小 | 减少比例 |
|------|---------|----------------|---------|
| slide1.png | 1.35 MB | ~400 KB | ~70% |
| slide2.png | 805 KB | ~250 KB | ~69% |
| slide3.png | 1.26 MB | ~380 KB | ~70% |

首屏轮播图加载时间预计从 3-5 秒降至 1 秒以内。
