import {
  CUSTOM_DOMAIN_HOST,
  CUSTOM_DOMAIN_ORIGIN,
  GITHUB_PAGES_HOST,
  GITHUB_PAGES_ORIGIN,
  PROJECT_PAGES_BASE,
  resolvePagesBasePath,
  runtimePagesBasePath,
} from "./pages-base.ts";

export {
  CUSTOM_DOMAIN_HOST,
  CUSTOM_DOMAIN_ORIGIN,
  GITHUB_PAGES_HOST,
  GITHUB_PAGES_ORIGIN,
  PROJECT_PAGES_BASE,
  WWW_CUSTOM_DOMAIN_ORIGIN,
  resolveDomainMode,
  resolvePagesBasePath,
  runtimePagesBasePath,
  useCustomDomainBasePath,
} from "./pages-base.ts";

/**
 * Next `basePath` for this JS bundle. Empty when Pages is built for
 * opencommunity.app (`NEXT_PUBLIC_CUSTOM_DOMAIN=1` / CNAME). Default `/xsnow`
 * matches `next dev` without that flag (unit tests, CUSTOM_DOMAIN=0).
 */
export const BASE_PATH = resolvePagesBasePath();
/**
 * Path-only PWA scope (`/` on the custom domain, `/xsnow/` on project Pages).
 * Next 16 `output: "export"` leaves MetadataRoute.Manifest paths unprefixed,
 * so prefer `PWA_START_URL` in the webmanifest: a path of `/` (or a relative
 * `./`) on github.io without a custom domain 404s at the user site root.
 */
export const PWA_SCOPE = `${BASE_PATH}/`;
export const PRIVACY_HREF = "/vie-privee";
export const TERMS_HREF = "/conditions";
export const ABOUT_HREF = "/about";
export const HOW_IT_WORKS_HREF = "/comment-ca-marche";
export const SECURITY_HREF = "/securite";
export const PROOFS_HREF = "/preuves-de-revenus";

/**
 * Custom-domain TLS is live (GitHub Pages Let's Encrypt for opencommunity.app).
 * PWA manifest / icons / metadataBase must use https — http + https_enforced
 * left Home Screen icons and some Safari image loads looking broken.
 */
export const PUBLIC_SITE_TLS_READY = true;

/** Canonical public origin (https preferred for shares; may warn until TLS). */
export const PUBLIC_SITE_ORIGIN = CUSTOM_DOMAIN_ORIGIN;

/** Canonical public URL. Used in share posts, install tips, and deep links. */
export const PUBLIC_SITE_URL = `${PUBLIC_SITE_ORIGIN}/`;

/** Origin safe for PWA icons / start_url while custom-domain TLS is broken. */
export const PWA_ASSET_ORIGIN = PUBLIC_SITE_TLS_READY
  ? CUSTOM_DOMAIN_ORIGIN
  : `http://${CUSTOM_DOMAIN_HOST}`;

/** Project Pages URL kept as a fallback note; GitHub redirects it after DNS. */
export const GITHUB_PAGES_SITE_URL = `${GITHUB_PAGES_ORIGIN}${PROJECT_PAGES_BASE}/`;

/**
 * Absolute Home Screen launch URL. HTTP until TLS matches opencommunity.app.
 */
export const PWA_START_URL = `${PWA_ASSET_ORIGIN}/`;

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
  const base =
    typeof window !== "undefined"
      ? runtimePagesBasePath(window.location.hostname, BASE_PATH)
      : BASE_PATH;
  return `${base}${normalized}`;
}

/** Absolute asset href for PWA icons (HTTP until custom-domain TLS is ready). */
export function absoluteAssetUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${PWA_ASSET_ORIGIN}${normalized}`;
}

/** Values written into `manifest.webmanifest` (absolute, never `/`). */
export function pwaManifestLaunch() {
  return {
    id: PWA_START_URL,
    start_url: PWA_START_URL,
    scope: PWA_START_URL,
  } as const;
}

export function isGithubPagesProjectHost(hostname: string) {
  return hostname === GITHUB_PAGES_HOST;
}

/** True when the path is outside the project `basePath` (org-root GitHub Pages 404). */
export function isOutsideAppScope(pathname: string) {
  if (!BASE_PATH) return false;
  const path = (pathname.split("?")[0] || "/").replace(/\/+$/, "") || "/";
  if (path === BASE_PATH) return false;
  return !path.startsWith(`${BASE_PATH}/`);
}

/**
 * Home-screen shortcuts that open `https://maraudeurx-arch.github.io/` never
 * load this app (GitHub’s 404). Canonical origin is opencommunity.app, so any
 * github.io hit should move there (GitHub also redirects after DNS).
 */
export function needsGithubPagesScopeRedirect(location: {
  hostname: string;
  pathname: string;
}) {
  return isGithubPagesProjectHost(location.hostname);
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

/** Unlisted owner inbox (secret in query / bearer). Not in the public nav. */
export const OWNER_IDEAS_HREF = "/proprietaire/idees";

/** Privacy, terms, owner inbox, and public-trust pages — readable without the consent sheet. */
export function isPublicInfoPath(pathname: string) {
  if (TRUST_NAV.some((item) => pathStartsWith(pathname, item.href))) return true;
  if (pathStartsWith(pathname, "/mon-profil/a-propos")) return true;
  return pathStartsWith(pathname, "/proprietaire");
}
