import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decisionMail, redactForLog, sendDecisionCopy } from "./decision-mail.ts";

const d = { caseId: "sim_x", title: "t", simulation: true, choice: "A. x", suggestion: null, followedSuggestion: null, decidedAt: "2026-10-21T22:00:00Z" };

describe("decision-copy log line", () => {
  it("logs sent/failed with Resend status and a redacted body (no email, no key)", async () => {
    const lines: string[] = [];
    const env = { ARBITER_DECISION_EMAILS: "on", RESEND_API_KEY: "re_SECRETSECRET123" };
    const fail = (async () => new Response('{"statusCode":403,"message":"The from@bad.example domain is not verified. key re_SECRETSECRET123"}', { status: 403 })) as typeof fetch;
    assert.equal(await sendDecisionCopy(env, "who@opc.test", "fr", d, fail, (l) => lines.push(l)), "failed");
    assert.match(lines[0], /^decision-copy case=sim_x sim=1 result=failed resend_status=403 body=/);
    assert.ok(!lines[0].includes("@") && !lines[0].includes("re_SECRET"), lines[0]);
    const ok = (async () => new Response('{"id":"abc"}', { status: 200 })) as typeof fetch;
    assert.equal(await sendDecisionCopy(env, "who@opc.test", "fr", d, ok, (l) => lines.push(l)), "sent");
    assert.match(lines[1], /result=sent resend_status=200/);
    await sendDecisionCopy(env, null, "fr", d, ok, (l) => lines.push(l));
    assert.match(lines[2], /result=no_email/);
    await sendDecisionCopy({}, "who@opc.test", "fr", d, ok, (l) => lines.push(l));
    assert.match(lines[3], /result=off reason=flag/);
    const boom = (async () => { throw new Error("network down for who@opc.test"); }) as typeof fetch;
    await sendDecisionCopy(env, "who@opc.test", "fr", d, boom, (l) => lines.push(l));
    assert.ok(/resend_status=0/.test(lines[4]) && !lines[4].includes("@"));
    assert.equal(redactForLog("Bearer abc.def x@y.co"), "Bearer [key] [email]");
  });
});

describe("decision-copy training explanation", () => {
  it("adds Indiana's explanation under a heading, only when there is one", () => {
    const withE = decisionMail({ ...d, explanation: "Bravo ! Tu as choisi A.\nCe que dit le Manuel de justice (M-5.3) : « Le fournisseur prouve la livraison. »" }, "fr").text;
    assert.ok(withE.includes("Pourquoi — la formation d’Indiana :\nBravo ! Tu as choisi A."));
    assert.ok(withE.indexOf("Pourquoi") < withE.indexOf("https://essaim-agents.com/manuel-justice-v2.3.2.pdf"));
    assert.ok(!decisionMail(d, "fr").text.includes("Pourquoi"));
    assert.ok(decisionMail({ ...d, explanation: "x" }, "en").text.includes("Indiana’s training (in French)"));
  });
});
