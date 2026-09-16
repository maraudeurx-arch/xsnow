/**
 * First-touch invite / share codes for OPC soft launch.
 * Query: `?invite=ami` or `?ref=ami`, optional `?src=critique`.
 * Inbound first-touch stays in localStorage. The visitor’s own share code
 * is separate (`opc-xxxx` or `opc`).
 */

import { PUBLIC_SITE_URL } from "./paths.ts";

export const INVITE_TOUCH_KEY = "xsnow.inviteTouch";
export const SHARE_CODE_KEY = "xsnow.shareCode";
export const INVITE_OPEN_SENT_KEY = "xsnow.inviteOpenSent";
export const DEFAULT_SHARE_CODE = "opc";
export const CODE_MAX = 24;

export type InviteTouch = {
  code: string;
  src: string;
};

export function sanitizeInviteCode(raw: unknown) {
  if (typeof raw !== "string") return "";
  const folded = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, CODE_MAX);
  return folded;
}

export function sanitizeInviteSrc(raw: unknown) {
  return sanitizeInviteCode(raw);
}

export function parseInviteSearch(search: string): InviteTouch | null {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const code = sanitizeInviteCode(params.get("invite") || params.get("ref"));
  if (!code) return null;
  return { code, src: sanitizeInviteSrc(params.get("src")) };
}

export function publicInviteUrl(code: string, src = "") {
  const clean = sanitizeInviteCode(code) || DEFAULT_SHARE_CODE;
  const base = PUBLIC_SITE_URL.replace(/\/+$/, "/");
  const params = new URLSearchParams();
  params.set("invite", clean);
  const source = sanitizeInviteSrc(src);
  if (source) params.set("src", source);
  return `${base}?${params.toString()}`;
}

export function defaultShareBlurb(url: string, locale: "fr" | "en" | "es" = "fr") {
  if (locale === "en") {
    return `Open Community — neighbourhood mutual aid, honest small incomes.\nJoin us: ${url}`;
  }
  if (locale === "es") {
    return `Open Community — ayuda mutua de barrio, ingresos pequeños y honestos.\nÚnete: ${url}`;
  }
  return `Open Community — entraide de quartier, petits revenus honnêtes.\nRejoins-nous : ${url}`;
}

function storageGet(store: Storage | undefined, key: string): string | null {
  if (!store) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(store: Storage | undefined, key: string, value: string) {
  if (!store) return;
  try {
    store.setItem(key, value);
  } catch {
    // Private mode / quota
  }
}

export function parseStoredTouch(raw: string | null): InviteTouch | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as { code?: unknown; src?: unknown };
    const code = sanitizeInviteCode(record.code);
    if (!code) return null;
    return { code, src: sanitizeInviteSrc(record.src) };
  } catch {
    const code = sanitizeInviteCode(raw);
    return code ? { code, src: "" } : null;
  }
}

export function readInviteTouch(
  store: Storage | undefined = typeof window === "undefined" ? undefined : window.localStorage,
): InviteTouch | null {
  return parseStoredTouch(storageGet(store, INVITE_TOUCH_KEY));
}

/** First inbound code wins. Later `?invite=` does not overwrite. */
export function rememberInviteTouch(
  touch: InviteTouch,
  store: Storage | undefined = typeof window === "undefined" ? undefined : window.localStorage,
): InviteTouch {
  const existing = readInviteTouch(store);
  if (existing) return existing;
  storageSet(store, INVITE_TOUCH_KEY, JSON.stringify(touch));
  return touch;
}

function randomShareCode() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let suffix = "";
  const bytes =
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(4))
      : null;
  for (let i = 0; i < 4; i += 1) {
    const n = bytes ? bytes[i]! : Math.floor(Math.random() * alphabet.length);
    suffix += alphabet[n % alphabet.length];
  }
  return `opc-${suffix}`;
}

export function readOrCreateShareCode(
  store: Storage | undefined = typeof window === "undefined" ? undefined : window.localStorage,
  create: () => string = randomShareCode,
) {
  const existing = sanitizeInviteCode(storageGet(store, SHARE_CODE_KEY) ?? "");
  if (existing) return existing;
  const created = sanitizeInviteCode(create()) || DEFAULT_SHARE_CODE;
  storageSet(store, SHARE_CODE_KEY, created);
  return created;
}

/** Map `OPC-7K3M` → `opc-7k3m` for `?invite=` attribution. */
export function inviteCodeFromMemberId(memberId: string) {
  return sanitizeInviteCode(memberId);
}

/**
 * Prefer the stable member number as the outbound invite/share code so
 * referrals can later attribute growth au prorata.
 */
export function bindShareCodeToMemberId(
  memberId: string,
  store: Storage | undefined = typeof window === "undefined" ? undefined : window.localStorage,
) {
  const code = inviteCodeFromMemberId(memberId);
  if (!code) return readOrCreateShareCode(store);
  storageSet(store, SHARE_CODE_KEY, code);
  return code;
}

/** Share code for Partager: member id when registered, else device code. */
export function resolveShareCode(
  memberId: string | null | undefined,
  store: Storage | undefined = typeof window === "undefined" ? undefined : window.localStorage,
) {
  if (memberId) {
    const bound = bindShareCodeToMemberId(memberId, store);
    if (bound) return bound;
  }
  return readOrCreateShareCode(store);
}

export function inviteOpenFingerprint(touch: InviteTouch) {
  return touch.src ? `${touch.code}|${touch.src}` : touch.code;
}

export function captureInviteFromSearch(
  search: string,
  store: Storage | undefined = typeof window === "undefined" ? undefined : window.localStorage,
) {
  const parsed = parseInviteSearch(search);
  if (!parsed) return readInviteTouch(store);
  return rememberInviteTouch(parsed, store);
}
