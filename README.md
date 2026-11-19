# 东问西问 · XW GEO 课件库

线上地址：<https://zxw0814.github.io/dongwenxiwen/>

静态站点，可直接部署到 Cloudflare Pages / GitHub Pages / 任意静态托管。

- 首页：`index.html`（登录 → 封面 → 课件库）
- 章节课件：`chapters/ch01.html` — `ch12.html`（单文件、离线可用）
- 数据：`data.js`
- 依赖：`vendor/`（Three.js、GLTFLoader、GSAP，均本地内联/本地文件）
- Cloudflare 配置：`_headers`、`robots.txt`、`404.html`

## 本地预览

```bash
python3 -m http.server 8080
# 打开 http://localhost:8080
```

## 部署到 Cloudflare Pages

见仓库外的 `DEPLOY_CLOUDFLARE.md`，或按下面设置：

- Framework preset: None
- Build command: 留空
- Build output directory: `/`
- Production branch: `main`

## 说明

访问验证是客户端门禁（用户名/密码哈希在 `app.js`），仅用于课堂访问控制；需要更强保护请在 Cloudflare 上启用 Access。
