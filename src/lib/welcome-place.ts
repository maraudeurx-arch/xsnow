import { normalizeCityKey } from "./demonym.ts";
import type { GeoConsent } from "./place-logic.ts";

/** First welcome waits for GPS reverse-geocode when the visitor granted location. */
export function welcomeSpeechReady(opts: {
  consent: GeoConsent;
  locating: boolean;
  hasOverride: boolean;
  waitingOnConsent: boolean;
}): boolean {
  if (opts.waitingOnConsent) return false;
  if (opts.hasOverride) return !opts.locating;
  if (opts.consent === "unset") return false;
  if (opts.consent === "granted" && opts.locating) return false;
  return true;
}

/**
 * Re-speak only when a real city becomes available after a neutral/wrong first line.
 * Never re-speak just to say the neighbourhood placeholder.
 */
export function shouldRespeakWelcome(opts: {
  previousCity: string | null;
  nextCity: string;
  nextResolved: boolean;
}): boolean {
  if (!opts.previousCity || !opts.nextCity.trim()) return false;
  if (normalizeCityKey(opts.previousCity) === normalizeCityKey(opts.nextCity)) return false;
  return opts.nextResolved;
}
