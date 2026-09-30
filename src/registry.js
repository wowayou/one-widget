const PLATFORM_DEFINITIONS = {
  afdian: {
    defaultKind: "support",
    defaultLabel: "Afdian",
    icon: "heart",
    hosts: ["afdian.com"]
  },
  kofi: {
    defaultKind: "support",
    defaultLabel: "Ko-fi",
    icon: "heart",
    hosts: ["ko-fi.com"]
  },
  buymeacoffee: {
    defaultKind: "support",
    defaultLabel: "Buy Me a Coffee",
    icon: "heart",
    hosts: ["buymeacoffee.com"]
  },
  patreon: {
    defaultKind: "support",
    defaultLabel: "Patreon",
    icon: "heart",
    hosts: ["patreon.com"]
  },
  paypal: {
    defaultKind: "support",
    defaultLabel: "PayPal",
    icon: "heart",
    hosts: ["paypal.com", "paypal.me"]
  },
  liberapay: {
    defaultKind: "support",
    defaultLabel: "Liberapay",
    icon: "heart",
    hosts: ["liberapay.com"]
  },
  opencollective: {
    defaultKind: "support",
    defaultLabel: "Open Collective",
    icon: "heart",
    hosts: ["opencollective.com"]
  },
  github: {
    defaultKind: "repository",
    defaultLabel: "GitHub",
    icon: "code",
    hosts: ["github.com"]
  },
  gitlab: {
    defaultKind: "repository",
    defaultLabel: "GitLab",
    icon: "code",
    hosts: ["gitlab.com"]
  },
  email: {
    defaultKind: "email",
    defaultLabel: "Email",
    icon: "mail",
    protocols: ["mailto:"]
  },
  website: {
    defaultKind: "website",
    defaultLabel: "Website",
    icon: "globe"
  },
  custom: {
    defaultKind: "custom",
    defaultLabel: "Visit link",
    icon: "link"
  }
};

// Hosts are compared against URL#hostname, which is lowercase, punycoded and
// may carry a trailing dot. Normalise declared hosts the same way so that
// "例子.com", "Code.Example.org." or a pasted "https://code.example.org/" still
// match. Anything else is kept as-is, because it never matched before either:
// an unparsable value must not turn into a build error, and an entry with a
// path ("github.com/someone") must not silently widen to the whole host.
function normalizeHost(host) {
  const raw = String(host).trim().toLowerCase();
  if (!raw) return "";
  try {
    const parsed = new URL(raw.includes("://") ? raw : `http://${raw}`);
    if (parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.port) return raw;
    return stripTrailingDot(parsed.hostname) || raw;
  } catch {
    return raw;
  }
}

function normalizeProtocol(protocol) {
  const raw = String(protocol).trim().toLowerCase();
  if (!raw) return "";
  return raw.endsWith(":") ? raw : `${raw}:`;
}

function stripTrailingDot(hostname) {
  return hostname.endsWith(".") ? hostname.slice(0, -1) : hostname;
}

function normalizePlatformDefinition(key, definition) {
  if (!definition || typeof definition !== "object") {
    throw new TypeError(`Platform "${key}" must be an object.`);
  }

  return {
    defaultKind: definition.defaultKind ?? "custom",
    defaultLabel: definition.defaultLabel ?? key,
    icon: definition.icon ?? "link",
    hosts: Array.isArray(definition.hosts)
      ? definition.hosts.map(normalizeHost).filter(Boolean)
      : [],
    protocols: Array.isArray(definition.protocols)
      ? definition.protocols.map(normalizeProtocol).filter(Boolean)
      : []
  };
}

export function createPlatformRegistry(customPlatforms = {}) {
  const registry = new Map();
  for (const [key, definition] of Object.entries(PLATFORM_DEFINITIONS)) {
    registry.set(key, normalizePlatformDefinition(key, definition));
  }
  // Custom keys are applied after the built-ins and normalised first, so a
  // custom "GitHub" replaces the built-in "github" instead of coexisting with it.
  for (const [key, definition] of entries(customPlatforms, "platforms")) {
    const normalizedKey = String(key).trim().toLowerCase();
    if (!normalizedKey) throw new TypeError("Platform key cannot be empty.");
    registry.delete(normalizedKey);
    registry.set(normalizedKey, normalizePlatformDefinition(normalizedKey, definition));
  }
  return registry;
}

// Accepts a plain object (the documented form) or a Map, which is what a
// caller building definitions programmatically tends to reach for.
function entries(value, name) {
  if (value === undefined || value === null) return [];
  if (value instanceof Map) return [...value];
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object keyed by name.`);
  }
  return Object.entries(value);
}

export function assertPlatformRegistry(registry) {
  if (!(registry instanceof Map)) {
    throw new TypeError("Platform registry must be a Map created by createPlatformRegistry().");
  }
  return registry;
}

export function registerPlatform(registry, key, definition) {
  assertPlatformRegistry(registry);
  const normalizedKey = String(key).trim().toLowerCase();
  if (!normalizedKey) throw new TypeError("Platform key cannot be empty.");

  const next = new Map(registry);
  // Re-insert at the end so an overriding registration also wins host ties,
  // matching createPlatformRegistry().
  next.delete(normalizedKey);
  next.set(normalizedKey, normalizePlatformDefinition(normalizedKey, definition));
  return next;
}

export function inferPlatform(url, registry = createPlatformRegistry()) {
  let parsed;
  try {
    parsed = url instanceof URL ? url : new URL(url);
  } catch {
    return undefined;
  }

  const protocol = parsed.protocol.toLowerCase();
  const hostname = stripTrailingDot(parsed.hostname.toLowerCase());

  // Pick the most specific match rather than the first one in iteration order.
  // An exact host beats a suffix match, and a longer host beats a shorter one,
  // so a custom "gist.github.com" platform wins over the built-in "github.com".
  // Ties go to the last registered platform, so a custom definition can claim a
  // host that a built-in already covers.
  let best;
  const consider = (key, score) => {
    if (!best || score >= best.score) best = { key, score };
  };

  for (const [key, definition] of registry) {
    if (definition.protocols.includes(protocol)) consider(key, 1);
    for (const host of definition.hosts) {
      if (hostname === host) consider(key, host.length + 1000);
      else if (hostname.endsWith(`.${host}`)) consider(key, host.length);
    }
  }

  return best?.key;
}

export const BUILTIN_PLATFORMS = Object.freeze(Object.keys(PLATFORM_DEFINITIONS));
