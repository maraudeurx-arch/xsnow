/**
 * Anonymous OPC usage analytics (privacy-first). No names, emails, or GPS.
 *
 * POST https://xsnow-chat.xsnowopc.workers.dev/stats
 * GET  https://xsnow-chat.xsnowopc.workers.dev/stats/summary
 *
 * JSON body (batch OK): `{ events: AnalyticsEvent[] }`
 *
 * Events (every row includes `session`, an anonymous uuid in localStorage):
 * - `session_start` — once per browser tab session
 * - `lang` — active UI language: `fr` | `en` | `es`
 * - `place` — `{ city, countryCode }` after geolocation succeeds (city-level only)
 * - `monetize_suggestion` — short free text (trim/cap 280) when chat looks like
 *   a monetization idea (keywords: monétiser, monetize, suggestion, service,
 *   activité / activity, vos idées) or when the visitor submits Vos idées
 * - `idea_submit` — `{ text }` involvement flags (`tete+coeur+mains`) from Vos idées
 * - `invite_open` — first-touch `?invite=` / `?ref=` code (`code` or `code|src`)
 * - `feedback_pos` / `feedback_neg` — `{ text }` surface (`accueil` / `vos-idees`)
 * - `offer_created` / `request_created` — anonymized `{ kind }` only (e.g.
 *   `car_morning`). No names, emails, phones, or Interac contacts.
 *
 * Nothing is queued or POSTed until analytics consent is granted
 * (`xsnow.analyticsConsent` = granted).
 */

import { analyticsAllowed } from "./consent.ts";
import { INVITE_OPEN_SENT_KEY } from "./invite.ts";
import {
  looksLikeCoordinates,
  sanitizeUntrustedText,
  SUGGESTION_TEXT_MAX,
} from "./sanitize.ts";

export { looksLikeCoordinates };

export const ANON_ID_KEY = "xsnow.anonId";
export const SESSION_START_KEY = "xsnow.sessionStartSent";
export const PLACE_SENT_KEY = "xsnow.placeSent";
export const SUGGESTION_MAX = SUGGESTION_TEXT_MAX;

export const STATS_FALLBACK_URL = "https://xsnow-chat.xsnowopc.workers.dev/stats";

const FORBIDDEN_KEYS = new Set([
  "lat",
  "lon",
  "latitude",
  "longitude",
  "gps",
  "email",
  "name",
  "street",
  "address",
  "phone",
]);

const SUGGESTION_NEEDLES = [
  "monetiser",
  "monetize",
  "monetise",
  "monetizar",
  "suggestion",
  "sugerencia",
  "service",
  "activite",
  "activity",
  "actividad",
  "vos idees",
  "your ideas",
  "tus ideas",
  "une idee",
  "my idea",
  "una idea",
];

export type AnalyticsLang = "fr" | "en" | "es";

export type AnalyticsEvent =
  | { type: "session_start"; session: string; t: number }
  | { type: "lang"; session: string; t: number; lang: AnalyticsLang }
  | { type: "place"; session: string; t: number; city: string; countryCode: string }
  | { type: "monetize_suggestion"; session: string; t: number; text: string }
  | { type: "idea_submit"; session: string; t: number; text: string }
  | { type: "invite_open"; session: string; t: number; text: string }
  | { type: "feedback_pos"; session: string; t: number; text: string }
  | { type: "feedback_neg"; session: string; t: number; text: string }
  | { type: "offer_created"; session: string; t: number; kind: string }
  | { type: "request_created"; session: string; t: number; kind: string };

type QueueSink = (events: AnalyticsEvent[]) => void;

let queue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let sink: QueueSink | null = null;
let consentOverride: boolean | null = null;

/** Test helper. `null` restores localStorage consent. */
export function setAnalyticsConsentOverride(value: boolean | null) {
  consentOverride = value;
}

export function canSendAnalytics() {
  if (consentOverride != null) return consentOverride;
  return analyticsAllowed();
}

export function statsEndpoint(base?: string) {
  const raw =
    base ||
    (typeof process !== "undefined" &&
      (process.env.NEXT_PUBLIC_CHAT_API_URL || process.env.NEXT_PUBLIC_CHAT_API)) ||
    "https://xsnow-chat.xsnowopc.workers.dev";
  return `${String(raw).replace(/\/+$/, "")}/stats`;
}

export function foldAscii(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function looksLikeMonetizeSuggestion(text: string) {
  const folded = foldAscii(text);
  if (!folded.trim()) return false;
  return SUGGESTION_NEEDLES.some((needle) => folded.includes(needle));
}

export function sanitizeSuggestion(text: string) {
  return sanitizeUntrustedText(text, {
    max: SUGGESTION_MAX,
    redactEmails: true,
    allowNewlines: false,
    dropCoordinates: true,
  });
}

export function sanitizeCity(city: string) {
  return sanitizeUntrustedText(city, {
    max: 80,
    redactEmails: true,
    allowNewlines: false,
    dropCoordinates: true,
  });
}

export function sanitizeCountryCode(code: string) {
  const value = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(value)) return "";
  return value;
}

export function sanitizeOfferKind(kind: string) {
  return foldAscii(kind)
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

function isAnalyticsLang(value: unknown): value is AnalyticsLang {
  return value === "fr" || value === "en" || value === "es";
}

function stripForbidden(record: Record<string, unknown>) {
  for (const key of Object.keys(record)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      delete record[key];
    }
  }
}

export function toAnalyticsEvent(raw: unknown, session: string, now = Date.now()): AnalyticsEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const record = { ...(raw as Record<string, unknown>) };
  stripForbidden(record);
  const type = record.type;
  if (type === "session_start") {
    return { type: "session_start", session, t: now };
  }
  if (type === "lang" && isAnalyticsLang(record.lang)) {
    return { type: "lang", session, t: now, lang: record.lang };
  }
  if (type === "place") {
    const city = typeof record.city === "string" ? sanitizeCity(record.city) : "";
    const countryCode =
      typeof record.countryCode === "string" ? sanitizeCountryCode(record.countryCode) : "";
    if (!city || !countryCode) return null;
    return { type: "place", session, t: now, city, countryCode };
  }
  if (type === "monetize_suggestion" || type === "idea_submit") {
    const text = typeof record.text === "string" ? sanitizeSuggestion(record.text) : "";
    if (!text) return null;
    return { type, session, t: now, text };
  }
  if (type === "invite_open") {
    const text = typeof record.text === "string" ? sanitizeSuggestion(record.text) : "";
    if (!text) return null;
    return { type: "invite_open", session, t: now, text: text.slice(0, 40) };
  }
  if (type === "feedback_pos" || type === "feedback_neg") {
    const text = typeof record.text === "string" ? sanitizeSuggestion(record.text) : "app";
    return { type, session, t: now, text: (text || "app").slice(0, 40) };
  }
  if (type === "offer_created" || type === "request_created") {
    const kind = typeof record.kind === "string" ? sanitizeOfferKind(record.kind) : "";
    if (!kind) return null;
    return { type, session, t: now, kind };
  }
  return null;
}

function storageGet(store: Storage | undefined, key: string): string | null {
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "string" && parsed ? parsed : null;
  } catch {
    return null;
  }
}

function storageSet(store: Storage | undefined, key: string, value: string) {
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode / quota — analytics stays best-effort.
  }
}

export function readOrCreateAnonId(
  store: Storage | undefined = typeof window === "undefined" ? undefined : window.localStorage,
  randomId: () => string = () => crypto.randomUUID(),
) {
  const existing = storageGet(store, ANON_ID_KEY);
  if (existing) return existing;
  const created = randomId();
  storageSet(store, ANON_ID_KEY, created);
  return created;
}

function browserSession() {
  if (typeof window === "undefined") return undefined;
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

function browserLocal() {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function enqueue(event: AnalyticsEvent) {
  if (!canSendAnalytics()) return;
  queue.push(event);
  if (queue.length >= 6) {
    flush();
    return;
  }
  if (flushTimer != null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, 700);
}

export function pendingEvents() {
  return queue.slice();
}

export function resetAnalyticsQueue() {
  queue = [];
  if (flushTimer != null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

export function setAnalyticsSink(next: QueueSink | null) {
  sink = next;
}

async function postEvents(events: AnalyticsEvent[]) {
  if (sink) {
    sink(events);
    return;
  }
  if (typeof fetch === "undefined") return;
  try {
    await fetch(statsEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: true,
      credentials: "omit",
    });
  } catch {
    // Offline / blocked — never surface to the visitor.
  }
}

export function flush() {
  if (flushTimer != null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!canSendAnalytics()) {
    queue = [];
    return;
  }
  if (!queue.length) return;
  const batch = queue;
  queue = [];
  void postEvents(batch);
}

let pageHideBound = false;

function bindPageHide() {
  if (typeof window === "undefined" || pageHideBound) return;
  pageHideBound = true;
  window.addEventListener("pagehide", () => flush());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

export function noteSessionStart() {
  if (typeof window === "undefined") return;
  if (!canSendAnalytics()) return;
  bindPageHide();
  const session = readOrCreateAnonId(browserLocal());
  const tab = browserSession();
  if (storageGet(tab, SESSION_START_KEY)) return;
  storageSet(tab, SESSION_START_KEY, "1");
  enqueue({ type: "session_start", session, t: Date.now() });
}

export function noteLang(lang: AnalyticsLang) {
  if (typeof window === "undefined") return;
  if (!canSendAnalytics()) return;
  bindPageHide();
  const session = readOrCreateAnonId(browserLocal());
  enqueue({ type: "lang", session, t: Date.now(), lang });
}

export function notePlace(city: string, countryCode: string) {
  if (typeof window === "undefined") return;
  if (!canSendAnalytics()) return;
  const cleanCity = sanitizeCity(city);
  const cleanCountry = sanitizeCountryCode(countryCode);
  if (!cleanCity || !cleanCountry) return;
  const session = readOrCreateAnonId(browserLocal());
  const fingerprint = `${cleanCity}|${cleanCountry}`;
  const tab = browserSession();
  if (storageGet(tab, PLACE_SENT_KEY) === fingerprint) return;
  storageSet(tab, PLACE_SENT_KEY, fingerprint);
  enqueue({
    type: "place",
    session,
    t: Date.now(),
    city: cleanCity,
    countryCode: cleanCountry,
  });
}

export function noteMonetizeSuggestion(text: string) {
  if (typeof window === "undefined") return;
  if (!canSendAnalytics()) return;
  if (!looksLikeMonetizeSuggestion(text)) return;
  const clean = sanitizeSuggestion(text);
  if (!clean) return;
  const session = readOrCreateAnonId(browserLocal());
  enqueue({ type: "monetize_suggestion", session, t: Date.now(), text: clean });
}

/** Vos idées form: already a suggestion — skip the chat keyword gate. */
export function noteCommunityIdea(text: string) {
  if (typeof window === "undefined") return;
  if (!canSendAnalytics()) return;
  const clean = sanitizeSuggestion(text);
  if (!clean) return;
  const session = readOrCreateAnonId(browserLocal());
  enqueue({ type: "monetize_suggestion", session, t: Date.now(), text: clean });
}

export function noteIdeaSubmit(flags: string) {
  if (typeof window === "undefined") return;
  if (!canSendAnalytics()) return;
  const clean = sanitizeSuggestion(flags).slice(0, 80);
  if (!clean) return;
  const session = readOrCreateAnonId(browserLocal());
  enqueue({ type: "idea_submit", session, t: Date.now(), text: clean });
}

export function noteInviteOpen(text: string) {
  if (typeof window === "undefined") return;
  if (!canSendAnalytics()) return;
  const clean = sanitizeSuggestion(text).slice(0, 40);
  if (!clean) return;
  const local = browserLocal();
  const session = readOrCreateAnonId(local);
  if (storageGet(local, INVITE_OPEN_SENT_KEY) === clean) return;
  storageSet(local, INVITE_OPEN_SENT_KEY, clean);
  enqueue({ type: "invite_open", session, t: Date.now(), text: clean });
}

export function noteFeedback(kind: "pos" | "neg", surface: string) {
  if (typeof window === "undefined") return;
  if (!canSendAnalytics()) return;
  const type = kind === "pos" ? "feedback_pos" : "feedback_neg";
  const clean = (sanitizeSuggestion(surface) || "app").slice(0, 40);
  const session = readOrCreateAnonId(browserLocal());
  enqueue({ type, session, t: Date.now(), text: clean });
}

export function noteOfferCreated(kind: string) {
  if (typeof window === "undefined") return;
  if (!canSendAnalytics()) return;
  const clean = sanitizeOfferKind(kind);
  if (!clean) return;
  const session = readOrCreateAnonId(browserLocal());
  enqueue({ type: "offer_created", session, t: Date.now(), kind: clean });
}

export function noteRequestCreated(kind: string) {
  if (typeof window === "undefined") return;
  if (!canSendAnalytics()) return;
  const clean = sanitizeOfferKind(kind);
  if (!clean) return;
  const session = readOrCreateAnonId(browserLocal());
  enqueue({ type: "request_created", session, t: Date.now(), kind: clean });
}
