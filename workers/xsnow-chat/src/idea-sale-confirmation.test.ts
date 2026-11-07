import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  handleIdeaSaleConfirmationPost,
  isIdeaSaleConfirmationPath,
  type IdeaSaleConfirmationEnv,
} from "./idea-sale-confirmation.ts";
import type { D1Like, D1Bound } from "./stats.ts";

type EventRow = {
  session_id: string;
  type: string;
  ts: number;
  lang: string | null;
  city: string | null;
  country_code: string | null;
  suggestion: string | null;
};

/** Same in-memory D1 double as ideas.test.ts (generic events-table shape). */
function memoryD1(seed: EventRow[] = []): D1Like & { rows: EventRow[] } {
  const rows = [...seed];
  const bound = (query: string, args: unknown[]): D1Bound => {
    const sql = query.replace(/\s+/g, " ").trim();
    return {
      async all<T>() {
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

const body = {
  id: "idee-vente-abc123",
  email: "marie@voisin.test",
  title: "Cours de cuisine du quartier",
  number: 1,
  lang: "fr",
};

const silent = () => {};

function resendDouble(result: "ok" | "error") {
  const calls: Array<{ url: string; payload: Record<string, unknown> }> = [];
  const fetchImpl = (async (url: string, init?: { body?: string }) => {
    calls.push({
      url: String(url),
      payload: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
    });
    return result === "ok"
      ? new Response(JSON.stringify({ id: "re_123" }), { status: 200 })
      : new Response(JSON.stringify({ message: "boom" }), { status: 500 });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

function env(partial: Partial<IdeaSaleConfirmationEnv> = {}): IdeaSaleConfirmationEnv {
  return {
    RESEND_API_KEY: "re_test_key",
    IDEA_SALE_CONFIRM_EMAILS: "on",
    ...partial,
  };
}

describe("idea-sale-confirmation path", () => {
  it("matches its route with or without a trailing slash", () => {
    assert.equal(isIdeaSaleConfirmationPath("/idea-sale-confirmation"), true);
    assert.equal(isIdeaSaleConfirmationPath("/idea-sale-confirmation/"), true);
    assert.equal(isIdeaSaleConfirmationPath("/ideas"), false);
  });
});

describe("POST /idea-sale-confirmation", () => {
  it("refuses an invalid body without touching Resend", async () => {
    const { calls, fetchImpl } = resendDouble("ok");
    const res = await handleIdeaSaleConfirmationPost(
      { email: "pas-un-courriel" },
      env(),
      Date.now(),
      fetchImpl,
      silent,
    );
    assert.equal(res.status, 400);
    assert.equal(calls.length, 0);
  });

  it("stays off without the flag or without a Resend key — no new secret involved", async () => {
    const { calls, fetchImpl } = resendDouble("ok");
    const off = await handleIdeaSaleConfirmationPost(
      body,
      env({ IDEA_SALE_CONFIRM_EMAILS: undefined }),
      Date.now(),
      fetchImpl,
      silent,
    );
    assert.deepEqual(off.data, { ok: true, emailed: false, reason: "off" });
    const noKey = await handleIdeaSaleConfirmationPost(
      body,
      env({ RESEND_API_KEY: undefined }),
      Date.now(),
      fetchImpl,
      silent,
    );
    assert.deepEqual(noKey.data, { ok: true, emailed: false, reason: "off" });
    assert.equal(calls.length, 0);
  });

  it("emails the seller in their language, with the title and their list number", async () => {
    const { calls, fetchImpl } = resendDouble("ok");
    const db = memoryD1();
    const res = await handleIdeaSaleConfirmationPost(body, env({ DB: db }), Date.now(), fetchImpl, silent);
    assert.deepEqual(res.data, { ok: true, emailed: true, reason: "sent" });
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, "https://api.resend.com/emails");
    assert.deepEqual(calls[0]?.payload.to, ["marie@voisin.test"]);
    assert.equal(calls[0]?.payload.subject, "Ton idée a bien été reçue — idée nº 1");
    assert.ok(String(calls[0]?.payload.text).includes("Cours de cuisine du quartier"));
    // Marker written for the duplicate guard, keyed by the proposal id.
    assert.equal(db.rows.length, 1);
    assert.equal(db.rows[0]?.type, "idea_sale_confirmation");
    assert.equal(db.rows[0]?.session_id, body.id);
  });

  it("never sends twice for the same submission", async () => {
    const { calls, fetchImpl } = resendDouble("ok");
    const db = memoryD1();
    const first = await handleIdeaSaleConfirmationPost(body, env({ DB: db }), Date.now(), fetchImpl, silent);
    assert.equal(first.data.emailed, true);
    const second = await handleIdeaSaleConfirmationPost(body, env({ DB: db }), Date.now(), fetchImpl, silent);
    assert.deepEqual(second.data, { ok: true, emailed: false, reason: "duplicate" });
    assert.equal(calls.length, 1);
  });

  it("a failed send writes no marker, so a later retry can still confirm", async () => {
    const db = memoryD1();
    const failing = resendDouble("error");
    const failed = await handleIdeaSaleConfirmationPost(body, env({ DB: db }), Date.now(), failing.fetchImpl, silent);
    assert.deepEqual(failed.data, { ok: true, emailed: false, reason: "failed" });
    assert.equal(db.rows.length, 0);

    const working = resendDouble("ok");
    const retried = await handleIdeaSaleConfirmationPost(body, env({ DB: db }), Date.now(), working.fetchImpl, silent);
    assert.equal(retried.data.emailed, true);
    assert.equal(db.rows.length, 1);
  });

  it("composes in English when the form was in English", async () => {
    const { calls, fetchImpl } = resendDouble("ok");
    const res = await handleIdeaSaleConfirmationPost(
      { ...body, id: "idee-vente-en2", number: 2, lang: "en" },
      env(),
      Date.now(),
      fetchImpl,
      silent,
    );
    assert.equal(res.data.emailed, true);
    assert.equal(calls[0]?.payload.subject, "Your idea has been received — idea no. 2");
  });
});
