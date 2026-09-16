import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OPC_INBOX_TO,
  RESEND_API_URL,
  DEFAULT_IDEAS_FROM,
  buildIdeaOwnerMail,
  buildRegisterOwnerMail,
  clipOpcId,
  parseRegisterNotice,
  resolveFromAddress,
  sendOwnerMail,
} from "./owner-mail.ts";

describe("clipOpcId / parseRegisterNotice", () => {
  it("keeps a valid OPC-XXXX and drops junk", () => {
    assert.equal(clipOpcId("OPC-7K3M"), "OPC-7K3M");
    assert.equal(clipOpcId("opc-7k3m"), "");
    assert.equal(clipOpcId("OPC-1111"), "");
    assert.equal(clipOpcId("<script>"), "");
  });

  it("requires first name + OPC id and never keeps phone or last name", () => {
    const ok = parseRegisterNotice({
      firstName: "Marie",
      lastName: "Tremblay",
      opcId: "OPC-7K3M",
      email: "marie@voisin.test",
      phone: "819-555-0100",
      city: "Gatineau",
    });
    assert.equal(ok?.firstName, "Marie");
    assert.equal(ok?.opcId, "OPC-7K3M");
    assert.equal(ok?.email, "marie@voisin.test");
    assert.equal(ok?.city, "Gatineau");
    assert.equal(parseRegisterNotice({ firstName: "Marie" }), null);
    assert.equal(parseRegisterNotice({ opcId: "OPC-7K3M" }), null);
    assert.equal(JSON.stringify(ok).includes("Tremblay"), false);
    assert.equal(JSON.stringify(ok).includes("555"), false);
  });
});

describe("owner inbox destination", () => {
  it("hardcodes Politzer’s Gmail and never a visitor-controlled To", () => {
    assert.equal(OPC_INBOX_TO, "opencommunity.opc@gmail.com");
  });
});

describe("buildIdeaOwnerMail / buildRegisterOwnerMail", () => {
  it("addresses Politzer and keeps plain text only", () => {
    const mail = buildIdeaOwnerMail(
      { text: "Déneiger les allées", city: "Gatineau", opcId: "OPC-7K3M" },
      Date.parse("2026-09-16T12:00:00.000Z"),
    );
    assert.match(mail.subject, /Gatineau/);
    assert.match(mail.text, /Déneiger les allées/);
    assert.match(mail.text, /OPC-7K3M/);
    assert.equal(mail.text.includes("<"), false);
    assert.equal(mail.subject.includes("<"), false);

    const register = buildRegisterOwnerMail(
      { firstName: "Marie", opcId: "OPC-7K3M", email: "marie@voisin.test", city: "Hull" },
      Date.parse("2026-09-16T12:00:00.000Z"),
    );
    assert.match(register.subject, /OPC-7K3M/);
    assert.match(register.text, /Marie/);
    assert.match(register.text, /marie@voisin.test/);
    assert.doesNotMatch(register.text, /819-555|Tremblay/);
  });
});

describe("sendOwnerMail", () => {
  it("does not send when RESEND_API_KEY is missing", async () => {
    const result = await sendOwnerMail({}, { subject: "x", text: "Déneiger" }, async () => {
      throw new Error("should not fetch");
    });
    assert.deepEqual(result, { sent: false, reason: "not_configured" });
  });

  it("POSTs Resend with a hardcoded TO that visitors cannot redirect", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init || {} });
      return new Response(JSON.stringify({ id: "re_1" }), { status: 200 });
    };
    const result = await sendOwnerMail(
      { RESEND_API_KEY: "re_test", IDEAS_FROM_EMAIL: "opc@example.com" },
      { subject: "OPC idée — Gatineau", text: "<b>Déneiger</b> les allées" },
      fakeFetch,
    );
    assert.equal(result.sent, true);
    assert.equal(calls[0]?.url, RESEND_API_URL);
    const headers = new Headers(calls[0]?.init.headers);
    assert.equal(headers.get("Authorization"), "Bearer re_test");
    const body = JSON.parse(String(calls[0]?.init.body));
    assert.deepEqual(body.to, [OPC_INBOX_TO]);
    assert.equal(body.to[0], "opencommunity.opc@gmail.com");
    assert.equal(body.from, "opc@example.com");
    assert.equal(JSON.stringify(body).includes("visitor@evil.test"), false);
    assert.equal(body.text.includes("<b>"), false);
    assert.match(body.text, /Déneiger/);
  });

  it("returns failed on HTTP or network errors without throwing", async () => {
    const http = await sendOwnerMail(
      { RESEND_API_KEY: "re_test" },
      { subject: "OPC", text: "Une idée" },
      async () => new Response("nope", { status: 401 }),
    );
    assert.equal(http.sent, false);
    assert.equal(http.reason, "http_401");
    const net = await sendOwnerMail(
      { RESEND_API_KEY: "re_test" },
      { subject: "OPC", text: "Une idée" },
      async () => {
        throw new Error("offline");
      },
    );
    assert.equal(net.sent, false);
    assert.equal(net.reason, "network");
  });

  it("falls back to the default From when the env value is junk", () => {
    assert.equal(resolveFromAddress("not-an-email"), DEFAULT_IDEAS_FROM);
    assert.equal(resolveFromAddress(""), DEFAULT_IDEAS_FROM);
  });
});
