import { assertPlatformRegistry, createPlatformRegistry, inferPlatform } from "./registry.js";

export const PROMOTION_KINDS = Object.freeze([
  "social",
  "support",
  "repository",
  "website",
  "email",
  "custom"
]);

const APPEARANCES = new Set(["icon", "chip", "button"]);
const EMPHASES = new Set(["primary", "secondary", "quiet"]);
const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

function stringField(value, path) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${path} must be a non-empty string.`);
  }
  return value.trim();
}

export function normalizeUrl(value, path = "url") {
  const raw = stringField(value, path);
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new TypeError(`${path} must be an absolute URL.`);
  }

  if (!SAFE_PROTOCOLS.has(parsed.protocol)) {
    throw new TypeError(`${path} uses unsupported protocol "${parsed.protocol}".`);
  }
  if ((parsed.protocol === "http:" || parsed.protocol === "https:") && !parsed.hostname) {
    throw new TypeError(`${path} must include a hostname.`);
  }
  // "mailto:" or "mailto:?subject=hi" parses fine but opens an empty draft
  // with no recipient, which is never what a promotion link intends.
  if (parsed.protocol === "mailto:" && !parsed.pathname.trim()) {
    throw new TypeError(`${path} must include an email address.`);
  }
  if (parsed.username || parsed.password) {
    throw new TypeError(`${path} must not contain embedded credentials.`);
  }

  return parsed.toString();
}

function defaultAppearance(kind) {
  if (kind === "support") return "button";
  return "chip";
}

function defaultEmphasis(kind) {
  if (kind === "support") return "primary";
  if (kind === "social") return "quiet";
  return "secondary";
}

function defaultIcon(kind) {
  if (kind === "support") return "heart";
  if (kind === "repository") return "code";
  if (kind === "website") return "globe";
  if (kind === "email") return "mail";
  return "link";
}

export function normalizePromotionItems(items, options) {
  if (!Array.isArray(items)) throw new TypeError("items must be an array.");
  options ??= {};

  const registry = options.registry
    ? assertPlatformRegistry(options.registry)
    : createPlatformRegistry(options.platforms);
  if (options.openInNewTab != null && typeof options.openInNewTab !== "boolean") {
    throw new TypeError("options.openInNewTab must be a boolean.");
  }
  const defaultOpenInNewTab = options.openInNewTab ?? true;
  const ids = new Set();

  return items.map((item, index) => {
    const path = `items[${index}]`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new TypeError(`${path} must be an object.`);
    }

    const id = stringField(item.id, `${path}.id`);
    if (!ID_PATTERN.test(id)) {
      throw new TypeError(`${path}.id may only contain letters, numbers, dot, colon, underscore, and hyphen.`);
    }
    if (ids.has(id)) throw new TypeError(`${path}.id duplicates "${id}".`);
    ids.add(id);

    const url = normalizeUrl(item.url, `${path}.url`);
    const platform = item.platform
      ? stringField(item.platform, `${path}.platform`).toLowerCase()
      : inferPlatform(url, registry) ?? "custom";
    const platformDefinition = registry.get(platform);
    const kind = item.kind ?? platformDefinition?.defaultKind ?? "custom";
    if (!PROMOTION_KINDS.includes(kind)) {
      throw new TypeError(`${path}.kind must be one of: ${PROMOTION_KINDS.join(", ")}.`);
    }

    const appearance = item.appearance ?? defaultAppearance(kind);
    if (!APPEARANCES.has(appearance)) {
      throw new TypeError(`${path}.appearance must be icon, chip, or button.`);
    }
    const emphasis = item.emphasis ?? defaultEmphasis(kind);
    if (!EMPHASES.has(emphasis)) {
      throw new TypeError(`${path}.emphasis must be primary, secondary, or quiet.`);
    }

    // null is what JSON / CMS exports emit for "not set", so treat it like
    // undefined for every optional field instead of failing on it.
    const order = item.order ?? index;
    if (!Number.isFinite(order)) throw new TypeError(`${path}.order must be a finite number.`);
    if (item.enabled != null && typeof item.enabled !== "boolean") {
      throw new TypeError(`${path}.enabled must be a boolean.`);
    }
    if (item.openInNewTab != null && typeof item.openInNewTab !== "boolean") {
      throw new TypeError(`${path}.openInNewTab must be a boolean.`);
    }
    if (item.icon != null && item.icon !== false && (typeof item.icon !== "string" || !item.icon.trim())) {
      throw new TypeError(`${path}.icon must be a non-empty string or false.`);
    }
    if (item.eventName != null && (typeof item.eventName !== "string" || !item.eventName.trim())) {
      throw new TypeError(`${path}.eventName must be a non-empty string.`);
    }

    const icon = item.icon === false
      ? false
      : item.icon ?? platformDefinition?.icon ?? defaultIcon(kind);

    return Object.freeze({
      id,
      kind,
      platform,
      url,
      label: stringField(item.label, `${path}.label`),
      shortLabel: item.shortLabel ? stringField(item.shortLabel, `${path}.shortLabel`) : undefined,
      icon: typeof icon === "string" ? icon.trim().toLowerCase() : icon,
      enabled: item.enabled ?? true,
      order,
      openInNewTab: item.openInNewTab ?? (url.startsWith("mailto:") ? false : defaultOpenInNewTab),
      appearance,
      emphasis,
      // Per-item override for the group-level tracking.eventName, so mixing a
      // support CTA with a "view source" link does not report both as the same
      // conversion event.
      eventName: item.eventName ? item.eventName.trim() : undefined,
      _index: index
    });
  });
}

export function renderableItems(items, options = {}) {
  return normalizePromotionItems(items, options)
    .filter((item) => item.enabled)
    .sort((a, b) => a.order - b.order || a._index - b._index);
}
