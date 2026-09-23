const ICONS = {
  heart: {
    viewBox: "0 0 24 24",
    paths: [
      {
        d: "M12 20.35 10.55 19C5.4 14.36 2 11.28 2 7.5 2 4.42 4.42 2 7.5 2c1.74 0 3.41.81 4.5 2.09A6.02 6.02 0 0 1 16.5 2C19.58 2 22 4.42 22 7.5c0 3.78-3.4 6.86-8.55 11.51Z"
      }
    ]
  },
  code: {
    viewBox: "0 0 24 24",
    paths: [
      {
        d: "m8.7 16.6-4.6-4.6 4.6-4.6 1.4 1.4L6.9 12l3.2 3.2-1.4 1.4Zm6.6 0-1.4-1.4 3.2-3.2-3.2-3.2 1.4-1.4 4.6 4.6-4.6 4.6Z"
      }
    ]
  },
  globe: {
    viewBox: "0 0 24 24",
    paths: [
      {
        d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.92 6h-3.03a15.7 15.7 0 0 0-1.38-3.09A8.05 8.05 0 0 1 18.92 8ZM12 4c.83 1.2 1.45 2.54 1.82 4h-3.64A13.4 13.4 0 0 1 12 4ZM4.26 14a8 8 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4h-3.4Zm.82 2h3.03c.3 1.1.76 2.14 1.38 3.09A8.05 8.05 0 0 1 5.08 16ZM8.11 8H5.08a8.05 8.05 0 0 1 4.41-3.09A15.7 15.7 0 0 0 8.11 8ZM12 20a13.4 13.4 0 0 1-1.82-4h3.64A13.4 13.4 0 0 1 12 20Zm2.24-6H9.76a14.5 14.5 0 0 1 0-4h4.48a14.5 14.5 0 0 1 0 4Zm.27 5.09A15.7 15.7 0 0 0 15.89 16h3.03a8.05 8.05 0 0 1-4.41 3.09ZM16.34 14a16.5 16.5 0 0 0 0-4h3.4a8 8 0 0 1 0 4h-3.4Z"
      }
    ]
  },
  mail: {
    viewBox: "0 0 24 24",
    paths: [
      {
        d: "M20 4H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V6c0-1.1-.9-2-2-2Zm0 4-8 5-8-5V6l8 5 8-5v2Z"
      }
    ]
  },
  link: {
    viewBox: "0 0 24 24",
    paths: [
      {
        d: "M3.9 12a5 5 0 0 1 5-5H12v2H8.9a3 3 0 1 0 0 6H12v2H8.9a5 5 0 0 1-5-5Zm5.1 1v-2h6v2H9Zm6-6h3.1a5 5 0 1 1 0 10H15v-2h3.1a3 3 0 1 0 0-6H15V7Z"
      }
    ]
  }
};

function normalizeIconDefinition(key, definition) {
  if (!definition || typeof definition !== "object") {
    throw new TypeError(`Icon "${key}" must be an object.`);
  }

  const viewBox = typeof definition.viewBox === "string" ? definition.viewBox.trim() : "";
  const paths = Array.isArray(definition.paths) ? definition.paths : [];

  if (!viewBox || paths.length === 0) {
    throw new TypeError(`Icon "${key}" requires a viewBox and at least one path.`);
  }

  return {
    viewBox,
    paths: paths.map((path, index) => {
      if (!path || typeof path.d !== "string" || !path.d.trim()) {
        throw new TypeError(`Icon "${key}" path ${index} requires non-empty path data.`);
      }
      return {
        d: path.d,
        fillRule: path.fillRule === "evenodd" ? "evenodd" : undefined,
        clipRule: path.clipRule === "evenodd" ? "evenodd" : undefined
      };
    })
  };
}

export function createIconRegistry(customIcons = {}) {
  const registry = new Map();
  for (const [key, definition] of Object.entries({ ...ICONS, ...customIcons })) {
    registry.set(key, normalizeIconDefinition(key, definition));
  }
  return registry;
}

export function registerIcon(registry, key, definition) {
  if (!(registry instanceof Map)) {
    throw new TypeError("Icon registry must be a Map created by createIconRegistry().");
  }
  const normalizedKey = String(key).trim().toLowerCase();
  if (!normalizedKey) throw new TypeError("Icon key cannot be empty.");

  const next = new Map(registry);
  next.set(normalizedKey, normalizeIconDefinition(normalizedKey, definition));
  return next;
}

export const BUILTIN_ICONS = Object.freeze(Object.keys(ICONS));
