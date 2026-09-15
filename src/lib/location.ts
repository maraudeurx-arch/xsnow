/**
 * Visitor place — localStorage only.
 *
 * Same GPS consent will later power « qui est à proximité » and family
 * geofence alerts (école, travail, maison de retraite). This module stores
 * { lat, lon, city, updatedAt } on the phone and reverse-geocodes the city.
 * Do not start realtime tracking, watches, or server-side location shares here.
 */

import { displayCity, lookupKnownCity } from "@/lib/demonym";
import {
  geoResultFromPayload as parseGeoPayload,
  inferLocaleHint,
} from "@/lib/geo-logic";
import { CHAT_API_URL } from "@/lib/llm";

export {
  frenchVoiceLangFor,
  inferLocaleHint,
  parseCityOverride,
  parseGeoPromptOverride,
} from "@/lib/geo-logic";

export const PLACE_STORAGE_KEY = "xsnow.place";
export const GEO_CONSENT_KEY = "xsnow.geoConsent";

export const FALLBACK_CITY = "Gatineau";
export const FALLBACK_COUNTRY = "CA";
export const FALLBACK_LOCALE = "fr-CA";
export const FALLBACK_LAT = 45.4765;
export const FALLBACK_LON = -75.7013;

export type GeoConsent = "unset" | "granted" | "denied" | "skipped";

export type StoredPlace = {
  lat: number | null;
  lon: number | null;
  city: string;
  countryCode: string;
  localeHint: string;
  updatedAt: number;
};

export type GeoResult = {
  city: string;
  countryCode: string;
  localeHint: string;
};

export const GEO_API_URL =
  process.env.NEXT_PUBLIC_GEO_API_URL ||
  `${String(CHAT_API_URL).replace(/\/$/, "")}/geo`;

export function fallbackPlace(now = Date.now()): StoredPlace {
  return {
    lat: FALLBACK_LAT,
    lon: FALLBACK_LON,
    city: FALLBACK_CITY,
    countryCode: FALLBACK_COUNTRY,
    localeHint: FALLBACK_LOCALE,
    updatedAt: now,
  };
}

export function placeFromCityName(city: string, now = Date.now()): StoredPlace {
  const known = lookupKnownCity(city);
  const pretty = displayCity(city) || FALLBACK_CITY;
  return {
    lat: known?.lat ?? null,
    lon: known?.lon ?? null,
    city: pretty,
    countryCode: known?.countryCode ?? FALLBACK_COUNTRY,
    localeHint: known?.localeHint ?? FALLBACK_LOCALE,
    updatedAt: now,
  };
}

export function isGeoConsent(value: unknown): value is GeoConsent {
  return value === "unset" || value === "granted" || value === "denied" || value === "skipped";
}

export function readConsent(): GeoConsent {
  if (typeof window === "undefined") return "unset";
  try {
    const raw = window.localStorage.getItem(GEO_CONSENT_KEY);
    if (!raw) return "unset";
    const parsed = JSON.parse(raw) as unknown;
    return isGeoConsent(parsed) ? parsed : "unset";
  } catch {
    return "unset";
  }
}

export function writeConsent(consent: GeoConsent) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GEO_CONSENT_KEY, JSON.stringify(consent));
}

function isStoredPlace(value: unknown): value is StoredPlace {
  if (!value || typeof value !== "object") return false;
  const record = value as StoredPlace;
  return (
    typeof record.city === "string" &&
    record.city.trim().length > 0 &&
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
    const raw = window.localStorage.getItem(PLACE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isStoredPlace(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeStoredPlace(place: StoredPlace) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLACE_STORAGE_KEY, JSON.stringify(place));
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
  return geoResultFromPayload(await response.json());
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
  return geoFromBigDataCloud(await response.json());
}

export async function reverseGeocode(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<GeoResult> {
  try {
    const fromWorker = await reverseViaWorker(lat, lon, signal);
    if (fromWorker) return fromWorker;
  } catch {
    // Worker missing, CORS, or quota — try the keyless browser geocoder.
  }

  try {
    const fromClient = await reverseViaBigDataCloud(lat, lon, signal);
    if (fromClient) return fromClient;
  } catch {
    // Offline or blocked.
  }

  return {
    city: FALLBACK_CITY,
    countryCode: FALLBACK_COUNTRY,
    localeHint: FALLBACK_LOCALE,
  };
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
