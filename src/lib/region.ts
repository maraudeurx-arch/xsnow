/** Country ISO → regional ambiance. Pure — no browser, no fetch. */

import { parseSeasonParam, seasonFromDate, SEASON_PHOTO, type Season } from "./season.ts";

export const REGIONAL_AMBIANCES = [
  "caribbean",
  "africa",
  "europe",
  "asia",
  "southamerica",
] as const;

export type RegionalAmbiance = (typeof REGIONAL_AMBIANCES)[number];

export type RegionMapResult = RegionalAmbiance | "seasonal";

export type ResolvedAmbiance =
  | { type: "season"; season: Season }
  | { type: "region"; region: RegionalAmbiance };

export const DEFAULT_AMBIANCE_SEASON: Season = "autumn";

export const DEFAULT_AMBIANCE: ResolvedAmbiance = {
  type: "season",
  season: DEFAULT_AMBIANCE_SEASON,
};

/** Haiti, Jamaica, Cuba, DR, Puerto Rico, Trinidad, and other Caribbean territories. */
const CARIBBEAN = new Set([
  "AG",
  "AI",
  "AW",
  "BB",
  "BL",
  "BQ",
  "BS",
  "CU",
  "CW",
  "DM",
  "DO",
  "GD",
  "GP",
  "HT",
  "JM",
  "KN",
  "KY",
  "LC",
  "MF",
  "MQ",
  "MS",
  "PR",
  "SX",
  "TC",
  "TT",
  "VC",
  "VG",
  "VI",
]);

/** Canada and USA keep the four-season calendar. Puerto Rico is Caribbean (`PR`). */
const SEASONAL = new Set(["CA", "US"]);

/** Default Africa ambiance (Sahel / warm dry), including North Africa. */
const AFRICA = new Set([
  "AO",
  "BF",
  "BI",
  "BJ",
  "BW",
  "CD",
  "CF",
  "CG",
  "CI",
  "CM",
  "CV",
  "DJ",
  "DZ",
  "EG",
  "EH",
  "ER",
  "ET",
  "GA",
  "GH",
  "GM",
  "GN",
  "GQ",
  "GW",
  "KE",
  "KM",
  "LR",
  "LS",
  "LY",
  "MA",
  "MG",
  "ML",
  "MR",
  "MU",
  "MW",
  "MZ",
  "NA",
  "NE",
  "NG",
  "RE",
  "RW",
  "SC",
  "SD",
  "SH",
  "SL",
  "SN",
  "SO",
  "SS",
  "ST",
  "SZ",
  "TD",
  "TG",
  "TN",
  "TZ",
  "UG",
  "YT",
  "ZA",
  "ZM",
  "ZW",
]);

const EUROPE = new Set([
  "AD",
  "AL",
  "AT",
  "AX",
  "BA",
  "BE",
  "BG",
  "BY",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FO",
  "FR",
  "GB",
  "GG",
  "GI",
  "GR",
  "HR",
  "HU",
  "IE",
  "IM",
  "IS",
  "IT",
  "JE",
  "LI",
  "LT",
  "LU",
  "LV",
  "MC",
  "MD",
  "ME",
  "MK",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "RS",
  "RU",
  "SE",
  "SI",
  "SK",
  "SM",
  "UA",
  "UK",
  "VA",
  "XK",
]);

const ASIA = new Set([
  "AE",
  "AF",
  "AM",
  "AZ",
  "BD",
  "BH",
  "BN",
  "BT",
  "CN",
  "GE",
  "HK",
  "ID",
  "IL",
  "IN",
  "IQ",
  "IR",
  "JO",
  "JP",
  "KG",
  "KH",
  "KP",
  "KR",
  "KW",
  "KZ",
  "LA",
  "LB",
  "LK",
  "MM",
  "MN",
  "MO",
  "MV",
  "MY",
  "NP",
  "OM",
  "PH",
  "PK",
  "PS",
  "QA",
  "SA",
  "SG",
  "SY",
  "TH",
  "TJ",
  "TL",
  "TM",
  "TR",
  "TW",
  "UZ",
  "VN",
  "YE",
]);

const SOUTH_AMERICA = new Set([
  "AR",
  "BO",
  "BR",
  "CL",
  "CO",
  "EC",
  "FK",
  "GF",
  "GY",
  "PE",
  "PY",
  "SR",
  "UY",
  "VE",
]);

export function normalizeCountryCode(raw: string | null | undefined): string {
  return (raw ?? "").trim().toUpperCase();
}

/**
 * Map a 2-letter ISO country/territory code to an ambiance region.
 * Caribbean is checked before CA/US so `PR` is never treated as US seasons.
 * Unknown / empty → null (caller falls back to autumn).
 */
export function regionForCountry(countryCode: string | null | undefined): RegionMapResult | null {
  const code = normalizeCountryCode(countryCode);
  if (!code) return null;
  if (CARIBBEAN.has(code)) return "caribbean";
  if (SEASONAL.has(code)) return "seasonal";
  if (AFRICA.has(code)) return "africa";
  if (EUROPE.has(code)) return "europe";
  if (ASIA.has(code)) return "asia";
  if (SOUTH_AMERICA.has(code)) return "southamerica";
  return null;
}

const REGION_ALIASES: Record<string, RegionalAmbiance> = {
  caribbean: "caribbean",
  africa: "africa",
  sahel: "africa",
  europe: "europe",
  meadow: "europe",
  asia: "asia",
  terraces: "asia",
  southamerica: "southamerica",
  "south-america": "southamerica",
  andes: "southamerica",
};

export function parseRegionParam(raw: string | null | undefined): RegionalAmbiance | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  return REGION_ALIASES[value] ?? null;
}

export function ambianceKey(ambiance: ResolvedAmbiance): string {
  return ambiance.type === "season" ? `season:${ambiance.season}` : `region:${ambiance.region}`;
}

export function sameAmbiance(a: ResolvedAmbiance, b: ResolvedAmbiance): boolean {
  return ambianceKey(a) === ambianceKey(b);
}

export type ResolveAmbianceInput = {
  countryCode?: string | null;
  seasonOverride?: Season | null;
  regionOverride?: RegionalAmbiance | null;
  now?: Date;
  timeZone?: string;
};

/**
 * Pick the backdrop.
 * 1. `?season=` QA override
 * 2. `?region=` QA override
 * 3. CA/US → calendar season
 * 4. mapped regional static image
 * 5. unknown / no geo → autumn
 */
export function resolveAmbiance(input: ResolveAmbianceInput = {}): ResolvedAmbiance {
  if (input.seasonOverride) {
    return { type: "season", season: input.seasonOverride };
  }
  if (input.regionOverride) {
    return { type: "region", region: input.regionOverride };
  }
  const mapped = regionForCountry(input.countryCode);
  if (mapped === "seasonal") {
    return { type: "season", season: seasonFromDate(input.now, input.timeZone) };
  }
  if (mapped) {
    return { type: "region", region: mapped };
  }
  return DEFAULT_AMBIANCE;
}

export function resolveAmbianceFromSearch(
  search: string,
  countryCode?: string | null,
  now?: Date,
): ResolvedAmbiance {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return resolveAmbiance({
    countryCode,
    seasonOverride: parseSeasonParam(params.get("season")),
    regionOverride: parseRegionParam(params.get("region")),
    now,
  });
}

export const REGIONAL_PHOTO: Record<RegionalAmbiance, { jpeg: string }> = {
  caribbean: { jpeg: "/backgrounds/caribbean.jpg" },
  africa: { jpeg: "/backgrounds/africa-sahel.jpg" },
  europe: { jpeg: "/backgrounds/europe-meadow.jpg" },
  asia: { jpeg: "/backgrounds/asia-terraces.jpg" },
  southamerica: { jpeg: "/backgrounds/southamerica-andes.jpg" },
};

export type AmbiancePhoto = { jpeg: string; webp?: string };

export function photoForAmbiance(ambiance: ResolvedAmbiance): AmbiancePhoto {
  if (ambiance.type === "region") return REGIONAL_PHOTO[ambiance.region];
  return { jpeg: SEASON_PHOTO[ambiance.season] };
}

export function ambianceAttr(ambiance: ResolvedAmbiance): string {
  return ambiance.type === "season" ? ambiance.season : ambiance.region;
}
