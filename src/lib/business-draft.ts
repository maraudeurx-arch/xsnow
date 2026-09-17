/**
 * Cloudflare Workers AI helper for the business ad form.
 * Drafts copy from fields the visitor typed. Never scrapes Facebook.
 */

import { CHAT_API_URL } from "./llm.ts";
import { NOTES_TEXT_MAX, TITLE_TEXT_MAX, sanitizeUntrustedText } from "./sanitize.ts";

export const ADS_DRAFT_PATH = "/ads/draft";
export const BUSINESS_DRAFT_NOTES_MAX = 400;

const FACEBOOK_HOST_RE =
  /(?:https?:\/\/)?(?:www\.|m\.|web\.)?(?:facebook\.com|fb\.com|fb\.me|fb\.watch|facebookwkhpilnemxj7asaniu7vnjjbiltxjqhye3mhbshg7kx5tfyd\.onion)\b/i;
const FACEBOOK_SCRAPE_RE =
  /\b(?:scrape|scraping|scrap|crawler|crawl|graph\s*api)\b[\s\S]{0,40}\b(?:facebook|fb)\b|\b(?:facebook|fb)\b[\s\S]{0,40}\b(?:scrape|scraping|scrap|crawler|crawl|graph\s*api)\b/i;

export type BusinessDraftInput = {
  name?: string;
  category?: string;
  city?: string;
  notes?: string;
  locale?: string;
};

export type BusinessDraftRequest = {
  name: string;
  category: string;
  city: string;
  notes: string;
  locale: string;
};

export function adsDraftUrl(base: string = CHAT_API_URL): string {
  return `${base.replace(/\/+$/, "")}${ADS_DRAFT_PATH}`;
}

export function looksLikeFacebookScrape(text: string): boolean {
  const value = text.trim();
  if (!value) return false;
  if (FACEBOOK_HOST_RE.test(value)) return true;
  if (FACEBOOK_SCRAPE_RE.test(value)) return true;
  return false;
}

export function clipDraftField(raw: unknown, max: number): string {
  return sanitizeUntrustedText(raw, {
    max,
    redactEmails: true,
    allowNewlines: false,
  });
}

export function parseBusinessDraftInput(raw: unknown): BusinessDraftRequest | { error: "bad_request" | "no_facebook_scrape" } {
  if (!raw || typeof raw !== "object") return { error: "bad_request" };
  const record = raw as BusinessDraftInput;
  const name = clipDraftField(record.name, TITLE_TEXT_MAX);
  const category = clipDraftField(record.category, TITLE_TEXT_MAX);
  const city = clipDraftField(record.city, TITLE_TEXT_MAX);
  const notes = clipDraftField(record.notes, BUSINESS_DRAFT_NOTES_MAX);
  const localeRaw = typeof record.locale === "string" ? record.locale.trim().toLowerCase() : "fr";
  const locale = localeRaw === "en" || localeRaw === "es" ? localeRaw : "fr";
  if (!name) return { error: "bad_request" };

  const blob = [name, category, city, notes].join("\n");
  if (looksLikeFacebookScrape(blob)) return { error: "no_facebook_scrape" };

  return { name, category, city, notes, locale };
}

export function businessDraftSystemPrompt(locale: string): string {
  const lang =
    locale === "en" ? "English" : locale === "es" ? "Spanish" : "French";
  return [
    `You draft a short neighbourhood business ad for Open Community in ${lang}.`,
    "Use only the name, category, city, and notes the visitor typed.",
    "2 to 4 sentences. Plain text. No hashtags dump. No HTML.",
    "Never invent a phone, email, URL, price, or income.",
    "Never promise revenue, salary, or customers.",
    "Never scrape or mention Facebook, Instagram, or any social network as a source.",
    "If notes are thin, write a modest local intro and stop.",
  ].join(" ");
}

export function businessDraftUserPrompt(input: BusinessDraftRequest): string {
  return [
    `Name: ${input.name}`,
    input.category ? `Category: ${input.category}` : "",
    input.city ? `City: ${input.city}` : "",
    input.notes ? `Notes: ${input.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function draftBusinessAd(
  input: BusinessDraftInput,
  opts: { fetch?: typeof fetch; signal?: AbortSignal; apiUrl?: string } = {},
): Promise<{ ok: true; draft: string } | { ok: false; error: "network" | "empty" | "no_facebook_scrape" | "bad_request" }> {
  const parsed = parseBusinessDraftInput(input);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const fetchFn = opts.fetch ?? (typeof fetch === "function" ? fetch : undefined);
  if (!fetchFn) return { ok: false, error: "network" };

  try {
    const response = await fetchFn(adsDraftUrl(opts.apiUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
      signal: opts.signal,
    });
    if (response.status === 400) {
      let payload: { error?: unknown } = {};
      try {
        payload = (await response.json()) as { error?: unknown };
      } catch {
        payload = {};
      }
      if (payload.error === "no_facebook_scrape") {
        return { ok: false, error: "no_facebook_scrape" };
      }
      return { ok: false, error: "bad_request" };
    }
    if (!response.ok) return { ok: false, error: "network" };
    const payload = (await response.json()) as { draft?: unknown; reply?: unknown };
    const draft = sanitizeUntrustedText(payload.draft ?? payload.reply, {
      max: NOTES_TEXT_MAX,
      redactEmails: true,
      allowNewlines: true,
    });
    if (!draft) return { ok: false, error: "empty" };
    return { ok: true, draft };
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === "AbortError") throw caught;
    return { ok: false, error: "network" };
  }
}
