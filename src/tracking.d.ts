import type { TrackingEnvironment, TrackingOptions } from "./index.js";

export type { TrackingEnvironment };

export function resolveTrackingSource(search: string | null | undefined, config?: TrackingOptions | null): string;
export function enhancePromotionWidget(root: Element, environment?: TrackingEnvironment | null): void;
export function enhancePromotionWidgets(scope?: ParentNode | null): void;
