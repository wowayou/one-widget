# Eigentime 接入说明

## 已对齐的现状

`personal-blog` 当前是 Astro 7 静态站点。中英文支持页共用 `src/pages/[lang]/support.astro`，付款平台与来源白名单来自根目录 `support.config.json`：

```json
{
  "platform": "afdian",
  "url": "https://afdian.com/a/eigentime",
  "sources": ["time-logger", "one-stop-job", "blog", "github"]
}
```

现有页面的公开契约需要继续保留：

- `/zh/support/` 与 `/en/support/` 在没有 JavaScript 时可用；
- CTA 的 URL 与 `platform` 分析字段来自同一份配置；
- `?from=` 只接受 allowlist，缺省为 `direct`，未知值为 `other`；
- 点击推送 `support_click`；
- 页面文案、免责声明和爱发电认证身份链不由组件接管。

## 最小改动接入

安装固定版本后，在 `support.astro` 的 frontmatter 增加：

```astro
import PromotionLinks from "@eigentime/one-widget/astro";

const supportItems = [
  {
    id: supportPlatform,
    kind: "support",
    platform: supportPlatform,
    url: supportUrl,
    label: copy.cta,
    // CTA 文案里已有 ❤️，关掉组件图标，避免一个按钮出现两个心形。
    icon: false,
    appearance: "button",
    emphasis: "primary",
    order: 10
  }
];
```

把原来的单个 `<a id="support-cta">`、`#support-sources` JSON script 和页面底部整段归因脚本替换为：

```astro
<PromotionLinks
  items={supportItems}
  ariaLabel={lang === "zh" ? "支持 Eigentime" : "Support Eigentime"}
  tracking={{
    sourceParam: "from",
    allowedSources: supportConfig.sources,
    defaultSource: "direct",
    unknownSource: "other",
    eventName: "support_click"
  }}
/>
```

`copy.ctaNote`、边界说明、身份表格和签名保持原样。原文件中 `.support-cta` 的样式可删除；`.support-cta-block` 与 `.support-cta-note` 仍由页面拥有，因为它们属于 support 页布局，不属于通用链接组件。

## 组件不负责的一致性

配置能改的只有链接、`platform` 归因字段和事件名；页面叙述仍由博客拥有。切换付款平台或新增链接时需要人工过一遍：

1. **文案**：正文、`copy.ctaNote`、免责声明、身份表格里写死的「爱发电」需要同步改，组件不会提示不一致。
2. **图标**：CTA 文案自带 ❤️ 时用 `icon: false`；改成不带 emoji 的文案时再决定是否放开组件图标。二选一，不要同时出现。
3. **统计语义**：同一个 widget 里新增「查看源码」这类非支持链接时，必须给它单独的 `eventName`（例如 `source_click`），否则它会和 CTA 共用 `support_click`，把浏览行为混进支持转化。`kind`、`platform`、`item_id` 会作为事件参数一并上报，可用于进一步拆分。
4. **认证身份链**：爱发电认证页、收款主体说明属于合规内容，切平台时必须重新确认，不随配置自动变化。

```js
// 支持 CTA 与源码链接共存时的事件名拆分
const items = [
  { id: "afdian", kind: "support", url: supportUrl, label: copy.cta, icon: false, order: 10 },
  { id: "repo", kind: "repository", url: repoUrl, label: copy.source, eventName: "source_click", order: 20 }
];
```

## 升级策略

目标是升级不需要重新配置：

- 安装方式二选一：`#v0.1.0` 完全锁定，或 `#semver:^0.1.0` 自动跟随 `0.1.x` 补丁（`npm update` 生效，lockfile 仍可复现）。破坏性变更只会出现在 `0.2.0`，不会自动到达博客。
- 组件仓库的 `npm run check` 里有契约测试，锁定静态结构、`one-widget__*` class、归因 `data-*`、`one-widget:click` 与 `dataLayer` 字段、`--one-*` token 和包导出入口。上游破坏这些会在组件仓库失败，而不是等博客构建时才暴露。
- 升级时只需读 [CHANGELOG.md](../CHANGELOG.md) 里「需要改配置：是/否」一行；标注为否时，直接跑下面的验收清单即可。

## 为什么不直接改博客仓库

本仓库是独立组件的实现源，博客仓库只是适配目标。组件在这里先完成测试和版本化，再由博客以固定 tag 消费，能避免两边复制实现，也不会让一次组件开发顺带触碰博客的发布、内容锁或生产部署流程。

## 验收清单

接入博客后在 `personal-blog` 仓库执行：

```bash
npm run check
npm run build
npm run test:ui
```

手动确认：

1. `/zh/support/` 与 `/en/support/` 的 CTA 文案自然且 URL 正确；
2. 禁用 JavaScript 后 CTA 仍能打开爱发电；
3. `?from=one-stop-job` 点击事件的 `source_project` 为 `one-stop-job`；
4. `?from=not-allowed` 归为 `other`，无参数归为 `direct`；
5. 浅色、深色、390px 和桌面宽度无溢出；
6. 键盘 Tab 有清晰 focus ring，触控区域至少 44px 高；
7. GTM 未加载时点击不报错，加载时 `dataLayer` 中出现 `support_click`；若页面同时放了非支持链接，确认它上报的是自己的事件名而不是 `support_click`。
