# 架构与扩展边界

## 目标

V1 首先解决 Eigentime 的真实场景：Astro 静态构建、中英文 `/support/`、爱发电外链、项目来源白名单和 GTM/GA4 点击事件。与此同时，不让支付平台、博客样式或 Astro 生命周期进入核心数据模型。

## 分层

```text
PromotionItem[] / JSON / CMS
            │
            ▼
  model.js：校验、URL 规范化、默认值
            │
            ▼
registry.js + icons.js：平台推断与可信 SVG path registry
            │
            ▼
 render.js：转义并输出语义化静态 HTML
            │
     ┌──────┴─────────┐
     ▼                ▼
Astro adapter     future adapters
     │
     ▼
tracking.js：可选的来源归因与事件增强
```

核心原则是“静态 HTML 是产品，JavaScript 是增强”。`tracking.js` 加载失败时，链接仍然可见、可聚焦、可点击；损失的只是分析归因。

## 稳定边界

计划保持稳定的公开概念：

- `PromotionItem`：有序条目模型；
- `kind` 与 `platform` 分离；
- `renderPromotionLinks()`：框架无关的安全 HTML renderer；
- 局部 platform/icon registry；
- `one-widget:click` 事件及其 `item_id`、`kind`、`platform`、`source_project` 字段；
- `--one-*` CSS token。

这些契约由 `test/contract.test.js` 断言锁定，不依赖人工记得；消费方不应该为了升级而重写配置，因此新能力只能以可选字段 + 保留旧默认值的形式加入。

短期不承诺稳定的部分：

- 内建平台清单；
- 中性内建图标的具体轮廓；
- 各框架 adapter 的文件组织。

这避免每增加一个平台都扩张核心类型，也避免把 `githubUrl`、`patreonUrl` 一类字段永久写入 API。

## 失败策略

配置错误在构建期抛出异常，而不是悄悄隐藏：

- ID 重复或格式不合法；
- URL 不是绝对地址、协议不安全、含内嵌凭据，或 `mailto:` 没有收件人；
- `kind`、`appearance`、`emphasis`、layout、theme 不属于支持值；
- 布尔字段或数值字段类型错误；
- `eventName` 为空串或纯空白；
- 自定义图标缺少 `viewBox` 或 path；
- `platforms` / `icons` 不是对象或 `Map`，`registry` / `iconRegistry` 不是 `Map`。

`null` 可选字段视为未设置，因为这是 JSON / CMS 表达“没填”的常见方式，而不是配置错误。

只有两类情况使用可预期的 fallback：未知平台使用 `custom` 语义；找不到图标 key 时使用中性的 link 图标。前者保证新平台无需升级包，后者保证图标配置错误不会让链接本身消失。

新增校验只针对此前就会静默出错的输入，已能正常渲染的配置升级后不会开始报错，这是“升级不需要重新配置”的一部分。

客户端增强相反，永远不抛错：缺少 DOM 全局对象时直接跳过，`one-widget:click` 派发与 `dataLayer` 推送各自 `try/catch`，单个 widget 失败不影响同页其它 widget。它丢失的只是归因，不能影响链接本身。

## 安全边界

- 所有 label、class、URL、data attribute 与 SVG path 属性都会 HTML 转义；
- URL 协议仅允许 `http:`、`https:`、`mailto:`；
- 新窗口固定加入 `rel="noopener noreferrer"`；
- 自定义图标不是 raw HTML 插槽；
- 查询参数只用于低基数 allowlist 归因，不转发到付款平台；
- 默认事件不采集用户身份、金额、订单或付款结果。

## 后续 adapter 的实现条件

React/Vue/Svelte adapter 应消费同一组 `normalizePromotionItems()` 结果与 CSS class，而不是复制平台推断规则。只有在出现真实的客户端动态增删需求后，才增加 Web Component；否则它会让静态站点为一次构建期渲染承担不必要的运行时生命周期。
