/** Must match `basePath` in next.config.ts (GitHub Pages project site). */
export const BASE_PATH = "/xsnow";
/**
 * Path-only PWA scope (`/xsnow/`).
 * Next 16 `output: "export"` leaves MetadataRoute.Manifest paths unprefixed,
 * so this already includes `basePath`. Prefer `PWA_START_URL` in the
 * webmanifest: a path of `/` (or a relative `./`) can resolve to the GitHub
 * user site `https://maraudeurx-arch.github.io/` — that URL 404s.
 */
export const PWA_SCOPE = `${BASE_PATH}/`;
export const PRIVACY_HREF = "/vie-privee";
export const TERMS_HREF = "/conditions";
export const ABOUT_HREF = "/about";
export const HOW_IT_WORKS_HREF = "/comment-ca-marche";
export const SECURITY_HREF = "/securite";
export const PROOFS_HREF = "/preuves-de-revenus";

/** GitHub Pages host (project site lives under {@link BASE_PATH}, not `/`). */
export const PUBLIC_SITE_ORIGIN = "https://maraudeurx-arch.github.io";

/** Canonical public URL (GitHub Pages). Used in share posts and deep links. */
export const PUBLIC_SITE_URL = `${PUBLIC_SITE_ORIGIN}${PWA_SCOPE}`;

/**
 * Absolute Home Screen launch URL. iOS can resolve a relative `start_url`
 * against the origin instead of the project path — use this, never `/`.
 */
export const PWA_START_URL = PUBLIC_SITE_URL;

/** Public GitHub identity and dedicated OPC contact email (no personal addresses). */
export const GITHUB_REPO_URL = "https://github.com/maraudeurx-arch/xsnow";
export const GITHUB_ISSUES_URL = "https://github.com/maraudeurx-arch/xsnow/issues";
export const GITHUB_SECURITY_MD_URL =
  "https://github.com/maraudeurx-arch/xsnow/blob/main/SECURITY.md";
export const OPC_PUBLIC_EMAIL = "opencommunity.opc@gmail.com";
export const OPC_PUBLIC_MAILTO = `mailto:${OPC_PUBLIC_EMAIL}`;

export const TRUST_NAV = [
  { href: PRIVACY_HREF, footerKey: "privacy" as const },
  { href: TERMS_HREF, footerKey: "terms" as const },
  { href: ABOUT_HREF, footerKey: "about" as const },
  { href: HOW_IT_WORKS_HREF, footerKey: "how" as const },
  { href: SECURITY_HREF, footerKey: "security" as const },
  { href: PROOFS_HREF, footerKey: "proofs" as const },
] as const;

export function assetUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${normalized}`;
}

/** Icon / asset href that cannot resolve to the github.io root. */
export function absoluteAssetUrl(path: string) {
  return `${PUBLIC_SITE_ORIGIN}${assetUrl(path)}`;
}

/** Values written into `manifest.webmanifest` (absolute, never `/`). */
export function pwaManifestLaunch() {
  return {
    id: PWA_START_URL,
    start_url: PWA_START_URL,
    scope: PWA_START_URL,
  } as const;
}

export function isGithubPagesProjectHost(
  hostname: string,
  origin: string = PUBLIC_SITE_ORIGIN,
) {
  try {
    return hostname === new URL(origin).hostname;
  } catch {
    return false;
  }
}

/** True when the path is outside `/xsnow/` (org-root GitHub Pages 404). */
export function isOutsideAppScope(pathname: string) {
  const path = (pathname.split("?")[0] || "/").replace(/\/+$/, "") || "/";
  if (path === BASE_PATH) return false;
  return !path.startsWith(`${BASE_PATH}/`);
}

/**
 * Home-screen shortcuts that open `https://maraudeurx-arch.github.io/`
 * never load this app (GitHub’s 404). If our JS does boot on that host
 * without `/xsnow/`, send them to the project site.
 */
export function needsGithubPagesScopeRedirect(location: {
  hostname: string;
  pathname: string;
}) {
  if (!isGithubPagesProjectHost(location.hostname)) return false;
  return isOutsideAppScope(location.pathname);
}

/** Compare App Router pathnames when `trailingSlash: true`. */
export function pathMatches(pathname: string, href: string) {
  const norm = (value: string) => value.replace(/\/+$/, "") || "/";
  return norm(pathname) === norm(href);
}

/** True when pathname is href or a nested route under it. */
export function pathStartsWith(pathname: string, href: string) {
  const norm = (value: string) => value.replace(/\/+$/, "") || "/";
  const current = norm(pathname);
  const base = norm(href);
  return current === base || current.startsWith(`${base}/`);
}

/** Privacy, terms, and public-trust pages — readable without the consent sheet. */
export function isPublicInfoPath(pathname: string) {
  if (TRUST_NAV.some((item) => pathStartsWith(pathname, item.href))) return true;
  return pathStartsWith(pathname, "/mon-profil/a-propos");
}
