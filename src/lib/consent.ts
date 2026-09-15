/**
 * Optional analytics consent — localStorage only.
 *
 * Location consent stays in `location.ts` (`xsnow.geoConsent`). Both must be
 * answered before the app asks the browser for GPS or POSTs usage events.
 */

export const ANALYTICS_CONSENT_KEY = "xsnow.analyticsConsent";

export type AnalyticsConsent = "unset" | "granted" | "denied";

const listeners = new Set<() => void>();
let cached: AnalyticsConsent | undefined;

export function isAnalyticsConsent(value: unknown): value is AnalyticsConsent {
  return value === "unset" || value === "granted" || value === "denied";
}

function emit() {
  cached = undefined;
  listeners.forEach((listener) => listener());
}

export function subscribeAnalyticsConsent(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function storageOf(
  store?: Storage,
): Storage | undefined {
  if (store) return store;
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function readAnalyticsConsent(
  store?: Storage,
): AnalyticsConsent {
  if (store === undefined && cached !== undefined) return cached;
  const storage = storageOf(store);
  if (!storage) return "unset";
  try {
    const raw = storage.getItem(ANALYTICS_CONSENT_KEY);
    if (!raw) {
      if (store === undefined) cached = "unset";
      return "unset";
    }
    const parsed = JSON.parse(raw) as unknown;
    const value = isAnalyticsConsent(parsed) ? parsed : "unset";
    if (store === undefined) cached = value;
    return value;
  } catch {
    if (store === undefined) cached = "unset";
    return "unset";
  }
}

export function writeAnalyticsConsent(
  consent: Exclude<AnalyticsConsent, "unset">,
  store?: Storage,
) {
  const storage = storageOf(store);
  if (!storage) return;
  storage.setItem(ANALYTICS_CONSENT_KEY, JSON.stringify(consent));
  if (store === undefined) emit();
}

export function analyticsAllowed(store?: Storage) {
  return readAnalyticsConsent(store) === "granted";
}

/** Test helper — drop the in-memory cache between cases. */
export function resetAnalyticsConsentCache() {
  cached = undefined;
}
