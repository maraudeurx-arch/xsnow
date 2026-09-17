/**
 * POST /ads/draft — Workers AI copy assist for the business ad form.
 * Never scrapes Facebook. Visitors typed the fields themselves.
 */

import {
  businessDraftSystemPrompt,
  businessDraftUserPrompt,
  parseBusinessDraftInput,
} from "../../../src/lib/business-draft.ts";
import { NOTES_TEXT_MAX, sanitizeUntrustedText } from "../../../src/lib/sanitize.ts";

export type AdsDraftAi = {
  run: (model: string, inputs: Record<string, unknown>) => Promise<unknown>;
};

const MODEL = "@cf/meta/llama-3.2-3b-instruct";
const MAX_TOKENS = 280;

function flattenContent(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
        return (part as { text: string }).text;
      }
      return "";
    })
    .join("")
    .trim();
}

function replyFromAi(payload: unknown): string {
  if (typeof payload === "string") return payload.trim();
  if (!payload || typeof payload !== "object") return "";
  const record = payload as {
    response?: unknown;
    reply?: unknown;
    result?: { response?: unknown };
    choices?: Array<{ message?: { content?: unknown }; text?: unknown }>;
  };
  if (typeof record.response === "string" && record.response.trim()) {
    return record.response.trim();
  }
  if (typeof record.reply === "string" && record.reply.trim()) {
    return record.reply.trim();
  }
  if (typeof record.result?.response === "string" && record.result.response.trim()) {
    return record.result.response.trim();
  }
  const choice = record.choices?.[0];
  const fromChoice = flattenContent(choice?.message?.content);
  if (fromChoice) return fromChoice;
  if (typeof choice?.text === "string") return choice.text.trim();
  return "";
}

export function isAdsDraftPath(pathname: string) {
  const value = pathname.replace(/\/+$/, "") || "/";
  return value === "/ads/draft" || value.endsWith("/ads/draft");
}

export async function handleAdsDraft(
  raw: unknown,
  env: { AI: AdsDraftAi },
): Promise<{ status: number; data: Record<string, unknown> }> {
  const parsed = parseBusinessDraftInput(raw);
  if ("error" in parsed) {
    const status = parsed.error === "no_facebook_scrape" ? 400 : 400;
    return { status, data: { error: parsed.error } };
  }

  try {
    const result = await env.AI.run(MODEL, {
      messages: [
        { role: "system", content: businessDraftSystemPrompt(parsed.locale) },
        { role: "user", content: businessDraftUserPrompt(parsed) },
      ],
      max_tokens: MAX_TOKENS,
      temperature: 0.4,
    });
    const draft = sanitizeUntrustedText(replyFromAi(result), {
      max: NOTES_TEXT_MAX,
      redactEmails: true,
      allowNewlines: true,
    });
    if (!draft) return { status: 502, data: { error: "empty" } };
    return { status: 200, data: { draft } };
  } catch {
    return { status: 502, data: { error: "upstream" } };
  }
}
