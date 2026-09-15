/** Must match `basePath` in next.config.ts (GitHub Pages project site). */
export const BASE_PATH = "/xsnow";
export const PRIVACY_HREF = "/vie-privee";
export const TERMS_HREF = "/conditions";

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
