/**
 * Accueil partner inventory — labeled sponsored slots, never fake news.
 *
 * Placeholders by default. A real network (AdSense, Mediavine, Canadian
 * direct-sold, local sponsors) plugs in via env without mixing ads into
 * headline titles. No click-farm chrome, no invented stories.
 */

export type AdProvider = "placeholder" | "adsense" | "none";
export type PartnerSlotId = "news-mid" | "news-bottom";

export const NEWS_PARTNER_SLOTS: readonly PartnerSlotId[] = ["news-mid", "news-bottom"];

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
