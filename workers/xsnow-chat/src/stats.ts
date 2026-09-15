/**
 * Anonymous OPC analytics ingest.
 * POST /stats  { events: [...] }
 * GET  /stats/summary
 *
 * D1 table `events` (see migrations/). Never store lat/lon, email, or names.
 */

export const STATS_EVENT_TYPES = [
  "session_start",
  "lang",
  "place",
  "monetize_suggestion",
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
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const COORDS_RE = /-?\d{1,3}\.\d+\s*,\s*-?\d{1,3}\.\d+/;
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
    value === "offer_created" ||
    value === "request_created"
  );
}

function clip(text: string, max: number) {
  const cleaned = text.replace(EMAIL_RE, "[redacted]").replace(/\s+/g, " ").trim();
  if (!cleaned || COORDS_RE.test(cleaned)) return "";
  return cleaned.length > max ? cleaned.slice(0, max) : cleaned;
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
    if (event.type === "monetize_suggestion") {
      const text = typeof event.text === "string" ? clip(event.text, 280) : "";
      if (!text) continue;
      row.text = text;
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
};

export const EMPTY_SUMMARY: StatsSummary = {
  sessions: 0,
  langs: {},
  places: [],
  suggestions: [],
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

  const langs: Record<string, number> = {};
  for (const row of langRows.results) {
    langs[row.key] = row.n;
  }

  return {
    sessions: Number(sessionsRow?.n ?? 0),
    langs,
    places: placeRows.results,
    suggestions: suggestionRows.results,
  };
}
