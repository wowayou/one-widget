import test from "node:test";
import assert from "node:assert/strict";
import { enhancePromotionWidget } from "../src/index.js";

// CustomEvent became a global in newer Node releases; polyfill for older runtimes
// so the mock DOM below can exercise the real dispatchEvent path.
if (typeof globalThis.CustomEvent === "undefined") {
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
      this.bubbles = options.bubbles ?? false;
    }
  };
}

// Minimal DOM stand-ins. enhancePromotionWidget only touches dataset,
// querySelectorAll, add/dispatchEvent and instanceof checks, so we can model
// just those without pulling in a full DOM implementation.
class MockElement {
  constructor({ dataset = {}, children = [] } = {}) {
    this.dataset = { ...dataset };
    this.children = children;
    this.listeners = new Map();
    this.dispatched = [];
  }

  querySelectorAll(selector) {
    if (selector === "[data-one-item]") {
      return this.children.filter((child) => child.dataset.oneItem !== undefined);
    }
    return [];
  }

  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(callback);
  }

  dispatchEvent(event) {
    this.dispatched.push(event);
    for (const callback of this.listeners.get(event.type) ?? []) callback(event);
    return true;
  }
}

class MockAnchor extends MockElement {}

function buildWidget(datasetOverrides = {}) {
  const anchor = new MockAnchor({
    dataset: { oneItem: "afdian", kind: "support", platform: "afdian" }
  });
  const root = new MockElement({
    dataset: {
      sourceParam: "from",
      sourceAllowlist: JSON.stringify(["blog", "one-stop-job"]),
      sourceDefault: "direct",
      sourceUnknown: "other",
      eventName: "support_click",
      ...datasetOverrides
    },
    children: [anchor]
  });
  return { root, anchor };
}

function makeEnvironment(search) {
  const globalObject = {};
  return {
    Element: MockElement,
    HTMLAnchorElement: MockAnchor,
    location: { search },
    globalObject
  };
}

test("resolves an allowlisted ?from= source onto the link", () => {
  const { root, anchor } = buildWidget();
  enhancePromotionWidget(root, makeEnvironment("?from=one-stop-job"));

  assert.equal(anchor.dataset.sourceProject, "one-stop-job");
});

test("dispatches one-widget:click and pushes to dataLayer with correct fields", () => {
  const { root, anchor } = buildWidget();
  const environment = makeEnvironment("?from=one-stop-job");
  enhancePromotionWidget(root, environment);

  anchor.dispatchEvent({ type: "click" });

  const clickEvent = root.dispatched.find((event) => event.type === "one-widget:click");
  assert.ok(clickEvent, "expected a one-widget:click event on the root");
  assert.deepEqual(clickEvent.detail, {
    item_id: "afdian",
    kind: "support",
    platform: "afdian",
    source_project: "one-stop-job"
  });

  assert.deepEqual(environment.globalObject.dataLayer, [
    {
      event: "support_click",
      item_id: "afdian",
      kind: "support",
      platform: "afdian",
      source_project: "one-stop-job"
    }
  ]);
});

test("unknown source falls back to the unknown bucket", () => {
  const { root, anchor } = buildWidget();
  enhancePromotionWidget(root, makeEnvironment("?from=not-allowed"));

  assert.equal(anchor.dataset.sourceProject, "other");
});

test("does not bind listeners twice when called repeatedly", () => {
  const { root, anchor } = buildWidget();
  const environment = makeEnvironment("?from=blog");

  enhancePromotionWidget(root, environment);
  enhancePromotionWidget(root, environment);

  anchor.dispatchEvent({ type: "click" });

  assert.equal(root.dispatched.filter((event) => event.type === "one-widget:click").length, 1);
  assert.equal(environment.globalObject.dataLayer.length, 1);
});

test("is a no-op when no tracking config is present", () => {
  const { root, anchor } = buildWidget({ eventName: undefined });
  // eventName override of undefined leaves the key set to undefined; delete it
  // so dataset mirrors an untracked widget rendered without a tracking option.
  delete root.dataset.eventName;

  assert.doesNotThrow(() => enhancePromotionWidget(root, makeEnvironment("?from=blog")));
  assert.equal(anchor.dataset.sourceProject, undefined);
});
