# one-widget

一个静态优先、无运行时依赖的赞助 / 项目推广链接组件。第一版为 [Eigentime](https://eigentime.org/) 的 Astro 博客设计，同时把数据模型、平台注册、HTML 渲染和点击归因拆开，便于后续增加 React、Vue、Svelte 或 Web Component 适配器。

它只负责把链接可靠地呈现出来并记录点击来源，不处理支付、账号、订单或赞助者数据。

## 为什么这样实现

- **无 JavaScript 也能完成核心动作**：Astro 在构建期输出完整的 `<nav><ul><a>`，不会让赞助入口依赖 hydration。
- **业务语义和平台分离**：`kind: "support"` 表示用途，`platform: "afdian"` 表示服务商。GitHub 仓库也不必被误建模成社交账号。
- **严格输入边界**：重复 ID、相对 URL、`javascript:` URL、无效枚举或错误布尔值会在构建期直接失败。
- **可扩展而不锁死**：内建常见平台推断，但 `platform` 仍允许任意字符串；自建平台和图标通过局部 registry 扩展，不修改全局状态。
- **站点样式优先**：默认会复用 Eigentime 已有的 `--accent`、`--panel`、`--line`、`--font-mono` 等 token；其他站点可覆盖 `--one-*` 变量。

## 在 Astro 中使用

仓库尚未发布到 npm。开发期可以从相邻目录安装：

```bash
npm install ../one-widget
```

发布仓库并打 tag 后，博客可以固定到明确版本，而不是跟随主分支：

```bash
npm install github:wowayou/one-widget#v0.1.0
```

```astro
---
import PromotionLinks from "@eigentime/one-widget/astro";

const items = [
  {
    id: "afdian",
    kind: "support",
    platform: "afdian",
    url: "https://afdian.com/a/eigentime",
    label: "在爱发电支持 Eigentime",
    order: 10
  },
  {
    id: "github",
    kind: "repository",
    url: "https://github.com/wowayou/personal-blog",
    label: "查看博客源码",
    order: 20
  }
];
---

<PromotionLinks
  items={items}
  ariaLabel="支持与项目链接"
  tracking={{
    sourceParam: "from",
    allowedSources: ["blog", "github", "one-stop-job"],
    defaultSource: "direct",
    unknownSource: "other",
    eventName: "support_click"
  }}
/>
```

页面会先输出完整静态链接。很小的客户端增强只负责：

1. 将 `?from=one-stop-job` 解析为允许的 `source_project`；
2. 点击时派发 `one-widget:click` DOM 事件；
3. 若页面使用 GTM，则向 `window.dataLayer` 推送同名分析事件。

未知来源统一归入 `other`，没有参数时归入 `direct`。查询参数不会被拼到付款链接上。

Eigentime 现有 `/zh/support/` 与 `/en/support/` 的具体替换方式见 [docs/eigentime-integration.md](docs/eigentime-integration.md)。

## 不依赖框架的服务端渲染

```js
import { renderPromotionLinks } from "@eigentime/one-widget";

const html = renderPromotionLinks(items, {
  ariaLabel: "Project links",
  layout: "wrap",
  theme: "inherit"
});
```

同时引入样式：

```js
import "@eigentime/one-widget/styles.css";
```

`renderPromotionLinks()` 会转义所有文本与属性，并且只允许 `http:`、`https:` 和 `mailto:` 绝对 URL。

## 数据模型

```ts
interface PromotionItem {
  id: string;
  kind?: "social" | "support" | "repository" | "website" | "email" | "custom";
  platform?: string;
  url: string;
  label: string;
  shortLabel?: string;
  icon?: string | false;
  enabled?: boolean;
  order?: number;
  openInNewTab?: boolean;
  appearance?: "icon" | "chip" | "button";
  emphasis?: "primary" | "secondary" | "quiet";
}
```

- 数组顺序是相同 `order` 时的稳定后备顺序。
- `enabled: false` 会保留配置但不渲染，适合临时下线某个平台。
- 未填 `platform` 时会根据 URL 推断；显式值始终优先。
- 未填 `kind`、`icon`、`appearance`、`emphasis` 时，才从平台注册与业务语义推导默认值。
- `appearance: "icon"` 仍保留 `aria-label` 和屏幕阅读器文本，可点击区域固定不小于 44×44px。

## 扩展平台与图标

扩展不会改写全局 registry；每次渲染可以传入自己的定义：

```js
const platforms = {
  forgejo: {
    defaultKind: "repository",
    defaultLabel: "Forgejo",
    icon: "forge",
    hosts: ["code.example.org"]
  }
};

const icons = {
  forge: {
    viewBox: "0 0 24 24",
    paths: [{ d: "M4 4h16v16H4z" }]
  }
};

renderPromotionLinks(items, { platforms, icons });
```

组件只接收 SVG `viewBox` 与 `<path d>` 数据，不接收任意 SVG/HTML 字符串，减少自定义图标带来的注入面。品牌图标应由调用方在确认商标规范后按需注册；核心包默认使用中性的 heart/code/globe/mail/link 图标。

## 主题与布局

布局支持 `wrap`、`stack`、`inline`，主题支持 `inherit`、`light`、`dark`。常用覆盖变量：

```css
.my-support-links {
  --one-accent: #0d766e;
  --one-accent-contrast: #fff;
  --one-bg: transparent;
  --one-line: color-mix(in srgb, currentColor 24%, transparent);
  --one-radius: 3px;
  --one-gap: 0.75rem;
}
```

## 开发与验证

项目没有安装依赖即可运行核心检查：

```bash
npm run check
npm run pack:check
```

Astro 适配器的真实构建 fixture 需要单独安装其测试依赖：

```bash
cd test/fixtures/astro
npm install
npm run build
```

架构与稳定 API 边界见 [docs/architecture.md](docs/architecture.md)。
