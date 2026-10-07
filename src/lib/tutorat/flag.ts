/**
 * Helpers for the hidden `/tutorat` section.
 *
 * Mechanism: the route lives in `src/app/tutorat/page.tutorat.tsx`. Next only
 * picks that file up when the `tutorat.tsx` extension is part of
 * `pageExtensions`, which the app config adds only when `NEXT_PUBLIC_TUTORAT=1`
 * at build time. Without the flag the file is ignored and the route is absent
 * from the static export.
 */

/** Environment variable that turns the hidden section on at build time. */
export const TUTORAT_FLAG = "NEXT_PUBLIC_TUTORAT";

/** Page extensions used when the flag is off. */
export const BASE_PAGE_EXTENSIONS = ["tsx", "ts", "jsx", "js"] as const;

/**
 * Returns true only when the flag value, trimmed, is exactly `"1"`.
 * Any other value (`""`, `"0"`, `"true"`, `"01"`, undefined) disables the section.
 */
export function isTutoratEnabled(env: Record<string, string | undefined>): boolean {
  const raw = env[TUTORAT_FLAG];
  if (typeof raw !== "string") return false;
  return raw.trim() === "1";
}

/**
 * Returns the page extensions to use for this build: the base list, plus
 * `"tutorat.tsx"` when the flag is enabled. Always returns a fresh array.
 */
export function tutoratPageExtensions(env: Record<string, string | undefined>): string[] {
  const extensions: string[] = [...BASE_PAGE_EXTENSIONS];
  if (isTutoratEnabled(env)) extensions.push("tutorat.tsx");
  return extensions;
}
