/**
 * Business photo ads → owner inbox (opencommunity.opc@gmail.com) for review
 * before any Accueil rotation or monetary offer.
 */

import { isSafeImageDataUrl, dataUrlByteLength } from "./compress-ad-image.ts";
import { clipNeighborhood } from "./ideas.ts";
import { clipOpcId } from "./owner-mail.ts";
import { sanitizeProfileEmail } from "./local-profile.ts";
import { sanitizeUntrustedText, TITLE_TEXT_MAX } from "./sanitize.ts";

export const BUSINESS_AD_INBOX_FALLBACK_URL =
  "https://xsnow-chat.xsnowopc.workers.dev/business-ads";
export const BUSINESS_AD_POST_TIMEOUT_MS = 20_000;
export const BUSINESS_AD_DESC_MAX = 500;

export type BusinessAdInboxInput = {
  id: string;
  name: string;
  category: string;
  city: string;
  description: string;
  contactEmail: string;
  opcId: string;
  imageDataUrl: string;
  imageBytes: number;
};

export type BusinessAdInboxPostResult = "sent" | "failed";

export function businessAdsInboxEndpoint(base?: string) {
  const raw =
    base ||
    (typeof process !== "undefined" &&
      (process.env.NEXT_PUBLIC_CHAT_API_URL || process.env.NEXT_PUBLIC_CHAT_API)) ||
    "https://xsnow-chat.xsnowopc.workers.dev";
  return `${String(raw).replace(/\/+$/, "")}/business-ads`;
}

function dataUrlToBase64(dataUrl: string): { base64: string; filename: string } | null {
  const trimmed = dataUrl.trim();
  const match = trimmed.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
  if (!match) return null;
  const ext = match[1]!.toLowerCase() === "png" ? "png" : match[1]!.toLowerCase() === "webp" ? "webp" : "jpg";
  return { base64: match[2]!, filename: `pub-business.${ext}` };
}

export function parseBusinessAdInboxInput(raw: unknown): BusinessAdInboxInput | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const name = sanitizeUntrustedText(record.name, { max: TITLE_TEXT_MAX });
  if (!name) return null;
  const contactEmail = sanitizeProfileEmail(record.contactEmail);
  if (!contactEmail) return null;
  const imageDataUrl = typeof record.imageDataUrl === "string" ? record.imageDataUrl.trim() : "";
  if (!isSafeImageDataUrl(imageDataUrl)) return null;
  const category = sanitizeUntrustedText(record.category, { max: 60 });
  const city = clipNeighborhood(typeof record.city === "string" ? record.city : "").slice(0, 80);
  const description = sanitizeUntrustedText(record.description, {
    max: BUSINESS_AD_DESC_MAX,
    allowNewlines: true,
  });
  const id = typeof record.id === "string" ? record.id.trim().slice(0, 64) : "";
  const opcId = clipOpcId(record.opcId);
  const imageBytes =
    typeof record.imageBytes === "number" && Number.isFinite(record.imageBytes)
      ? record.imageBytes
      : dataUrlByteLength(imageDataUrl);
  return {
    id,
    name,
    category,
    city,
    description,
    contactEmail,
    opcId,
    imageDataUrl,
    imageBytes,
  };
}

export async function postBusinessAdToInbox(
  input: BusinessAdInboxInput,
  fetchImpl: typeof fetch = fetch,
): Promise<BusinessAdInboxPostResult> {
  const parsed = parseBusinessAdInboxInput(input);
  if (!parsed) return "failed";
  const encoded = dataUrlToBase64(parsed.imageDataUrl);
  if (!encoded) return "failed";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BUSINESS_AD_POST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(businessAdsInboxEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: parsed.id,
        name: parsed.name,
        category: parsed.category,
        city: parsed.city,
        description: parsed.description,
        contactEmail: parsed.contactEmail,
        opcId: parsed.opcId,
        imageBase64: encoded.base64,
        imageFilename: encoded.filename,
        imageBytes: parsed.imageBytes,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return "failed";
    const json = (await response.json()) as { ok?: boolean; emailed?: boolean };
    return json.ok && json.emailed ? "sent" : "failed";
  } catch {
    return "failed";
  } finally {
    clearTimeout(timer);
  }
}

export { dataUrlToBase64 };
