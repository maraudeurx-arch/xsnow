/**
 * Optional Worker relay for consented proximity alerts.
 * Soft-fails when the Worker is down — the device copy still works.
 *
 * POST /alerts          guardian registers schedule + place + SMS target
 * GET  /alerts?token=   proche reads a public invite preview (no phone)
 * POST /alerts/consent  proche grants or denies sharing
 * POST /alerts/ping     proche sends a consented GPS ping
 */

import {
  parseInvitePreview,
  sanitizeAlertToken,
  type AlertInvitePreview,
  type AlertRadiusKm,
  type GeofenceResult,
  type WeeklySchedule,
} from "./proximity-alerts.ts";

export const ALERT_RELAY_TIMEOUT_MS = 8_000;

export type AlertRelayResult = "sent" | "failed" | "not_configured";

export type AlertRegisterInput = {
  token: string;
  person: string;
  place: string;
  placeLat: number | null;
  placeLon: number | null;
  radiusKm: AlertRadiusKm;
  schedule: WeeklySchedule;
  phone: string;
  email: string;
};

export type AlertPingPayload = {
  ok: boolean;
  scheduled?: boolean;
  outside?: boolean | null;
  distanceKm?: number | null;
  sms?: { sent: boolean; reason?: string };
  email?: { sent: boolean; reason?: string };
};

function workerBase(base?: string) {
  const raw =
    base ||
    (typeof process !== "undefined" &&
      (process.env.NEXT_PUBLIC_CHAT_API_URL || process.env.NEXT_PUBLIC_CHAT_API)) ||
    "https://xsnow-chat.xsnowopc.workers.dev";
  return String(raw).replace(/\/+$/, "");
}

export function alertsEndpoint(base?: string) {
  return `${workerBase(base)}/alerts`;
}

export function alertsConsentEndpoint(base?: string) {
  return `${alertsEndpoint(base)}/consent`;
}

export function alertsPingEndpoint(base?: string) {
  return `${alertsEndpoint(base)}/ping`;
}

async function postJson(
  url: string,
  body: unknown,
  fetchImpl: typeof fetch,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ALERT_RELAY_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
      credentials: "omit",
      signal: controller.signal,
    });
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  } finally {
    clearTimeout(timer);
  }
}

function asRelayResult(ok: boolean, data: unknown): AlertRelayResult {
  if (!ok) return "failed";
  if (!data || typeof data !== "object") return "failed";
  const record = data as { ok?: unknown; persisted?: unknown };
  return record.ok === true ? "sent" : "failed";
}

export async function postAlertRegister(
  input: AlertRegisterInput,
  fetchImpl: typeof fetch = fetch,
): Promise<AlertRelayResult> {
  const token = sanitizeAlertToken(input.token);
  if (!token) return "failed";
  const result = await postJson(alertsEndpoint(), input, fetchImpl);
  return asRelayResult(result.ok, result.data);
}

export async function postAlertConsent(
  input: { token: string; granted: boolean; placeLat?: number | null; placeLon?: number | null },
  fetchImpl: typeof fetch = fetch,
): Promise<AlertRelayResult> {
  const token = sanitizeAlertToken(input.token);
  if (!token) return "failed";
  const result = await postJson(alertsConsentEndpoint(), { ...input, token }, fetchImpl);
  return asRelayResult(result.ok, result.data);
}

export async function postAlertPing(
  input: { token: string; lat: number; lon: number },
  fetchImpl: typeof fetch = fetch,
): Promise<{ result: AlertRelayResult; payload: AlertPingPayload | null }> {
  const token = sanitizeAlertToken(input.token);
  if (!token) return { result: "failed", payload: null };
  const posted = await postJson(alertsPingEndpoint(), input, fetchImpl);
  if (!posted.ok || !posted.data || typeof posted.data !== "object") {
    return { result: "failed", payload: null };
  }
  const record = posted.data as AlertPingPayload;
  if (record.ok !== true) return { result: "failed", payload: record };
  return { result: "sent", payload: record };
}

export async function fetchAlertInvite(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AlertInvitePreview | null> {
  const clean = sanitizeAlertToken(token);
  if (!clean) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ALERT_RELAY_TIMEOUT_MS);
  try {
    const url = `${alertsEndpoint()}?token=${encodeURIComponent(clean)}`;
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") return null;
    const record = payload as { ok?: unknown; alert?: unknown };
    if (record.ok !== true) return null;
    return parseInvitePreview(record.alert);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function geofenceFromPingPayload(payload: AlertPingPayload | null): GeofenceResult | null {
  if (!payload || payload.ok !== true) return null;
  const scheduled = payload.scheduled === true;
  const outside = payload.outside === true ? true : payload.outside === false ? false : null;
  const distanceKm =
    typeof payload.distanceKm === "number" && Number.isFinite(payload.distanceKm)
      ? payload.distanceKm
      : null;
  return {
    scheduled,
    hasPlace: distanceKm != null,
    distanceKm,
    outside,
    shouldAlert: Boolean(scheduled && outside),
  };
}
