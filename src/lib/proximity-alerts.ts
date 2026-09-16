/**
 * Consent-based proximity alerts (Alertes de proximité).
 *
 * Guardian configures a proche, place, weekly hours, and 5/10/20 km radius
 * on this device. The proche must open an invite link and grant browser
 * geolocation themselves. OPC never uses Apple Find My, iCloud, Messages,
 * or another person’s Apple ID.
 *
 * Location pings run only while Open Community is open (PWA / browser).
 * iOS Home Screen does not offer reliable background GPS.
 */

import { distanceKm } from "./geo-logic.ts";
import { PUBLIC_SITE_URL } from "./paths.ts";
import { sanitizePersonName, sanitizeProfileEmail, sanitizeProfilePhone } from "./local-profile.ts";
import { sanitizeRecordId, sanitizeUntrustedText } from "./sanitize.ts";

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const ALERTS_KEY = "xsnow.alerts";
export const ALERT_SHARES_KEY = "xsnow.alertShares";
export const ALERT_NOTICES_KEY = "xsnow.alertNotices";

export const ALERT_RADII_KM = [5, 10, 20] as const;
export type AlertRadiusKm = (typeof ALERT_RADII_KM)[number];

export const WEEKDAYS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const ALERT_RELATIONS = ["enfant", "conjoint", "grands-parents", "autre"] as const;
export type AlertRelation = (typeof ALERT_RELATIONS)[number];

export const ALERT_CONSENTS = ["pending", "granted", "denied"] as const;
export type AlertConsent = (typeof ALERT_CONSENTS)[number];

export const PLACE_TEXT_MAX = 80;
export const ALERT_TOKEN_PREFIX = "alr-";
export const ALERT_TOKEN_RE = /^alr-[a-z0-9]{8,16}$/;
export const PING_INTERVAL_MS = 5 * 60 * 1000;
export const SMS_COOLDOWN_MS = 30 * 60 * 1000;
export const DEFAULT_WINDOW_START = "08:00";
export const DEFAULT_WINDOW_END = "18:00";

export type DayWindow = {
  enabled: boolean;
  start: string;
  end: string;
};

export type WeeklySchedule = Record<Weekday, DayWindow>;

export type ProximityAlert = {
  id: string;
  token: string;
  person: string;
  relation: AlertRelation;
  place: string;
  placeLat: number | null;
  placeLon: number | null;
  radiusKm: AlertRadiusKm;
  schedule: WeeklySchedule;
  guardianPhone: string;
  guardianEmail: string;
  consent: AlertConsent;
  consentedAt: string | null;
  lastPingAt: string | null;
  lastDistanceKm: number | null;
  lastOutside: boolean | null;
  createdAt: string;
};

export type AlertShare = {
  token: string;
  person: string;
  place: string;
  radiusKm: AlertRadiusKm;
  schedule: WeeklySchedule;
  placeLat: number | null;
  placeLon: number | null;
  acceptedAt: string;
};

export type AlertNotice = {
  id: string;
  token: string;
  person: string;
  place: string;
  distanceKm: number;
  at: string;
};

export type GeofenceResult = {
  scheduled: boolean;
  hasPlace: boolean;
  distanceKm: number | null;
  outside: boolean | null;
  shouldAlert: boolean;
};

export type AlertFormInput = {
  person: string;
  relation: string;
  place: string;
  radiusKm: unknown;
  schedule?: unknown;
  guardianPhone?: string;
  guardianEmail?: string;
  placeLat?: unknown;
  placeLon?: unknown;
};

const WEEKDAY_FROM_JS: Weekday[] = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

function clipPlace(raw: unknown): string {
  return sanitizeUntrustedText(raw, {
    max: PLACE_TEXT_MAX,
    redactEmails: true,
    allowNewlines: false,
  });
}

export function isAlertRadiusKm(value: unknown): value is AlertRadiusKm {
  return value === 5 || value === 10 || value === 20;
}

export function parseRadiusKm(raw: unknown): AlertRadiusKm {
  if (isAlertRadiusKm(raw)) return raw;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (raw <= 5) return 5;
    if (raw <= 10) return 10;
    return 20;
  }
  if (typeof raw === "string") {
    const folded = raw.trim().toLowerCase().replace(",", ".");
    const km = folded.match(/(\d+(?:\.\d+)?)\s*km/);
    if (km) return parseRadiusKm(Number(km[1]));
    const metres = folded.match(/(\d+(?:\.\d+)?)\s*m\b/);
    if (metres) return parseRadiusKm(Number(metres[1]) / 1000);
    const n = Number.parseFloat(folded);
    if (Number.isFinite(n)) return parseRadiusKm(n);
  }
  return 5;
}

export function isWeekday(value: unknown): value is Weekday {
  return typeof value === "string" && (WEEKDAYS as readonly string[]).includes(value);
}

export function isAlertRelation(value: unknown): value is AlertRelation {
  return typeof value === "string" && (ALERT_RELATIONS as readonly string[]).includes(value);
}

export function parseRelation(raw: unknown): AlertRelation {
  return isAlertRelation(raw) ? raw : "enfant";
}

export function isAlertConsent(value: unknown): value is AlertConsent {
  return value === "pending" || value === "granted" || value === "denied";
}

export function isClockTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export function minutesOf(hhmm: string): number | null {
  if (!isClockTime(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h! * 60 + m!;
}

export function emptyDayWindow(): DayWindow {
  return { enabled: false, start: DEFAULT_WINDOW_START, end: DEFAULT_WINDOW_END };
}

export function defaultSchedule(): WeeklySchedule {
  const out = {} as WeeklySchedule;
  for (const day of WEEKDAYS) {
    out[day] = { enabled: true, start: DEFAULT_WINDOW_START, end: DEFAULT_WINDOW_END };
  }
  return out;
}

export function parseDayWindow(raw: unknown): DayWindow {
  if (!raw || typeof raw !== "object") return emptyDayWindow();
  const record = raw as { enabled?: unknown; start?: unknown; end?: unknown };
  return {
    enabled: record.enabled === true,
    start: isClockTime(record.start) ? record.start : DEFAULT_WINDOW_START,
    end: isClockTime(record.end) ? record.end : DEFAULT_WINDOW_END,
  };
}

export function parseWeeklySchedule(raw: unknown): WeeklySchedule {
  const fallback = defaultSchedule();
  if (!raw || typeof raw !== "object") return fallback;
  const record = raw as Record<string, unknown>;
  const out = {} as WeeklySchedule;
  for (const day of WEEKDAYS) {
    out[day] = parseDayWindow(record[day]);
  }
  return out;
}

function windowContains(window: DayWindow | undefined, currentMinutes: number, part: "same" | "overnight"): boolean {
  if (!window?.enabled) return false;
  const start = minutesOf(window.start);
  const end = minutesOf(window.end);
  if (start == null || end == null) return false;
  if (end === start) return part === "same";
  if (end > start) return part === "same" && currentMinutes >= start && currentMinutes < end;
  if (part === "same") return currentMinutes >= start;
  return currentMinutes < end;
}

/** True when `now` (device local time) falls in an enabled weekday window. Overnight windows (22:00–06:00) continue past midnight. */
export function isWithinSchedule(schedule: WeeklySchedule, now: Date = new Date()): boolean {
  const dayIndex = now.getDay();
  const day = WEEKDAY_FROM_JS[dayIndex] ?? "lun";
  const current = now.getHours() * 60 + now.getMinutes();
  if (windowContains(schedule[day], current, "same")) return true;
  const prev = WEEKDAY_FROM_JS[(dayIndex + 6) % 7] ?? "dim";
  return windowContains(schedule[prev], current, "overnight");
}

export function finiteCoord(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 180) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number.parseFloat(value);
    if (Number.isFinite(n) && Math.abs(n) <= 180) return n;
  }
  return null;
}

export function evaluateGeofence(
  input: {
    schedule: WeeklySchedule;
    placeLat: number | null;
    placeLon: number | null;
    radiusKm: AlertRadiusKm;
  },
  lat: number,
  lon: number,
  now: Date = new Date(),
): GeofenceResult {
  const scheduled = isWithinSchedule(input.schedule, now);
  const hasPlace =
    input.placeLat != null &&
    input.placeLon != null &&
    Number.isFinite(input.placeLat) &&
    Number.isFinite(input.placeLon);
  const km = hasPlace ? distanceKm(lat, lon, input.placeLat!, input.placeLon!) : null;
  const outside = km == null ? null : km > input.radiusKm;
  return {
    scheduled,
    hasPlace,
    distanceKm: km == null ? null : Math.round(km * 10) / 10,
    outside,
    shouldAlert: Boolean(scheduled && hasPlace && outside),
  };
}

const TOKEN_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function createAlertToken(
  createBytes: () => Uint8Array = () =>
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(10))
      : Uint8Array.from({ length: 10 }, () => Math.floor(Math.random() * 256)),
): string {
  const bytes = createBytes();
  let suffix = "";
  for (let i = 0; i < 10; i += 1) {
    suffix += TOKEN_ALPHABET[(bytes[i] ?? 0) % TOKEN_ALPHABET.length]!;
  }
  return `${ALERT_TOKEN_PREFIX}${suffix}`;
}

export function sanitizeAlertToken(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const folded = raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  return ALERT_TOKEN_RE.test(folded) ? folded : "";
}

function tokenFromLegacyId(id: string): string {
  const folded = id.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
  const padded = (folded || "legacy").padEnd(8, "x").slice(0, 10);
  return `${ALERT_TOKEN_PREFIX}${padded}`;
}

export function publicAlertInviteUrl(token: string) {
  const clean = sanitizeAlertToken(token);
  const base = PUBLIC_SITE_URL.replace(/\/+$/, "/");
  if (!clean) return `${base}alertes/`;
  return `${base}alertes/?alerte=${encodeURIComponent(clean)}`;
}

export function parseAlertInviteSearch(search: string): string {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  return sanitizeAlertToken(params.get("alerte") || params.get("alert"));
}

export function toE164(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (trimmed.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return "";
}

export function parseStoredAlert(raw: unknown): ProximityAlert | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const person = sanitizePersonName(record.person);
  const place = clipPlace(record.place);
  if (!person || !place) return null;
  const id = sanitizeRecordId(record.id) || uid();
  const token = sanitizeAlertToken(record.token) || tokenFromLegacyId(id);
  const createdAt =
    typeof record.createdAt === "string" && record.createdAt.trim()
      ? record.createdAt
      : new Date(0).toISOString();
  return {
    id,
    token,
    person,
    relation: parseRelation(record.relation),
    place,
    placeLat: finiteCoord(record.placeLat),
    placeLon: finiteCoord(record.placeLon),
    radiusKm: parseRadiusKm(record.radiusKm ?? record.radius),
    schedule: parseWeeklySchedule(record.schedule),
    guardianPhone: sanitizeProfilePhone(record.guardianPhone ?? ""),
    guardianEmail: sanitizeProfileEmail(record.guardianEmail ?? ""),
    consent: isAlertConsent(record.consent) ? record.consent : "pending",
    consentedAt: typeof record.consentedAt === "string" ? record.consentedAt : null,
    lastPingAt: typeof record.lastPingAt === "string" ? record.lastPingAt : null,
    lastDistanceKm:
      typeof record.lastDistanceKm === "number" && Number.isFinite(record.lastDistanceKm)
        ? record.lastDistanceKm
        : null,
    lastOutside: typeof record.lastOutside === "boolean" ? record.lastOutside : null,
    createdAt,
  };
}

export function parseStoredShare(raw: unknown): AlertShare | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const token = sanitizeAlertToken(record.token);
  const person = sanitizePersonName(record.person);
  const place = clipPlace(record.place);
  if (!token || !person || !place) return null;
  return {
    token,
    person,
    place,
    radiusKm: parseRadiusKm(record.radiusKm),
    schedule: parseWeeklySchedule(record.schedule),
    placeLat: finiteCoord(record.placeLat),
    placeLon: finiteCoord(record.placeLon),
    acceptedAt:
      typeof record.acceptedAt === "string" && record.acceptedAt.trim()
        ? record.acceptedAt
        : new Date(0).toISOString(),
  };
}

export function parseStoredNotice(raw: unknown): AlertNotice | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const token = sanitizeAlertToken(record.token);
  const person = sanitizePersonName(record.person);
  const place = clipPlace(record.place);
  const id = sanitizeRecordId(record.id);
  const distance =
    typeof record.distanceKm === "number" && Number.isFinite(record.distanceKm)
      ? record.distanceKm
      : null;
  const at = typeof record.at === "string" ? record.at : "";
  if (!token || !person || !place || !id || distance == null || !at) return null;
  return { id, token, person, place, distanceKm: distance, at };
}

export function alertFromForm(
  input: AlertFormInput,
  now = () => new Date().toISOString(),
  makeId: () => string = uid,
  makeToken: () => string = createAlertToken,
): ProximityAlert | null {
  const person = sanitizePersonName(input.person);
  const place = clipPlace(input.place);
  if (!person || !place) return null;
  const createdAt = now();
  return {
    id: makeId(),
    token: makeToken(),
    person,
    relation: parseRelation(input.relation),
    place,
    placeLat: finiteCoord(input.placeLat),
    placeLon: finiteCoord(input.placeLon),
    radiusKm: parseRadiusKm(input.radiusKm),
    schedule: parseWeeklySchedule(input.schedule),
    guardianPhone: sanitizeProfilePhone(input.guardianPhone ?? ""),
    guardianEmail: sanitizeProfileEmail(input.guardianEmail ?? ""),
    consent: "pending",
    consentedAt: null,
    lastPingAt: null,
    lastDistanceKm: null,
    lastOutside: null,
    createdAt,
  };
}

export function applyConsent(
  alert: ProximityAlert,
  consent: Exclude<AlertConsent, "pending">,
  at = new Date().toISOString(),
): ProximityAlert {
  return {
    ...alert,
    consent,
    consentedAt: consent === "granted" ? at : alert.consentedAt,
  };
}

export function applyPing(
  alert: ProximityAlert,
  result: GeofenceResult,
  at = new Date().toISOString(),
): ProximityAlert {
  return {
    ...alert,
    lastPingAt: at,
    lastDistanceKm: result.distanceKm,
    lastOutside: result.outside,
  };
}

export function shareFromAlert(alert: ProximityAlert, acceptedAt = new Date().toISOString()): AlertShare {
  return {
    token: alert.token,
    person: alert.person,
    place: alert.place,
    radiusKm: alert.radiusKm,
    schedule: alert.schedule,
    placeLat: alert.placeLat,
    placeLon: alert.placeLon,
    acceptedAt,
  };
}

export function withPlaceCoords<T extends { placeLat: number | null; placeLon: number | null }>(
  item: T,
  lat: number,
  lon: number,
): T {
  return { ...item, placeLat: lat, placeLon: lon };
}

export function noticeFromResult(
  share: { token: string; person: string; place: string },
  result: GeofenceResult,
  at = new Date().toISOString(),
  makeId: () => string = uid,
): AlertNotice | null {
  if (!result.shouldAlert || result.distanceKm == null) return null;
  return {
    id: makeId(),
    token: share.token,
    person: share.person,
    place: share.place,
    distanceKm: result.distanceKm,
    at,
  };
}

export function prependNotice(list: AlertNotice[], notice: AlertNotice, max = 20): AlertNotice[] {
  return [notice, ...list.filter((item) => item.id !== notice.id)].slice(0, max);
}

export type AlertInvitePreview = {
  token: string;
  person: string;
  place: string;
  radiusKm: AlertRadiusKm;
  schedule: WeeklySchedule;
  consent: AlertConsent;
  placeLat: number | null;
  placeLon: number | null;
};

export function invitePreviewFromAlert(alert: ProximityAlert): AlertInvitePreview {
  return {
    token: alert.token,
    person: alert.person,
    place: alert.place,
    radiusKm: alert.radiusKm,
    schedule: alert.schedule,
    consent: alert.consent,
    placeLat: alert.placeLat,
    placeLon: alert.placeLon,
  };
}

export function parseInvitePreview(raw: unknown): AlertInvitePreview | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const token = sanitizeAlertToken(record.token);
  const person = sanitizePersonName(record.person);
  const place = clipPlace(record.place);
  if (!token || !person || !place) return null;
  return {
    token,
    person,
    place,
    radiusKm: parseRadiusKm(record.radiusKm),
    schedule: parseWeeklySchedule(record.schedule),
    consent: isAlertConsent(record.consent) ? record.consent : "pending",
    placeLat: finiteCoord(record.placeLat),
    placeLon: finiteCoord(record.placeLon),
  };
}

export function enabledDaysSummary(schedule: WeeklySchedule): Weekday[] {
  return WEEKDAYS.filter((day) => schedule[day].enabled);
}
