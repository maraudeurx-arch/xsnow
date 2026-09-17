/**
 * Seeded neighbourhood ads for the full-height pubs reel (`/pubs`).
 * House creatives only — labeled publicité, not news headlines, not a
 * personal Mes services listing. Phone numbers stay off data fields.
 */

import { assetUrl } from "./paths.ts";

export const ADS_REEL_MS = 8_000;
export const APARTMENT_RENT_CAD = 533;
export const APARTMENT_AVAILABLE_ON = "2026-10-01";
export const APARTMENT_CITY = "Gatineau";

export type CommunityAdKind = "photo" | "flyer" | "summary";

export type CommunityAd = {
  id: string;
  kind: CommunityAdKind;
  imagePath: string;
  filename: string;
  downloadable: boolean;
  rentCad?: number;
  availableOn?: string;
  city?: string;
};

export const SEED_COMMUNITY_ADS: readonly CommunityAd[] = [
  {
    id: "bogo-cat",
    kind: "photo",
    imagePath: "/ads/bogo-cat.png",
    filename: "bogo-chat.png",
    downloadable: true,
  },
  {
    id: "daycare-flyer",
    kind: "flyer",
    imagePath: "/ads/garderie-quartier.svg",
    filename: "garderie-quartier.svg",
    downloadable: true,
  },
  {
    id: "apartment-gatineau",
    kind: "summary",
    imagePath: "/ads/chambre-gatineau.svg",
    filename: "chambre-gatineau.svg",
    downloadable: true,
    rentCad: APARTMENT_RENT_CAD,
    availableOn: APARTMENT_AVAILABLE_ON,
    city: APARTMENT_CITY,
  },
];

export function listCommunityAds(
  ads: readonly CommunityAd[] = SEED_COMMUNITY_ADS,
): readonly CommunityAd[] {
  return ads.length ? ads : SEED_COMMUNITY_ADS;
}

export function communityAdById(
  id: string,
  ads: readonly CommunityAd[] = SEED_COMMUNITY_ADS,
): CommunityAd | null {
  return ads.find((ad) => ad.id === id) ?? null;
}

export function communityAdImageUrl(ad: CommunityAd): string {
  return assetUrl(ad.imagePath);
}

export function nextAdIndex(current: number, length: number): number {
  if (!length) return 0;
  return (current + 1) % length;
}

export function prevAdIndex(current: number, length: number): number {
  if (!length) return 0;
  return (current - 1 + length) % length;
}

export function formatApartmentSummary(ad: CommunityAd = SEED_COMMUNITY_ADS[2]!): {
  rentCad: number;
  availableOn: string;
  city: string;
} {
  return {
    rentCad: ad.rentCad ?? APARTMENT_RENT_CAD,
    availableOn: ad.availableOn ?? APARTMENT_AVAILABLE_ON,
    city: ad.city ?? APARTMENT_CITY,
  };
}
