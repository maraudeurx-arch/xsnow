/**
 * « Reprendre l’écran quitté » — iPhone Home Screen (standalone) launches always
 * open start_url (Accueil). We remember the last app screen (path only: no
 * query, no hash, no personal data) for 24 h and go back to it on launch.
 */

export const LAST_SCREEN_KEY = "xsnow.lastScreen";
export const LAST_SCREEN_TTL_MS = 24 * 60 * 60 * 1000;

/** Screens worth resuming. Owner inbox, legal/info pages and previews are never resumed. */
const RESUMABLE_ROOTS = [
  "/gagner-maintenant",
  "/vos-idees",
  "/mon-profil",
  "/mes-services",
  "/en-demande",
  "/proximite",
  "/services",
  "/alertes",
  "/telephone",
  "/business",
  "/monetise",
  "/sondages",
] as const;

const SAFE_PATH = /^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/;

/** `/vos-idees/` → `/vos-idees`; `/` stays `/`; anything odd → null. */
export function normalizeScreenPath(pathname: string): string | null {
  if (typeof pathname !== "string") return null;
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (path === "/") return "/";
  if (path.length > 80 || !SAFE_PATH.test(path)) return null;
  return path;
}

export function isResumableScreen(pathname: string): boolean {
  const path = normalizeScreenPath(pathname);
  if (!path || path === "/") return false;
  return RESUMABLE_ROOTS.some((root) => path === root || path.startsWith(`${root}/`));
}

type Stored = { path: string; at: number };

function parseStored(raw: string | null): Stored | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object") return null;
    const { path, at } = value as Record<string, unknown>;
    if (typeof path !== "string" || typeof at !== "number" || !Number.isFinite(at)) return null;
    return { path, at };
  } catch {
    return null;
  }
}

/** Remember the screen; leaving to Accueil or a non-resumable page clears it. */
export function rememberScreen(storage: Storage | undefined, pathname: string, now: number) {
  if (!storage) return;
  try {
    const path = normalizeScreenPath(pathname);
    if (path && isResumableScreen(path)) {
      storage.setItem(LAST_SCREEN_KEY, JSON.stringify({ path, at: now }));
    } else {
      storage.removeItem(LAST_SCREEN_KEY);
    }
  } catch {
    // Private mode / quota — resume is a nicety, never block the app.
  }
}

export type ResumeContext = {
  /** Current App Router pathname (basePath already stripped). */
  pathname: string;
  search: string;
  hash: string;
  /** Home Screen app (iOS `navigator.standalone` or display-mode standalone). */
  standalone: boolean;
  /** Avatar already chosen on this device: onboarding is done. */
  hasAvatar: boolean;
  now: number;
};

/**
 * Where to go on launch, or null to stay. Only from a bare Accueil launch in the
 * installed app, for a returning visitor, within 24 h. Invalid data is cleared.
 */
export function resumeTarget(storage: Storage | undefined, ctx: ResumeContext): string | null {
  if (!storage) return null;
  if (!ctx.standalone || !ctx.hasAvatar) return null;
  if (normalizeScreenPath(ctx.pathname) !== "/") return null;
  // An explicit link (?lang=, ?opc-look=, #…) wins over the remembered screen.
  if (ctx.search || ctx.hash) return null;
  let raw: string | null = null;
  try {
    raw = storage.getItem(LAST_SCREEN_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  const stored = parseStored(raw);
  const age = stored ? ctx.now - stored.at : Number.NaN;
  const valid =
    stored !== null &&
    isResumableScreen(stored.path) &&
    age >= 0 &&
    age <= LAST_SCREEN_TTL_MS;
  if (!valid) {
    try {
      storage.removeItem(LAST_SCREEN_KEY);
    } catch {
      // ignore
    }
    return null;
  }
  return `${normalizeScreenPath(stored.path)}/`;
}
