/**
 * POST /business-ads — visitor business photo ad for owner review.
 * Emails opencommunity.opc@gmail.com with the photo attached. Never auto-publishes Accueil.
 */

import {
  buildBusinessAdOwnerMail,
  sendOwnerMail,
  type MailEnv,
} from "../../../src/lib/owner-mail.ts";
import { sanitizeUntrustedText, TITLE_TEXT_MAX } from "../../../src/lib/sanitize.ts";
import { sanitizeProfileEmail } from "../../../src/lib/local-profile.ts";
import { clipNeighborhood } from "../../../src/lib/ideas.ts";
import { clipOpcId } from "../../../src/lib/owner-mail.ts";
import { AD_IMAGE_MAX_BYTES } from "../../../src/lib/compress-ad-image.ts";

export type BusinessAdsEnv = MailEnv;

export function isBusinessAdsPath(pathname: string) {
  const value = pathname.replace(/\/+$/, "") || "/";
  return value === "/business-ads" || value.endsWith("/business-ads");
}

function parseBody(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const name = sanitizeUntrustedText(record.name, { max: TITLE_TEXT_MAX });
  const contactEmail = sanitizeProfileEmail(record.contactEmail);
  const imageBase64 = typeof record.imageBase64 === "string" ? record.imageBase64.trim() : "";
  const imageFilename =
    typeof record.imageFilename === "string"
      ? record.imageFilename.trim().replace(/[^\w.\-]+/g, "").slice(0, 80)
      : "pub-business.jpg";
  if (!name || !contactEmail || !imageBase64) return null;
  // rough byte size from base64
  const padding = imageBase64.endsWith("==") ? 2 : imageBase64.endsWith("=") ? 1 : 0;
  const bytes = Math.max(0, Math.floor((imageBase64.length * 3) / 4) - padding);
  if (bytes <= 0 || bytes > AD_IMAGE_MAX_BYTES) return null;
  return {
    name,
    category: sanitizeUntrustedText(record.category, { max: 60 }),
    city: clipNeighborhood(typeof record.city === "string" ? record.city : "").slice(0, 80),
    description: sanitizeUntrustedText(record.description, { max: 500, allowNewlines: true }),
    contactEmail,
    opcId: clipOpcId(record.opcId),
    imageBase64,
    imageFilename: imageFilename || "pub-business.jpg",
    imageBytes: bytes,
  };
}

export async function handleBusinessAdsPost(
  raw: unknown,
  env: BusinessAdsEnv,
): Promise<Response> {
  const input = parseBody(raw);
  if (!input) {
    return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const mail = buildBusinessAdOwnerMail(input);
  const result = await sendOwnerMail(env, mail);
  return Response.json(
    { ok: true, emailed: result.sent, reason: result.reason },
    { status: result.sent ? 200 : 502 },
  );
}
