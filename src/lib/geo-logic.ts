/** Pure geo helpers — no browser, no fetch. Safe for Node tests. */

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
  if (country === "US") return "en-US";
  if (country === "GB" || country === "UK") return "en-GB";
  return "fr-CA";
}

/** App stays French; TTS still prefers a French voice even in the US. */
export function frenchVoiceLangFor(localeHint: string) {
  const hint = localeHint.toLowerCase();
  if (hint.startsWith("fr-fr") || hint.startsWith("fr-be") || hint.startsWith("fr-ch")) {
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
