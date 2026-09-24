import test from "node:test";
import assert from "node:assert/strict";
import { enhancePromotionWidget } from "../src/index.js";
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
