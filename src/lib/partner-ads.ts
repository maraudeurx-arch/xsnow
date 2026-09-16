/**
 * Accueil partner inventory — labeled sponsored slots, never fake news.
 *
 * Soft-launch: rotating house ads that push register (S’inscrire / Mes infos)
 * and share (Partager / invite). A real network (AdSense, Mediavine, Canadian
 * direct-sold, local sponsors) plugs in via NEXT_PUBLIC_ADS_* without mixing
 * ads into headline titles. No click-farm chrome, no invented stories, no
 * claim of live ad revenue.
 */

import { dataUrlByteLength, isSafeImageDataUrl } from "./compress-ad-image.ts";
import { durableGet, durableSet } from "./durable-storage.ts";
import { assetUrl } from "./paths.ts";
import { sanitizeUntrustedText, TITLE_TEXT_MAX } from "./sanitize.ts";

export type AdProvider = "placeholder" | "adsense" | "none";
export type PartnerSlotId = "news-mid" | "news-bottom";
/** House-ad intent until a real sold partner is swapped in. */
export type PartnerGrowthKind = "register" | "share" | "local" | "garderie" | "chambre";

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
  /** Visitor-uploaded photo (data URL, already capped in KB). */
  imageDataUrl?: string;
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
  partnerGrowGarderieName: string;
  partnerGrowGarderieTagline: string;
  partnerGrowChambreName: string;
  partnerGrowChambreTagline: string;
};

export const NEWS_PARTNER_SLOTS: readonly PartnerSlotId[] = ["news-mid", "news-bottom"];

/** How often placeholder creatives advance (ms). */
export const PARTNER_ROTATION_MS = 9_000;

/** localStorage key for the shared rotation cursor (safe / durable). */
export const PARTNER_ROTATION_KEY = "xsnow.partnerAdRotation";

/** One device-local visitor photo ad (Publicité), never a CDN object. */
export const VISITOR_ADS_KEY = "xsnow.visitorPartnerAds";

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
  {
    id: "placeholder-garderie",
    kind: "garderie",
    href: PARTNER_REGISTER_HREF,
    imagePath: "/partners/garderie.svg",
  },
  {
    id: "placeholder-chambre",
    kind: "chambre",
    href: PARTNER_REGISTER_HREF,
    imagePath: "/partners/chambre-gatineau-centre.png",
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
  visitor: readonly PartnerCreative[] = [],
): readonly PartnerCreative[] {
  const house = creatives.length ? creatives : PLACEHOLDER_PARTNERS;
  const extra = visitor.filter((item) => partnerCreativeImageUrl(item));
  return extra.length ? [...extra, ...house] : house;
}

export function partnerCreativeImageUrl(creative: PartnerCreative): string | null {
  const data = (creative.imageDataUrl || "").trim();
  if (data && isSafeImageDataUrl(data)) return data;
  const path = (creative.imagePath || "").trim();
  if (!path) return null;
  if (isSafeImageDataUrl(path)) return path;
  if (path.startsWith("data:")) return null;
  return assetUrl(path);
}

/** Safe download filename for a published creative (never a news headline). */
export function partnerCreativeDownloadName(creative: PartnerCreative): string {
  if (creative.imageDataUrl || (creative.imagePath || "").startsWith("data:")) {
    const id = creative.id.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "visite";
    return `publicite-${id}.jpg`;
  }
  const fromPath = filenameFromImagePath(creative.imagePath || "");
  if (fromPath) return fromPath;
  const id = creative.id.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "creative";
  return `publicite-${id}.png`;
}

export function filenameFromImagePath(imagePath: string): string | null {
  const trimmed = imagePath.trim();
  if (!trimmed) return null;
  let path = trimmed.split("?")[0] || "";
  try {
    if (/^https?:\/\//i.test(trimmed)) path = new URL(trimmed).pathname;
  } catch {
    // Keep the raw path if URL parsing fails.
  }
  const raw = (path.split("/").pop() || "").trim();
  const cleaned = raw.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "");
  if (cleaned && /\.[a-z0-9]{2,5}$/i.test(cleaned)) return cleaned;
  return cleaned || null;
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
      : creative.kind === "chambre"
        ? { name: copy.partnerGrowChambreName, tagline: copy.partnerGrowChambreTagline }
        : creative.kind === "garderie"
          ? { name: copy.partnerGrowGarderieName, tagline: copy.partnerGrowGarderieTagline }
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

export type VisitorPartnerAd = {
  id: string;
  name: string;
  tagline: string;
  imageDataUrl: string;
  bytes: number;
  createdAt: string;
};

function clipAdText(value: string, max = TITLE_TEXT_MAX): string {
  return sanitizeUntrustedText(value, { max });
}

export function visitorAdToCreative(ad: VisitorPartnerAd): PartnerCreative {
  return {
    id: ad.id,
    kind: "local",
    href: "/business",
    imageDataUrl: ad.imageDataUrl,
    name: ad.name,
    tagline: ad.tagline,
  };
}

export function parseVisitorAds(raw: string | null | undefined): VisitorPartnerAd[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const ads: VisitorPartnerAd[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const item = row as Partial<VisitorPartnerAd>;
      const imageDataUrl = typeof item.imageDataUrl === "string" ? item.imageDataUrl.trim() : "";
      if (!isSafeImageDataUrl(imageDataUrl)) continue;
      const id = clipAdText(String(item.id || "visite"), 40) || "visite";
      const name = clipAdText(String(item.name || ""), TITLE_TEXT_MAX);
      if (!name) continue;
      const tagline = clipAdText(String(item.tagline || ""), 180);
      const bytes = Number(item.bytes);
      ads.push({
        id: id.startsWith("visitor-") ? id : `visitor-${id}`,
        name,
        tagline,
        imageDataUrl,
        bytes: Number.isFinite(bytes) && bytes > 0 ? bytes : dataUrlByteLength(imageDataUrl),
        createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
      });
    }
    return ads.slice(0, 1);
  } catch {
    return [];
  }
}

export function readVisitorPartnerCreatives(store?: Storage): PartnerCreative[] {
  return parseVisitorAds(durableGet(VISITOR_ADS_KEY, store)).map(visitorAdToCreative);
}

export function writeVisitorPartnerAd(ad: VisitorPartnerAd) {
  if (!isSafeImageDataUrl(ad.imageDataUrl)) return false;
  const name = clipAdText(ad.name, TITLE_TEXT_MAX);
  if (!name) return false;
  const record: VisitorPartnerAd = {
    id: ad.id.startsWith("visitor-") ? ad.id : `visitor-${ad.id}`,
    name,
    tagline: clipAdText(ad.tagline, 180),
    imageDataUrl: ad.imageDataUrl.trim(),
    bytes: ad.bytes,
    createdAt: ad.createdAt || new Date().toISOString(),
  };
  durableSet(VISITOR_ADS_KEY, JSON.stringify([record]));
  return true;
}
