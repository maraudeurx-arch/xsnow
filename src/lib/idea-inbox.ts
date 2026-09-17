/**
 * Cross-device owner inbox for Vos idées.
 *
 * Visitors still persist ideas on-device (localStorage). A sanitized copy
 * (plain text + city + timestamp + optional OPC id — never name, visitor phone)
 * is POSTed to the Cloudflare Worker, which emails opencommunity.opc@gmail.com.
 * The owner can also read GET /ideas behind IDEAS_OWNER_SECRET.
 */

import { IDEA_TEXT_MAX, IDEA_TEXT_MIN, clipIdeaText, clipNeighborhood } from "./ideas.ts";
import { clipOpcId } from "./owner-mail.ts";
import { sanitizeRecordId } from "./sanitize.ts";

export const IDEA_EVENT_TYPE = "community_idea";
export const IDEA_INBOX_CITY_MAX = 80;
export const IDEA_INBOX_LIST_MAX = 200;
export const IDEA_INBOX_POST_TIMEOUT_MS = 8_000;
export const OWNER_SECRET_QUERY = "secret";

export const IDEAS_INBOX_FALLBACK_URL = "https://xsnow-chat.xsnowopc.workers.dev/ideas";

export type IdeaInboxInput = {
  id: string;
  text: string;
  city: string;
  opcId: string;
};

export type StoredInboxIdea = {
  id: string;
  text: string;
  city: string;
  createdAt: number;
};

export type IdeaCityCompile = {
  city: string;
  n: number;
};

export type IdeaInboxPostResult = "sent" | "failed";

export type IdeaInboxListPayload = {
  ok: true;
  count: number;
  compiled: IdeaCityCompile[];
  ideas: StoredInboxIdea[];
};

export function ideasInboxEndpoint(base?: string) {
  const raw =
    base ||
    (typeof process !== "undefined" &&
      (process.env.NEXT_PUBLIC_CHAT_API_URL || process.env.NEXT_PUBLIC_CHAT_API)) ||
    "https://xsnow-chat.xsnowopc.workers.dev";
  return `${String(raw).replace(/\/+$/, "")}/ideas`;
}

export function registerNoticeEndpoint(base?: string) {
  const ideas = ideasInboxEndpoint(base);
  return ideas.replace(/\/ideas$/, "/register");
}

export function clipInboxCity(value: string) {
  return clipNeighborhood(value).slice(0, IDEA_INBOX_CITY_MAX);
}

export function parseIdeaInboxInput(raw: unknown): IdeaInboxInput | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const text = typeof record.text === "string" ? clipIdeaText(record.text) : "";
  if (text.length < IDEA_TEXT_MIN) return null;
  if (text.length > IDEA_TEXT_MAX) return null;
  const city = typeof record.city === "string" ? clipInboxCity(record.city) : "";
  const id = sanitizeRecordId(record.id) || "";
  const opcId = clipOpcId(record.opcId);
  // Whitelist only. Extra keys (email, phone, lastName, …) are dropped here.
  return { id, text, city, opcId };
}

export function compileIdeasByCity(ideas: Array<{ city: string }>): IdeaCityCompile[] {
  const counts = new Map<string, number>();
  for (const idea of ideas) {
    const city = typeof idea.city === "string" ? idea.city.trim() : "";
    counts.set(city, (counts.get(city) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([city, n]) => ({ city, n }))
    .sort((a, b) => b.n - a.n || a.city.localeCompare(b.city, "fr"));
}

export function inboxListPayload(ideas: StoredInboxIdea[]): IdeaInboxListPayload {
  const clipped = ideas.slice(0, IDEA_INBOX_LIST_MAX);
  return {
    ok: true,
    count: clipped.length,
    compiled: compileIdeasByCity(clipped),
    ideas: clipped,
  };
}

function isInboxListPayload(raw: unknown): raw is IdeaInboxListPayload {
  if (!raw || typeof raw !== "object") return false;
  const record = raw as { ok?: unknown; ideas?: unknown; compiled?: unknown; count?: unknown };
  return record.ok === true && Array.isArray(record.ideas) && Array.isArray(record.compiled);
}

export async function postIdeaToInbox(
  input: { id: string; text: string; city: string; opcId?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<IdeaInboxPostResult> {
  const parsed = parseIdeaInboxInput(input);
  if (!parsed) return "failed";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IDEA_INBOX_POST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(ideasInboxEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
      keepalive: true,
      credentials: "omit",
      signal: controller.signal,
    });
    if (!response.ok) return "failed";
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      return "failed";
    }
    if (!payload || typeof payload !== "object") return "failed";
    const record = payload as { ok?: unknown; emailed?: unknown };
    return record.ok === true && record.emailed === true ? "sent" : "failed";
  } catch {
    return "failed";
  } finally {
    clearTimeout(timer);
  }
}

export async function postRegisterNotice(
  input: { firstName: string; opcId: string; email: string; city: string },
  fetchImpl: typeof fetch = fetch,
): Promise<IdeaInboxPostResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IDEA_INBOX_POST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(registerNoticeEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      keepalive: true,
      credentials: "omit",
      signal: controller.signal,
    });
    if (!response.ok) return "failed";
    const payload = (await response.json()) as { ok?: unknown; emailed?: unknown };
    return payload.ok === true && payload.emailed === true ? "sent" : "failed";
  } catch {
    return "failed";
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchOwnerIdeaInbox(
  secret: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; payload: IdeaInboxListPayload } | { ok: false; status: number }> {
  const trimmed = secret.trim();
  if (!trimmed) return { ok: false, status: 401 };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IDEA_INBOX_POST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(ideasInboxEndpoint(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${trimmed}`,
      },
      credentials: "omit",
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, status: response.status };
    const payload: unknown = await response.json();
    if (!isInboxListPayload(payload)) return { ok: false, status: 502 };
    return { ok: true, payload };
  } catch {
    return { ok: false, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

export function ownerIdeasExportName(now = new Date()) {
  const stamp = now.toISOString().slice(0, 10);
  return `opc-idees-${stamp}.json`;
}
