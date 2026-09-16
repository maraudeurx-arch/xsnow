/**
 * Keyless public chat proxy for Xsnow / Open Community.
 * Deploy: npx wrangler login && npx wrangler deploy
 *
 * Visitors never log in. GitHub Pages origin is allowed via CORS.
 * `POST /` = chat
 * `GET|POST /geo` = reverse geocode {lat,lon}
 * `GET /news` = local headlines via Google News RSS (no invented stories)
 * `POST /stats` = anonymous usage events (no PII)
 * `GET /stats/summary` = aggregate counts
 * `POST /ideas` = sanitized visitor ideas; emails opencommunity.opc@gmail.com
 * `POST /register` = optional registration notice to the same inbox
 * `GET /ideas` = owner list (JSON or HTML) behind `IDEAS_OWNER_SECRET`
 *
 * D1: `npx wrangler d1 create xsnow-stats` then set database_id in wrangler.toml
 * and `npx wrangler d1 migrations apply xsnow-stats --remote`.
 */

import { parseLatLon, reverseGeocode } from "./geo";
import { handleIdeasGet, handleIdeasPost, handleRegisterPost, isIdeasPath, isRegisterPath } from "./ideas";
import { fetchCityNews, parseCityParam, parseLangParam } from "./news";
import { CHAT_TEXT_MAX, isJsonContentType, sanitizeUntrustedText } from "../../../src/lib/sanitize.ts";
import {
  EMPTY_SUMMARY,
  insertStatsEvents,
  parseStatsEvents,
  readStatsSummary,
  type D1Like,
} from "./stats";

export interface Env {
  AI: {
    run: (model: string, inputs: Record<string, unknown>) => Promise<unknown>;
  };
  DB?: D1Like;
  /** Owner inbox. Set with `npx wrangler secret put IDEAS_OWNER_SECRET`. Never commit. */
  IDEAS_OWNER_SECRET?: string;
  /** Resend API key. `npx wrangler secret put RESEND_API_KEY`. Required to email ideas. */
  RESEND_API_KEY?: string;
  /** Optional From: header, verified Resend domain. Default: beth.t@example.com */
  IDEAS_FROM_EMAIL?: string;
}

const MODEL = "@cf/meta/llama-3.2-3b-instruct";
const MAX_BODY_BYTES = 16_384;
const MAX_MESSAGES = 24;
const MAX_TEXT_CHARS = CHAT_TEXT_MAX;
const MAX_TOKENS = 400;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 16;
const RATE_MAP_CAP = 2_000;

const ALLOWED_ORIGINS = new Set([
  "https://maraudeurx-arch.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

const hitsByIp = new Map<string, number[]>();

type ChatRole = "user" | "assistant";

type ChatTurn = {
  role: ChatRole;
  content: string;
};

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(data: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
    },
  });
}

function html(body: string, status: number, origin: string | null): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      ...corsHeaders(origin),
    },
  });
}

function clientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

function tooMany(ip: string): boolean {
  const now = Date.now();
  const recent = (hitsByIp.get(ip) ?? []).filter((stamp) => now - stamp < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    hitsByIp.set(ip, recent);
    return true;
  }
  recent.push(now);
  hitsByIp.set(ip, recent);

  if (hitsByIp.size > RATE_MAP_CAP) {
    for (const [key, stamps] of hitsByIp) {
      if (stamps.every((stamp) => now - stamp >= RATE_WINDOW_MS)) {
        hitsByIp.delete(key);
      }
    }
    if (hitsByIp.size > RATE_MAP_CAP) {
      const oldest = hitsByIp.keys().next().value;
      if (oldest) hitsByIp.delete(oldest);
    }
  }

  return false;
}

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

function clipLength(text: string): string {
  return text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text;
}

function clipUserText(text: string): string {
  return sanitizeUntrustedText(text, {
    max: MAX_TEXT_CHARS,
    redactEmails: false,
    allowNewlines: true,
  });
}

function parseBody(raw: unknown): { system: string; messages: ChatTurn[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as { system?: unknown; messages?: unknown };
  if (typeof record.system !== "string") return null;
  if (!Array.isArray(record.messages)) return null;
  if (record.messages.length === 0 || record.messages.length > MAX_MESSAGES) return null;

  const messages: ChatTurn[] = [];
  for (const item of record.messages) {
    if (!item || typeof item !== "object") return null;
    const turn = item as { role?: unknown; content?: unknown };
    if (turn.role !== "user" && turn.role !== "assistant") return null;
    const content = clipUserText(flattenContent(turn.content));
    if (!content) return null;
    messages.push({ role: turn.role, content });
  }

  const system = clipLength(record.system.trim());
  if (!system) return null;
  if (messages[messages.length - 1]?.role !== "user") return null;

  return { system, messages };
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

function isGeoPath(pathname: string) {
  return pathname === "/geo" || pathname.endsWith("/geo");
}

function isStatsSummaryPath(pathname: string) {
  const value = pathname.replace(/\/+$/, "") || "/";
  return value === "/stats/summary" || value.endsWith("/stats/summary");
}

function isStatsPath(pathname: string) {
  const value = pathname.replace(/\/+$/, "") || "/";
  return value === "/stats" || value.endsWith("/stats");
}

async function readJsonBody(request: Request, origin: string | null): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
  if (!isJsonContentType(request.headers.get("Content-Type"))) {
    return { ok: false, response: json({ error: "unsupported_media_type" }, 415, origin) };
  }

  const declaredLength = Number(request.headers.get("Content-Length") || "0");
  if (declaredLength > MAX_BODY_BYTES) {
    return { ok: false, response: json({ error: "payload_too_large" }, 413, origin) };
  }

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return { ok: false, response: json({ error: "bad_request" }, 400, origin) };
  }

  if (rawText.length > MAX_BODY_BYTES) {
    return { ok: false, response: json({ error: "payload_too_large" }, 413, origin) };
  }

  try {
    return { ok: true, value: JSON.parse(rawText) as unknown };
  } catch {
    return { ok: false, response: json({ error: "bad_request" }, 400, origin) };
  }
}

async function handleStats(request: Request, env: Env, origin: string | null): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, origin);
  }
  if (tooMany(clientIp(request))) {
    return json({ error: "rate_limited" }, 429, origin);
  }

  const body = await readJsonBody(request, origin);
  if (!body.ok) return body.response;

  const events = parseStatsEvents(body.value);
  if (!events.length) {
    return json({ error: "bad_request" }, 400, origin);
  }

  if (env.DB) {
    try {
      await insertStatsEvents(env.DB, events);
    } catch {
      return json({ error: "store_failed" }, 503, origin);
    }
  }

  return json({ ok: true, stored: events.length, persisted: Boolean(env.DB) }, 200, origin);
}

async function handleStatsSummary(request: Request, env: Env, origin: string | null): Promise<Response> {
  if (request.method !== "GET") {
    return json({ error: "method_not_allowed" }, 405, origin);
  }
  if (tooMany(clientIp(request))) {
    return json({ error: "rate_limited" }, 429, origin);
  }
  if (!env.DB) {
    return json({ ...EMPTY_SUMMARY, persisted: false }, 200, origin);
  }
  try {
    const summary = await readStatsSummary(env.DB);
    return json({ ...summary, persisted: true }, 200, origin);
  } catch {
    return json({ error: "store_failed" }, 503, origin);
  }
}


function isNewsPath(pathname: string) {
  const value = pathname.replace(/\/+$/, "") || "/";
  return value === "/news" || value.endsWith("/news");
}

async function handleIdeas(request: Request, env: Env, origin: string | null): Promise<Response> {
  if (request.method === "POST") {
    if (tooMany(clientIp(request))) {
      return json({ error: "rate_limited" }, 429, origin);
    }
    const body = await readJsonBody(request, origin);
    if (!body.ok) return body.response;
    const result = await handleIdeasPost(body.value, env);
    return json(result.data, result.status, origin);
  }

  if (request.method !== "GET") {
    return json({ error: "method_not_allowed" }, 405, origin);
  }

  if (tooMany(clientIp(request))) {
    return json({ error: "rate_limited" }, 429, origin);
  }

  const result = await handleIdeasGet(request, env);
  if (result.html) return html(result.html, result.status, origin);
  return json(result.json ?? { error: "unauthorized" }, result.status, origin);
}

async function handleRegister(request: Request, env: Env, origin: string | null): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, origin);
  }
  if (tooMany(clientIp(request))) {
    return json({ error: "rate_limited" }, 429, origin);
  }
  const body = await readJsonBody(request, origin);
  if (!body.ok) return body.response;
  const result = await handleRegisterPost(body.value, env);
  return json(result.data, result.status, origin);
}

async function handleNews(request: Request, origin: string | null): Promise<Response> {
  if (request.method !== "GET") {
    return json({ error: "method_not_allowed" }, 405, origin);
  }
  if (tooMany(clientIp(request))) {
    return json({ error: "rate_limited" }, 429, origin);
  }

  const url = new URL(request.url);
  const city = parseCityParam(url.searchParams.get("city"));
  if (!city) return json({ error: "bad_request" }, 400, origin);
  const lang = parseLangParam(url.searchParams.get("lang"));
  const countryRaw = url.searchParams.get("country");
  const country =
    typeof countryRaw === "string" && countryRaw.trim()
      ? countryRaw.trim().slice(0, 8).toUpperCase()
      : undefined;

  try {
    const payload = await fetchCityNews({ city, lang, country });
    return json(payload, 200, origin);
  } catch {
    return json({ error: "news_failed" }, 502, origin);
  }
}

async function handleGeo(request: Request, origin: string | null): Promise<Response> {
  if (request.method !== "GET" && request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, origin);
  }

  if (tooMany(clientIp(request))) {
    return json({ error: "rate_limited" }, 429, origin);
  }

  if (request.method === "GET") {
    const url = new URL(request.url);
    const parsed = parseLatLon({
      lat: url.searchParams.get("lat"),
      lon: url.searchParams.get("lon"),
    });
    if (!parsed) return json({ error: "bad_request" }, 400, origin);
    const result = await reverseGeocode(parsed.lat, parsed.lon);
    if (!result) return json({ error: "geocode_failed" }, 502, origin);
    return json(result, 200, origin);
  }

  const body = await readJsonBody(request, origin);
  if (!body.ok) return body.response;

  const coords = parseLatLon(
    body.value && typeof body.value === "object"
      ? (body.value as { lat?: unknown; lon?: unknown; longitude?: unknown })
      : {},
  );
  if (!coords) return json({ error: "bad_request" }, 400, origin);

  const result = await reverseGeocode(coords.lat, coords.lon);
  if (!result) return json({ error: "geocode_failed" }, 502, origin);
  return json(result, 200, origin);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const pathname = new URL(request.url).pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (isGeoPath(pathname)) {
      return handleGeo(request, origin);
    }

    if (isNewsPath(pathname)) {
      return handleNews(request, origin);
    }

    if (isStatsSummaryPath(pathname)) {
      return handleStatsSummary(request, env, origin);
    }

    if (isStatsPath(pathname)) {
      return handleStats(request, env, origin);
    }

    if (isIdeasPath(pathname)) {
      return handleIdeas(request, env, origin);
    }

    if (isRegisterPath(pathname)) {
      return handleRegister(request, env, origin);
    }

    if (request.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405, origin);
    }

    if (tooMany(clientIp(request))) {
      return json({ error: "rate_limited" }, 429, origin);
    }

    const parsed = await readJsonBody(request, origin);
    if (!parsed.ok) return parsed.response;

    const body = parseBody(parsed.value);
    if (!body) {
      return json({ error: "bad_request" }, 400, origin);
    }

    try {
      const result = await env.AI.run(MODEL, {
        messages: [{ role: "system", content: body.system }, ...body.messages],
        max_tokens: MAX_TOKENS,
        temperature: 0.6,
      });
      const reply = clipUserText(replyFromAi(result));
      if (!reply) {
        return json({ error: "empty" }, 502, origin);
      }
      return json({ reply }, 200, origin);
    } catch {
      return json({ error: "upstream" }, 502, origin);
    }
  },
};
