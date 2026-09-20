/**
 * Accueil full-bleed ad reel — one creative at a time.
 * House seeds + optional device-local visitor photo (like Bogo).
 */

import { dataUrlByteLength, isSafeImageDataUrl } from "./compress-ad-image.ts";
import { durableGet, durableSet } from "./durable-storage.ts";
import { assetUrl } from "./paths.ts";
import { sanitizeUntrustedText, TITLE_TEXT_MAX } from "./sanitize.ts";

/** Rotate every 5 seconds. */
export const ACCUEIL_ADS_REEL_MS = 5_000;

/** Device-local visitor business photos shown in the Accueil reel. */
export const VISITOR_ACCUEIL_ADS_KEY = "xsnow.visitorAccueilAds";

export type AccueilAd = {
  id: string;
  /** Path under public/ (house creatives). */
  imagePath?: string;
  /** Visitor-uploaded data URL (already KB-capped). */
  imageDataUrl?: string;
  /** In-app or absolute href when the creative is tapped. */
  href: string;
  /** Short title for alt / aria. */
  title: string;
  /** Soft-launch model creative (seed inventory, not a sold partner slot). */
  example?: boolean;
  /** Optional on-screen caption lines (UI overlay — survives image crop). */
  captionLines?: readonly string[];
};

export type VisitorAccueilAd = {
  id: string;
  title: string;
  imageDataUrl: string;
  bytes: number;
  createdAt: string;
};

/**
 * Order: labeled model ads (business + neighbourhood), then OPC house promos.
 * Visitor photos are prepended at runtime via {@link listAccueilAds}.
 */
export const ACCUEIL_ADS: readonly AccueilAd[] = [
  {
    id: "joase-renov-malabo",
    imagePath: "/ads/joase-renov-malabo.jpg",
    href: "/business",
    title: "Service de rénovation et de peinture — Malabo, Guinée équatoriale",
    captionLines: [
      "Service de rénovation et de peinture",
      "Malabo — Guinée équatoriale",
    ],
  },
  {
    id: "desinsectisation-libreville",
    imagePath: "/ads/desinsectisation-libreville.jpg",
    href: "/business",
    title: "Désinsectisation & dératisation (Libreville)",
  },
  {
    id: "exemple-coiffeuse",
    imagePath: "/ads/exemple-coiffeuse.svg",
    href: "/business",
    title: "Salon Mira — coupe & couleur",
    example: true,
  },
  {
    id: "exemple-plombier",
    imagePath: "/ads/exemple-plombier.svg",
    href: "/business",
    title: "Plomberie Nord — urgence quartier",
    example: true,
  },
  {
    id: "exemple-cafe",
    imagePath: "/ads/exemple-cafe.svg",
    href: "/business",
    title: "Café du coin — brunch & terrasse",
    example: true,
  },
  {
    id: "bogo-cat",
    imagePath: "/ads/bogo-cat.jpg",
    href: "/business",
    title: "Chat perdu — Bogo",
    example: true,
  },
  {
    id: "garderie-zozo",
    imagePath: "/ads/garderie-zozo.jpg",
    href: "/business",
    title: "Place en garderie — Zozo",
    example: true,
  },
  {
    id: "appart-chambre",
    imagePath: "/ads/appart-chambre.jpg",
    href: "/business",
    title: "Chambre à louer",
    example: true,
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

export function visitorToAccueilAd(ad: VisitorAccueilAd): AccueilAd {
  return {
    id: ad.id.startsWith("visitor-") ? ad.id : `visitor-${ad.id}`,
    imageDataUrl: ad.imageDataUrl,
    href: "/business",
    title: sanitizeUntrustedText(ad.title, { max: TITLE_TEXT_MAX }) || "Publicité locale",
  };
}

export function parseVisitorAccueilAds(raw: string | null | undefined): VisitorAccueilAd[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const ads: VisitorAccueilAd[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const item = row as Partial<VisitorAccueilAd>;
      const imageDataUrl = typeof item.imageDataUrl === "string" ? item.imageDataUrl.trim() : "";
      if (!isSafeImageDataUrl(imageDataUrl)) continue;
      const id = typeof item.id === "string" ? item.id.trim() : "";
      if (!id) continue;
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const bytes =
        typeof item.bytes === "number" && Number.isFinite(item.bytes) && item.bytes > 0
          ? item.bytes
          : dataUrlByteLength(imageDataUrl);
      const createdAt =
        typeof item.createdAt === "string" && item.createdAt ? item.createdAt : new Date().toISOString();
      ads.push({
        id: id.startsWith("visitor-") ? id : `visitor-${id}`,
        title,
        imageDataUrl,
        bytes,
        createdAt,
      });
    }
    return ads;
  } catch {
    return [];
  }
}

export function readVisitorAccueilAds(store?: Storage): AccueilAd[] {
  return parseVisitorAccueilAds(durableGet(VISITOR_ACCUEIL_ADS_KEY, store)).map(visitorToAccueilAd);
}

/** Keep the latest visitor photo on this device (one slot, like a soft-launch house ad). */
export function writeVisitorAccueilAd(ad: VisitorAccueilAd): boolean {
  if (!isSafeImageDataUrl(ad.imageDataUrl)) return false;
  const record: VisitorAccueilAd = {
    id: ad.id.startsWith("visitor-") ? ad.id : `visitor-${ad.id}`,
    title: sanitizeUntrustedText(ad.title, { max: TITLE_TEXT_MAX }) || "Publicité locale",
    imageDataUrl: ad.imageDataUrl.trim(),
    bytes: ad.bytes > 0 ? ad.bytes : dataUrlByteLength(ad.imageDataUrl),
    createdAt: ad.createdAt || new Date().toISOString(),
  };
  durableSet(VISITOR_ACCUEIL_ADS_KEY, JSON.stringify([record]));
  return true;
}

export function listAccueilAds(
  house: readonly AccueilAd[] = ACCUEIL_ADS,
  store?: Storage,
): readonly AccueilAd[] {
  const visitor = readVisitorAccueilAds(store);
  const base = house.length ? house : ACCUEIL_ADS;
  return visitor.length ? [...visitor, ...base] : base;
}

export function accueilAdImageUrl(ad: AccueilAd): string {
  const data = (ad.imageDataUrl || "").trim();
  if (data && isSafeImageDataUrl(data)) return data;
  if (ad.imagePath) return assetUrl(ad.imagePath);
  return "";
}

export function nextAccueilAdIndex(current: number, length: number): number {
  if (!length) return 0;
  return (current + 1) % length;
}
