import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compileIdeasByCity,
  fetchOwnerIdeaInbox,
  ideasInboxEndpoint,
  inboxListPayload,
  ownerIdeasExportName,
  parseIdeaInboxInput,
  postIdeaToInbox,
  postRegisterNotice,
  registerNoticeEndpoint,
} from "./idea-inbox.ts";

describe("parseIdeaInboxInput", () => {
  it("keeps plain French text and city, drops HTML and short junk", () => {
    const ok = parseIdeaInboxInput({
      id: "idea-1",
      text: "  Déneiger les allées le samedi  ",
      city: "Gatineau",
    });
    assert.equal(ok?.text, "Déneiger les allées le samedi");
    assert.equal(ok?.city, "Gatineau");
    assert.equal(ok?.id, "idea-1");
    assert.equal(parseIdeaInboxInput({ text: "ab" }), null);
    const xss = parseIdeaInboxInput({
      text: "<script>alert(1)</script> Partager une perceuse javascript:alert(1)",
      city: "<b>Hull</b>",
    });
    assert.equal(xss?.text.includes("<script"), false);
    assert.equal(xss?.text.includes("javascript:"), false);
    assert.match(xss?.text ?? "", /Partager une perceuse/);
    assert.equal(xss?.city.includes("<"), false);
    const withOpc = parseIdeaInboxInput({
      text: "Partager une perceuse",
      city: "Hull",
      opcId: "OPC-7K3M",
    });
    assert.equal(withOpc?.opcId, "OPC-7K3M");
    assert.equal(parseIdeaInboxInput({ text: "Partager une perceuse", opcId: "nope" })?.opcId, "");
  });

  it("does not keep emails in city or text", () => {
    const parsed = parseIdeaInboxInput({
      text: "Aide à marie@voisin.test pour les courses",
      city: "Hull",
    });
    assert.equal(parsed?.text.includes("@"), false);
    assert.match(parsed?.text ?? "", /\[redacted\]/);
  });
});

describe("compileIdeasByCity", () => {
  it("groups real rows and treats blank city as its own bucket", () => {
    assert.deepEqual(compileIdeasByCity([]), []);
    const compiled = compileIdeasByCity([
      { city: "Gatineau" },
      { city: "Gatineau" },
      { city: "" },
      { city: "Hull" },
    ]);
    assert.deepEqual(compiled, [
      { city: "Gatineau", n: 2 },
      { city: "", n: 1 },
      { city: "Hull", n: 1 },
    ]);
  });
});

describe("inboxListPayload", () => {
  it("does not invent ideas when the store is empty", () => {
    const payload = inboxListPayload([]);
    assert.equal(payload.ok, true);
    assert.equal(payload.count, 0);
    assert.deepEqual(payload.ideas, []);
    assert.deepEqual(payload.compiled, []);
  });
});

describe("ideasInboxEndpoint", () => {
  it("points at /ideas on the chat worker", () => {
    assert.equal(
      ideasInboxEndpoint("https://xsnow-chat.xsnowopc.workers.dev"),
      "https://xsnow-chat.xsnowopc.workers.dev/ideas",
    );
    assert.match(ownerIdeasExportName(new Date("2026-09-16T12:00:00.000Z")), /opc-idees-2026-09-16\.json/);
  });
});

describe("postIdeaToInbox / fetchOwnerIdeaInbox", () => {
  it("POSTs sanitized JSON and treats emailed as sent", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init || {} });
      return new Response(JSON.stringify({ ok: true, persisted: true, emailed: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    const result = await postIdeaToInbox(
      { id: "idea-1", text: "Un café de réparation vélo", city: "Aylmer", opcId: "OPC-7K3M" },
      fakeFetch,
    );
    assert.equal(result, "sent");
    assert.match(calls[0]?.url ?? "", /\/ideas$/);
    assert.equal(calls[0]?.init.method, "POST");
    const body = JSON.parse(String(calls[0]?.init.body));
    assert.equal(body.text, "Un café de réparation vélo");
    assert.equal(body.city, "Aylmer");
    assert.equal(body.opcId, "OPC-7K3M");
    assert.equal(body.text.includes("<"), false);
    assert.equal(calls[0]?.init.credentials, "omit");
    const headers = new Headers(calls[0]?.init.headers);
    assert.equal(headers.get("Content-Type"), "application/json");
    assert.equal(headers.get("Authorization"), null);
  });

  it("treats ok without emailed as failed (honest if Resend is unset)", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ ok: true, persisted: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    assert.equal(
      await postIdeaToInbox({ id: "x", text: "Déneiger les allées", city: "" }, fakeFetch),
      "failed",
    );
  });

  it("returns failed on network errors without throwing", async () => {
    const fakeFetch: typeof fetch = async () => {
      throw new Error("offline");
    };
    assert.equal(await postIdeaToInbox({ id: "x", text: "Déneiger", city: "" }, fakeFetch), "failed");
  });

  it("POSTs a registration notice to /register and soft-fails offline", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init || {} });
      return new Response(JSON.stringify({ ok: true, emailed: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    assert.equal(
      registerNoticeEndpoint("https://xsnow-chat.xsnowopc.workers.dev"),
      "https://xsnow-chat.xsnowopc.workers.dev/register",
    );
    assert.equal(
      await postRegisterNotice(
        { firstName: "Marie", opcId: "OPC-7K3M", email: "marie@voisin.test", city: "Hull" },
        fakeFetch,
      ),
      "sent",
    );
    assert.match(calls[0]?.url ?? "", /\/register$/);
    const offline: typeof fetch = async () => {
      throw new Error("offline");
    };
    assert.equal(
      await postRegisterNotice(
        { firstName: "Marie", opcId: "OPC-7K3M", email: "marie@voisin.test", city: "" },
        offline,
      ),
      "failed",
    );
  });

  it("GETs the owner list with a bearer secret and rejects empty secret", async () => {
    const fakeFetch: typeof fetch = async (_input, init) => {
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("Authorization"), "Bearer test-secret");
      assert.equal(headers.get("Accept"), "application/json");
      return new Response(JSON.stringify(inboxListPayload([])), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    const ok = await fetchOwnerIdeaInbox("test-secret", fakeFetch);
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.payload.count, 0);
    const denied = await fetchOwnerIdeaInbox("  ", fakeFetch);
    assert.equal(denied.ok, false);
  });
});
