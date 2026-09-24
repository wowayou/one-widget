import test from "node:test";
import assert from "node:assert/strict";
import {
  createPlatformRegistry,
  createIconRegistry,
  inferPlatform,
  normalizePromotionItems,
  normalizeUrl,
  registerPlatform,
  renderableItems
} from "../src/index.js";

test("infers built-in platforms without overriding explicit semantics", () => {
  const [item] = normalizePromotionItems([
    {
      id: "repo",
      kind: "social",
      url: "https://github.com/wowayou/personal-blog",
      label: "Follow on GitHub"
    }
  ]);

  assert.equal(item.platform, "github");
  assert.equal(item.kind, "social");
  assert.equal(item.icon, "code");
});

test("filters disabled items and performs a stable order sort", () => {
  const input = [
    { id: "b", url: "https://example.com/b", label: "B", order: 10 },
    { id: "hidden", url: "https://example.com/x", label: "X", order: 0, enabled: false },
    { id: "a", url: "https://example.com/a", label: "A", order: 10 }
  ];
  const result = renderableItems(input);

  assert.deepEqual(result.map((item) => item.id), ["b", "a"]);
  assert.equal(input[0].platform, undefined, "input objects must not be mutated");
});

test("supports local custom platform registries", () => {
  const base = createPlatformRegistry();
  const extended = registerPlatform(base, "forgejo", {
    defaultKind: "repository",
    defaultLabel: "Forgejo",
    icon: "code",
    hosts: ["code.example.org"]
  });

  assert.equal(inferPlatform("https://code.example.org/team/repo", extended), "forgejo");
  assert.equal(inferPlatform("https://code.example.org/team/repo", base), undefined);
});

test("prefers the most specific host over a broader built-in match", () => {
  const registry = registerPlatform(createPlatformRegistry(), "gist", {
    defaultKind: "repository",
    defaultLabel: "GitHub Gist",
    icon: "code",
    hosts: ["gist.github.com"]
  });

  // gist.github.com is a subdomain suffix-match for the built-in github.com,
  // but the exact custom host must win.
  assert.equal(inferPlatform("https://gist.github.com/user/abc123", registry), "gist");
  assert.equal(inferPlatform("https://github.com/user/repo", registry), "github");
});

test("lets a custom platform claim a host a built-in already covers", () => {
  const registry = createPlatformRegistry({
    myhub: { defaultKind: "repository", defaultLabel: "MyHub", hosts: ["github.com"] }
  });

  // Equal specificity: the explicitly registered platform is the more recent
  // intent, so it must win over the built-in of the same host.
  assert.equal(inferPlatform("https://github.com/user/repo", registry), "myhub");
  assert.equal(inferPlatform("https://gitlab.com/user/repo", registry), "gitlab");
});

test("rejects unsafe or ambiguous configuration", () => {
  assert.throws(() => normalizeUrl("javascript:alert(1)"), /unsupported protocol/);
  assert.throws(() => normalizeUrl("/relative"), /absolute URL/);
  assert.throws(() => normalizeUrl("https://user:secret@example.com"), /embedded credentials/);
  assert.throws(() => normalizePromotionItems([
    { id: "same", url: "https://example.com", label: "One" },
    { id: "same", url: "https://example.org", label: "Two" }
  ]), /duplicates/);
  assert.throws(() => normalizePromotionItems([
    { id: "bad", url: "https://example.com", label: "Bad", enabled: "yes" }
  ]), /enabled must be a boolean/);
  assert.throws(() => normalizePromotionItems([
    { id: "bad", url: "https://example.com", label: "Bad", eventName: "  " }
  ]), /eventName must be a non-empty string/);
});

test("rejects a non-boolean default openInNewTab option", () => {
  assert.throws(() => normalizePromotionItems([
    { id: "ok", url: "https://example.com", label: "OK" }
  ], { openInNewTab: "no" }), /openInNewTab must be a boolean/);
});

test("matches custom icon keys regardless of case", () => {
  const registry = createIconRegistry({
    Forge: { viewBox: "0 0 24 24", paths: [{ d: "M4 4h16v16H4z" }] }
  });
  assert.ok(registry.has("forge"), "custom icon key should be lowercased");

  const [item] = normalizePromotionItems([
    { id: "forge", url: "https://example.com", label: "Forge", icon: "Forge" }
  ]);
  assert.equal(item.icon, "forge", "item.icon should resolve to the lowercased key");
});
