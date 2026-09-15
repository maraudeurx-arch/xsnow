/**
 * Versioned public catalog for GOV+owner-approved community content.
 *
 * Soft launch: empty. Do not put a visitor’s (or the owner’s) personal offers,
 * Interac, PayPal, requests, or ideas here until a numbered release.
 * The app loads `public/catalog/<APP_VERSION>.json`; missing/invalid files
 * fall back to this empty catalog — never to a seeded personal listing.
 */

import { APP_RELEASE_DATE, APP_VERSION } from "./app-version.ts";
import { parseStoredIdea, type CommunityIdea } from "./ideas.ts";
import { isInjectedSeedId, parseStoredOffer, type CommunityOffer } from "./offers.ts";
import { assetUrl } from "./paths.ts";
import { SERVICE_KINDS, type ServiceKind, type ServiceListing } from "./services.ts";

export type CatalogReleaseNote = {
  version: string;
  date: string;
  text: string;
};

export type PublicCatalog = {
  version: string;
  updated: string;
  offers: CommunityOffer[];
  ideas: CommunityIdea[];
  services: ServiceListing[];
  notes: CatalogReleaseNote[];
};

export const EMPTY_PUBLIC_CATALOG: PublicCatalog = {
  version: APP_VERSION,
  updated: APP_RELEASE_DATE,
  offers: [],
  ideas: [],
  services: [],
  notes: [
    {
      version: APP_VERSION,
      date: APP_RELEASE_DATE,
      text: "Soft launch: empty public catalog. Personal offers, requests, and ideas stay on-device until GOV+owner approval ships them in a numbered release.",
    },
  ],
};

export function catalogAssetPath(version = APP_VERSION) {
  return `/catalog/${version}.json`;
}

export function catalogAssetUrl(version = APP_VERSION) {
  return assetUrl(catalogAssetPath(version));
}

function isServiceKindValue(value: unknown): value is ServiceKind {
  return typeof value === "string" && (SERVICE_KINDS as readonly string[]).includes(value);
}

function parseCatalogService(raw: unknown): ServiceListing | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (!isServiceKindValue(record.service)) return null;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  const title = typeof record.title === "string" ? record.title.trim() : "";
  if (!id || !title || isInjectedSeedId(id)) return null;
  const side = record.side === "demande" ? "demande" : "offre";
  const price = typeof record.price === "number" && Number.isFinite(record.price) ? record.price : 0;
  return {
    id,
    service: record.service,
    side,
    title,
    description: typeof record.description === "string" ? record.description : "",
    neighborhood: typeof record.neighborhood === "string" ? record.neighborhood : "",
    radiusKm: typeof record.radiusKm === "number" && Number.isFinite(record.radiusKm) ? record.radiusKm : 3,
    price,
    currency: typeof record.currency === "string" && record.currency ? record.currency : "CAD",
    rateUnit:
      record.rateUnit === "heure" ||
      record.rateUnit === "forfait" ||
      record.rateUnit === "jour" ||
      record.rateUnit === "pret" ||
      record.rateUnit === "course"
        ? record.rateUnit
        : "course",
    objectName: typeof record.objectName === "string" ? record.objectName : undefined,
    collateralAmount:
      typeof record.collateralAmount === "number" && Number.isFinite(record.collateralAmount)
        ? record.collateralAmount
        : undefined,
    collateralCurrency: typeof record.collateralCurrency === "string" ? record.collateralCurrency : undefined,
    collateralStatus:
      record.collateralStatus === "proposee" ||
      record.collateralStatus === "convenue" ||
      record.collateralStatus === "en_attente" ||
      record.collateralStatus === "liberee"
        ? record.collateralStatus
        : undefined,
    createdAt:
      typeof record.createdAt === "string" && record.createdAt ? record.createdAt : new Date().toISOString(),
  };
}

function parseNotes(raw: unknown): CatalogReleaseNote[] {
  if (!Array.isArray(raw)) return EMPTY_PUBLIC_CATALOG.notes;
  const notes: CatalogReleaseNote[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const version = typeof record.version === "string" ? record.version.trim() : "";
    const date = typeof record.date === "string" ? record.date.trim() : "";
    const text = typeof record.text === "string" ? record.text.trim() : "";
    if (!version || !text) continue;
    notes.push({ version, date, text });
  }
  return notes.length ? notes : EMPTY_PUBLIC_CATALOG.notes;
}

export function parsePublicCatalog(raw: unknown): PublicCatalog {
  if (!raw || typeof raw !== "object") return EMPTY_PUBLIC_CATALOG;
  const record = raw as Record<string, unknown>;
  const offers = Array.isArray(record.offers)
    ? record.offers
        .map(parseStoredOffer)
        .filter((item): item is CommunityOffer => Boolean(item?.published && !isInjectedSeedId(item.id)))
    : [];
  const ideas = Array.isArray(record.ideas)
    ? record.ideas.map(parseStoredIdea).filter((item): item is CommunityIdea => Boolean(item))
    : [];
  const services = Array.isArray(record.services)
    ? record.services.map(parseCatalogService).filter((item): item is ServiceListing => Boolean(item))
    : [];
  return {
    version: typeof record.version === "string" && record.version.trim() ? record.version.trim() : APP_VERSION,
    updated: typeof record.updated === "string" && record.updated.trim() ? record.updated.trim() : APP_RELEASE_DATE,
    offers,
    ideas,
    services,
    notes: parseNotes(record.notes),
  };
}

type FetchLike = (input: string, init?: { cache?: RequestCache }) => Promise<{
  ok: boolean;
  json: () => Promise<unknown>;
}>;

export async function loadPublicCatalog(
  fetcher: FetchLike | undefined = typeof fetch === "function" ? fetch : undefined,
  version = APP_VERSION,
): Promise<PublicCatalog> {
  if (!fetcher) return EMPTY_PUBLIC_CATALOG;
  try {
    const response = await fetcher(catalogAssetUrl(version), { cache: "no-store" });
    if (!response.ok) return EMPTY_PUBLIC_CATALOG;
    return parsePublicCatalog(await response.json());
  } catch {
    return EMPTY_PUBLIC_CATALOG;
  }
}
