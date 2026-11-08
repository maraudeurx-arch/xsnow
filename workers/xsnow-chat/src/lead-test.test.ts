import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { OwnerMail } from "../../../src/lib/owner-mail.ts";
import { handleLeadTestAnswerPost, isLeadTestAnswerPath } from "./lead-test.ts";

describe("worker — route /lead-test-answer", () => {
  it("reconnaît le chemin, avec ou sans préfixe", () => {
    assert.equal(isLeadTestAnswerPath("/lead-test-answer"), true);
    assert.equal(isLeadTestAnswerPath("/lead-test-answer/"), true);
    assert.equal(isLeadTestAnswerPath("/quelque-part/lead-test-answer"), true);
    assert.equal(isLeadTestAnswerPath("/ideas"), false);
    assert.equal(isLeadTestAnswerPath("/lead-test"), false);
  });

  it("une réponse valide part en courriel à l'équipe Essaim-Agents", async () => {
    const sent: OwnerMail[] = [];
    const mailer = async (_env: unknown, mail: OwnerMail) => {
      sent.push(mail);
      return { sent: true };
    };
    const result = await handleLeadTestAnswerPost(
      {
        opcId: "OPC-5X78",
        projectId: "education",
        n: 3,
        choice: "B",
        reason: "",
        at: "2026-11-08T16:31:00.000Z",
      },
      {},
      Date.parse("2026-11-08T16:31:05.000Z"),
      mailer as never,
    );
    assert.equal(result.status, 200);
    assert.deepEqual(result.data, { ok: true, emailed: true });
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.to, "essaim.agents@gmail.com");
    assert.match(sent[0]?.text ?? "", /Steve Badinga/);
    assert.match(sent[0]?.text ?? "", /Proposition : 3\/12/);
  });

  it("un corps invalide est refusé (400) sans aucun courriel", async () => {
    let calls = 0;
    const mailer = async () => {
      calls += 1;
      return { sent: true };
    };
    for (const body of [
      null,
      {},
      { opcId: "OPC-UBNZ", projectId: "education", n: 1, choice: "B" }, // mauvais chef pour ce projet
      { opcId: "OPC-5X78", projectId: "education", n: 1, choice: "X" },
      { opcId: "OPC-5X78", projectId: "inconnu", n: 1, choice: "B" },
    ]) {
      const result = await handleLeadTestAnswerPost(body, {}, Date.now(), mailer as never);
      assert.equal(result.status, 400);
    }
    assert.equal(calls, 0);
  });

  it("si Resend n'est pas configuré, la réponse reste acceptée mais « emailed » est faux (honnête)", async () => {
    const mailer = async () => ({ sent: false, reason: "not_configured" });
    const result = await handleLeadTestAnswerPost(
      { opcId: "OPC-UBNZ", projectId: "haute-couture", n: 12, choice: "B", at: "2026-11-08T20:00:00.000Z" },
      {},
      Date.now(),
      mailer as never,
    );
    assert.equal(result.status, 200);
    assert.deepEqual(result.data, { ok: true, emailed: false });
  });
});
