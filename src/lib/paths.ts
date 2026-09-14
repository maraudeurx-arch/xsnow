/** Must match `basePath` in next.config.ts (GitHub Pages project site). */
export const BASE_PATH = "/xsnow";

export function assetUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${normalized}`;
}

/** Compare App Router pathnames when `trailingSlash: true`. */
export function pathMatches(pathname: string, href: string) {
  const norm = (value: string) => value.replace(/\/+$/, "") || "/";
  return norm(pathname) === norm(href);
}
