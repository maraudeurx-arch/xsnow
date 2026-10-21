import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleArbitrage, isArbitragePath, type ArbStore, type ArbiterRow, type CaseRow } from "./arbitrage.ts";
import { ARBITER_TERMS_VERSION, bytesToB64, importVerifyKey, verifyAttestation } from "../../../src/lib/arbitrage.ts";

function memStore(): ArbStore & { arbiters: Map<string, ArbiterRow>; cases: Map<string, CaseRow> } {
  const arbiters = new Map<string, ArbiterRow>();
  const cases = new Map<string, CaseRow>();
  return {
    arbiters,
    cases,
    async insertArbiter(r) { arbiters.set(r.id, { ...r }); },
    async arbiterByToken(h) { return [...arbiters.values()].find((a) => a.token_hash === h) ?? null; },
    async arbiterById(id) { return arbiters.get(id) ?? null; },
    async pendingArbiters() { return [...arbiters.values()].filter((a) => a.status === "pending"); },
    async updateArbiter(id, p) { const a = arbiters.get(id); if (a) arbiters.set(id, { ...a, ...p }); },
    async purgeExpired(now) {
      for (const a of arbiters.values()) if (a.purge_after && a.purge_after < now) { a.identity_enc = null; a.photo_enc = null; }
    },
    async insertCase(c) { cases.set(c.id, { ...c }); },
    async caseById(id) { return cases.get(id) ?? null; },
    async openCases() { return [...cases.values()].filter((c) => c.status === "open"); },
    async updateCase(id, p) { const c = cases.get(id); if (c) cases.set(id, { ...c, ...p }); },
  };
}

async function makeEnv() {
  const kp = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const pkcs8 = bytesToB64(new Uint8Array(await crypto.subtle.exportKey("pkcs8", kp.privateKey)));
  const spki = bytesToB64(new Uint8Array(await crypto.subtle.exportKey("spki", kp.publicKey)));
  return {
    ARBITER_ENC_KEY: bytesToB64(crypto.getRandomValues(new Uint8Array(32))),
    ARBITER_SIGNING_KEY: pkcs8,
    ARBITER_SIGNING_PUBLIC_KEY: spki,
    ARBITER_ADMIN_SECRET: "admin-test-secret",
    AI: {
      run: async () => ({ response: '{"outcome":"claimant","refundPercent":100,"rationale":"Livraison non conforme."}' }),
    },
  };
}

const B = "https://w.test";
const req = (path: string, method = "GET", body?: unknown, token?: string) =>
  new Request(B + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const application = {
  consent: true,
  lastName: "Estigene",
  firstName: "Politzer",
  docType: "passport",
  docNumber: "AB123456",
  issuingCountry: "CA",
  expiryDate: "2030-01-01",
  idPhotoBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  idPhotoMime: "image/png",
  face: { score: 0.72, liveness: true, method: "human-3/faceres" },
  terms: { version: ARBITER_TERMS_VERSION, acceptedAt: "2026-10-21T11:59:00.000Z" },
};

describe("arbitrage worker", () => {
  it("matches paths", () => {
    assert.equal(isArbitragePath("/arbitrage/apply"), true);
    assert.equal(isArbitragePath("/arbitrages"), false);
  });

  it("503 when secrets are missing", async () => {
    const res = await handleArbitrage(req("/arbitrage/apply", "POST", application), {}, { store: memStore() });
    assert.equal(res.status, 503);
  });

  it("runs the full HITL flow and notifies both parties without PII", async () => {
    const env = await makeEnv();
    const store = memStore();
    const sent: { url: string; body: string }[] = [];
    const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
      sent.push({ url: String(url), body: String(init?.body) });
      return new Response("ok", { status: 200 });
    }) as typeof fetch;
    const deps = { store, fetchImpl, now: () => Date.parse("2026-10-21T12:00:00Z") };

    assert.equal((await handleArbitrage(req("/arbitrage/apply", "POST", { ...application, consent: false }), env, deps)).status, 400);
    const applied = await (await handleArbitrage(req("/arbitrage/apply", "POST", application), env, deps)).json();
    assert.equal(applied.status, "pending");
    const row = store.arbiters.get(applied.arbiterId)!;
    assert.equal(row.terms_version, ARBITER_TERMS_VERSION);
    assert.equal(row.terms_accepted_at, "2026-10-21T11:59:00.000Z");
    const { terms: _t, ...noTerms } = application;
    void _t;
    const refused = await handleArbitrage(req("/arbitrage/apply", "POST", noTerms), env, deps);
    assert.equal(refused.status, 400);
    assert.equal((await refused.json()).error, "terms_required");
    assert.ok(!row.identity_enc!.includes("AB123456"), "identity encrypted at rest");
    assert.ok(!row.photo_enc!.includes(application.idPhotoBase64.slice(0, 20)), "photo encrypted at rest");

    // not verified yet
    assert.equal((await handleArbitrage(req("/arbitrage/cases", "GET", undefined, applied.token), env, deps)).status, 403);
    // admin auth
    assert.equal((await handleArbitrage(req("/arbitrage/admin/pending", "GET", undefined, "nope"), env, deps)).status, 401);
    const pending = await (await handleArbitrage(req("/arbitrage/admin/pending", "GET", undefined, env.ARBITER_ADMIN_SECRET), env, deps)).json();
    assert.equal(pending.pending[0].identity.docNumber, "AB123456");
    assert.equal(pending.pending[0].terms.version, ARBITER_TERMS_VERSION);
    await handleArbitrage(req("/arbitrage/admin/review", "POST", { arbiterId: applied.arbiterId, approve: true, faceReviewed: true }, env.ARBITER_ADMIN_SECRET), env, deps);
    const me = await (await handleArbitrage(req("/arbitrage/me", "GET", undefined, applied.token), env, deps)).json();
    assert.equal(me.status, "verified");

    const created = await (await handleArbitrage(req("/arbitrage/admin/cases", "POST", {
      claimant: { agentId: "agent-A", webhookUrl: "https://a.test/hook" },
      respondent: { agentId: "agent-B", webhookUrl: "https://b.test/hook" },
      amountUsdc: 500, claim: "Service non livré", response: "Livré à temps",
    }, env.ARBITER_ADMIN_SECRET), env, deps)).json();
    const list = await (await handleArbitrage(req("/arbitrage/cases", "GET", undefined, applied.token), env, deps)).json();
    assert.equal(list.cases[0].suggestion.outcome, "claimant");

    // reject without reason → 400
    assert.equal((await handleArbitrage(req("/arbitrage/cases/decide", "POST", { caseId: created.caseId, accept: false }, applied.token), env, deps)).status, 400);
    const decided = await (await handleArbitrage(req("/arbitrage/cases/decide", "POST", { caseId: created.caseId, accept: true }, applied.token), env, deps)).json();
    assert.equal(decided.payload.origin.kind, "ai_suggestion_accepted");
    assert.equal(decided.payload.attestation.verificationLevel, "id_reviewed+face_reviewed");
    assert.deepEqual(sent.map((s) => s.url).sort(), ["https://a.test/hook", "https://b.test/hook"]);
    for (const s of sent) {
      for (const leak of ["AB123456", "Estigene", "Politzer", application.idPhotoBase64.slice(0, 16)]) {
        assert.ok(!s.body.includes(leak), `no ${leak} in party payload`);
      }
    }
    const key = await importVerifyKey(env.ARBITER_SIGNING_PUBLIC_KEY);
    assert.equal(await verifyAttestation(key, decided.payload.attestation), true);
    const tampered = { ...decided.payload.attestation, arbiterId: "arb_fake" };
    assert.equal(await verifyAttestation(key, tampered), false);
    // case closed
    assert.equal((await handleArbitrage(req("/arbitrage/cases/decide", "POST", { caseId: created.caseId, accept: true }, applied.token), env, deps)).status, 404);
  });

  it("human override requires a reason and a decision", async () => {
    const env = await makeEnv();
    const store = memStore();
    const deps = { store, fetchImpl: (async () => new Response("")) as typeof fetch };
    const a = await (await handleArbitrage(req("/arbitrage/apply", "POST", application), env, deps)).json();
    await handleArbitrage(req("/arbitrage/admin/review", "POST", { arbiterId: a.arbiterId, approve: true }, env.ARBITER_ADMIN_SECRET), env, deps);
    const c = await (await handleArbitrage(req("/arbitrage/admin/cases", "POST", {
      claimant: { agentId: "A", webhookUrl: "https://a.test" }, respondent: { agentId: "B", webhookUrl: "https://b.test" },
      amountUsdc: 300, claim: "x", response: "y",
    }, env.ARBITER_ADMIN_SECRET), env, deps)).json();
    await handleArbitrage(req("/arbitrage/cases", "GET", undefined, a.token), env, deps);
    const res = await (await handleArbitrage(req("/arbitrage/cases/decide", "POST", {
      caseId: c.caseId, accept: false, reason: "Preuve de livraison valide",
      overrideDecision: { outcome: "respondent", refundPercent: 0, rationale: "Livraison prouvée." },
    }, a.token), env, deps)).json();
    assert.equal(res.payload.origin.kind, "human_override");
    assert.equal(res.payload.attestation.verificationLevel, "id_reviewed+face_auto");
  });

  it("purges raw identity after retention", async () => {
    const env = await makeEnv();
    const store = memStore();
    let t = Date.parse("2026-10-21T00:00:00Z");
    const deps = { store, now: () => t };
    const a = await (await handleArbitrage(req("/arbitrage/apply", "POST", application), env, deps)).json();
    await handleArbitrage(req("/arbitrage/admin/review", "POST", { arbiterId: a.arbiterId, approve: true }, env.ARBITER_ADMIN_SECRET), env, deps);
    t += 91 * 86_400_000;
    await handleArbitrage(req("/arbitrage/me", "GET", undefined, a.token), env, deps);
    assert.equal(store.arbiters.get(a.arbiterId)!.photo_enc, null);
    assert.ok(store.arbiters.get(a.arbiterId)!.identity_hash);
  });
});
