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
7. GTM 未加载时点击不报错，加载时 `dataLayer` 中出现 `support_click`。
