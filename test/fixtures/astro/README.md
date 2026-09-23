# Astro integration fixture

这个最小站点验证包导出的 `.astro` 组件能够被真实 Astro 构建,并断言 CSS 与客户端追踪增强进入了最终静态 HTML。

```bash
npm install
npm run verify   # astro build + verify.mjs 断言
```

`npm run build` 只做构建;`npm run verify` 会在构建后运行 `verify.mjs`,检查静态 HTML 里的归因 `data-*` 属性、组件 CSS 以及客户端追踪增强是否都进入了产物。

它不是发布内容；`node_modules`、`.astro`、`dist` 与 fixture 自己生成的 lockfile 均被根目录 `.gitignore` 排除。
