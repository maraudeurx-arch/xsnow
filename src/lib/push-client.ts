/** Browser-side helpers for arbiter Web Push (opt-in). */

export type PushSupport = "ok" | "ios-install" | "unsupported";

export function isIos(ua: string) {
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && /Mobile/.test(ua));
}

/** iOS only allows Web Push from a Home Screen web app (iOS 16.4+). */
export function pushSupport(env: { ua: string; standalone: boolean; hasPush: boolean; hasSw: boolean; hasNotification: boolean }): PushSupport {
  if (isIos(env.ua) && !env.standalone) return "ios-install";
  if (!env.hasPush || !env.hasSw || !env.hasNotification) return "unsupported";
  return "ok";
}

export function b64uToUint8(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}
