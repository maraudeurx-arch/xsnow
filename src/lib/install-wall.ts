/**
 * Mur d'installation obligatoire (règle de Popol, 09/11/2026 — comme Know
 * Yourself et Clé en main) : tant qu'OPC n'est pas ouverte comme application
 * installée sur l'écran d'accueil (PWA, mode standalone), on ne montre que
 * les instructions d'installation. Raison : pas encore de budget App Store /
 * Play Store. Seule une vraie ouverture en mode installé déverrouille.
 */

export const INSTALL_WALL_ENABLED = true;

/** Vidéo d’introduction d’OPC : publicité « Entraide » approuvée par Popol le 11/11/2026 (30 s, gens qui s’entraident). */
export const INSTALL_WALL_VIDEO_URL = "/pub-opc-entraide-fr.mp4";

/** Legal pages stay readable before install (privacy and terms must always be reachable). */
export const INSTALL_WALL_OPEN_PATHS = ["/conditions", "/vie-privee", "/securite"] as const;

export type InstallPlatform = "ios" | "android" | "other";

export function installPlatform(ua: string): InstallPlatform {
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua))) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

/** In-app browsers (Facebook, Instagram, WhatsApp, Messenger, TikTok, LINE, Android WebView) cannot install. */
export function inAppBrowser(ua: string): boolean {
  return /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Messenger|TikTok|musical_ly|Line\/|; wv\)/i.test(ua);
}

export function isStandaloneDisplay(env: { navigatorStandalone?: boolean; displayModeStandalone?: boolean; displayModeFullscreen?: boolean }): boolean {
  return env.navigatorStandalone === true || env.displayModeStandalone === true || env.displayModeFullscreen === true;
}

function pathAllowed(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return INSTALL_WALL_OPEN_PATHS.some((open) => p === open || p.endsWith(open));
}

/** The decision: show the wall unless the app runs installed (or the page is a legal page). */
export function shouldShowInstallWall(input: { standalone: boolean; pathname: string; enabled?: boolean }): boolean {
  if (!(input.enabled ?? INSTALL_WALL_ENABLED)) return false;
  if (input.standalone) return false;
  return !pathAllowed(input.pathname);
}
