# Astro integration fixture

这个最小站点验证包导出的 `.astro` 组件能够被真实 Astro 构建,并断言 CSS 与客户端追踪增强进入了最终静态 HTML。

```bash
npm install
npm run verify        # astro build + verify.mjs 断言（默认 astro ^7）
npm run verify:astro5 # 换装 peerDependencies 里声明的其余大版本再跑
npm run verify:astro6
```

`npm run build` 只做构建;`npm run verify` 会在构建后运行 `verify.mjs`,检查静态 HTML 里的归因 `data-*` 属性、组件 CSS 以及客户端追踪增强是否都进入了产物。`verify:astro5/6/7` 用 `npm install --no-save` 临时换装对应大版本,不会改动 fixture 的 `package.json`。

它不是发布内容；`node_modules`、`.astro`、`dist` 与 fixture 自己生成的 lockfile 均被根目录 `.gitignore` 排除。
