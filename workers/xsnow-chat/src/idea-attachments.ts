/**
 * POST /idea-attachments — optional document or photo of a « Vendre mes
 * idées » proposal (sketch, describing document, prototype photo).
 * Emails opencommunity.opc@gmail.com with the file attached, under the
 * same proposal id the flattened proposal text travels with (/ideas).
 * Modeled on /business-ads: same Resend owner mail, same omit-and-retry
 * fallback when the attachment send fails.
 */

import {
  buildIdeaAttachmentOwnerMail,
  sendOwnerMail,
  type MailEnv,
} from "../../../src/lib/owner-mail.ts";
import { sanitizeUntrustedText, TITLE_TEXT_MAX } from "../../../src/lib/sanitize.ts";
import { clipOpcId } from "../../../src/lib/owner-mail.ts";
import { sanitizeRecordId } from "../../../src/lib/sanitize.ts";
import {
  IDEA_ATTACHMENT_MAX_BYTES,
  ideaAttachmentKind,
} from "../../../src/lib/idea-attachment.ts";

export type IdeaAttachmentsEnv = MailEnv;

export function isIdeaAttachmentsPath(pathname: string) {
  const value = pathname.replace(/\/+$/, "") || "/";
  return value === "/idea-attachments" || value.endsWith("/idea-attachments");
}

function parseBody(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = sanitizeRecordId(record.id) || "";
  const mime = typeof record.mime === "string" ? record.mime.trim().toLowerCase() : "";
  if (!id || !ideaAttachmentKind(mime)) return null;
  const base64 = typeof record.base64 === "string" ? record.base64.replace(/\s+/g, "") : "";
  if (!base64) return null;
  // rough byte size from base64
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const bytes = Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
  if (bytes <= 0 || bytes > IDEA_ATTACHMENT_MAX_BYTES) return null;
  const fallbackName = mime === "application/pdf" ? "document.pdf" : "photo.jpg";
  const filename =
    typeof record.filename === "string"
      ? record.filename.trim().replace(/[^\w.\-]+/g, "").slice(0, 80)
      : "";
  return {
    id,
    title: sanitizeUntrustedText(record.title, { max: TITLE_TEXT_MAX }),
    opcId: clipOpcId(record.opcId),
    filename: filename || fallbackName,
    mime,
    base64,
    bytes,
  };
}

export async function handleIdeaAttachmentsPost(
  raw: unknown,
  env: IdeaAttachmentsEnv,
): Promise<Response> {
  const input = parseBody(raw);
  if (!input) {
    return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const mail = buildIdeaAttachmentOwnerMail(input);
  let result = await sendOwnerMail(env, mail);
  let attachmentOmitted = false;
  if (!result.sent && mail.attachments?.length) {
    const { attachments: _drop, ...without } = mail;
    const retryText =
      without.text +
      "\n\n[Fichier non joint: l’envoi avec pièce jointe a échoué. Demander le document ou la photo à l’auteur si besoin.]";
    result = await sendOwnerMail(env, { ...without, text: retryText });
    attachmentOmitted = result.sent;
  }
  return Response.json(
    {
      ok: true,
      emailed: result.sent,
      reason: result.reason,
      attachmentOmitted,
    },
    { status: result.sent ? 200 : 502 },
  );
}
