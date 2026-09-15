/**
 * Anonymous OPC analytics ingest.
 * POST /stats  { events: [...] }
 * GET  /stats/summary
 *
 * D1 table `events` (see migrations/). Never store lat/lon, email, names,
 * HTML, or executable payloads. `suggestion` is plain text only.
 */

import { sanitizeUntrustedText } from "../../../src/lib/sanitize.ts";

export const STATS_EVENT_TYPES = [
  "session_start",
  "lang",
  "place",
  "monetize_suggestion",
  "idea_submit",
  "invite_open",
  "feedback_pos",
  "feedback_neg",
  "offer_created",
  "request_created",
] as const;

export type StatsEventType = (typeof STATS_EVENT_TYPES)[number];

export type StoredStatsEvent = {
  session: string;
  type: StatsEventType;
  t: number;
  lang?: string;
  city?: string;
  countryCode?: string;
  text?: string;
};

const MAX_BATCH = 32;
const SESSION_RE = /^[A-Za-z0-9_-]{8,80}$/;
const FORBIDDEN_KEYS = new Set([
  "lat",
  "lon",
  "latitude",
  "longitude",
  "gps",
  "email",
  "name",
  "street",
  "address",
  "phone",
]);

function isType(value: unknown): value is StatsEventType {
  return (
    value === "session_start" ||
    value === "lang" ||
    value === "place" ||
    value === "monetize_suggestion" ||
    value === "idea_submit" ||
    value === "invite_open" ||
    value === "feedback_pos" ||
    value === "feedback_neg" ||
    value === "offer_created" ||
    value === "request_created"
  );
}

function clip(text: string, max: number) {
  return sanitizeUntrustedText(text, {
    max,
    redactEmails: true,
    allowNewlines: false,
    dropCoordinates: true,
  });
}

function sessionId(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return SESSION_RE.test(trimmed) ? trimmed : "";
}

export function parseStatsEvents(raw: unknown): StoredStatsEvent[] {
  if (!raw || typeof raw !== "object") return [];
  const record = raw as { events?: unknown; event?: unknown };
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(record.events)
      ? record.events
      : record.event
        ? [record.event]
        : [];

  const out: StoredStatsEvent[] = [];
  for (const item of list.slice(0, MAX_BATCH)) {
    if (!item || typeof item !== "object") continue;
    const event = { ...(item as Record<string, unknown>) };
    for (const key of Object.keys(event)) {
      if (FORBIDDEN_KEYS.has(key.toLowerCase())) delete event[key];
    }
    if (!isType(event.type)) continue;
    const session = sessionId(event.session);
    if (!session) continue;
    const t = typeof event.t === "number" && Number.isFinite(event.t) ? event.t : Date.now();
    const row: StoredStatsEvent = { session, type: event.type, t };

    if (event.type === "lang") {
      if (event.lang !== "fr" && event.lang !== "en" && event.lang !== "es") continue;
      row.lang = event.lang;
    }
    if (event.type === "place") {
      const city = typeof event.city === "string" ? clip(event.city, 80) : "";
      const countryCode =
        typeof event.countryCode === "string" ? event.countryCode.trim().toUpperCase() : "";
      if (!city || !/^[A-Z]{2}$/.test(countryCode)) continue;
      row.city = city;
      row.countryCode = countryCode;
    }
    if (event.type === "monetize_suggestion" || event.type === "idea_submit") {
      const text = typeof event.text === "string" ? clip(event.text, event.type === "idea_submit" ? 80 : 280) : "";
      if (!text) continue;
      row.text = text;
    }
    if (event.type === "invite_open") {
      const text = typeof event.text === "string" ? clip(event.text, 40) : "";
      if (!text) continue;
      row.text = text;
    }
    if (event.type === "feedback_pos" || event.type === "feedback_neg") {
      const text = typeof event.text === "string" ? clip(event.text, 40) : "app";
      row.text = text || "app";
    }
    if (event.type === "offer_created" || event.type === "request_created") {
      const kindRaw = typeof event.kind === "string" ? event.kind : "";
      const kind = kindRaw
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "")
        .slice(0, 40);
      if (!kind) continue;
      row.text = kind;
    }
    out.push(row);
  }
  return out;
}

export type D1Bound = {
  all: <T>() => Promise<{ results: T[] }>;
  first: <T>() => Promise<T | null>;
};

export type D1Like = {
  prepare: (query: string) => { bind: (...args: unknown[]) => D1Bound };
  batch: (statements: D1Bound[]) => Promise<unknown>;
};

const INSERT = `INSERT INTO events (session_id, type, ts, lang, city, country_code, suggestion)
VALUES (?, ?, ?, ?, ?, ?, ?)`;

export async function insertStatsEvents(db: D1Like, events: StoredStatsEvent[]) {
  if (!events.length) return;
  const statements = events.map((event) =>
    db.prepare(INSERT).bind(
      event.session,
      event.type,
      event.t,
      event.lang ?? null,
      event.city ?? null,
      event.countryCode ?? null,
      event.text ?? null,
    ),
  );
  await db.batch(statements);
}

export type StatsSummary = {
  sessions: number;
  langs: Record<string, number>;
  places: Array<{ city: string; countryCode: string; n: number }>;
  suggestions: Array<{ text: string; t: number }>;
  inviteOpens: number;
  ideaSubmits: number;
  feedbackPos: number;
  feedbackNeg: number;
  invites: Array<{ text: string; n: number }>;
};

export const EMPTY_SUMMARY: StatsSummary = {
  sessions: 0,
  langs: {},
  places: [],
  suggestions: [],
  inviteOpens: 0,
  ideaSubmits: 0,
  feedbackPos: 0,
  feedbackNeg: 0,
  invites: [],
};

export async function readStatsSummary(db: D1Like): Promise<StatsSummary> {
  const sessionsRow = await db
    .prepare(`SELECT COUNT(DISTINCT session_id) AS n FROM events WHERE type = 'session_start'`)
    .bind()
    .first<{ n: number }>();

  const langRows = await db
    .prepare(
      `SELECT lang AS key, COUNT(*) AS n FROM events WHERE type = 'lang' AND lang IS NOT NULL GROUP BY lang`,
    )
    .bind()
    .all<{ key: string; n: number }>();

  const placeRows = await db
    .prepare(
      `SELECT city, country_code AS countryCode, COUNT(*) AS n
       FROM events
       WHERE type = 'place' AND city IS NOT NULL AND country_code IS NOT NULL
       GROUP BY city, country_code
       ORDER BY n DESC
       LIMIT 50`,
    )
    .bind()
    .all<{ city: string; countryCode: string; n: number }>();

  const suggestionRows = await db
    .prepare(
      `SELECT suggestion AS text, ts AS t
       FROM events
       WHERE type = 'monetize_suggestion' AND suggestion IS NOT NULL
       ORDER BY ts DESC
       LIMIT 40`,
    )
    .bind()
    .all<{ text: string; t: number }>();

  const countOf = async (type: string) => {
    const row = await db
      .prepare(`SELECT COUNT(*) AS n FROM events WHERE type = ?`)
      .bind(type)
      .first<{ n: number }>();
    return Number(row?.n ?? 0);
  };

  const inviteRows = await db
    .prepare(
      `SELECT suggestion AS text, COUNT(*) AS n
       FROM events
       WHERE type = 'invite_open' AND suggestion IS NOT NULL
       GROUP BY suggestion
       ORDER BY n DESC
       LIMIT 40`,
    )
    .bind()
    .all<{ text: string; n: number }>();

  const langs: Record<string, number> = {};
  for (const row of langRows.results) {
    langs[row.key] = row.n;
  }

  return {
    sessions: Number(sessionsRow?.n ?? 0),
    langs,
    places: placeRows.results,
    suggestions: suggestionRows.results,
    inviteOpens: await countOf("invite_open"),
    ideaSubmits: await countOf("idea_submit"),
    feedbackPos: await countOf("feedback_pos"),
    feedbackNeg: await countOf("feedback_neg"),
    invites: inviteRows.results,
  };
}
