/**
 * Accueil partner inventory — labeled sponsored slots, never fake news.
 *
 * Soft-launch: rotating house ads that push register (S’inscrire / Mes infos)
 * and share (Partager / invite). A real network (AdSense, Mediavine, Canadian
 * direct-sold, local sponsors) plugs in via NEXT_PUBLIC_ADS_* without mixing
 * ads into headline titles. No click-farm chrome, no invented stories, no
 * claim of live ad revenue.
 */

import { durableGet, durableSet } from "./durable-storage.ts";
import { assetUrl } from "./paths.ts";

export type AdProvider = "placeholder" | "adsense" | "none";
export type PartnerSlotId = "news-mid" | "news-bottom";
/** House-ad intent until a real sold partner is swapped in. */
export type PartnerGrowthKind = "register" | "share" | "local";

export const PARTNER_REGISTER_HREF = "/mon-profil";
export const PARTNER_SHARE_HREF = "/mon-profil/inviter";

export type PartnerCreative = {
  id: string;
  /** Soft-launch house-ad intent (register / share / local partner). */
  kind: PartnerGrowthKind;
  /** Destination when the creative is tapped (in-app path or https). */
  href: string;
  /** Optional creative art (served under basePath via assetUrl). */
  imagePath?: string;
  /** Override display name for a real sold partner. */
  name?: string;
  /** Override blurb for a real sold partner — never a news headline. */
  tagline?: string;
  /** Override CTA chip for a real sold partner. */
  cta?: string;
};

/** i18n slice used to resolve house-ad copy (FR/EN/ES). */
export type PartnerSlotCopy = {
  partnerCtaRegister: string;
  partnerCtaShare: string;
  partnerGrowRegisterName: string;
  partnerGrowRegisterTagline: string;
  partnerGrowShareName: string;
  partnerGrowShareTagline: string;
  partnerGrowLocalName: string;
  partnerGrowLocalTagline: string;
};

export const NEWS_PARTNER_SLOTS: readonly PartnerSlotId[] = ["news-mid", "news-bottom"];

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
    kind: "register",
    href: PARTNER_REGISTER_HREF,
    imagePath: "/partners/coop.svg",
  },
  {
    id: "placeholder-atelier",
    kind: "share",
    href: PARTNER_SHARE_HREF,
    imagePath: "/partners/atelier.svg",
  },
  {
    id: "placeholder-marche",
    kind: "local",
    href: PARTNER_REGISTER_HREF,
    imagePath: "/partners/marche.svg",
  },
];

const SLOT_OFFSET: Record<PartnerSlotId, number> = {
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

export function adsenseSlotId(
  slot: PartnerSlotId,
  env: { mid?: string; bottom?: string } = {
    mid: process.env.NEXT_PUBLIC_ADSENSE_SLOT_NEWS_MID,
    bottom: process.env.NEXT_PUBLIC_ADSENSE_SLOT_NEWS_BOTTOM,
  },
): string {
  const value = slot === "news-mid" ? env.mid : env.bottom;
  return (value || "").trim();
}

export function usesAdsense(
  slot: PartnerSlotId,
  env: {
    provider?: string;
    enabled?: string;
    client?: string;
    mid?: string;
    bottom?: string;
  } = {
    provider: process.env.NEXT_PUBLIC_ADS_PROVIDER,
    enabled: process.env.NEXT_PUBLIC_ADS_ENABLED,
    client: process.env.NEXT_PUBLIC_ADSENSE_CLIENT,
    mid: process.env.NEXT_PUBLIC_ADSENSE_SLOT_NEWS_MID,
    bottom: process.env.NEXT_PUBLIC_ADSENSE_SLOT_NEWS_BOTTOM,
  },
): boolean {
  return (
    adProvider(env.provider, env.enabled) === "adsense" &&
    Boolean(adsenseClientId(env.client)) &&
    Boolean(adsenseSlotId(slot, { mid: env.mid, bottom: env.bottom }))
  );
}

/** Slots to render under real headlines inside Nouvelles du Quartier. */
export function visiblePartnerSlots(
  env: { enabled?: string; provider?: string } = {
    enabled: process.env.NEXT_PUBLIC_ADS_ENABLED,
    provider: process.env.NEXT_PUBLIC_ADS_PROVIDER,
  },
): PartnerSlotId[] {
  if (!adsEnabled(env)) return [];
  return [...NEWS_PARTNER_SLOTS];
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

export function partnerCtaKind(kind: PartnerGrowthKind): "register" | "share" {
  return kind === "share" ? "share" : "register";
}

/** Localized name / tagline / CTA for a placeholder or sold creative. */
export function resolvePartnerCreative(
  creative: PartnerCreative,
  copy: PartnerSlotCopy,
): { name: string; tagline: string; cta: string; href: string; ctaKind: "register" | "share" } {
  const ctaKind = partnerCtaKind(creative.kind);
  const fallbackCta = ctaKind === "share" ? copy.partnerCtaShare : copy.partnerCtaRegister;
  const byKind =
    creative.kind === "share"
      ? { name: copy.partnerGrowShareName, tagline: copy.partnerGrowShareTagline }
      : creative.kind === "local"
        ? { name: copy.partnerGrowLocalName, tagline: copy.partnerGrowLocalTagline }
        : { name: copy.partnerGrowRegisterName, tagline: copy.partnerGrowRegisterTagline };
  return {
    name: (creative.name || byKind.name).trim() || byKind.name,
    tagline: (creative.tagline || byKind.tagline).trim() || byKind.tagline,
    cta: (creative.cta || fallbackCta).trim() || fallbackCta,
    href: creative.href,
    ctaKind,
  };
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
