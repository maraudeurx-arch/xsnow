/** Pure place helpers — no browser, no fetch. Safe for Node tests. */

import { demonymFor, displayCity, lookupKnownCity, placeName } from "./demonym.ts";
import { isImplausibleSeedCity, SEED_CITY, SEED_LAT, SEED_LON } from "./geo-logic.ts";
import type { Locale } from "./i18n/locales.ts";

export const FALLBACK_CITY = SEED_CITY;
export const FALLBACK_COUNTRY = "CA";
export const FALLBACK_LOCALE = "fr-CA";
export const FALLBACK_LAT = SEED_LAT;
export const FALLBACK_LON = SEED_LON;

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

/** Neutral place until GPS / ?city= / a real stored city is known. */
export function unresolvedPlace(now = Date.now()): StoredPlace {
  return {
    lat: null,
    lon: null,
    city: "",
    countryCode: "",
    localeHint: "",
    updatedAt: now,
  };
}

export function isSeedFallbackPlace(place: StoredPlace, seedCity = FALLBACK_CITY): boolean {
  if (place.city.trim().toLowerCase() !== seedCity.toLowerCase()) return false;
  if (place.lat == null || place.lon == null) return true;
  return Math.abs(place.lat - FALLBACK_LAT) < 0.0002 && Math.abs(place.lon - FALLBACK_LON) < 0.0002;
}

/**
 * Drop the Gatineau seed when it was never a live fix, and never keep
 * "Gatineau" attached to coordinates that are clearly somewhere else.
 */
export function sanitizeStoredPlace(place: StoredPlace | null, consent: GeoConsent): StoredPlace {
  if (!place) return unresolvedPlace();

  if (isImplausibleSeedCity(place.city, place.lat, place.lon)) {
    return {
      ...place,
      city: "",
      countryCode: place.countryCode === FALLBACK_COUNTRY ? "" : place.countryCode,
      localeHint: place.localeHint === FALLBACK_LOCALE ? "" : place.localeHint,
    };
  }

  if (consent !== "granted" && isSeedFallbackPlace(place)) {
    return unresolvedPlace(place.updatedAt);
  }

  return place;
}

export function placeToKeepOnSkip(stored: StoredPlace | null): StoredPlace {
  const cleaned = sanitizeStoredPlace(stored, "skipped");
  return cleaned.city.trim() ? cleaned : unresolvedPlace();
}

export type PlaceBranding = {
  city: string;
  placeName: string;
  demonym: string;
  resolved: boolean;
};

export function brandingForPlace(
  city: string,
  locale: Locale,
  labels: { neighborhood: string; wordmark: string; demonym: string },
): PlaceBranding {
  const trimmed = city.trim();
  if (!trimmed) {
    return {
      city: labels.neighborhood,
      placeName: placeName(labels.wordmark),
      demonym: labels.demonym,
      resolved: false,
    };
  }
  return {
    city: displayCity(trimmed),
    placeName: placeName(trimmed),
    demonym: demonymFor(trimmed, locale),
    resolved: true,
  };
}

export function coordsOnlyPlace(lat: number, lon: number, now = Date.now()): StoredPlace {
  return {
    lat,
    lon,
    city: "",
    countryCode: "",
    localeHint: "",
    updatedAt: now,
  };
}

export function placeFromCityName(city: string, now = Date.now()): StoredPlace {
  const trimmed = city.trim();
  if (!trimmed) return unresolvedPlace(now);
  const known = lookupKnownCity(trimmed);
  const pretty = displayCity(trimmed) || trimmed;
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
