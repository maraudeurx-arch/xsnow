/** Must match `basePath` in next.config.ts (GitHub Pages project site). */
export const BASE_PATH = "/xsnow";
/**
 * PWA identity / Home Screen launch URL.
 * Next 16 `output: "export"` leaves MetadataRoute.Manifest paths unprefixed,
 * so this must already include `basePath`. `/` opens github.io, not the app.
 */
export const PWA_SCOPE = `${BASE_PATH}/`;
export const PRIVACY_HREF = "/vie-privee";
export const TERMS_HREF = "/conditions";
export const ABOUT_HREF = "/about";
export const HOW_IT_WORKS_HREF = "/comment-ca-marche";
export const SECURITY_HREF = "/securite";
export const PROOFS_HREF = "/preuves-de-revenus";

/** Canonical public URL (GitHub Pages). Used in share posts and deep links. */
export const PUBLIC_SITE_URL = "https://maraudeurx-arch.github.io/xsnow/";

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
