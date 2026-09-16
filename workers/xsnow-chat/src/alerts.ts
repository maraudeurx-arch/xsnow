/**
 * Consent-based proximity alerts relay.
 *
 * POST /alerts          — guardian registers a proche (schedule, place, SMS)
 * GET  /alerts?token=   — public invite preview (no phone, no email)
 * POST /alerts/consent  — proche grants location sharing themselves
 * POST /alerts/ping     — consented GPS ping; may SMS (Twilio) / email (Resend)
 *
 * Never stores Apple ID, iCloud, Find My, or Messages credentials.
 * Live lat/lon from a ping are evaluated and discarded (not persisted).
 */

import {
  sendAlertMail,
  sendAlertSms,
  type AlertMailEnv,
  type SmsEnv,
} from "../../../src/lib/alert-sms.ts";
import {
  SMS_COOLDOWN_MS,
  evaluateGeofence,
  finiteCoord,
  parseInvitePreview,
  parseRadiusKm,
  parseWeeklySchedule,
  sanitizeAlertToken,
  toE164,
  type AlertConsent,
  type AlertInvitePreview,
  type AlertRadiusKm,
  type WeeklySchedule,
} from "../../../src/lib/proximity-alerts.ts";
import { sanitizePersonName, sanitizeProfileEmail, sanitizeProfilePhone } from "../../../src/lib/local-profile.ts";
import { sanitizeUntrustedText } from "../../../src/lib/sanitize.ts";
import type { D1Like } from "./stats";

export type AlertsEnv = SmsEnv & AlertMailEnv & {
  DB?: D1Like;
};

export type StoredRelayAlert = {
  token: string;
  person: string;
  place: string;
  placeLat: number | null;
  placeLon: number | null;
  radiusKm: AlertRadiusKm;
  schedule: WeeklySchedule;
  phone: string;
  email: string;
  consent: AlertConsent;
  lastPingAt: number | null;
  lastDistanceKm: number | null;
  lastOutside: boolean | null;
  lastSmsAt: number | null;
  createdAt: number;
};

const PLACE_MAX = 80;
const memory = new Map<string, StoredRelayAlert>();

const UPSERT = `INSERT INTO proximity_alerts (
  token, person, place, place_lat, place_lon, radius_km, schedule, phone, email,
  consent, last_ping_at, last_distance_km, last_outside, last_sms_at, created_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(token) DO UPDATE SET
  person = excluded.person,
  place = excluded.place,
  place_lat = excluded.place_lat,
  place_lon = excluded.place_lon,
  radius_km = excluded.radius_km,
  schedule = excluded.schedule,
  phone = excluded.phone,
  email = excluded.email`;

const SELECT = `SELECT token, person, place, place_lat AS placeLat, place_lon AS placeLon,
  radius_km AS radiusKm, schedule, phone, email, consent, last_ping_at AS lastPingAt,
  last_distance_km AS lastDistanceKm, last_outside AS lastOutside, last_sms_at AS lastSmsAt,
  created_at AS createdAt
FROM proximity_alerts WHERE token = ? LIMIT 1`;

const UPDATE_CONSENT = `UPDATE proximity_alerts SET consent = ?, place_lat = ?, place_lon = ? WHERE token = ?`;
const UPDATE_PING = `UPDATE proximity_alerts SET last_ping_at = ?, last_distance_km = ?, last_outside = ?, last_sms_at = ?, place_lat = ?, place_lon = ? WHERE token = ?`;

export function isAlertsPath(pathname: string) {
  const value = pathname.replace(/\/+$/, "") || "/";
  return value === "/alerts" || value.endsWith("/alerts");
}

export function isAlertsConsentPath(pathname: string) {
  const value = pathname.replace(/\/+$/, "") || "/";
  return value === "/alerts/consent" || value.endsWith("/alerts/consent");
}

export function isAlertsPingPath(pathname: string) {
  const value = pathname.replace(/\/+$/, "") || "/";
  return value === "/alerts/ping" || value.endsWith("/alerts/ping");
}

function clipPlace(raw: unknown) {
  return sanitizeUntrustedText(raw, {
    max: PLACE_MAX,
    redactEmails: true,
    allowNewlines: false,
  });
}

function parseRegister(raw: unknown): StoredRelayAlert | null {
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
    placeLat: finiteCoord(record.placeLat),
    placeLon: finiteCoord(record.placeLon),
    radiusKm: parseRadiusKm(record.radiusKm),
    schedule: parseWeeklySchedule(record.schedule),
    phone: sanitizeProfilePhone(record.phone ?? record.guardianPhone ?? ""),
    email: sanitizeProfileEmail(record.email ?? record.guardianEmail ?? ""),
    consent: "pending",
    lastPingAt: null,
    lastDistanceKm: null,
    lastOutside: null,
    lastSmsAt: null,
    createdAt: Date.now(),
  };
}

export function publicPreview(alert: StoredRelayAlert): AlertInvitePreview {
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

function parseScheduleField(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function fromRow(row: Record<string, unknown>): StoredRelayAlert | null {
  const preview = parseInvitePreview({
    token: row.token,
    person: row.person,
    place: row.place,
    radiusKm: row.radiusKm,
    schedule: parseScheduleField(row.schedule),
    consent: row.consent === 1 || row.consent === "granted" ? "granted" : row.consent === "denied" ? "denied" : "pending",
    placeLat: row.placeLat,
    placeLon: row.placeLon,
  });
  if (!preview) return null;
  return {
    ...preview,
    phone: sanitizeProfilePhone(row.phone ?? ""),
    email: sanitizeProfileEmail(row.email ?? ""),
    lastPingAt: typeof row.lastPingAt === "number" ? row.lastPingAt : null,
    lastDistanceKm: typeof row.lastDistanceKm === "number" ? row.lastDistanceKm : null,
    lastOutside: row.lastOutside === 1 || row.lastOutside === true,
    lastSmsAt: typeof row.lastSmsAt === "number" ? row.lastSmsAt : null,
    createdAt: typeof row.createdAt === "number" ? row.createdAt : 0,
  };
}

async function readAlert(env: AlertsEnv, token: string): Promise<StoredRelayAlert | null> {
  const fromMemory = memory.get(token);
  if (fromMemory) return fromMemory;
  if (!env.DB) return null;
  try {
    const row = await env.DB.prepare(SELECT).bind(token).first<Record<string, unknown>>();
    if (!row) return null;
    const parsed = fromRow(row);
    if (parsed) memory.set(token, parsed);
    return parsed;
  } catch {
    return null;
  }
}

async function persistAlert(env: AlertsEnv, alert: StoredRelayAlert): Promise<boolean> {
  memory.set(alert.token, alert);
  if (!env.DB) return false;
  try {
    await env.DB.batch([
      env.DB.prepare(UPSERT).bind(
        alert.token,
        alert.person,
        alert.place,
        alert.placeLat,
        alert.placeLon,
        alert.radiusKm,
        JSON.stringify(alert.schedule),
        alert.phone,
        alert.email,
        alert.consent === "granted" ? 1 : 0,
        alert.lastPingAt,
        alert.lastDistanceKm,
        alert.lastOutside ? 1 : 0,
        alert.lastSmsAt,
        alert.createdAt,
      ),
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function handleAlertsRegister(
  rawBody: unknown,
  env: AlertsEnv,
): Promise<{ status: number; data: Record<string, unknown> }> {
  const parsed = parseRegister(rawBody);
  if (!parsed) return { status: 400, data: { error: "bad_request" } };
  const existing = await readAlert(env, parsed.token);
  const next: StoredRelayAlert = existing
    ? {
        ...existing,
        person: parsed.person,
        place: parsed.place,
        placeLat: parsed.placeLat ?? existing.placeLat,
        placeLon: parsed.placeLon ?? existing.placeLon,
        radiusKm: parsed.radiusKm,
        schedule: parsed.schedule,
        phone: parsed.phone || existing.phone,
        email: parsed.email || existing.email,
      }
    : parsed;
  const persisted = await persistAlert(env, next);
  return { status: 200, data: { ok: true, persisted } };
}

export async function handleAlertsGet(
  request: Request,
  env: AlertsEnv,
): Promise<{ status: number; data: Record<string, unknown> }> {
  const token = sanitizeAlertToken(new URL(request.url).searchParams.get("token"));
  if (!token) return { status: 400, data: { error: "bad_request" } };
  const alert = await readAlert(env, token);
  if (!alert) return { status: 404, data: { error: "not_found" } };
  return { status: 200, data: { ok: true, alert: publicPreview(alert) } };
}

export async function handleAlertsConsent(
  rawBody: unknown,
  env: AlertsEnv,
): Promise<{ status: number; data: Record<string, unknown> }> {
  if (!rawBody || typeof rawBody !== "object") return { status: 400, data: { error: "bad_request" } };
  const record = rawBody as { token?: unknown; granted?: unknown; placeLat?: unknown; placeLon?: unknown };
  const token = sanitizeAlertToken(record.token);
  if (!token) return { status: 400, data: { error: "bad_request" } };
  const alert = await readAlert(env, token);
  if (!alert) return { status: 404, data: { error: "not_found" } };
  const granted = record.granted === true;
  const lat = finiteCoord(record.placeLat);
  const lon = finiteCoord(record.placeLon);
  const next: StoredRelayAlert = {
    ...alert,
    consent: granted ? "granted" : "denied",
    placeLat: lat ?? alert.placeLat,
    placeLon: lon ?? alert.placeLon,
  };
  memory.set(token, next);
  if (env.DB) {
    try {
      await env.DB.batch([
        env.DB.prepare(UPDATE_CONSENT).bind(
          granted ? 1 : 0,
          next.placeLat,
          next.placeLon,
          token,
        ),
      ]);
    } catch {
      // Table may not exist yet — memory still holds consent.
    }
  }
  return { status: 200, data: { ok: true, consent: next.consent } };
}

export async function handleAlertsPing(
  rawBody: unknown,
  env: AlertsEnv,
  now = Date.now(),
): Promise<{ status: number; data: Record<string, unknown> }> {
  if (!rawBody || typeof rawBody !== "object") return { status: 400, data: { error: "bad_request" } };
  const record = rawBody as { token?: unknown; lat?: unknown; lon?: unknown };
  const token = sanitizeAlertToken(record.token);
  const lat = finiteCoord(record.lat);
  const lon = finiteCoord(record.lon);
  if (!token || lat == null || lon == null) return { status: 400, data: { error: "bad_request" } };
  const alert = await readAlert(env, token);
  if (!alert) return { status: 404, data: { error: "not_found" } };
  if (alert.consent !== "granted") {
    return { status: 403, data: { error: "consent_required" } };
  }

  const result = evaluateGeofence(alert, lat, lon, new Date(now));
  const cool = alert.lastSmsAt != null && now - alert.lastSmsAt < SMS_COOLDOWN_MS;
  let sms: { sent: boolean; reason?: string } = { sent: false, reason: "skipped" };
  let email: { sent: boolean; reason?: string } = { sent: false, reason: "skipped" };

  if (result.shouldAlert && !cool) {
    if (alert.phone && toE164(alert.phone)) {
      sms = await sendAlertSms(env, {
        to: alert.phone,
        person: alert.person,
        place: alert.place,
        distanceKm: result.distanceKm ?? 0,
        radiusKm: alert.radiusKm,
      });
    } else {
      sms = { sent: false, reason: "no_phone" };
    }
    if (alert.email) {
      email = await sendAlertMail(env, {
        to: alert.email,
        person: alert.person,
        place: alert.place,
        distanceKm: result.distanceKm ?? 0,
        radiusKm: alert.radiusKm,
      });
    } else {
      email = { sent: false, reason: "no_email" };
    }
  }

  const next: StoredRelayAlert = {
    ...alert,
    lastPingAt: now,
    lastDistanceKm: result.distanceKm,
    lastOutside: result.outside,
    lastSmsAt: sms.sent || email.sent ? now : alert.lastSmsAt,
  };
  memory.set(token, next);
  if (env.DB) {
    try {
      await env.DB.batch([
        env.DB.prepare(UPDATE_PING).bind(
          next.lastPingAt,
          next.lastDistanceKm,
          next.lastOutside ? 1 : 0,
          next.lastSmsAt,
          next.placeLat,
          next.placeLon,
          token,
        ),
      ]);
    } catch {
      // Soft-fail persistence.
    }
  }

  return {
    status: 200,
    data: {
      ok: true,
      scheduled: result.scheduled,
      outside: result.outside,
      distanceKm: result.distanceKm,
      sms,
      email,
    },
  };
}

/** Test helper — drop the isolate cache between cases. */
export function resetAlertMemory() {
  memory.clear();
}
