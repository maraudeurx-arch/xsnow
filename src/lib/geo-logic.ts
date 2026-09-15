/** Pure geo helpers — no browser, no fetch. Safe for Node tests. */

/** Dev/default seed city — never a live label for coordinates elsewhere. */
export const SEED_CITY = "Gatineau";
export const SEED_LAT = 45.4765;
export const SEED_LON = -75.7013;
/** Ottawa–Gatineau metro; Haiti and other countries are thousands of km away. */
export const SEED_CITY_MAX_KM = 80;

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isNearSeedCity(lat: number, lon: number, maxKm = SEED_CITY_MAX_KM): boolean {
  return distanceKm(lat, lon, SEED_LAT, SEED_LON) <= maxKm;
}

function normalizeSeedCity(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** True when a geocoder (or old storage) stamped the seed city on far-away GPS. */
export function isImplausibleSeedCity(
  city: string,
  lat: number | null,
  lon: number | null,
  seedCity = SEED_CITY,
): boolean {
  if (normalizeSeedCity(city) !== normalizeSeedCity(seedCity)) return false;
  if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return false;
  }
  return !isNearSeedCity(lat, lon);
}

export function acceptGeoResult(
  lat: number,
  lon: number,
  result: { city?: string } | null,
): result is { city: string } {
  const city = typeof result?.city === "string" ? result.city.trim() : "";
  if (!city) return false;
  return !isImplausibleSeedCity(city, lat, lon);
}

export function inferLocaleHint(countryCode: string, region?: string | null): string {
  const country = countryCode.trim().toUpperCase();
  const regionKey = (region ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (country === "CA") {
    const frenchCa = new Set([
      "quebec",
      "québec",
      "qc",
      "ca-qc",
      "ontario",
      "on",
      "ca-on",
      "new brunswick",
      "nouveau-brunswick",
      "nb",
      "ca-nb",
    ]);
    if (!regionKey || frenchCa.has(regionKey)) return "fr-CA";
    return "fr-CA";
  }
  if (country === "FR") return "fr-FR";
  if (country === "BE") return "fr-BE";
  if (country === "CH") return "fr-CH";
  if (country === "HT") return "fr-HT";
  if (country === "US") return "en-US";
  if (country === "GB" || country === "UK") return "en-GB";
  return "fr-CA";
}

/** App stays French; TTS still prefers a French voice even in the US. */
export function frenchVoiceLangFor(localeHint: string) {
  const hint = localeHint.toLowerCase();
  if (
    hint.startsWith("fr-fr") ||
    hint.startsWith("fr-be") ||
    hint.startsWith("fr-ch") ||
    hint.startsWith("fr-ht")
  ) {
    return "fr-FR";
  }
  return "fr-CA";
}

export function parseCityOverride(search: string): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const raw = params.get("city");
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
}

export function parseGeoPromptOverride(search: string): boolean {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get("geo") === "prompt";
}

export function geoResultFromPayload(payload: unknown): {
  city: string;
  countryCode: string;
  localeHint: string;
} | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as {
    city?: unknown;
    countryCode?: unknown;
    localeHint?: unknown;
  };
  const city = typeof record.city === "string" ? record.city.trim() : "";
  const countryCode =
    typeof record.countryCode === "string" && record.countryCode.trim()
      ? record.countryCode.trim().toUpperCase()
      : "";
  const localeHint =
    typeof record.localeHint === "string" && record.localeHint.trim()
      ? record.localeHint.trim()
      : "";
  if (!city || !countryCode || !localeHint) return null;
  return { city, countryCode, localeHint };
}
