/**
 * Accueil full-bleed ad reel — one creative at a time, image fills the slot.
 * House + OPC promos only (labeled publicité, not news).
 */

import { assetUrl } from "./paths.ts";

/** Rotate every 5 seconds as requested. */
export const ACCUEIL_ADS_REEL_MS = 5_000;

export type AccueilAd = {
  id: string;
  /** Path under public/ */
  imagePath: string;
  /** In-app or absolute href when the creative is tapped. */
  href: string;
  /** Short FR title for alt / aria. */
  title: string;
};

/**
 * Order: neighbourhood examples first, then OPC house promos.
 */
export const ACCUEIL_ADS: readonly AccueilAd[] = [
  {
    id: "bogo-cat",
    imagePath: "/ads/bogo-cat.jpg",
    href: "/",
    title: "Chat perdu — Bogo",
  },
  {
    id: "garderie-zozo",
    imagePath: "/ads/garderie-zozo.jpg",
    href: "/",
    title: "Place en garderie — Zozo",
  },
  {
    id: "appart-chambre",
    imagePath: "/ads/appart-chambre.jpg",
    href: "/",
    title: "Chambre à louer — environ 533 $/mois",
  },
  {
    id: "opc-competences",
    imagePath: "/promo/competences.png",
    href: "/promo/competences.html",
    title: "Open Community — Faites connaître votre compétence",
  },
  {
    id: "opc-commerce",
    imagePath: "/promo/commerce.png",
    href: "/promo/commerce.html",
    title: "Open Community — Faites connaître votre commerce",
  },
];

export function listAccueilAds(
  ads: readonly AccueilAd[] = ACCUEIL_ADS,
): readonly AccueilAd[] {
  return ads.length ? ads : ACCUEIL_ADS;
}

export function accueilAdImageUrl(ad: AccueilAd): string {
  return assetUrl(ad.imagePath);
}

export function nextAccueilAdIndex(current: number, length: number): number {
  if (!length) return 0;
  return (current + 1) % length;
}
