// Consumer contract tests.
//
// These lock the surface a consuming site (the Eigentime blog) actually depends
// on, so that "upgrade without reconfiguring" is enforced here instead of being
// discovered during a downstream build:
//
//   - static markup shape and one-widget__* class names,
//   - attribution data-* attribute names,
//   - one-widget:click / dataLayer field names,
//   - --one-* CSS token names,
//   - package export entry points.
//
// Deliberately not locked: SVG path data, colour values, built-in platform list
// and the full HTML snapshot, all of which are declared unstable in
// docs/architecture.md and must stay free to change.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { enhancePromotionWidget, renderPromotionLinks } from "../src/index.js";
import { MockAnchor, MockElement, makeEnvironment } from "./helpers/mock-dom.js";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

const items = [
  {
    id: "afdian",
    kind: "support",
    platform: "afdian",
    url: "https://afdian.com/a/eigentime",
    label: "Support Eigentime",
    appearance: "button",
    emphasis: "primary",
    order: 10
  },
  {
    id: "repo",
    kind: "repository",
    url: "https://github.com/wowayou/one-widget",
    label: "View source",
    order: 20,
    eventName: "source_click"
  }
];

const tracking = {
  sourceParam: "from",
  allowedSources: ["blog", "one-stop-job"],
  defaultSource: "direct",
  unknownSource: "other",
  eventName: "support_click"
};

test("static markup keeps the documented structure and class names", () => {
  const html = renderPromotionLinks(items, { ariaLabel: "Support Eigentime", tracking });

  assert.match(html, /^<nav class="one-widget"[^>]*>/, "root must stay a <nav class=one-widget>");
  assert.match(html, /<ul class="one-widget__list">/);
  assert.match(html, /<li class="one-widget__item">/);
  assert.match(html, /<a class="one-widget__link one-widget__link--support one-widget__link--button one-widget__link--primary"/);
  assert.match(html, /<span class="one-widget__label">/);
  assert.match(html, /<svg class="one-widget__icon"[^>]*aria-hidden="true"/);

  // Core action must work without JavaScript.
  assert.match(html, /href="https:\/\/afdian\.com\/a\/eigentime"/);
  const externalLinks = html.match(/<a [^>]*target="_blank"[^>]*>/g) ?? [];
  assert.equal(externalLinks.length, 2);
  for (const link of externalLinks) assert.match(link, /rel="noopener noreferrer"/);
});

test("attribution attribute names stay stable", () => {
  const html = renderPromotionLinks(items, { tracking });

  for (const attribute of [
    "data-one-widget",
    "data-layout",
    "data-theme",
    "data-source-param",
    "data-source-allowlist",
    "data-source-default",
    "data-source-unknown",
    "data-event-name"
  ]) {
    assert.ok(html.includes(attribute), `root attribute ${attribute} is part of the contract`);
  }

  for (const attribute of [
    'data-one-item="afdian"',
    'data-kind="support"',
    'data-platform="afdian"',
    'data-source-project="direct"'
  ]) {
    assert.ok(html.includes(attribute), `link attribute ${attribute} is part of the contract`);
  }

  // Server-rendered default keeps attribution usable before the enhancement runs.
  assert.equal((html.match(/data-source-project="direct"/g) ?? []).length, 2);
});

test("click event and dataLayer field names stay stable", () => {
  const anchor = new MockAnchor({
    dataset: { oneItem: "afdian", kind: "support", platform: "afdian" }
  });
  const root = new MockElement({
    dataset: {
      sourceParam: "from",
      sourceAllowlist: JSON.stringify(tracking.allowedSources),
      sourceDefault: "direct",
      sourceUnknown: "other",
      eventName: "support_click"
    },
    children: [anchor]
  });

  const environment = makeEnvironment("?from=blog");
  enhancePromotionWidget(root, environment);
  anchor.dispatchEvent({ type: "click" });

  const clickEvent = root.dispatched.find((event) => event.type === "one-widget:click");
  assert.ok(clickEvent, "one-widget:click is part of the contract");
  assert.deepEqual(
    Object.keys(clickEvent.detail).sort(),
    ["item_id", "kind", "platform", "source_project"],
    "detail fields are part of the contract"
  );
  assert.deepEqual(
    Object.keys(environment.globalObject.dataLayer[0]).sort(),
    ["event", "item_id", "kind", "platform", "source_project"],
    "dataLayer payload fields are part of the contract"
  );
});

test("CSS token names stay stable", () => {
  for (const token of [
    "--one-bg",
    "--one-fg",
    "--one-muted",
    "--one-line",
    "--one-accent",
    "--one-accent-contrast",
    "--one-font",
    "--one-font-ui",
    "--one-radius",
    "--one-gap"
  ]) {
    assert.ok(styles.includes(`${token}:`), `${token} is a documented override point`);
  }
});

test("package export entry points stay stable", () => {
  // ./package.json stays exported so a consuming site can read the installed
  // version (upgrade checks, build banners) without a resolution error.
  assert.deepEqual(
    Object.keys(packageJson.exports).sort(),
    [".", "./astro", "./package.json", "./styles.css", "./tracking"]
  );
});

test("existing configuration keeps working when new optional fields are absent", () => {
  // A consumer pinned to an older config shape must render the same link markup
  // as before; new fields may only add attributes to the items that use them.
  const legacyItems = [{ id: "afdian", kind: "support", platform: "afdian", url: items[0].url, label: items[0].label, appearance: "button", emphasis: "primary" }];
  const html = renderPromotionLinks(legacyItems, { tracking });

  assert.doesNotMatch(html, /<a[^>]*data-event-name=/, "no per-item event name unless configured");
  assert.match(html, /data-event-name="support_click"/, "group event name still drives tracking");
});
