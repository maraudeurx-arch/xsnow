/** Must match `basePath` in next.config.ts (GitHub Pages project site). */
export const BASE_PATH = "/xsnow";
export const PRIVACY_HREF = "/vie-privee";
export const TERMS_HREF = "/conditions";
export const ABOUT_HREF = "/about";
export const HOW_IT_WORKS_HREF = "/comment-ca-marche";
export const SECURITY_HREF = "/securite";
export const PROOFS_HREF = "/preuves-de-revenus";

/** Canonical public URL (GitHub Pages). Used in share posts and deep links. */
export const PUBLIC_SITE_URL = "https://maraudeurx-arch.github.io/xsnow/";

/** Public GitHub identity — Issues is the current contact channel. */
export const GITHUB_REPO_URL = "https://github.com/maraudeurx-arch/xsnow";
export const GITHUB_ISSUES_URL = "https://github.com/maraudeurx-arch/xsnow/issues";
export const GITHUB_SECURITY_MD_URL =
  "https://github.com/maraudeurx-arch/xsnow/blob/main/SECURITY.md";

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
