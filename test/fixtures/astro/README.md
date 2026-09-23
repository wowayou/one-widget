# Astro integration fixture

这个最小站点验证包导出的 `.astro` 组件能够被真实 Astro 构建，并检查 CSS 与客户端追踪增强是否进入最终静态 HTML。

```bash
npm install
npm run build
```

它不是发布内容；`node_modules`、`.astro`、`dist` 与 fixture 自己生成的 lockfile 均被根目录 `.gitignore` 排除。
