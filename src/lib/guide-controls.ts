/**
 * Home “Réécouter” / “Changer d’avatar” stay visible for one hour after the
 * visitor settles on an avatar. Soft-launch UX: if they have not switched by
 * then, hide the chips to declutter Accueil. Changing avatar restarts the hour.
 */

export const GUIDE_CONTROLS_STARTED_KEY = "xsnow.guideControlsStartedAt";
export const GUIDE_CONTROLS_VISIBLE_MS = 60 * 60 * 1000;

function storage(store?: Storage): Storage | undefined {
  if (store) return store;
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function readGuideControlsStartedAt(store?: Storage): number | null {
  const raw = storage(store)?.getItem(GUIDE_CONTROLS_STARTED_KEY);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Stamp “now” if missing; return the active start time. */
export function ensureGuideControlsStarted(
  now = Date.now(),
  store?: Storage,
): number {
  const existing = readGuideControlsStartedAt(store);
  if (existing != null) return existing;
  storage(store)?.setItem(GUIDE_CONTROLS_STARTED_KEY, String(now));
  return now;
}

/** Call when the visitor picks a (new) avatar — reopen the one-hour window. */
export function refreshGuideControlsStarted(
  now = Date.now(),
  store?: Storage,
): number {
  storage(store)?.setItem(GUIDE_CONTROLS_STARTED_KEY, String(now));
  return now;
}

export function shouldShowGuideControls(
  now = Date.now(),
  store?: Storage,
): boolean {
  const started = readGuideControlsStartedAt(store);
  if (started == null) return true;
  return now - started < GUIDE_CONTROLS_VISIBLE_MS;
}
