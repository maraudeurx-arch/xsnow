/**
 * Reverse geocode {lat,lon} → { city, countryCode, localeHint }.
 * BigDataCloud (no key) first; Nominatim fallback with a proper User-Agent.
 */

export type GeoResult = {
  city: string;
  countryCode: string;
  localeHint: string;
};

const NOMINATIM_UA =
  "XsnowOpenCommunity/1.0 (https://github.com/maraudeurx-arch/xsnow)";

const FRENCH_CA_REGIONS = new Set([
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

function normalizeRegion(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function inferLocaleHint(countryCode: string, region?: string | null): string {
  const country = countryCode.trim().toUpperCase();
  const regionKey = normalizeRegion(region ?? "");
  if (country === "CA") {
    if (!regionKey || FRENCH_CA_REGIONS.has(regionKey)) return "fr-CA";
    return "fr-CA";
  }
  if (country === "FR") return "fr-FR";
  if (country === "BE") return "fr-BE";
  if (country === "CH") return "fr-CH";
  if (country === "US") return "en-US";
  if (country === "GB" || country === "UK") return "en-GB";
  return "fr-CA";
}

export function parseLatLon(input: { lat?: unknown; lon?: unknown; longitude?: unknown }): {
  lat: number;
  lon: number;
} | null {
  const latRaw = input.lat;
  const lonRaw = input.lon ?? input.longitude;
  const lat = typeof latRaw === "number" ? latRaw : typeof latRaw === "string" ? Number(latRaw) : NaN;
  const lon = typeof lonRaw === "number" ? lonRaw : typeof lonRaw === "string" ? Number(lonRaw) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

function pickCity(candidates: Array<unknown>): string | null {
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function fromBigDataCloud(payload: unknown): GeoResult | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as {
    city?: unknown;
    locality?: unknown;
    principalSubdivision?: unknown;
    principalSubdivisionCode?: unknown;
    countryCode?: unknown;
  };
  const city = pickCity([record.city, record.locality, record.principalSubdivision]);
  const countryCode =
    typeof record.countryCode === "string" ? record.countryCode.trim().toUpperCase() : "";
  if (!city || !countryCode) return null;
  const region =
    (typeof record.principalSubdivisionCode === "string" && record.principalSubdivisionCode) ||
    (typeof record.principalSubdivision === "string" && record.principalSubdivision) ||
    "";
  return {
    city,
    countryCode,
    localeHint: inferLocaleHint(countryCode, region),
  };
}

function fromNominatim(payload: unknown): GeoResult | null {
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
  const city = pickCity([
    address.city,
    address.town,
    address.village,
    address.municipality,
    address.county,
  ]);
  const countryCode =
    typeof address.country_code === "string" ? address.country_code.trim().toUpperCase() : "";
  if (!city || !countryCode) return null;
  return {
    city,
    countryCode,
    localeHint: inferLocaleHint(
      countryCode,
      typeof address.state === "string" ? address.state : null,
    ),
  };
}

async function fetchJson(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) return null;
  return response.json();
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeoResult> {
  const signal = AbortSignal.timeout ? AbortSignal.timeout(8_000) : undefined;

  try {
    const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("localityLanguage", "fr");
    const payload = await fetchJson(url.toString(), {
      headers: { Accept: "application/json" },
      signal,
    });
    const parsed = fromBigDataCloud(payload);
    if (parsed) return parsed;
  } catch {
    // Try Nominatim.
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("format", "json");
    url.searchParams.set("accept-language", "fr");
    const payload = await fetchJson(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": NOMINATIM_UA,
      },
      signal,
    });
    const parsed = fromNominatim(payload);
    if (parsed) return parsed;
  } catch {
    // Fallback city.
  }

  return { city: "Gatineau", countryCode: "CA", localeHint: "fr-CA" };
}
