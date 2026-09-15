/**
 * One-time iOS / Android “Add to Home Screen” tip. Dismiss is stored in localStorage.
 * `?installTip=1` forces the tip for QA (desktop browser, screenshots).
 */

export const INSTALL_TIP_KEY = "xsnow.installTipDismissed";

export type InstallTipEnv = {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
  standalone?: boolean;
  displayModeStandalone?: boolean;
  search?: string;
  store?: Pick<Storage, "getItem" | "setItem"> | null;
};

function storageOf(store?: InstallTipEnv["store"]): InstallTipEnv["store"] | null {
  if (store !== undefined) return store;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isIosDevice(env: InstallTipEnv = {}) {
  const ua =
    env.userAgent ?? (typeof navigator === "undefined" ? "" : navigator.userAgent);
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  const platform =
    env.platform ?? (typeof navigator === "undefined" ? "" : navigator.platform);
  const touch =
    env.maxTouchPoints ??
    (typeof navigator === "undefined" ? 0 : navigator.maxTouchPoints || 0);
  // iPadOS 13+ reports as Macintosh.
  return platform === "MacIntel" && touch > 1;
}

export function isAndroidDevice(env: InstallTipEnv = {}) {
  const ua =
    env.userAgent ?? (typeof navigator === "undefined" ? "" : navigator.userAgent);
  return /Android/i.test(ua);
}

export function isStandaloneDisplay(env: InstallTipEnv = {}) {
  if (env.standalone) return true;
  if (env.displayModeStandalone) return true;
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone) return true;
  try {
    return window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    return false;
  }
}

export function readInstallTipDismissed(store?: InstallTipEnv["store"]) {
  const storage = storageOf(store);
  if (!storage) return false;
  try {
    return storage.getItem(INSTALL_TIP_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeInstallTipDismissed(store?: InstallTipEnv["store"]) {
  const storage = storageOf(store);
  if (!storage) return;
  try {
    storage.setItem(INSTALL_TIP_KEY, "1");
  } catch {
    // Private mode / quota
  }
}

export function forceInstallTipFromSearch(search = "") {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(raw).get("installTip") === "1";
}

export function shouldShowInstallTip(env: InstallTipEnv = {}) {
  if (readInstallTipDismissed(env.store)) return false;
  const search =
    env.search ??
    (typeof window === "undefined" ? "" : window.location.search);
  if (forceInstallTipFromSearch(search)) return true;
  if (isStandaloneDisplay(env)) return false;
  return isIosDevice(env) || isAndroidDevice(env);
}
