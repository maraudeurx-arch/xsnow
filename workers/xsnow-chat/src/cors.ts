/**
 * Browser origins allowed to call the Worker (chat, news, geo, stats, /ideas, /register, /alerts).
 * Allowlist only — never `*`. Unknown hosts (previews, ub.io, …) get no
 * Access-Control-Allow-Origin, so the browser blocks the request as a network error.
 */

export const ALLOWED_ORIGINS = new Set([
  "https://maraudeurx-arch.github.io",
  "https://opencommunity.app",
  "https://www.opencommunity.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

/** POST /ideas and /register send JSON; owner GET /ideas may send Authorization. */
export const CORS_ALLOW_METHODS = "GET, POST, OPTIONS";
export const CORS_ALLOW_HEADERS = "Content-Type, Authorization";

export function isAllowedOrigin(origin: string | null): origin is string {
  return Boolean(origin && ALLOWED_ORIGINS.has(origin));
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": CORS_ALLOW_METHODS,
    "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}
