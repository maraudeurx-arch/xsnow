/**
 * Owner inbox for Vos idées.
 * POST /ideas — public, sanitized plain text + city (no HTML, no PII).
 * GET  /ideas?secret=  or Authorization: Bearer — owner list / HTML / JSON.
 *
 * Stored in the existing D1 `events` table as type `community_idea`
 * (session_id = idea id, suggestion = text, city, ts). No extra KV/DO.
 */

import {
  compileIdeasByCity,
  IDEA_EVENT_TYPE,
  IDEA_INBOX_LIST_MAX,
  inboxListPayload,
  OWNER_SECRET_QUERY,
  parseIdeaInboxInput,
  type StoredInboxIdea,
} from "../../../src/lib/idea-inbox.ts";
import {
  buildIdeaOwnerMail,
  buildRegisterOwnerMail,
  parseRegisterNotice,
  sendOwnerMail,
  type MailEnv,
  type OwnerMail,
} from "../../../src/lib/owner-mail.ts";
import { sanitizeRecordId } from "../../../src/lib/sanitize.ts";
import type { D1Like } from "./stats";

export type IdeasEnv = MailEnv & {
  DB?: D1Like;
  IDEAS_OWNER_SECRET?: string;
};

export type OwnerMailer = (env: IdeasEnv, mail: OwnerMail) => Promise<{ sent: boolean; reason?: string }>;

const INSERT = `INSERT INTO events (session_id, type, ts, lang, city, country_code, suggestion)
VALUES (?, ?, ?, ?, ?, ?, ?)`;

const SELECT_ONE = `SELECT session_id AS id FROM events WHERE type = ? AND session_id = ? LIMIT 1`;

const SELECT_LIST = `SELECT session_id AS id, suggestion AS text, city, ts AS createdAt
FROM events
WHERE type = ? AND suggestion IS NOT NULL
ORDER BY ts DESC
LIMIT ?`;

export function isIdeasPath(pathname: string) {
  const value = pathname.replace(/\/+$/, "") || "/";
  return value === "/ideas" || value.endsWith("/ideas");
}

export function isRegisterPath(pathname: string) {
  const value = pathname.replace(/\/+$/, "") || "/";
  return value === "/register" || value.endsWith("/register");
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function readPresentedSecret(request: Request): string {
  const header = request.headers.get("Authorization") || "";
  const bearer = header.match(/^Bearer\s+(\S+)/i);
  if (bearer?.[1]) return bearer[1];
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get(OWNER_SECRET_QUERY) || url.searchParams.get("key");
  return typeof fromQuery === "string" ? fromQuery : "";
}

export async function secretsEqual(given: string, expected: string): Promise<boolean> {
  if (!given || !expected) return false;
  const encoder = new TextEncoder();
  const left = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(given)));
  const right = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(expected)));
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left[i]! ^ right[i]!;
  }
  return diff === 0;
}

export async function ownerAuthorized(request: Request, env: IdeasEnv): Promise<boolean> {
  const expected = typeof env.IDEAS_OWNER_SECRET === "string" ? env.IDEAS_OWNER_SECRET.trim() : "";
  if (!expected) return false;
  return secretsEqual(readPresentedSecret(request).trim(), expected);
}

function newIdeaId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  }
  return `idea${Date.now().toString(36)}`;
}

export async function insertInboxIdea(
  db: D1Like,
  input: { id: string; text: string; city: string },
  now = Date.now(),
): Promise<StoredInboxIdea> {
  const id = sanitizeRecordId(input.id) || newIdeaId();
  const existing = await db.prepare(SELECT_ONE).bind(IDEA_EVENT_TYPE, id).first<{ id: string }>();
  if (existing?.id) {
    return { id, text: input.text, city: input.city, createdAt: now };
  }
  await db.batch([
    db.prepare(INSERT).bind(id, IDEA_EVENT_TYPE, now, null, input.city || null, null, input.text),
  ]);
  return { id, text: input.text, city: input.city, createdAt: now };
}

export async function listInboxIdeas(db: D1Like, limit = IDEA_INBOX_LIST_MAX): Promise<StoredInboxIdea[]> {
  const rows = await db
    .prepare(SELECT_LIST)
    .bind(IDEA_EVENT_TYPE, limit)
    .all<{ id: string; text: string; city: string | null; createdAt: number }>();
  const out: StoredInboxIdea[] = [];
  for (const row of rows.results) {
    const parsed = parseIdeaInboxInput({
      id: row.id,
      text: row.text,
      city: row.city || "",
    });
    if (!parsed) continue;
    const createdAt =
      typeof row.createdAt === "number" && Number.isFinite(row.createdAt) ? row.createdAt : 0;
    out.push({
      id: parsed.id || row.id,
      text: parsed.text,
      city: parsed.city,
      createdAt,
    });
  }
  return out;
}

export function wantsJson(request: Request) {
  const url = new URL(request.url);
  const format = (url.searchParams.get("format") || "").toLowerCase();
  if (format === "json") return true;
  if (format === "html") return false;
  const accept = request.headers.get("Accept") || "";
  return accept.includes("application/json") && !accept.includes("text/html");
}

export function renderOwnerHtml(ideas: StoredInboxIdea[]): string {
  const payload = inboxListPayload(ideas);
  const compiled = compileIdeasByCity(payload.ideas);
  const compiledRows =
    compiled.length === 0
      ? `<p class="empty">Aucune idée reçue pour l’instant. Les visiteurs envoient depuis Vos idées. Rien n’est inventé ici.</p>`
      : `<ul class="compile">${compiled
          .map((row) => {
            const label = row.city ? escapeHtml(row.city) : "Ville non indiquée";
            return `<li>${label} — <strong>${row.n}</strong></li>`;
          })
          .join("")}</ul>`;
  const items =
    payload.ideas.length === 0
      ? ""
      : `<ol class="ideas">${payload.ideas
          .map((idea) => {
            const when = idea.createdAt
              ? escapeHtml(new Date(idea.createdAt).toISOString())
              : "";
            const city = idea.city ? escapeHtml(idea.city) : "Ville non indiquée";
            return `<li>
  <p class="meta">${city} · ${when}</p>
  <p class="text">${escapeHtml(idea.text)}</p>
</li>`;
          })
          .join("")}</ol>`;

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Boîte d’idées OPC — propriétaire</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0b0c10; color: #f4f6fb; margin: 0; padding: 1.25rem; }
    h1 { font-size: 1.35rem; margin: 0 0 .35rem; }
    .lead { color: #c5cdd8; max-width: 40rem; }
    .empty { color: #e8c36a; }
    .compile, .ideas { padding-left: 1.2rem; }
    .ideas li { margin: .85rem 0; }
    .meta { color: #9aa4b2; font-size: .85rem; margin: 0 0 .25rem; }
    .text { margin: 0; white-space: pre-wrap; }
    a { color: #7eb6ff; }
  </style>
</head>
<body>
  <h1>Boîte d’idées — Open Community</h1>
  <p class="lead">Compilation pour Politzer. Texte brut uniquement (pas de HTML). Les visiteurs gardent aussi une copie sur leur appareil. Ne partage pas l’URL secrète.</p>
  <p><strong>${payload.count}</strong> idée(s). Pour l’export JSON, ajoute <code>&amp;format=json</code> à cette URL (garde le secret).</p>
  <h2>Par ville</h2>
  ${compiledRows}
  <h2>Liste</h2>
  ${items || `<p class="empty">La liste est vide — pas d’idée fictive.</p>`}
</body>
</html>`;
}

export async function handleIdeasPost(
  rawBody: unknown,
  env: IdeasEnv,
  now = Date.now(),
  mailer: OwnerMailer = sendOwnerMail,
): Promise<{ status: number; data: Record<string, unknown> }> {
  const parsed = parseIdeaInboxInput(rawBody);
  if (!parsed) return { status: 400, data: { error: "bad_request" } };

  let persisted = false;
  if (env.DB) {
    try {
      await insertInboxIdea(env.DB, parsed, now);
      persisted = true;
    } catch {
      persisted = false;
    }
  }

  let emailed = false;
  try {
    const mail = await mailer(env, buildIdeaOwnerMail(parsed, now));
    emailed = Boolean(mail.sent);
  } catch {
    emailed = false;
  }

  return { status: 200, data: { ok: true, persisted, emailed } };
}

export async function handleRegisterPost(
  rawBody: unknown,
  env: IdeasEnv,
  now = Date.now(),
  mailer: OwnerMailer = sendOwnerMail,
): Promise<{ status: number; data: Record<string, unknown> }> {
  const parsed = parseRegisterNotice(rawBody);
  if (!parsed) return { status: 400, data: { error: "bad_request" } };
  let emailed = false;
  try {
    const mail = await mailer(env, buildRegisterOwnerMail(parsed, now));
    emailed = Boolean(mail.sent);
  } catch {
    emailed = false;
  }
  return { status: 200, data: { ok: true, emailed } };
}

export async function handleIdeasGet(
  request: Request,
  env: IdeasEnv,
): Promise<{ status: number; json?: unknown; html?: string }> {
  const allowed = await ownerAuthorized(request, env);
  if (!allowed) return { status: 401, json: { error: "unauthorized" } };
  if (!env.DB) {
    const empty = inboxListPayload([]);
    if (wantsJson(request)) return { status: 200, json: { ...empty, persisted: false } };
    return { status: 200, html: renderOwnerHtml([]) };
  }
  try {
    const ideas = await listInboxIdeas(env.DB);
    if (wantsJson(request)) return { status: 200, json: inboxListPayload(ideas) };
    return { status: 200, html: renderOwnerHtml(ideas) };
  } catch {
    return { status: 503, json: { error: "store_failed" } };
  }
}
