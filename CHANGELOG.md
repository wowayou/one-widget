# Changelog

版本策略见 [README 的「升级与版本策略」](README.md#升级与版本策略)。每条变更都标注**调用方是否需要改配置**，升级时只读这一列即可。

## 0.1.2 - 未发布

需要改配置：否。兼容性与健壮性加固，现有 `items` / `tracking` 配置原样可用。只有此前就会静默出错的输入会改为构建期报错（见最后三条）。

行为变化（无需改配置，但升级后数据或输出可能不同）：

- 归因：`?from=` 的值会去掉首尾空白并忽略大小写匹配 allowlist，上报时统一使用配置里的写法。此前 `?from=GitHub`、`?from=blog%20` 会被归为 `other`。
- 归因：中键点击（“在新标签页打开”）现在也会上报。此前浏览器不为中键触发 `click`，这部分访问会漏记；右键不上报。
- 渲染：所有条目都 `enabled: false` 时 `renderPromotionLinks()` 返回空字符串，不再输出一个空的、带名字的 `<nav>` 地标。
- 渲染：`tracking` 的字符串值与 `allowedSources` 会去除首尾空白，allowlist 去重；空白的 `ariaLabel` 回落到默认的 `Project links`。

健壮性：

- 客户端增强在没有 `window` / `document` 的环境（SSR、测试、Worker）里调用不再抛 `ReferenceError`；跨 iframe 的元素按 `nodeType` 识别。
- 点击时 `one-widget:click` 与 `dataLayer` 两条上报互相隔离：页面监听器抛错、或站点把 `dataLayer` 定义成非数组，都不会影响另一条，也不会影响跳转。
- `enhancePromotionWidgets()` 中某个 widget 出错不再中断同页其它 widget 的增强。
- CMS / JSON 导出的 `null` 可选字段按“未设置”处理，不再报类型错误。
- `renderPromotionLinks()` / `normalizePromotionItems()` 接受 `options` 为 `null`；`platforms` / `icons` 除对象外也接受 `Map`。
- 平台 `hosts` 按 `URL#hostname` 的规则规范化：大小写、国际化域名（punycode）、结尾点号、误贴的 `https://…/` 都能匹配；`protocols` 可省略冒号（`"mailto"`）。自定义平台键以大小写不同的方式覆盖内建平台（如 `GitHub`）时替换而不是并存。

兼容性：

- `package.json` 增加 `main`、`types`、`typesVersions` 以及导出的 `default` 条件：TypeScript `moduleResolution: "node10"` 与只认 `default`/`require` 条件的工具也能解析入口和类型。
- 类型：函数参数接受 `readonly` 数组（`as const` 配置可直接传入），`TrackingEnvironment` 从主入口导出。
- 样式：长标签（URL、无空格的中文）自动换行，不再撑破 390px 视口；`inline` 布局的滚动容器不再裁掉焦点环；不支持 `:focus-visible` 的浏览器回落为 `:focus` 焦点环；Windows 高对比度模式下按钮保留系统色边框；读屏专用文本改用 `clip-path`。
- CI：新增 GitHub Actions，在 Node 20 / 22 / 24 上跑 `npm run check`，并用 Astro 5 / 6 / 7 实际构建 fixture。本版已在本地 Astro 5.18.2 / 6.4.8 / 7.3.5 上构建并断言通过。

新增构建期报错（仅针对此前就无法正常工作的配置）：

- `mailto:` 链接没有收件人（`mailto:`、`mailto:?subject=…`）。
- `platforms` / `icons` 传入数组或非对象。此前数组会生成名为 `"0"`、`"1"` 的平台。
- `options.registry` / `options.iconRegistry` 不是 `Map`。此前会在渲染中途抛出含义不明的错误。

## 0.1.1 - 2026-09-24

需要改配置：否。全部为可选新增或修正，现有 `items` / `tracking` 配置不升级也能继续工作。

- 新增：`PromotionItem.eventName` 可覆盖该条目的点击事件名。同一组里混放「支持」与「查看源码」时，给后者单独事件名，避免源码点击被统计成支持转化；不填则继续用 `tracking.eventName`。（两个独立 widget（如支持页与页脚）各自有组级 `eventName`，不需要这个字段。）
- 修正：导出 `./package.json`。此前消费方读取已安装版本号（升级校验、构建信息）会报 `ERR_PACKAGE_PATH_NOT_EXPORTED`。
- 修正：自定义平台声明与内建平台相同的 host（例如自己的 `github.com` 归类）时，显式注册的平台现在会胜出；此前只有更精确的子域才能覆盖内建。
- 新增：契约测试（`test/contract.test.js`）锁定静态结构、`one-widget__*` class、归因 `data-*`、`one-widget:click` 与 `dataLayer` 字段、`--one-*` token、包导出入口，使「升级不需要重新配置」成为 CI 约束而非口头承诺。
- 文档：说明 `label` 自带 emoji 时应设 `icon: false`；补充平台切换的人工审查清单与升级策略。
- 测试：Astro fixture 默认依赖改为 `^7`，并提供 `verify:astro5/6/7` 脚本复现多版本验证；本版已在 Astro 5.18.2 / 7.3.4 / 7.3.5 上构建并断言通过。

## 0.1.0 - 2026-09-24

首个可消费版本。需要改配置：首次接入，见 [docs/eigentime-integration.md](docs/eigentime-integration.md)。

- 静态优先渲染：构建期输出完整 `<nav><ul><a>`，无 JavaScript 也可完成核心动作。
- 数据模型与平台注册分离：`kind` 表业务语义，`platform` 表服务商，支持局部 platform/icon registry 扩展。
- 可选点击归因：`?from=` allowlist 解析、`one-widget:click` 事件与 `dataLayer` 推送。
- 严格输入边界：重复 ID、相对 URL、不安全协议、内嵌凭据、非法枚举与错误布尔值在构建期失败。
- 已在 Astro 5.18.2 / 6.4.8 / 7.3.4 上实际构建并断言通过。
