import type { TrackingOptions } from "./index.js";

export interface TrackingEnvironment {
  location?: Location;
  globalObject?: Window & { dataLayer?: Array<Record<string, unknown>> };
  Element?: typeof Element;
  HTMLAnchorElement?: typeof HTMLAnchorElement;
}

export function resolveTrackingSource(search: string, config?: TrackingOptions): string;
export function enhancePromotionWidget(root: Element, environment?: TrackingEnvironment): void;
export function enhancePromotionWidgets(scope?: ParentNode): void;
