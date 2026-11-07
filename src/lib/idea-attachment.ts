/**
 * Optional document or photo attached to a « Vendre mes idées » proposal
 * (Popol, 07/11/2026): a sketch, a document describing the idea, a photo of
 * a prototype.
 *
 * Transport reuses the one attachment route that already exists in this
 * codebase — the business photo ads pattern. The flattened « Vos idées »
 * text channel stays exactly as it is (plain text, no PII); the file can
 * never travel inside it. Instead the file is POSTed separately, under the
 * same proposal id, to the Worker's /idea-attachments endpoint, which
 * e-mails it to the team inbox (opencommunity.opc@gmail.com) as a Resend
 * attachment — the same destination the proposal and the register notice
 * already use, under the seller's (extended) consent.
 *
 * Guardrails: common image types or PDF only; one explicit size cap;
 * images are re-encoded on the device through the existing ad-image
 * pipeline (JPEG ≤150 Ko for the inbox), PDFs are sent as-is under the cap.
 * The attachment is optional and best-effort: the proposal is sent without
 * it, and a failed attachment upload never blocks the proposal.
 */

import { dataUrlByteLength, prepareAdImageForInbox } from "./compress-ad-image.ts";
import { clipOpcId } from "./owner-mail.ts";
import { sanitizeRecordId } from "./sanitize.ts";

/** Decoded-size cap for one attachment (same ceiling as the ad pipeline). */
export const IDEA_ATTACHMENT_MAX_BYTES = 400 * 1024;
export const IDEA_ATTACHMENT_POST_TIMEOUT_MS = 45_000;

export const IDEA_ATTACHMENT_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
export const IDEA_ATTACHMENT_PDF_MIME = "application/pdf";

export type IdeaAttachmentKind = "image" | "pdf";

export function ideaAttachmentKind(mime: string): IdeaAttachmentKind | null {
  const value = (mime || "").trim().toLowerCase();
  if ((IDEA_ATTACHMENT_IMAGE_MIMES as readonly string[]).includes(value)) return "image";
  if (value === IDEA_ATTACHMENT_PDF_MIME) return "pdf";
  return null;
}

export type IdeaAttachmentMetaIssue = "type" | "size";

/** Pure metadata gate (declared type + size), used before any file read. */
export function ideaAttachmentMetaIssue(meta: { type: string; size: number }): IdeaAttachmentMetaIssue | null {
  if (!ideaAttachmentKind(meta.type)) return "type";
  if (!Number.isFinite(meta.size) || meta.size <= 0 || meta.size > IDEA_ATTACHMENT_MAX_BYTES) return "size";
  return null;
}

const DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,([A-Za-z0-9+/=\s]+)$/;

export type ParsedIdeaAttachmentDataUrl = {
  mime: string;
  kind: IdeaAttachmentKind;
  base64: string;
  bytes: number;
};

/** Whitelist-parse a data URL (same defence as isSafeImageDataUrl, plus PDF). */
export function parseIdeaAttachmentDataUrl(raw: string): ParsedIdeaAttachmentDataUrl | null {
  const value = String(raw ?? "").trim();
  const match = value.match(DATA_URL_RE);
  if (!match) return null;
  const mime = match[1]!.toLowerCase();
  const kind = ideaAttachmentKind(mime);
  if (!kind) return null;
  const base64 = match[2]!.replace(/\s+/g, "");
  const bytes = dataUrlByteLength(`data:${mime};base64,${base64}`);
  if (bytes <= 0 || bytes > IDEA_ATTACHMENT_MAX_BYTES) return null;
  return { mime, kind, base64, bytes };
}

export type PreparedIdeaAttachment = {
  dataUrl: string;
  mime: string;
  filename: string;
  bytes: number;
};

export type PrepareIdeaAttachmentResult =
  | { ok: true; value: PreparedIdeaAttachment }
  | { ok: false; reason: "bad_type" | "too_big" | "unreadable" };

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

function safeFilename(name: string, fallback: string): string {
  const cleaned = (name || "").trim().replace(/[^\w.\-]+/g, "").slice(0, 80);
  return cleaned || fallback;
}

/**
 * Validate and prepare a chosen file on the device. Images go through the
 * existing inbox image pipeline (re-encoded JPEG ≤150 Ko); PDFs are read
 * as-is and held to IDEA_ATTACHMENT_MAX_BYTES.
 */
export async function prepareIdeaAttachment(file: File): Promise<PrepareIdeaAttachmentResult> {
  // A PDF picked from some file managers arrives with an empty type:
  // fall back to the extension before refusing.
  const kind = ideaAttachmentKind(file.type) ?? (/\.pdf$/i.test(file.name || "") ? "pdf" : null);
  if (!kind) return { ok: false, reason: "bad_type" };
  // The size cap gates what is SENT. A PDF travels as-is, so it is gated
  // here; an image is first re-encoded by the inbox pipeline (≤150 Ko),
  // which applies its own raw-read cap — a multi-megabyte photo is fine.
  if (kind === "pdf" && ideaAttachmentMetaIssue({ type: IDEA_ATTACHMENT_PDF_MIME, size: file.size }) === "size") {
    return { ok: false, reason: "too_big" };
  }

  if (kind === "image") {
    const prepared = await prepareAdImageForInbox(file);
    if (!prepared.ok) {
      return { ok: false, reason: prepared.reason === "too_large" ? "too_big" : prepared.reason === "not_image" ? "bad_type" : "unreadable" };
    }
    return {
      ok: true,
      value: {
        dataUrl: prepared.value.dataUrl,
        mime: prepared.value.mime,
        filename: safeFilename(file.name, prepared.value.filename),
        bytes: prepared.value.bytes,
      },
    };
  }

  try {
    const dataUrl = await fileToDataUrl(file);
    const parsed = parseIdeaAttachmentDataUrl(dataUrl);
    if (!parsed) return { ok: false, reason: "too_big" };
    return {
      ok: true,
      value: {
        dataUrl,
        mime: IDEA_ATTACHMENT_PDF_MIME,
        filename: safeFilename(file.name, "document.pdf"),
        bytes: parsed.bytes,
      },
    };
  } catch {
    return { ok: false, reason: "unreadable" };
  }
}

export function ideaAttachmentsEndpoint(base?: string) {
  const raw =
    base ||
    (typeof process !== "undefined" &&
      (process.env.NEXT_PUBLIC_CHAT_API_URL || process.env.NEXT_PUBLIC_CHAT_API)) ||
    "https://xsnow-chat.xsnowopc.workers.dev";
  return `${String(raw).replace(/\/+$/, "")}/idea-attachments`;
}

export type IdeaAttachmentPostResult = "sent" | "failed";

/**
 * Best-effort upload of the prepared attachment, keyed by the proposal id
 * (the same id the flattened proposal text travels under), so the team can
 * match file and proposal in the inbox.
 */
export async function postIdeaAttachment(
  input: { id: string; title: string; opcId?: string; attachment: PreparedIdeaAttachment },
  fetchImpl: typeof fetch = fetch,
): Promise<IdeaAttachmentPostResult> {
  const parsed = parseIdeaAttachmentDataUrl(input.attachment.dataUrl);
  if (!parsed) return "failed";
  const id = sanitizeRecordId(input.id) || "";
  if (!id) return "failed";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IDEA_ATTACHMENT_POST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(ideaAttachmentsEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        title: String(input.title ?? "").slice(0, 60),
        opcId: clipOpcId(input.opcId),
        filename: input.attachment.filename,
        mime: parsed.mime,
        base64: parsed.base64,
      }),
      keepalive: true,
      credentials: "omit",
      signal: controller.signal,
    });
    if (!response.ok) return "failed";
    const payload = (await response.json().catch(() => null)) as { ok?: unknown; emailed?: unknown } | null;
    return payload?.ok === true && payload?.emailed === true ? "sent" : "failed";
  } catch {
    return "failed";
  } finally {
    clearTimeout(timer);
  }
}
