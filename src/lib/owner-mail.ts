/**
 * Owner-facing mail (plain text only).
 * Destination is always opencommunity.opc@gmail.com — never a visitor-controlled address.
 */

import { clipNeighborhood } from "./ideas.ts";
import { isOpcMemberId, sanitizePersonName, sanitizeProfileEmail } from "./local-profile.ts";
import { sanitizeUntrustedText } from "./sanitize.ts";

export const OPC_INBOX_TO = "opencommunity.opc@gmail.com";
export const RESEND_API_URL = "https://api.resend.com/emails";
export const DEFAULT_IDEAS_FROM = "Open Community <beth.t@example.com>";

export type OwnerMail = {
  subject: string;
  text: string;
};

export type RegisterNoticeInput = {
  firstName: string;
  opcId: string;
  email: string;
  city: string;
};

function clipCity(value: string) {
  return clipNeighborhood(value).slice(0, 80);
}

export function clipOpcId(raw: unknown): string {
  return typeof raw === "string" && isOpcMemberId(raw.trim()) ? raw.trim() : "";
}

export function parseRegisterNotice(raw: unknown): RegisterNoticeInput | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const firstName = sanitizePersonName(record.firstName);
  const opcId = clipOpcId(record.opcId);
  const email = sanitizeProfileEmail(record.email);
  const city = typeof record.city === "string" ? clipCity(record.city) : "";
  if (!firstName || !opcId) return null;
  return { firstName, opcId, email, city };
}

export function resolveFromAddress(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_IDEAS_FROM;
  const text = raw.trim().replace(/[\r\n<>]/g, "").slice(0, 120);
  if (!text.includes("@") || text.length < 5) return DEFAULT_IDEAS_FROM;
  return text;
}

function clipSubject(value: string) {
  return sanitizeUntrustedText(value, {
    max: 80,
    redactEmails: true,
    allowNewlines: false,
  });
}

export function buildIdeaOwnerMail(
  idea: { text: string; city: string; opcId?: string },
  now = Date.now(),
): OwnerMail {
  const city = idea.city.trim() || "ville non indiquée";
  const opc = idea.opcId || "non inscrit";
  const when = new Date(now).toISOString();
  const subject = clipSubject(`OPC idée — ${city}`);
  const text = [
    "Nouvelle idée Open Community (Vos idées).",
    "",
    `Date: ${when}`,
    `Ville: ${city}`,
    `Numéro OPC (appareil): ${opc}`,
    "",
    "Idée:",
    idea.text,
    "",
    "— Texte brut seulement (pas de HTML). Profil e-mail / téléphone du visiteur non inclus.",
  ].join("\n");
  return { subject, text };
}

export function buildRegisterOwnerMail(notice: RegisterNoticeInput, now = Date.now()): OwnerMail {
  const city = notice.city.trim() || "ville non indiquée";
  const when = new Date(now).toISOString();
  const subject = clipSubject(`OPC inscription — ${notice.opcId}`);
  const text = [
    "Nouvelle inscription locale Open Community (Mon profil).",
    "",
    `Date: ${when}`,
    `Ville: ${city}`,
    `Numéro OPC: ${notice.opcId}`,
    `Prénom: ${notice.firstName}`,
    `E-mail visiteur: ${notice.email || "(non fourni)"}`,
    "",
    "— Téléphone et nom de famille restent sur l’appareil, non envoyés. Texte brut seulement.",
  ].join("\n");
  return { subject, text };
}

export type ResendSendResult = { sent: boolean; reason?: string };

export type MailEnv = {
  RESEND_API_KEY?: string;
  IDEAS_FROM_EMAIL?: string;
};

export async function sendOwnerMail(
  env: MailEnv,
  mail: OwnerMail,
  fetchImpl: typeof fetch = fetch,
): Promise<ResendSendResult> {
  const key = typeof env.RESEND_API_KEY === "string" ? env.RESEND_API_KEY.trim() : "";
  if (!key) return { sent: false, reason: "not_configured" };

  const from = resolveFromAddress(env.IDEAS_FROM_EMAIL);
  const subject = clipSubject(mail.subject) || "OPC";
  const text = sanitizeUntrustedText(mail.text, {
    max: 4_000,
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
        from,
        to: [OPC_INBOX_TO],
        subject,
        text,
      }),
    });
    if (!response.ok) return { sent: false, reason: `http_${response.status}` };
    return { sent: true };
  } catch {
    return { sent: false, reason: "network" };
  }
}
