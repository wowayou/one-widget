# Changelog

版本策略见 [README 的「升级与版本策略」](README.md#升级与版本策略)。每条变更都标注**调用方是否需要改配置**，升级时只读这一列即可。

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
