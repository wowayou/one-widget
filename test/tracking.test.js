import test from "node:test";
import assert from "node:assert/strict";
import { enhancePromotionWidget, enhancePromotionWidgets, resolveTrackingSource } from "../src/index.js";
import { MockAnchor, MockElement, makeEnvironment } from "./helpers/mock-dom.js";

function buildWidget(datasetOverrides = {}, anchors) {
  const anchor = new MockAnchor({
    dataset: { oneItem: "afdian", kind: "support", platform: "afdian" }
  });
  const children = anchors ?? [anchor];
  const root = new MockElement({
    dataset: {
      sourceParam: "from",
      sourceAllowlist: JSON.stringify(["blog", "one-stop-job"]),
      sourceDefault: "direct",
      sourceUnknown: "other",
      eventName: "support_click",
      ...datasetOverrides
    },
    children
  });
  return { root, anchor: children[0] };
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

test("a per-item event name overrides the group default", () => {
  const support = new MockAnchor({
    dataset: { oneItem: "afdian", kind: "support", platform: "afdian" }
  });
  const source = new MockAnchor({
    dataset: { oneItem: "repo", kind: "repository", platform: "github", eventName: "source_click" }
  });
  const { root } = buildWidget({}, [support, source]);
  const environment = makeEnvironment("?from=blog");
  enhancePromotionWidget(root, environment);

  support.dispatchEvent({ type: "click" });
  source.dispatchEvent({ type: "click" });

  // A repository link must not be reported as a support conversion just because
  // it shares the widget with the support CTA.
  assert.deepEqual(
    environment.globalObject.dataLayer.map((entry) => [entry.event, entry.kind]),
    [["support_click", "support"], ["source_click", "repository"]]
  );
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

test("matches sources case-insensitively and reports the configured spelling", () => {
  const config = { allowedSources: ["one-stop-job", "GitHub"], defaultSource: "direct", unknownSource: "other" };

  assert.equal(resolveTrackingSource("?from=One-Stop-Job", config), "one-stop-job");
  assert.equal(resolveTrackingSource("?from=github%20", config), "GitHub");
  assert.equal(resolveTrackingSource("?from=%20%20", config), "direct");
  assert.equal(resolveTrackingSource("?from=DIRECT", config), "direct");
  assert.equal(resolveTrackingSource(undefined, null), "direct");
});

test("reports middle-click opens but not right clicks", () => {
  const { root, anchor } = buildWidget();
  const environment = makeEnvironment("?from=blog");
  enhancePromotionWidget(root, environment);

  anchor.dispatchEvent({ type: "auxclick", button: 1 });
  anchor.dispatchEvent({ type: "auxclick", button: 2 });
  anchor.dispatchEvent({ type: "click", button: 1 });

  assert.equal(environment.globalObject.dataLayer.length, 1, "only the middle click is reported, once");
});

test("a foreign dataLayer or a throwing listener never breaks the click", () => {
  const { root, anchor } = buildWidget();
  const environment = makeEnvironment("?from=blog");
  environment.globalObject.dataLayer = { not: "an array" };
  root.addEventListener("one-widget:click", () => {
    throw new Error("listener failure");
  });
  enhancePromotionWidget(root, environment);

  assert.doesNotThrow(() => anchor.dispatchEvent({ type: "click" }));
  assert.equal(root.dispatched.filter((event) => event.type === "one-widget:click").length, 1);

  const second = buildWidget();
  const secondEnvironment = makeEnvironment("?from=blog");
  second.root.addEventListener("one-widget:click", () => {
    throw new Error("listener failure");
  });
  enhancePromotionWidget(second.root, secondEnvironment);
  second.anchor.dispatchEvent({ type: "click" });
  assert.equal(secondEnvironment.globalObject.dataLayer.length, 1, "dataLayer still receives the event");
});

test("does not touch browser globals when run outside a browser", () => {
  assert.doesNotThrow(() => enhancePromotionWidgets());
  assert.doesNotThrow(() => enhancePromotionWidgets(null));

  const { root, anchor } = buildWidget();
  assert.doesNotThrow(() => enhancePromotionWidget(root, { Element: MockElement, HTMLAnchorElement: MockAnchor }));
  assert.equal(anchor.dataset.sourceProject, "direct", "no location means no ?from= to read");
  assert.doesNotThrow(() => anchor.dispatchEvent({ type: "click" }));
});

test("accepts element nodes from another realm by node type", () => {
  const anchor = { nodeType: 1, localName: "a", dataset: { oneItem: "afdian", kind: "support", platform: "afdian" }, addEventListener() {} };
  const root = {
    nodeType: 1,
    dataset: { eventName: "support_click", sourceAllowlist: "[\"blog\", 42]" },
    querySelectorAll: () => [anchor]
  };

  enhancePromotionWidget(root, { location: { search: "?from=blog" }, globalObject: {} });
  assert.equal(anchor.dataset.sourceProject, "blog");
});
