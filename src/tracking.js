const enhancedRoots = new WeakSet();

// Element nodes from another realm (an iframe, a test DOM) fail instanceof
// against this realm's constructors, so fall back to the node type.
function isElement(value, ElementConstructor) {
  if (!value || typeof value !== "object") return false;
  if (ElementConstructor && value instanceof ElementConstructor) return true;
  return value.nodeType === 1 && typeof value.querySelectorAll === "function";
}

function isAnchor(value, AnchorConstructor) {
  if (!value || typeof value !== "object") return false;
  if (AnchorConstructor && value instanceof AnchorConstructor) return true;
  return value.nodeType === 1 && String(value.localName ?? value.tagName ?? "").toLowerCase() === "a";
}

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
    allowedSources: allowedSources.filter((source) => typeof source === "string"),
    defaultSource: root.dataset.sourceDefault || "direct",
    unknownSource: root.dataset.sourceUnknown || "other",
    eventName: root.dataset.eventName || "promotion_click"
  };
}

export function resolveTrackingSource(search, config) {
  config ??= {};
  const sourceParam = config.sourceParam ?? "from";
  const allowedSources = Array.isArray(config.allowedSources) ? config.allowedSources : [];
  const defaultSource = config.defaultSource ?? "direct";
  const unknownSource = config.unknownSource ?? "other";
  let raw;

  try {
    raw = new URLSearchParams(search ?? "").get(sourceParam);
  } catch {
    return defaultSource;
  }

  raw = raw?.trim();
  if (!raw) return defaultSource;

  // Links shared by hand pick up stray case ("?from=Blog") and trailing
  // whitespace; match case-insensitively but always report the configured
  // spelling so the analytics buckets stay low-cardinality.
  const wanted = raw.toLowerCase();
  for (const candidate of [defaultSource, ...allowedSources]) {
    if (typeof candidate === "string" && candidate.trim().toLowerCase() === wanted) {
      return candidate.trim();
    }
  }
  return unknownSource;
}

function report(root, link, source, config, globalObject, CustomEventConstructor) {
  const detail = {
    item_id: link.dataset.oneItem || "unknown",
    kind: link.dataset.kind || "custom",
    platform: link.dataset.platform || "custom",
    source_project: source
  };

  // Each sink is isolated: a throwing listener or a foreign dataLayer must not
  // stop the other sink, and neither may ever get in the way of navigation.
  try {
    if (typeof CustomEventConstructor === "function") {
      root.dispatchEvent(new CustomEventConstructor("one-widget:click", { detail, bubbles: true }));
    }
  } catch {
    // Attribution is best-effort.
  }

  try {
    if (!globalObject) return;
    globalObject.dataLayer = globalObject.dataLayer || [];
    if (typeof globalObject.dataLayer.push !== "function") return;
    // A per-item data-event-name wins over the group default so a repository
    // link in a support widget is not counted as a support conversion.
    globalObject.dataLayer.push({ event: link.dataset.eventName || config.eventName, ...detail });
  } catch {
    // Attribution is best-effort.
  }
}

export function enhancePromotionWidget(root, environment) {
  environment ??= {};
  const ElementConstructor = environment.Element ?? globalThis.Element;
  const AnchorConstructor = environment.HTMLAnchorElement ?? globalThis.HTMLAnchorElement;
  if (!isElement(root, ElementConstructor) || !root.dataset || enhancedRoots.has(root)) return;
  enhancedRoots.add(root);

  const config = parseTrackingConfig(root);
  if (!root.dataset.eventName) return;

  const globalObject = environment.globalObject ?? globalThis.window;
  const locationObject = environment.location ?? globalThis.location;
  const CustomEventConstructor = environment.CustomEvent ?? globalThis.CustomEvent;
  const source = resolveTrackingSource(locationObject?.search ?? "", config);

  for (const link of root.querySelectorAll("[data-one-item]")) {
    if (!isAnchor(link, AnchorConstructor) || !link.dataset) continue;
    link.dataset.sourceProject = source;

    const track = () => report(root, link, source, config, globalObject, CustomEventConstructor);
    link.addEventListener("click", (event) => {
      // Only the primary button; a middle click is reported via auxclick below.
      if (!event?.button) track();
    });
    // Middle-click ("open in new tab") never fires click in modern browsers,
    // so without this those visits would go unattributed.
    link.addEventListener("auxclick", (event) => {
      if (event?.button === 1) track();
    });
  }
}

export function enhancePromotionWidgets(scope) {
  scope ??= globalThis.document;
  if (!scope || typeof scope.querySelectorAll !== "function") return;
  for (const root of scope.querySelectorAll("[data-one-widget]")) {
    try {
      enhancePromotionWidget(root);
    } catch {
      // One malformed widget must not prevent the rest of the page from being
      // enhanced; its static links keep working either way.
    }
  }
}
