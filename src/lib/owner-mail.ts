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
  /** Optional Resend attachments (base64 content, no data: prefix). */
  attachments?: Array<{ filename: string; content: string; content_type?: string }>;
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
  const text = raw.trim().replace(/[\r\n]/g, "").slice(0, 120);
  // Allow "Name <email@domain>" or bare email; strip control chars only.
  const angled = text.match(/^(.+?)<([^>]+@[^>]+)>$/);
  if (angled) {
    const email = angled[2]!.trim();
    const name = angled[1]!.replace(/[<>]/g, "").trim();
    if (email.includes("@") && email.length >= 5) {
      return name ? `${name} <${email}>` : email;
    }
  }
  const bare = text.replace(/[<>]/g, "").trim();
  if (!bare.includes("@") || bare.length < 5 || bare.includes(" ")) return DEFAULT_IDEAS_FROM;
  return bare;
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


export type BusinessAdNoticeInput = {
  name: string;
  category: string;
  city: string;
  description: string;
  contactEmail: string;
  opcId: string;
  imageBase64: string;
  imageFilename: string;
  imageBytes: number;
};

export function buildBusinessAdOwnerMail(
  ad: BusinessAdNoticeInput,
  now = Date.now(),
): OwnerMail {
  const city = ad.city.trim() || "ville non indiquée";
  const when = new Date(now).toISOString();
  const subject = clipSubject(`OPC pub business — ${ad.name || city}`);
  const text = [
    "Nouvelle pub business Open Community (à vérifier avant diffusion Accueil).",
    "",
    `Date: ${when}`,
    `Ville: ${city}`,
    `Commerce: ${ad.name}`,
    `Catégorie: ${ad.category || "(non fournie)"}`,
    `Contact auteur (pour proposition monétaire): ${ad.contactEmail}`,
    `Numéro OPC (appareil): ${ad.opcId || "non inscrit"}`,
    `Photo: ${ad.imageFilename} (~${Math.ceil(ad.imageBytes / 1024)} Ko)`,
    "",
    "Description:",
    ad.description || "(vide)",
    "",
    "Processus: vérifier la légitimité, puis revenir vers l’auteur avec une proposition monétaire compétitive.",
    "L’avatar OPC peut aider l’auteur à comparer Facebook / WhatsApp / sites locaux.",
    "",
    "— Ne pas publier sur Accueil tant que l’équipe n’a pas approuvé.",
  ].join("\n");
  const lower = ad.imageFilename.toLowerCase();
  const contentType = lower.endsWith(".png")
    ? "image/png"
    : lower.endsWith(".webp")
      ? "image/webp"
      : "image/jpeg";
  const attachments =
    ad.imageBase64 && ad.imageFilename
      ? [
          {
            filename: ad.imageFilename,
            content: ad.imageBase64,
            content_type: contentType,
          },
        ]
      : undefined;
  return { subject, text, attachments };
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
        ...(mail.attachments?.length ? { attachments: mail.attachments } : {}),
      }),
    });
    if (!response.ok) {
      let detail = "";
      try {
        const raw = (await response.text()).slice(0, 200);
        try {
          const errJson = JSON.parse(raw) as { message?: string; name?: string };
          detail = String(errJson.message || errJson.name || raw);
        } catch {
          detail = raw.replace(/\s+/g, " ").trim();
        }
      } catch {
        detail = "";
      }
      detail = detail.slice(0, 160);
      return {
        sent: false,
        reason: detail ? `http_${response.status}:${detail}` : `http_${response.status}`,
      };
    }
    return { sent: true };
  } catch {
    return { sent: false, reason: "network" };
  }
}
