const enhancedRoots = new WeakSet();

function parseTrackingConfig(root) {
  let allowedSources = [];
  try {
    allowedSources = JSON.parse(root.dataset.sourceAllowlist ?? "[]");
    if (!Array.isArray(allowedSources)) allowedSources = [];
  } catch {
    allowedSources = [];
  }

  return {
    sourceParam: root.dataset.sourceParam || "from",
    allowedSources,
    defaultSource: root.dataset.sourceDefault || "direct",
    unknownSource: root.dataset.sourceUnknown || "other",
    eventName: root.dataset.eventName || "promotion_click"
  };
}

export function resolveTrackingSource(search, config = {}) {
  const sourceParam = config.sourceParam ?? "from";
  const allowedSources = config.allowedSources ?? [];
  const defaultSource = config.defaultSource ?? "direct";
  const unknownSource = config.unknownSource ?? "other";
  let raw;

  try {
    raw = new URLSearchParams(search).get(sourceParam);
  } catch {
    return defaultSource;
  }

  if (!raw) return defaultSource;
  if (raw === defaultSource || allowedSources.includes(raw)) return raw;
  return unknownSource;
}

export function enhancePromotionWidget(root, environment = {}) {
  const ElementConstructor = environment.Element ?? globalThis.Element;
  const AnchorConstructor = environment.HTMLAnchorElement ?? globalThis.HTMLAnchorElement;
  if (!ElementConstructor || !(root instanceof ElementConstructor) || enhancedRoots.has(root)) return;
  enhancedRoots.add(root);

  const config = parseTrackingConfig(root);
  if (!root.dataset.eventName) return;

  const locationObject = environment.location ?? window.location;
  const source = resolveTrackingSource(locationObject.search, config);

  for (const link of root.querySelectorAll("[data-one-item]")) {
    if (!AnchorConstructor || !(link instanceof AnchorConstructor)) continue;
    link.dataset.sourceProject = source;
    link.addEventListener("click", () => {
      const detail = {
        item_id: link.dataset.oneItem || "unknown",
        kind: link.dataset.kind || "custom",
        platform: link.dataset.platform || "custom",
        source_project: source
      };

      root.dispatchEvent(new CustomEvent("one-widget:click", { detail, bubbles: true }));

      const globalObject = environment.globalObject ?? window;
      globalObject.dataLayer = globalObject.dataLayer || [];
      globalObject.dataLayer.push({ event: config.eventName, ...detail });
    });
  }
}

export function enhancePromotionWidgets(scope = document) {
  for (const root of scope.querySelectorAll("[data-one-widget]")) {
    enhancePromotionWidget(root);
  }
}
