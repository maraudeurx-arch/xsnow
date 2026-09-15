/**
 * Best-effort CSP for static GitHub Pages (meta http-equiv only).
 * Pages cannot set Content-Security-Policy HTTP headers.
 *
 * `script-src 'unsafe-inline'` is required for Next.js static hydration.
 * `connect-src` / `frame-src` allow https and wss so RainbowKit / WalletConnect
 * and the Cloudflare chat worker keep working. `object-src 'none'` and
 * `base-uri 'self'` close plugin / <base> injection. Visitor ideas are still
 * never rendered as HTML.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https:",
  "worker-src 'self' blob:",
  "form-action 'self' https:",
  "upgrade-insecure-requests",
].join("; ");
