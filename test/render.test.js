import test from "node:test";
import assert from "node:assert/strict";
import { renderPromotionLinks, resolveTrackingSource } from "../src/index.js";

test("renders semantic, accessible links with safe new-tab attributes", () => {
  const html = renderPromotionLinks([
    {
      id: "support",
      kind: "support",
      platform: "afdian",
      url: "https://afdian.com/a/eigentime",
      label: "Support Eigentime"
    }
  ], { ariaLabel: "Support links" });

  assert.match(html, /^<nav/);
  assert.match(html, /<ul class="one-widget__list">/);
  assert.match(html, /<span class="one-widget__label">Support Eigentime<\/span>/);
  assert.doesNotMatch(html, /<a[^>]*aria-label=/, "non-icon links get their name from visible text");
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /one-widget__link--primary/);
});

test("escapes labels, classes, and SVG path data", () => {
  const html = renderPromotionLinks([
    {
      id: "safe",
      url: "https://example.com/?a=1&b=2",
      label: "<img src=x onerror=alert(1)>"
    }
  ], {
    className: 'custom" onclick="alert(1)',
    icons: {
      hostile: { viewBox: "0 0 24 24", paths: [{ d: 'M0 0" onload="alert(1)' }] }
    },
    platforms: {
      hostile: { defaultKind: "custom", icon: "hostile", hosts: ["example.com"] }
    }
  });

  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /" onclick=/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /custom&amp;quot;|custom&quot;/);
  assert.doesNotMatch(html, /" onload=/);
  assert.match(html, /&quot; onload=&quot;/);
});

test("renders icon-only items with an accessible name", () => {
  const html = renderPromotionLinks([
    {
      id: "source",
      kind: "repository",
      url: "https://github.com/wowayou/personal-blog",
      label: "View source on GitHub",
      appearance: "icon"
    }
  ]);

  assert.match(html, /aria-label="View source on GitHub"/);
  assert.match(html, /one-widget__label--sr-only/);
  assert.match(html, /title="View source on GitHub"/);
});

test("uses the visible shortLabel as the accessible name in non-icon mode", () => {
  const html = renderPromotionLinks([
    {
      id: "support",
      kind: "support",
      platform: "afdian",
      url: "https://afdian.com/a/eigentime",
      label: "Support Eigentime on Afdian",
      shortLabel: "Sponsor"
    }
  ]);

  // The visible text must carry the accessible name (WCAG 2.5.3), so no
  // aria-label may override "Sponsor" with the longer label.
  assert.match(html, /<span class="one-widget__label">Sponsor<\/span>/);
  assert.doesNotMatch(html, /<a[^>]*aria-label=/);
});

test("resolves allowlisted source attribution", () => {
  const config = {
    allowedSources: ["blog", "one-stop-job"],
    defaultSource: "direct",
    unknownSource: "other"
  };

  assert.equal(resolveTrackingSource("", config), "direct");
  assert.equal(resolveTrackingSource("?from=one-stop-job", config), "one-stop-job");
  assert.equal(resolveTrackingSource("?from=not-allowed", config), "other");
});

test("rejects malformed tracking configuration instead of silently degrading", () => {
  const items = [{ id: "a", url: "https://afdian.com/a/x", label: "Support" }];

  assert.throws(
    () => renderPromotionLinks(items, { tracking: { allowedSources: "blog" } }),
    /allowedSources must be an array/
  );
  assert.throws(
    () => renderPromotionLinks(items, { tracking: { allowedSources: ["blog", 42] } }),
    /allowedSources\[1\] must be a non-empty string/
  );
  assert.throws(
    () => renderPromotionLinks(items, { tracking: { eventName: "" } }),
    /eventName must be a non-empty string/
  );
});
