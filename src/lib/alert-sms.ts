/**
 * Outbound proximity-alert SMS (Twilio-ready) + optional Resend email.
 * Soft-fails when secrets are unset — same idea as `sendOwnerMail`.
 *
 * Never reads the visitor’s Messages inbox. The Worker only sends.
 */

import { toE164 } from "./proximity-alerts.ts";
import { sanitizeProfileEmail } from "./local-profile.ts";
import { sanitizeUntrustedText } from "./sanitize.ts";

export const TWILIO_MESSAGES_PATH = "/2010-04-01/Accounts/{sid}/Messages.json";
export const TWILIO_API_HOST = "https://api.twilio.com";
export const RESEND_API_URL = "https://api.resend.com/emails";
export const DEFAULT_ALERT_FROM_EMAIL = "Open Community <beth.t@example.com>";
export const SMS_BODY_MAX = 320;

export type SmsSendResult = { sent: boolean; reason?: string };

export type SmsEnv = {
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_NUMBER?: string;
};

export type AlertMailEnv = {
  RESEND_API_KEY?: string;
  IDEAS_FROM_EMAIL?: string;
};

export type AlertSmsInput = {
  to: string;
  person: string;
  place: string;
  distanceKm: number;
  radiusKm: number;
  locale?: "fr" | "en" | "es";
};

function basicAuth(user: string, pass: string) {
  const raw = `${user}:${pass}`;
  if (typeof btoa === "function") return btoa(raw);
  return Buffer.from(raw, "utf8").toString("base64");
}

export function twilioMessagesUrl(accountSid: string) {
  const sid = accountSid.trim();
  return `${TWILIO_API_HOST}${TWILIO_MESSAGES_PATH.replace("{sid}", encodeURIComponent(sid))}`;
}

export function clipSmsField(raw: unknown, max = 80): string {
  return sanitizeUntrustedText(raw, {
    max,
    redactEmails: false,
    allowNewlines: false,
  });
}

export function buildAlertSmsBody(input: AlertSmsInput): string {
  const person = clipSmsField(input.person, 40) || "proche";
  const place = clipSmsField(input.place, 40) || "endroit";
  const km = Number.isFinite(input.distanceKm) ? String(Math.round(input.distanceKm)) : "?";
  const radius = Number.isFinite(input.radiusKm) ? String(input.radiusKm) : "?";
  const locale = input.locale ?? "fr";
  let text: string;
  if (locale === "en") {
    text = `OPC: ${person} is ${km} km from ${place} (limit ${radius} km) during the planned hours. Not Apple Find My.`;
  } else if (locale === "es") {
    text = `OPC: ${person} está a ${km} km de ${place} (límite ${radius} km) en el horario previsto. No es Apple Buscar.`;
  } else {
    text = `OPC : ${person} est à ${km} km de ${place} (seuil ${radius} km), pendant la plage prévue. Pas Apple Localiser.`;
  }
  return text.length > SMS_BODY_MAX ? text.slice(0, SMS_BODY_MAX) : text;
}

export async function sendAlertSms(
  env: SmsEnv,
  input: AlertSmsInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SmsSendResult> {
  const sid = typeof env.TWILIO_ACCOUNT_SID === "string" ? env.TWILIO_ACCOUNT_SID.trim() : "";
  const token = typeof env.TWILIO_AUTH_TOKEN === "string" ? env.TWILIO_AUTH_TOKEN.trim() : "";
  const fromRaw = typeof env.TWILIO_FROM_NUMBER === "string" ? env.TWILIO_FROM_NUMBER.trim() : "";
  const from = toE164(fromRaw) || (fromRaw.startsWith("+") ? fromRaw : "");
  if (!sid || !token || !from) return { sent: false, reason: "not_configured" };

  const to = toE164(input.to);
  if (!to) return { sent: false, reason: "bad_to" };

  const body = buildAlertSmsBody(input);
  if (!body) return { sent: false, reason: "empty" };

  try {
    const response = await fetchImpl(twilioMessagesUrl(sid), {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth(sid, token)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
    });
    if (!response.ok) return { sent: false, reason: `http_${response.status}` };
    return { sent: true };
  } catch {
    return { sent: false, reason: "network" };
  }
}

function resolveFromAddress(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_ALERT_FROM_EMAIL;
  const text = raw.trim().replace(/[\r\n<>]/g, "").slice(0, 120);
  if (!text.includes("@") || text.length < 5) return DEFAULT_ALERT_FROM_EMAIL;
  return text;
}

export function buildAlertMailText(input: AlertSmsInput): { subject: string; text: string } {
  const sms = buildAlertSmsBody(input);
  return {
    subject: "OPC — alerte de proximité",
    text: [
      sms,
      "",
      "Le proche a accepté le partage dans Open Community. Ce n’est pas Apple Localiser / iCloud / Messages.",
    ].join("\n"),
  };
}

export async function sendAlertMail(
  env: AlertMailEnv,
  input: AlertSmsInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SmsSendResult> {
  const key = typeof env.RESEND_API_KEY === "string" ? env.RESEND_API_KEY.trim() : "";
  if (!key) return { sent: false, reason: "not_configured" };
  const to = sanitizeProfileEmail(input.to);
  if (!to) return { sent: false, reason: "bad_to" };

  const mail = buildAlertMailText(input);
  const text = sanitizeUntrustedText(mail.text, {
    max: 1_000,
    redactEmails: false,
    allowNewlines: true,
  });
  if (!text) return { sent: false, reason: "empty" };

  try {
    const response = await fetchImpl(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resolveFromAddress(env.IDEAS_FROM_EMAIL),
        to: [to],
        subject: mail.subject,
        text,
      }),
    });
    if (!response.ok) return { sent: false, reason: `http_${response.status}` };
    return { sent: true };
  } catch {
    return { sent: false, reason: "network" };
  }
}
