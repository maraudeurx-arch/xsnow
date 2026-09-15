/**
 * UI locales for v1.
 *
 * To add a 4th language (e.g. Portuguese `pt`):
 * 1. Add the code to `Locale` below
 * 2. Add `src/lib/i18n/pt.ts` exporting `pt` with the same shape as `fr`
 * 3. Register it in `DICTIONARIES` (`index.ts`)
 * 4. Map `pt*` in `detectLocale`
 * 5. Add a label in each dictionary’s `settings.languages`
 */

export const LOCALES = ["fr", "en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";
export const LANG_STORAGE_KEY = "xsnow.lang";

export function isLocale(value: unknown): value is Locale {
  return value === "fr" || value === "en" || value === "es";
}

export function detectLocale(languages: readonly string[]): Locale {
  for (const raw of languages) {
    const tag = raw.trim().toLowerCase();
    if (!tag) continue;
    const primary = tag.split("-")[0];
    if (primary === "fr") return "fr";
    if (primary === "en") return "en";
    if (primary === "es") return "es";
  }
  return DEFAULT_LOCALE;
}

export function parseLangOverride(search: string): Locale | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const raw = params.get("lang");
  return isLocale(raw) ? raw : null;
}

export function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isLocale(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeStoredLocale(locale: Locale) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LANG_STORAGE_KEY, JSON.stringify(locale));
}

export function browserLanguages(): string[] {
  if (typeof navigator === "undefined") return [];
  if (Array.isArray(navigator.languages) && navigator.languages.length) {
    return [...navigator.languages];
  }
  if (navigator.language) return [navigator.language];
  return [];
}

export function interpolate(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}
