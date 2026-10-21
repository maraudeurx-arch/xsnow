/**
 * Minimal Web Push (RFC 8030 + VAPID RFC 8292) with NO payload: the push only wakes the
 * service worker, which shows a fixed "arbitration pending" notification. No payload means
 * no message encryption and no case data ever leaves the worker through the push service.
 */

const b64uToBytes = (s: string) => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};
const bytesToB64u = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const enc = new TextEncoder();

/** Push services we accept (blocks SSRF to arbitrary URLs). */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /^web\.push\.apple\.com$/,
  /^updates\.push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/, /(^|\.)push\.services\.mozilla\.com$/];

export function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && PUSH_HOSTS.some((re) => re.test(u.hostname)) && endpoint.length <= 1000;
  } catch { return false; }
}

/** VAPID keys: public = base64url of the 65-byte uncompressed P-256 point, private = base64url of d (32 bytes). */
export async function importVapidPrivate(publicB64u: string, privateB64u: string): Promise<CryptoKey> {
  const pub = b64uToBytes(publicB64u);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error("bad_vapid_public");
  return crypto.subtle.importKey("jwk", {
    kty: "EC", crv: "P-256", d: privateB64u, x: bytesToB64u(pub.slice(1, 33)), y: bytesToB64u(pub.slice(33, 65)), ext: false,
  }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

export async function vapidJwt(key: CryptoKey, audience: string, subject: string, nowMs: number): Promise<string> {
  const h = bytesToB64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const p = bytesToB64u(enc.encode(JSON.stringify({ aud: audience, exp: Math.floor(nowMs / 1000) + 12 * 3600, sub: subject })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${h}.${p}`)));
  return `${h}.${p}.${bytesToB64u(sig)}`;
}

export type PushResult = { endpoint: string; status: number; gone: boolean };

/** Send one payload-less push. `gone` = subscription expired (404/410) and should be deleted. */
export async function sendPush(endpoint: string, key: CryptoKey, publicB64u: string, subject: string, nowMs: number, fetchImpl: typeof fetch): Promise<PushResult> {
  if (!isAllowedPushEndpoint(endpoint)) return { endpoint, status: 0, gone: true };
  const jwt = await vapidJwt(key, new URL(endpoint).origin, subject, nowMs);
  try {
    const r = await fetchImpl(endpoint, {
      method: "POST",
      headers: { Authorization: `vapid t=${jwt}, k=${publicB64u}`, TTL: "86400", Urgency: "high", "Content-Length": "0" },
    });
    return { endpoint, status: r.status, gone: r.status === 404 || r.status === 410 };
  } catch {
    return { endpoint, status: 0, gone: false };
  }
}
