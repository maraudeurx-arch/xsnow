/** Must match `basePath` in next.config.ts (GitHub Pages project site). */
export const BASE_PATH = "/xsnow";

export function assetUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${normalized}`;
}
