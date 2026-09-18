/**
 * GitHub Pages host vs custom domain (opencommunity.app).
 *
 * Project site without a custom domain lives at
 * `https://maraudeurx-arch.github.io/xsnow/` (`basePath: "/xsnow"`).
 * With `public/CNAME` (or `CUSTOM_DOMAIN=1`) the same export is served at the
 * domain root, so `basePath` / `assetPrefix` must be empty or `/_next` 404s.
 *
 * `CUSTOM_DOMAIN=0` keeps `/xsnow` even when a CNAME file exists (legacy e2e).
 *
 * IMPORTANT: read `process.env.NEXT_PUBLIC_CUSTOM_DOMAIN` as a *static* member
 * access so Next/Turbopack can inline it in the client bundle. Dynamic
 * `env["NEXT_PUBLIC_…"]` lookups stay empty in the browser and wrongly fall
 * back to `/xsnow`, which 404s every avatar/logo/ad on opencommunity.app.
 */

export const PROJECT_PAGES_BASE = "/xsnow";
export const CUSTOM_DOMAIN_HOST = "opencommunity.app";
export const CUSTOM_DOMAIN_ORIGIN = `https://${CUSTOM_DOMAIN_HOST}`;
export const WWW_CUSTOM_DOMAIN_ORIGIN = `https://www.${CUSTOM_DOMAIN_HOST}`;
export const GITHUB_PAGES_HOST = "maraudeurx-arch.github.io";
export const GITHUB_PAGES_ORIGIN = `https://${GITHUB_PAGES_HOST}`;

export type DomainMode = "custom" | "project" | "auto";

/** Inlined at build time on the client when set via next.config `env`. */
const NEXT_PUBLIC_DOMAIN_FLAG = (process.env.NEXT_PUBLIC_CUSTOM_DOMAIN ?? "")
  .trim()
  .toLowerCase();

function envFlag(env: NodeJS.ProcessEnv, name: string) {
  return (env[name] ?? "").trim().toLowerCase();
}

function combinedDomainEnv(env: NodeJS.ProcessEnv) {
  // Prefer the statically addressed public flag (browser-safe), then CUSTOM_DOMAIN (build/CI).
  return NEXT_PUBLIC_DOMAIN_FLAG || envFlag(env, "CUSTOM_DOMAIN") || envFlag(env, "NEXT_PUBLIC_CUSTOM_DOMAIN");
}

export function resolveDomainMode(env: NodeJS.ProcessEnv = process.env): DomainMode {
  const explicit = combinedDomainEnv(env);
  if (explicit === "0" || explicit === "false" || explicit === "no" || explicit === "project") {
    return "project";
  }
  if (explicit === "1" || explicit === "true" || explicit === "yes" || explicit === "custom") {
    return "custom";
  }
  return "auto";
}

export function isCustomDomainCname(host: string) {
  const hostname = host.trim().toLowerCase().replace(/\.$/, "");
  return hostname === CUSTOM_DOMAIN_HOST || hostname === `www.${CUSTOM_DOMAIN_HOST}`;
}

/**
 * Next `basePath` / `assetPrefix`. Pass `{ cnamePresent: true }` from
 * `next.config.ts` when `public/CNAME` is the custom domain.
 */
export function resolvePagesBasePath(
  env: NodeJS.ProcessEnv = process.env,
  options: { cnamePresent?: boolean } = {},
) {
  const mode = resolveDomainMode(env);
  if (mode === "custom") return "";
  if (mode === "project") return PROJECT_PAGES_BASE;
  return options.cnamePresent ? "" : PROJECT_PAGES_BASE;
}

export function useCustomDomainBasePath(
  env: NodeJS.ProcessEnv = process.env,
  options: { cnamePresent?: boolean } = {},
) {
  return resolvePagesBasePath(env, options) === "";
}

/** Browser safety net when the public env flag was not inlined. */
export function runtimePagesBasePath(
  hostname: string | undefined = typeof window !== "undefined" ? window.location.hostname : undefined,
  buildPath: string = resolvePagesBasePath(),
) {
  if (!hostname) return buildPath;
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (host === CUSTOM_DOMAIN_HOST || host === `www.${CUSTOM_DOMAIN_HOST}`) return "";
  if (host === GITHUB_PAGES_HOST) return PROJECT_PAGES_BASE;
  return buildPath;
}
