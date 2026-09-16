/**
 * Visitor place — device-local (localStorage + IndexedDB backup).
 *
 * Same GPS consent will later power « qui est à proximité » and family
 * geofence alerts (école, travail, maison de retraite). This module stores
 * { lat, lon, city, updatedAt } on the phone and reverse-geocodes the city.
 * Do not start realtime tracking, watches, or server-side location shares here.
 */

import { displayCity } from "@/lib/demonym";
import { durableGet, durableSet } from "./durable-storage.ts";
import {
  acceptGeoResult,
  geoResultFromPayload as parseGeoPayload,
  inferLocaleHint,
} from "@/lib/geo-logic";
import { CHAT_API_URL } from "@/lib/llm";
import { isGeoConsent, type GeoConsent, type GeoResult, type StoredPlace } from "@/lib/place-logic";

export {
  frenchVoiceLangFor,
  inferLocaleHint,
  parseCityOverride,
  parseGeoPromptOverride,
} from "@/lib/geo-logic";

export {
  FALLBACK_CITY,
  FALLBACK_COUNTRY,
  FALLBACK_LAT,
  FALLBACK_LOCALE,
  FALLBACK_LON,
  brandingForPlace,
  coordsOnlyPlace,
  fallbackPlace,
  isGeoConsent,
  isSeedFallbackPlace,
  placeFromCityName,
  placeToKeepOnSkip,
  sanitizeStoredPlace,
  unresolvedPlace,
  type GeoConsent,
  type GeoResult,
  type PlaceBranding,
  type StoredPlace,
} from "@/lib/place-logic";

export const PLACE_STORAGE_KEY = "xsnow.place";
export const GEO_CONSENT_KEY = "xsnow.geoConsent";

export const GEO_API_URL =
  process.env.NEXT_PUBLIC_GEO_API_URL ||
  `${String(CHAT_API_URL).replace(/\/$/, "")}/geo`;

export function readConsent(): GeoConsent {
  if (typeof window === "undefined") return "unset";
  try {
    const raw = durableGet(GEO_CONSENT_KEY);
    if (!raw) return "unset";
    const parsed = JSON.parse(raw) as unknown;
    return isGeoConsent(parsed) ? parsed : "unset";
  } catch {
    return "unset";
  }
}

export function writeConsent(consent: GeoConsent) {
  if (typeof window === "undefined") return;
  durableSet(GEO_CONSENT_KEY, JSON.stringify(consent));
}

function isStoredPlace(value: unknown): value is StoredPlace {
  if (!value || typeof value !== "object") return false;
  const record = value as StoredPlace;
  return (
    typeof record.city === "string" &&
    typeof record.countryCode === "string" &&
    typeof record.localeHint === "string" &&
    typeof record.updatedAt === "number" &&
    (record.lat === null || typeof record.lat === "number") &&
    (record.lon === null || typeof record.lon === "number")
  );
}

export function readStoredPlace(): StoredPlace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = durableGet(PLACE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isStoredPlace(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeStoredPlace(place: StoredPlace) {
  if (typeof window === "undefined") return;
  durableSet(PLACE_STORAGE_KEY, JSON.stringify(place));
}

function cityFromUnknown(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.toLowerCase() !== "null" ? trimmed : null;
}

export function geoResultFromPayload(payload: unknown): GeoResult | null {
  const parsed = parseGeoPayload(payload);
  if (!parsed) return null;
  return { ...parsed, city: displayCity(parsed.city) };
}

function geoFromBigDataCloud(payload: unknown): GeoResult | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as {
    city?: unknown;
    locality?: unknown;
    principalSubdivision?: unknown;
    principalSubdivisionCode?: unknown;
    countryCode?: unknown;
  };
  const city =
    cityFromUnknown(record.city) ||
    cityFromUnknown(record.locality) ||
    cityFromUnknown(record.principalSubdivision);
  const countryCode =
    typeof record.countryCode === "string" ? record.countryCode.trim().toUpperCase() : "";
  if (!city || !countryCode) return null;
  const region =
    (typeof record.principalSubdivisionCode === "string" && record.principalSubdivisionCode) ||
    (typeof record.principalSubdivision === "string" && record.principalSubdivision) ||
    "";
  return {
    city: displayCity(city),
    countryCode,
    localeHint: inferLocaleHint(countryCode, region),
  };
}

function acceptOrNull(lat: number, lon: number, result: GeoResult | null): GeoResult | null {
  if (!result || !acceptGeoResult(lat, lon, result)) return null;
  return result;
}

async function reverseViaWorker(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<GeoResult | null> {
  const response = await fetch(GEO_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lon }),
    signal,
  });
  if (!response.ok) return null;
  return acceptOrNull(lat, lon, geoResultFromPayload(await response.json()));
}

async function reverseViaBigDataCloud(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<GeoResult | null> {
  const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("localityLanguage", "fr");
  const response = await fetch(url, { signal });
  if (!response.ok) return null;
  return acceptOrNull(lat, lon, geoFromBigDataCloud(await response.json()));
}

function geoFromNominatim(payload: unknown): GeoResult | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as {
    address?: {
      city?: unknown;
      town?: unknown;
      village?: unknown;
      municipality?: unknown;
      county?: unknown;
      state?: unknown;
      country_code?: unknown;
    };
  };
  const address = record.address;
  if (!address) return null;
  const city =
    cityFromUnknown(address.city) ||
    cityFromUnknown(address.town) ||
    cityFromUnknown(address.village) ||
    cityFromUnknown(address.municipality) ||
    cityFromUnknown(address.county);
  const countryCode =
    typeof address.country_code === "string" ? address.country_code.trim().toUpperCase() : "";
  if (!city || !countryCode) return null;
  return {
    city: displayCity(city),
    countryCode,
    localeHint: inferLocaleHint(
      countryCode,
      typeof address.state === "string" ? address.state : null,
    ),
  };
}

async function reverseViaNominatim(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<GeoResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "json");
  url.searchParams.set("accept-language", "fr");
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  return acceptOrNull(lat, lon, geoFromNominatim(await response.json()));
}

export async function reverseGeocode(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<GeoResult | null> {
  try {
    const fromWorker = await reverseViaWorker(lat, lon, signal);
    if (fromWorker) return fromWorker;
  } catch {
    // Worker missing, CORS, or quota — try keyless browser geocoders.
  }

  try {
    const fromClient = await reverseViaBigDataCloud(lat, lon, signal);
    if (fromClient) return fromClient;
  } catch {
    // Offline or blocked.
  }

  try {
    const fromNominatim = await reverseViaNominatim(lat, lon, signal);
    if (fromNominatim) return fromNominatim;
  } catch {
    // Nominatim blocked in the browser — stay unresolved, never fake Gatineau.
  }

  return null;
}

/**
 * Future: list neighbours / commerces near { lat, lon }.
 * Intentionally empty — no realtime proximity in this PR.
 */
export async function fetchNearbyPeople(place: StoredPlace): Promise<[]> {
  void place;
  return [];
}

/**
 * Future: alert when a child, partner, or parent leaves a trusted zone.
 * Returns an unsubscribe no-op so call sites can wire it later.
 */
export function watchFamilyGeofences(opts?: {
  members?: Array<{ id: string; lat: number; lon: number }>;
}): () => void {
  void opts;
  return () => {};
}
