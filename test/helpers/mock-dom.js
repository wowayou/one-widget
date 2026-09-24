// Minimal DOM stand-ins shared by the tracking and contract tests.
// enhancePromotionWidget only touches dataset, querySelectorAll,
// add/dispatchEvent and instanceof checks, so we can model just those without
// pulling in a full DOM implementation.

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

export class MockElement {
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

export class MockAnchor extends MockElement {}

export function makeEnvironment(search) {
  return {
    Element: MockElement,
    HTMLAnchorElement: MockAnchor,
    location: { search },
    globalObject: {}
  };
}
