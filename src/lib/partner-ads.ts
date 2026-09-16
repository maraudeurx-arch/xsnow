/**
 * Accueil partner inventory — labeled sponsored slots, never fake news.
 *
 * Soft-launch: rotating placeholder creatives (partner name + image + url).
 * A real network (AdSense, Mediavine, Canadian direct-sold, local sponsors)
 * plugs in via env without mixing ads into headline titles. No click-farm
 * chrome, no invented stories, no claim of live ad revenue.
 */

import { durableGet, durableSet } from "./durable-storage.ts";
import { assetUrl } from "./paths.ts";

export type AdProvider = "placeholder" | "adsense" | "none";
export type PartnerSlotId = "news-top" | "news-mid" | "news-bottom";

export type PartnerSlotPlacement = {
  leading: PartnerSlotId[];
  inline: PartnerSlotId[];
  trailing: PartnerSlotId[];
};

export type AdsenseSlotEnv = {
  top?: string;
  mid?: string;
  bottom?: string;
};

export type PartnerCreative = {
  id: string;
  /** Display name shown next to the Commandité label. */
  name: string;
  /** Destination when the creative is tapped (in-app path or https). */
  href: string;
  /** Optional creative art (served under basePath via assetUrl). */
  imagePath?: string;
  /** Short soft-launch blurb — not a news headline. */
  tagline: string;
};

export const NEWS_PARTNER_SLOTS: readonly PartnerSlotId[] = [
  "news-top",
  "news-mid",
  "news-bottom",
];

/** How often placeholder creatives advance (ms). */
export const PARTNER_ROTATION_MS = 9_000;

/** localStorage key for the shared rotation cursor (safe / durable). */
export const PARTNER_ROTATION_KEY = "xsnow.partnerAdRotation";

/**
 * Soft-launch partner creatives. Replace name / imagePath / href when real
 * deals land — keep ids stable so rotation indexes stay sensible.
 */
export const PLACEHOLDER_PARTNERS: readonly PartnerCreative[] = [
  {
    id: "placeholder-coop",
    name: "Coop du quartier (exemple)",
    href: "/monetise",
    imagePath: "/partners/coop.svg",
    tagline: "Emplacement réservé — partenaire réel à venir.",
  },
  {
    id: "placeholder-atelier",
    name: "Atelier voisin (exemple)",
    href: "/monetise",
    imagePath: "/partners/atelier.svg",
    tagline: "Exemple soft-launch — pas une publicité vendue.",
  },
  {
    id: "placeholder-marche",
    name: "Marché local (exemple)",
    href: "/monetise",
    imagePath: "/partners/marche.svg",
    tagline: "Inventaire démonstration — revenus pubs pas encore en direct.",
  },
];

const SLOT_OFFSET: Record<PartnerSlotId, number> = {
  "news-top": 2,
  "news-mid": 0,
  "news-bottom": 1,
};

export function parseAdsEnabled(raw: string | undefined): boolean {
  const value = (raw || "").trim().toLowerCase();
  if (value === "0" || value === "false" || value === "off" || value === "no") return false;
  return true;
}

export function parseAdProvider(raw: string | undefined): AdProvider {
  const value = (raw || "").trim().toLowerCase();
  if (value === "none" || value === "off") return "none";
  if (value === "adsense") return "adsense";
  return "placeholder";
}

export function adsEnabled(
  env: { enabled?: string; provider?: string } = {
    enabled: process.env.NEXT_PUBLIC_ADS_ENABLED,
    provider: process.env.NEXT_PUBLIC_ADS_PROVIDER,
  },
): boolean {
  if (!parseAdsEnabled(env.enabled)) return false;
  return parseAdProvider(env.provider) !== "none";
}

export function adProvider(
  raw: string | undefined = process.env.NEXT_PUBLIC_ADS_PROVIDER,
  enabledRaw: string | undefined = process.env.NEXT_PUBLIC_ADS_ENABLED,
): AdProvider {
  if (!parseAdsEnabled(enabledRaw)) return "none";
  return parseAdProvider(raw);
}

export function adsenseClientId(
  raw: string | undefined = process.env.NEXT_PUBLIC_ADSENSE_CLIENT,
): string {
  return (raw || "").trim();
}

function defaultAdsenseEnv(): AdsenseSlotEnv {
  return {
    top: process.env.NEXT_PUBLIC_ADSENSE_SLOT_NEWS_TOP,
    mid: process.env.NEXT_PUBLIC_ADSENSE_SLOT_NEWS_MID,
    bottom: process.env.NEXT_PUBLIC_ADSENSE_SLOT_NEWS_BOTTOM,
  };
}

export function adsenseSlotId(
  slot: PartnerSlotId,
  env: AdsenseSlotEnv = defaultAdsenseEnv(),
): string {
  const value = slot === "news-top" ? env.top : slot === "news-mid" ? env.mid : env.bottom;
  return (value || "").trim();
}

export function usesAdsense(
  slot: PartnerSlotId,
  env: {
    provider?: string;
    enabled?: string;
    client?: string;
    top?: string;
    mid?: string;
    bottom?: string;
  } = {
    provider: process.env.NEXT_PUBLIC_ADS_PROVIDER,
    enabled: process.env.NEXT_PUBLIC_ADS_ENABLED,
    client: process.env.NEXT_PUBLIC_ADSENSE_CLIENT,
    ...defaultAdsenseEnv(),
  },
): boolean {
  return (
    adProvider(env.provider, env.enabled) === "adsense" &&
    Boolean(adsenseClientId(env.client)) &&
    Boolean(adsenseSlotId(slot, { top: env.top, mid: env.mid, bottom: env.bottom }))
  );
}

/** Slots to render inside Nouvelles du Quartier (labeled Commandité, never fake news). */
export function visiblePartnerSlots(
  env: { enabled?: string; provider?: string } = {
    enabled: process.env.NEXT_PUBLIC_ADS_ENABLED,
    provider: process.env.NEXT_PUBLIC_ADS_PROVIDER,
  },
): PartnerSlotId[] {
  if (!adsEnabled(env)) return [];
  return [...NEWS_PARTNER_SLOTS];
}

/**
 * news-top sits above headlines, news-mid after the first headline when
 * stories exist, news-bottom after the list. Without headlines, mid joins
 * the trailing stack so inventory stays visible on empty/error.
 */
export function placePartnerSlots(
  slots: readonly PartnerSlotId[],
  hasHeadlines: boolean,
): PartnerSlotPlacement {
  const leading: PartnerSlotId[] = [];
  const inline: PartnerSlotId[] = [];
  const trailing: PartnerSlotId[] = [];
  for (const slot of slots) {
    if (slot === "news-top") leading.push(slot);
    else if (slot === "news-mid" && hasHeadlines) inline.push(slot);
    else trailing.push(slot);
  }
  return { leading, inline, trailing };
}

export function listPartnerCreatives(
  creatives: readonly PartnerCreative[] = PLACEHOLDER_PARTNERS,
): readonly PartnerCreative[] {
  return creatives.length ? creatives : PLACEHOLDER_PARTNERS;
}

export function partnerCreativeImageUrl(creative: PartnerCreative): string | null {
  if (!creative.imagePath) return null;
  return assetUrl(creative.imagePath);
}

/** Normalize a stored rotation cursor. */
export function parseRotationIndex(raw: string | null | undefined, length: number): number {
  if (!length) return 0;
  if (raw == null || raw === "") return 0;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed % length;
}

export function readRotationIndex(
  length: number = PLACEHOLDER_PARTNERS.length,
  store?: Storage,
): number {
  return parseRotationIndex(durableGet(PARTNER_ROTATION_KEY, store), length);
}

export function writeRotationIndex(index: number, length: number = PLACEHOLDER_PARTNERS.length) {
  if (!length) return;
  const normalized = ((index % length) + length) % length;
  durableSet(PARTNER_ROTATION_KEY, String(normalized));
}

export function nextRotationIndex(current: number, length: number): number {
  if (!length) return 0;
  return (current + 1) % length;
}

/** Pick the creative for a slot given a shared rotation cursor. */
export function creativeForSlot(
  slot: PartnerSlotId,
  rotationIndex: number,
  creatives: readonly PartnerCreative[] = PLACEHOLDER_PARTNERS,
): PartnerCreative {
  const list = listPartnerCreatives(creatives);
  const offset = SLOT_OFFSET[slot] ?? 0;
  const index = ((rotationIndex + offset) % list.length + list.length) % list.length;
  return list[index]!;
}
