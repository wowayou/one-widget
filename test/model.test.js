import test from "node:test";
import assert from "node:assert/strict";
import {
  createPlatformRegistry,
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
});
