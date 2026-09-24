import { createIconRegistry } from "./icons.js";
import { createPlatformRegistry } from "./registry.js";
import { renderableItems } from "./model.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function attribute(name, value) {
  if (value === undefined || value === null || value === false) return "";
  if (value === true) return ` ${name}`;
  return ` ${name}="${escapeHtml(value)}"`;
}

function renderIcon(key, registry) {
  const icon = registry.get(key) ?? registry.get("link");
  if (!icon) return "";
  const paths = icon.paths.map((path) => {
    return `<path${attribute("d", path.d)}${attribute("fill-rule", path.fillRule)}${attribute("clip-rule", path.clipRule)}></path>`;
  }).join("");
  return `<svg class="one-widget__icon" viewBox="${escapeHtml(icon.viewBox)}" aria-hidden="true" focusable="false">${paths}</svg>`;
}

function normalizeTracking(tracking) {
  if (!tracking) return undefined;
  if (typeof tracking !== "object" || Array.isArray(tracking)) {
    throw new TypeError("tracking must be an object.");
  }

  for (const field of ["sourceParam", "defaultSource", "unknownSource", "eventName"]) {
    const value = tracking[field];
    if (value !== undefined && (typeof value !== "string" || !value.trim())) {
      throw new TypeError(`tracking.${field} must be a non-empty string.`);
    }
  }

  let allowedSources = [];
  if (tracking.allowedSources !== undefined) {
    if (!Array.isArray(tracking.allowedSources)) {
      throw new TypeError("tracking.allowedSources must be an array of strings.");
    }
    allowedSources = tracking.allowedSources.map((source, index) => {
      if (typeof source !== "string" || !source.trim()) {
        throw new TypeError(`tracking.allowedSources[${index}] must be a non-empty string.`);
      }
      return source;
    });
  }

  return {
    sourceParam: tracking.sourceParam ?? "from",
    allowedSources,
    defaultSource: tracking.defaultSource ?? "direct",
    unknownSource: tracking.unknownSource ?? "other",
    eventName: tracking.eventName ?? "promotion_click"
  };
}

export function renderPromotionLinks(items, options = {}) {
  const platformRegistry = options.registry ?? createPlatformRegistry(options.platforms);
  const iconRegistry = options.iconRegistry ?? createIconRegistry(options.icons);
  const visibleItems = renderableItems(items, {
    registry: platformRegistry,
    openInNewTab: options.openInNewTab
  });
  const tracking = normalizeTracking(options.tracking);
  const layout = options.layout ?? "wrap";
  const theme = options.theme ?? "inherit";
  const ariaLabel = options.ariaLabel ?? "Project links";

  if (!["wrap", "stack", "inline"].includes(layout)) {
    throw new TypeError("layout must be wrap, stack, or inline.");
  }
  if (!["inherit", "light", "dark"].includes(theme)) {
    throw new TypeError("theme must be inherit, light, or dark.");
  }

  const rootAttributes = [
    attribute("class", `one-widget${options.className ? ` ${options.className}` : ""}`),
    attribute("aria-label", ariaLabel),
    attribute("data-one-widget", true),
    attribute("data-layout", layout),
    attribute("data-theme", theme),
    attribute("data-source-param", tracking?.sourceParam),
    attribute("data-source-allowlist", tracking ? JSON.stringify(tracking.allowedSources) : undefined),
    attribute("data-source-default", tracking?.defaultSource),
    attribute("data-source-unknown", tracking?.unknownSource),
    attribute("data-event-name", tracking?.eventName)
  ].join("");

  const links = visibleItems.map((item) => {
    const label = item.appearance === "icon" ? item.label : item.shortLabel ?? item.label;
    const labelClass = item.appearance === "icon" ? "one-widget__label one-widget__label--sr-only" : "one-widget__label";
    const target = item.openInNewTab ? "_blank" : undefined;
    const rel = item.openInNewTab ? "noopener noreferrer" : undefined;
    const linkClass = [
      "one-widget__link",
      `one-widget__link--${item.kind}`,
      `one-widget__link--${item.appearance}`,
      `one-widget__link--${item.emphasis}`
    ].join(" ");

    return `<li class="one-widget__item"><a${attribute("class", linkClass)}${attribute("href", item.url)}${attribute("target", target)}${attribute("rel", rel)}${attribute("aria-label", item.appearance === "icon" ? item.label : undefined)}${attribute("title", item.appearance === "icon" ? item.label : undefined)}${attribute("data-one-item", item.id)}${attribute("data-kind", item.kind)}${attribute("data-platform", item.platform)}${attribute("data-event-name", tracking ? item.eventName : undefined)}${attribute("data-source-project", tracking?.defaultSource)}>${item.icon === false ? "" : renderIcon(item.icon, iconRegistry)}<span class="${labelClass}">${escapeHtml(label)}</span></a></li>`;
  }).join("");

  return `<nav${rootAttributes}><ul class="one-widget__list">${links}</ul></nav>`;
}
