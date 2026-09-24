export type PromotionKind = "social" | "support" | "repository" | "website" | "email" | "custom";
export type PromotionAppearance = "icon" | "chip" | "button";
export type PromotionEmphasis = "primary" | "secondary" | "quiet";
export type PromotionLayout = "wrap" | "stack" | "inline";
export type PromotionTheme = "inherit" | "light" | "dark";

export interface PromotionItem {
  id: string;
  kind?: PromotionKind;
  platform?: string;
  url: string;
  label: string;
  shortLabel?: string;
  icon?: string | false;
  enabled?: boolean;
  order?: number;
  openInNewTab?: boolean;
  appearance?: PromotionAppearance;
  emphasis?: PromotionEmphasis;
  /** Overrides tracking.eventName for this item only. */
  eventName?: string;
}

export interface IconPath {
  d: string;
  fillRule?: "evenodd";
  clipRule?: "evenodd";
}

export interface IconDefinition {
  viewBox: string;
  paths: IconPath[];
}

export interface PlatformDefinition {
  defaultKind?: PromotionKind;
  defaultLabel?: string;
  icon?: string;
  hosts?: string[];
  protocols?: string[];
}

export interface TrackingOptions {
  sourceParam?: string;
  allowedSources?: string[];
  defaultSource?: string;
  unknownSource?: string;
  eventName?: string;
}

export interface RenderOptions {
  ariaLabel?: string;
  className?: string;
  layout?: PromotionLayout;
  theme?: PromotionTheme;
  openInNewTab?: boolean;
  tracking?: TrackingOptions;
  registry?: Map<string, Required<PlatformDefinition>>;
  iconRegistry?: Map<string, IconDefinition>;
  platforms?: Record<string, PlatformDefinition>;
  icons?: Record<string, IconDefinition>;
}

export interface NormalizedPromotionItem extends Required<Omit<PromotionItem, "shortLabel" | "eventName">> {
  shortLabel?: string;
  eventName?: string;
  platform: string;
}

export const PROMOTION_KINDS: readonly PromotionKind[];
export const BUILTIN_PLATFORMS: readonly string[];
export const BUILTIN_ICONS: readonly string[];

export function createPlatformRegistry(customPlatforms?: Record<string, PlatformDefinition>): Map<string, Required<PlatformDefinition>>;
export function registerPlatform(registry: Map<string, Required<PlatformDefinition>>, key: string, definition: PlatformDefinition): Map<string, Required<PlatformDefinition>>;
export function inferPlatform(url: string | URL, registry?: Map<string, Required<PlatformDefinition>>): string | undefined;
export function createIconRegistry(customIcons?: Record<string, IconDefinition>): Map<string, IconDefinition>;
export function registerIcon(registry: Map<string, IconDefinition>, key: string, definition: IconDefinition): Map<string, IconDefinition>;
export function normalizeUrl(value: string, path?: string): string;
export function normalizePromotionItems(items: PromotionItem[], options?: RenderOptions): NormalizedPromotionItem[];
export function renderableItems(items: PromotionItem[], options?: RenderOptions): NormalizedPromotionItem[];
export function renderPromotionLinks(items: PromotionItem[], options?: RenderOptions): string;
export function resolveTrackingSource(search: string, config?: TrackingOptions): string;
export function enhancePromotionWidget(root: Element, environment?: Record<string, unknown>): void;
export function enhancePromotionWidgets(scope?: ParentNode): void;
