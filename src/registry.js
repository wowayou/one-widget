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

function normalizePlatformDefinition(key, definition) {
  if (!definition || typeof definition !== "object") {
    throw new TypeError(`Platform "${key}" must be an object.`);
  }

  return {
    defaultKind: definition.defaultKind ?? "custom",
    defaultLabel: definition.defaultLabel ?? key,
    icon: definition.icon ?? "link",
    hosts: Array.isArray(definition.hosts)
      ? definition.hosts.map((host) => String(host).trim().toLowerCase()).filter(Boolean)
      : [],
    protocols: Array.isArray(definition.protocols)
      ? definition.protocols.map((protocol) => String(protocol).trim().toLowerCase()).filter(Boolean)
      : []
  };
}

export function createPlatformRegistry(customPlatforms = {}) {
  const registry = new Map();
  for (const [key, definition] of Object.entries({ ...PLATFORM_DEFINITIONS, ...customPlatforms })) {
    const normalizedKey = key.trim().toLowerCase();
    registry.set(normalizedKey, normalizePlatformDefinition(normalizedKey, definition));
  }
  return registry;
}

export function registerPlatform(registry, key, definition) {
  if (!(registry instanceof Map)) {
    throw new TypeError("Platform registry must be a Map created by createPlatformRegistry().");
  }
  const normalizedKey = String(key).trim().toLowerCase();
  if (!normalizedKey) throw new TypeError("Platform key cannot be empty.");

  const next = new Map(registry);
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
  const hostname = parsed.hostname.toLowerCase();

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
