/**
 * « Liens partenaires » block on Gagner maintenant + HITL pool opt-in.
 *
 * DRAFT — hidden by default. The block renders only when the app is built with
 * `NEXT_PUBLIC_PARTNER_LINKS=1`. Publication waits for written confirmation
 * from micro1 and Popol's go.
 *
 * Links are config placeholders: `url` stays empty until the real referral
 * links are approved. An empty or non-https url renders as plain text, never
 * as a link.
 *
 * The opt-in is device-local only (localStorage + IndexedDB backup through
 * durable-storage). Nothing is sent anywhere; there is no endpoint for it.
 */

import { durableGet, durableSet, subscribeDurableStorage } from "./durable-storage.ts";

/** Build-time flag that turns the block on. */
export const PARTNER_LINKS_FLAG = "NEXT_PUBLIC_PARTNER_LINKS";

/** Inlined at build time on the client (static member access). */
const PARTNER_LINKS_FLAG_VALUE = process.env.NEXT_PUBLIC_PARTNER_LINKS;

/** True only when the flag value, trimmed, is exactly `"1"`. */
export function isPartnerLinksEnabled(raw: string | undefined = PARTNER_LINKS_FLAG_VALUE): boolean {
  return typeof raw === "string" && raw.trim() === "1";
}

export type PartnerLink = {
  id: "mercor" | "micro1";
  label: string;
  /** Placeholder. Empty until the approved referral link is filled in. */
  url: string;
};

/** Placeholders for {{LIEN_MERCOR}} and {{LIEN_MICRO1}}. No real code or link. */
export const PARTNER_LINKS: readonly PartnerLink[] = [
  { id: "mercor", label: "Mercor", url: "" },
  { id: "micro1", label: "micro1", url: "" },
];

/** Returns the url only if it is a real https link; otherwise null. */
export function partnerLinkHref(link: Pick<PartnerLink, "url">): string | null {
  const url = (link.url || "").trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export const HITL_POOL_OPT_IN_KEY = "xsnow.hitlPoolOptIn";

const optInListeners = new Set<() => void>();

/** For useSyncExternalStore: fires on local writes and durable-storage restores. */
export function subscribeHitlPoolOptIn(onChange: () => void) {
  optInListeners.add(onChange);
  const stopDurable = subscribeDurableStorage(onChange);
  return () => {
    optInListeners.delete(onChange);
    stopDurable();
  };
}

export type HitlPoolOptIn = { optedIn: true; at: string };

/** Default is not opted in. Anything unexpected reads as not opted in. */
export function readHitlPoolOptIn(store?: Storage): HitlPoolOptIn | null {
  try {
    const raw = durableGet(HITL_POOL_OPT_IN_KEY, store);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as { optedIn?: unknown }).optedIn === true &&
      typeof (parsed as { at?: unknown }).at === "string"
    ) {
      return { optedIn: true, at: (parsed as { at: string }).at };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Stores only `{ optedIn, at }` on this device. Unchecking writes
 * `optedIn: false` (an empty value would let the IndexedDB backup restore the
 * old opt-in — see durable-storage).
 */
export function writeHitlPoolOptIn(optedIn: boolean, store?: Storage, now: Date = new Date()) {
  durableSet(HITL_POOL_OPT_IN_KEY, JSON.stringify({ optedIn, at: now.toISOString() }), store);
  if (store === undefined) optInListeners.forEach((listener) => listener());
}
