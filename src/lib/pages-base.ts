/**
 * GitHub Pages host vs custom domain (opencommunity.app).
 *
 * Project site without a custom domain lives at
 * `https://maraudeurx-arch.github.io/xsnow/` (`basePath: "/xsnow"`).
 * With `public/CNAME` (or `CUSTOM_DOMAIN=1`) the same export is served at the
 * domain root, so `basePath` / `assetPrefix` must be empty or `/_next` 404s.
 *
 * `CUSTOM_DOMAIN=0` keeps `/xsnow` even when a CNAME file exists (legacy e2e).
 */

export const PROJECT_PAGES_BASE = "/xsnow";
export const CUSTOM_DOMAIN_HOST = "opencommunity.app";
export const CUSTOM_DOMAIN_ORIGIN = `https://${CUSTOM_DOMAIN_HOST}`;
export const WWW_CUSTOM_DOMAIN_ORIGIN = `https://www.${CUSTOM_DOMAIN_HOST}`;
export const GITHUB_PAGES_HOST = "maraudeurx-arch.github.io";
export const GITHUB_PAGES_ORIGIN = `https://${GITHUB_PAGES_HOST}`;

export type DomainMode = "custom" | "project" | "auto";

function envFlag(env: NodeJS.ProcessEnv, name: string) {
  return (env[name] ?? "").trim().toLowerCase();
}

function combinedDomainEnv(env: NodeJS.ProcessEnv) {
  return envFlag(env, "NEXT_PUBLIC_CUSTOM_DOMAIN") || envFlag(env, "CUSTOM_DOMAIN");
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
