import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { IDEA_EVENT_TYPE, inboxListPayload } from "../../../src/lib/idea-inbox.ts";
import {
  escapeHtml,
  handleIdeasGet,
  handleIdeasPost,
  handleRegisterPost,
  insertInboxIdea,
  isIdeasPath,
  isRegisterPath,
  listInboxIdeas,
  ownerAuthorized,
  renderOwnerHtml,
  secretsEqual,
  type IdeasEnv,
  type OwnerMailer,
} from "./ideas.ts";
import type { D1Bound, D1Like } from "./stats.ts";

type EventRow = {
  session_id: string;
  type: string;
  ts: number;
  lang: string | null;
  city: string | null;
  country_code: string | null;
  suggestion: string | null;
};

function memoryD1(seed: EventRow[] = []): D1Like & { rows: EventRow[] } {
  const rows = [...seed];
  const bound = (query: string, args: unknown[]): D1Bound => {
    const sql = query.replace(/\s+/g, " ").trim();
    return {
      async all<T>() {
        if (sql.includes("WHERE type = ? AND suggestion IS NOT NULL")) {
          const type = String(args[0]);
          const limit = Number(args[1] ?? 200);
          const results = rows
            .filter((row) => row.type === type && row.suggestion)
            .sort((a, b) => b.ts - a.ts)
            .slice(0, limit)
            .map((row) => ({
              id: row.session_id,
              text: row.suggestion,
              city: row.city,
              createdAt: row.ts,
            }));
          return { results: results as T[] };
        }
        return { results: [] as T[] };
      },
      async first<T>() {
        if (sql.startsWith("INSERT INTO events")) {
          rows.push({
            session_id: String(args[0]),
            type: String(args[1]),
            ts: Number(args[2]),
            lang: (args[3] as string | null) ?? null,
            city: (args[4] as string | null) ?? null,
            country_code: (args[5] as string | null) ?? null,
            suggestion: (args[6] as string | null) ?? null,
          });
          return null as T;
        }
        if (sql.includes("WHERE type = ? AND session_id = ?")) {
          const type = String(args[0]);
          const id = String(args[1]);
          const row = rows.find((item) => item.type === type && item.session_id === id);
          return (row ? { id: row.session_id } : null) as T;
        }
        return null as T;
      },
    };
  };
  return {
    rows,
    prepare(query: string) {
      return {
        bind(...args: unknown[]) {
          return bound(query, args);
        },
      };
    },
    async batch(statements: D1Bound[]) {
      for (const statement of statements) {
        await statement.first();
      }
    },
  };
}

const sentMailer: OwnerMailer = async () => ({ sent: true });
const failedMailer: OwnerMailer = async () => ({ sent: false, reason: "network" });

describe("ideas path", () => {
  it("matches /ideas and /register with or without a trailing slash", () => {
    assert.equal(isIdeasPath("/ideas"), true);
    assert.equal(isIdeasPath("/ideas/"), true);
    assert.equal(isIdeasPath("/stats"), false);
    assert.equal(isRegisterPath("/register"), true);
    assert.equal(isRegisterPath("/register/"), true);
    assert.equal(isRegisterPath("/ideas"), false);
  });
});

describe("owner secret", () => {
  it("rejects empty or wrong secrets in constant time", async () => {
    assert.equal(await secretsEqual("abc", "abc"), true);
    assert.equal(await secretsEqual("abc", "abd"), false);
    assert.equal(await secretsEqual("", "secret"), false);
    const env: IdeasEnv = { IDEAS_OWNER_SECRET: "owner-secret" };
    const ok = new Request("https://worker.test/ideas", {
      headers: { Authorization: "Bearer owner-secret" },
    });
    const query = new Request("https://worker.test/ideas?secret=owner-secret");
    const bad = new Request("https://worker.test/ideas?secret=nope");
    const missing = new Request("https://worker.test/ideas");
    assert.equal(await ownerAuthorized(ok, env), true);
    assert.equal(await ownerAuthorized(query, env), true);
    assert.equal(await ownerAuthorized(bad, env), false);
    assert.equal(await ownerAuthorized(missing, env), false);
    assert.equal(await ownerAuthorized(ok, {}), false);
  });
});

describe("escapeHtml", () => {
  it("neutralizes tags so owner HTML never executes visitor text", () => {
    assert.equal(escapeHtml("<script>x</script>"), "&lt;script&gt;x&lt;/script&gt;");
    assert.equal(escapeHtml(`a&b"c'`), "a&amp;b&quot;c&#39;");
  });
});

describe("handleIdeasPost", () => {
  it("stores sanitized text + city and skips HTML", async () => {
    const db = memoryD1();
    const now = 1_779_000_000_000;
    const result = await handleIdeasPost(
      { id: "idea-1", text: "<b>Déneiger les allées</b>", city: "Gatineau" },
      { DB: db },
      now,
      sentMailer,
    );
    assert.equal(result.status, 200);
    assert.equal((result.data as { ok?: boolean }).ok, true);
    assert.equal((result.data as { emailed?: boolean }).emailed, true);
    assert.equal(db.rows.length, 1);
    assert.equal(db.rows[0]?.type, IDEA_EVENT_TYPE);
    assert.equal(db.rows[0]?.suggestion?.includes("<"), false);
    assert.match(db.rows[0]?.suggestion ?? "", /Déneiger les allées/);
    assert.equal(db.rows[0]?.city, "Gatineau");
    assert.equal(db.rows[0]?.ts, now);
  });

  it("rejects short or empty text and reports unpersisted when D1 is missing", async () => {
    const bad = await handleIdeasPost({ text: "no" }, {});
    assert.equal(bad.status, 400);
    const noDb = await handleIdeasPost({ text: "Une vraie idée de quartier" }, {}, Date.now(), sentMailer);
    assert.equal(noDb.status, 200);
    assert.equal((noDb.data as { persisted?: boolean }).persisted, false);
    assert.equal((noDb.data as { emailed?: boolean }).emailed, true);
  });

  it("does not email the owner for Playwright OPC-e2e ideas", async () => {
    const mails: Array<{ subject: string; text: string }> = [];
    const mailer: OwnerMailer = async (_env, mail) => {
      mails.push(mail);
      return { sent: true };
    };
    const result = await handleIdeasPost(
      {
        id: "idea-e2e",
        text: "Co-voiturage OPC-e2e 123",
        city: "Gatineau",
        opcId: "OPC-7K3M",
      },
      {},
      Date.now(),
      mailer,
    );
    assert.equal(result.status, 200);
    assert.equal((result.data as { ok?: boolean }).ok, true);
    assert.equal((result.data as { emailed?: boolean }).emailed, false);
    assert.equal(mails.length, 0);
  });

  it("never mails visitor phone or email even if the POST includes them", async () => {
    const mails: Array<{ subject: string; text: string }> = [];
    const mailer: OwnerMailer = async (_env, mail) => {
      mails.push(mail);
      return { sent: true };
    };
    const db = memoryD1();
    const now = Date.parse("2026-09-17T12:00:00.000Z");
    const result = await handleIdeasPost(
      {
        id: "idea-pii",
        text: "Un café de réparation vélo",
        city: "Aylmer",
        opcId: "OPC-7K3M",
        email: "marie@voisin.test",
        phone: "819-555-0100",
        lastName: "Tremblay",
      },
      { DB: db },
      now,
      mailer,
    );
    assert.equal(result.status, 200);
    assert.equal((result.data as { emailed?: boolean }).emailed, true);
    const stored = JSON.stringify(db.rows);
    assert.equal(stored.includes("marie@"), false);
    assert.equal(stored.includes("555-0100"), false);
    assert.equal(stored.includes("Tremblay"), false);
    assert.equal(mails.length, 1);
    const mailText = mails[0]?.text ?? "";
    assert.match(mailText, /Un café de réparation vélo/);
    assert.match(mailText, /Aylmer/);
    assert.match(mailText, /OPC-7K3M/);
    assert.match(mailText, /2026-09-17T12:00:00.000Z/);
    assert.doesNotMatch(mailText, /marie@voisin\.test/);
    assert.doesNotMatch(mailText, /819-555-0100/);
    assert.doesNotMatch(mailText, /Tremblay/);
  });

  it("still returns 200 and keeps D1 when mail fails", async () => {
    const db = memoryD1();
    const result = await handleIdeasPost(
      { text: "Une vraie idée de quartier", city: "Hull" },
      { DB: db },
      30,
      failedMailer,
    );
    assert.equal(result.status, 200);
    assert.equal((result.data as { persisted?: boolean }).persisted, true);
    assert.equal((result.data as { emailed?: boolean }).emailed, false);
    assert.equal(db.rows.length, 1);
  });

  it("is idempotent on the same id", async () => {
    const db = memoryD1();
    const body = { id: "same-id", text: "Partager une perceuse le samedi", city: "Hull" };
    await handleIdeasPost(body, { DB: db }, 10, sentMailer);
    await handleIdeasPost(body, { DB: db }, 20, sentMailer);
    assert.equal(db.rows.length, 1);
  });
});

describe("handleRegisterPost", () => {
  it("emails a sanitized notice and rejects junk", async () => {
    const mails: unknown[] = [];
    const mailer: OwnerMailer = async (_env, mail) => {
      mails.push(mail);
      return { sent: true };
    };
    const ok = await handleRegisterPost(
      { firstName: "Marie", opcId: "OPC-7K3M", email: "marie@voisin.test", city: "Hull", phone: "819" },
      {},
      40,
      mailer,
    );
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.data, { ok: true, emailed: true });
    const text = String((mails[0] as { text?: string })?.text || "");
    assert.match(text, /Marie/);
    assert.match(text, /OPC-7K3M/);
    assert.doesNotMatch(text, /819/);
    const bad = await handleRegisterPost({ firstName: "Marie" }, {});
    assert.equal(bad.status, 400);
  });
});

describe("handleIdeasGet", () => {
  it("lists stored ideas for the owner and stays empty without fakes", async () => {
    const db = memoryD1();
    await insertInboxIdea(db, { id: "a1", text: "Co-voiturage du matin", city: "Hull" }, 50);
    const ideas = await listInboxIdeas(db);
    assert.equal(ideas.length, 1);
    assert.equal(ideas[0]?.text, "Co-voiturage du matin");

    const env: IdeasEnv = { DB: db, IDEAS_OWNER_SECRET: "owner-secret" };
    const allowed = new Request("https://worker.test/ideas?format=json", {
      headers: { Authorization: "Bearer owner-secret", Accept: "application/json" },
    });
    const listed = await handleIdeasGet(allowed, env);
    assert.equal(listed.status, 200);
    const json = listed.json as ReturnType<typeof inboxListPayload>;
    assert.equal(json.count, 1);
    assert.equal(json.ideas[0]?.city, "Hull");

    const emptyDb = memoryD1();
    const empty = await handleIdeasGet(allowed, { DB: emptyDb, IDEAS_OWNER_SECRET: "owner-secret" });
    const emptyJson = empty.json as ReturnType<typeof inboxListPayload>;
    assert.equal(emptyJson.count, 0);
    assert.deepEqual(emptyJson.ideas, []);

    const denied = await handleIdeasGet(new Request("https://worker.test/ideas?format=json", {
      headers: { Accept: "application/json" },
    }), env);
    assert.equal(denied.status, 401);
  });

  it("renders HTML that escapes visitor text", async () => {
    const html = renderOwnerHtml([
      { id: "h1", text: "Café <script>x</script>", city: "Hull", createdAt: 50 },
    ]);
    assert.match(html, /Café/);
    assert.doesNotMatch(html, /<script>x<\/script>/);
    assert.match(html, /&lt;script&gt;/);
    const empty = renderOwnerHtml([]);
    assert.match(empty, /Aucune idée reçue/);
    assert.doesNotMatch(empty, /Déneiger/);
  });
});
