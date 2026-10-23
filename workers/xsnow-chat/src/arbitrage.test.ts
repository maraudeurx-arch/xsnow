import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleArbitrage, isArbitragePath, parseSimCase, simTextError, type ArbStore, type ArbiterRow, type CaseRow, type SimAnswerRow, type WalletRow, type PushSubRow, type ExplanationRow } from "./arbitrage.ts";
import { ARBITER_TERMS_VERSION, bytesToB64, importVerifyKey, verifyAttestation } from "../../../src/lib/arbitrage.ts";

function memStore(): ArbStore & { arbiters: Map<string, ArbiterRow>; cases: Map<string, CaseRow>; simAns: SimAnswerRow[]; explanations: ExplanationRow[] } {
  const arbiters = new Map<string, ArbiterRow>();
  const cases = new Map<string, CaseRow>();
  const simAns: SimAnswerRow[] = [];
  const simInvites = new Set<string>();
  const wallets = new Map<string, WalletRow>();
  const pushSubs = new Map<string, PushSubRow>();
  const explanations: ExplanationRow[] = [];
  return {
    explanations,
    async insertExplanation(e) { if (!explanations.some((x) => x.case_id === e.case_id && x.arbiter_id === e.arbiter_id)) explanations.push({ ...e }); },
    async explanationsBy(id, limit) { return explanations.filter((x) => x.arbiter_id === id).sort((a, b) => b.created_at - a.created_at).slice(0, limit); },
    async explanationsForCase(id) { return explanations.filter((x) => x.case_id === id); },
    arbiters,
    cases,
    simAns,
    async openSimCases() { return [...cases.values()].filter((c) => c.status === "open" && c.simulation === 1); },
    async allSimCases() { return [...cases.values()].filter((c) => c.simulation === 1); },
    async insertSimAnswer(a) {
      if (simAns.some((x) => x.case_id === a.case_id && x.arbiter_id === a.arbiter_id)) return false;
      simAns.push({ ...a }); return true;
    },
    async simAnswers(id) { return simAns.filter((a) => a.case_id === id); },
    async isSimInvited(id) { return simInvites.has(id); },
    async setSimInvite(id, on) { if (on) simInvites.add(id); else simInvites.delete(id); },
    async simAnswerCountBy(id) { return simAns.filter((a) => a.arbiter_id === id).length; },
    async walletOf(id) { return wallets.get(id) ?? null; },
    async setWallet(w) { wallets.set(w.arbiter_id, { ...w }); },
    async allWallets() { return [...wallets.values()]; },
    async addPushSub(x) { pushSubs.set(x.endpoint, { ...x }); },
    async removePushSub(e, a) { const x = pushSubs.get(e); if (x && (!a || x.arbiter_id === a)) pushSubs.delete(e); },
    async allPushSubs() { return [...pushSubs.values()]; },
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
    async openCases() { return [...cases.values()].filter((c) => c.status === "open" && c.simulation !== 1); },
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
  email: "arbitre@opc.test",
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

  it("simulation text guard: no authority words, only approved figures", () => {
    assert.equal(simTextError("Le tribunal décide"), "forbidden_word");
    assert.equal(simTextError("Devant la Cour"), "forbidden_word");
    assert.equal(simTextError("small claims court"), "forbidden_word");
    assert.equal(simTextError("Dossier en cours, voir le courriel"), null);
    assert.equal(simTextError("Payé 30 $ par arbitrage, 50 $ par appel, 10 % OPC"), null);
    assert.equal(simTextError("$30 per case"), null);
    assert.equal(simTextError("Litige de 500 USDC"), "pay_figure_not_allowed");
    assert.equal(simTextError("L'arbitre touche 25 $"), "pay_figure_not_allowed");
    assert.equal(simTextError("part de 40 %"), "pay_figure_not_allowed");
    const ok = parseSimCase({ title: "Colis non reçu", scenario: "Un agent dit ne pas avoir reçu le fichier.", choices: ["Rembourser", "Refuser"] });
    assert.ok(ok.ok && ok.value.title === "SIMULATION — Colis non reçu");
    assert.deepEqual(ok.ok && ok.value.choices.map((c) => c.id), ["a", "b"]);
    assert.deepEqual(ok.ok && ok.value.choices.map((c) => c.letter), ["A", "B"]);
    assert.equal((parseSimCase({ title: "x", scenario: "y", choices: ["a"] }) as { error: string }).error, "choices_2_to_4");
    assert.equal((parseSimCase({ title: "x", scenario: "y", choices: ["a", "b", "c", "d", "e"] }) as { error: string }).error, "choices_2_to_4");
    assert.equal((parseSimCase({ title: "x", scenario: "y", choices: ["a", "le tribunal"] }) as { error: string }).error, "forbidden_word");
  });

  it("simulation: several arbiters answer the same case independently; no AI, webhook, signature or reputation", async () => {
    const env = await makeEnv();
    let aiCalls = 0;
    env.AI = { run: async () => { aiCalls++; return { response: "{}" }; } };
    const store = memStore();
    let fetches = 0;
    let t = Date.parse("2026-10-21T22:00:00Z");
    const deps = { store, now: () => t, fetchImpl: (async () => { fetches++; return new Response(""); }) as typeof fetch };
    const S = env.ARBITER_ADMIN_SECRET;
    const toks: string[] = [];
    for (let i = 0; i < 5; i++) {
      const a = await (await handleArbitrage(req("/arbitrage/apply", "POST", { ...application, docNumber: `AB12345${i}` }), env, deps)).json();
      await handleArbitrage(req("/arbitrage/admin/review", "POST", { arbiterId: a.arbiterId, approve: true }, S), env, deps);
      toks.push(a.token);
    }
    // pending arbiter cannot see simulations
    const p = await (await handleArbitrage(req("/arbitrage/apply", "POST", { ...application, docNumber: "ZZ999999" }), env, deps)).json();
    assert.equal((await handleArbitrage(req("/arbitrage/sim-cases", "GET", undefined, p.token), env, deps)).status, 403);
    // non-admin cannot create
    assert.equal((await handleArbitrage(req("/arbitrage/admin/sim-cases", "POST", {}, toks[0]), env, deps)).status, 401);
    assert.equal((await (await handleArbitrage(req("/arbitrage/admin/sim-cases", "POST", { title: "x", scenario: "Le tribunal", choices: ["a", "b"] }, S), env, deps)).json()).error, "forbidden_word");
    const c = await (await handleArbitrage(req("/arbitrage/admin/sim-cases", "POST", {
      title: "Fichier non livré", scenario: "L'agent A dit que l'agent B n'a pas livré.",
      choices: [{ id: "a", label: "Rembourser A" }, { id: "b", label: "Donner raison à B" }, { id: "c", label: "Partager" }],
    }, S), env, deps)).json();
    assert.equal(c.simulation, true);
    assert.match(c.title, /^SIMULATION — /);
    // simulation never shows in the real case list nor accepts real decisions
    assert.equal((await (await handleArbitrage(req("/arbitrage/cases", "GET", undefined, toks[0]), env, deps)).json()).cases.length, 0);
    assert.equal((await handleArbitrage(req("/arbitrage/cases/decide", "POST", { caseId: c.caseId, accept: true }, toks[0]), env, deps)).status, 404);
    const list = await (await handleArbitrage(req("/arbitrage/sim-cases", "GET", undefined, toks[0]), env, deps)).json();
    assert.equal(list.cases[0].choices.length, 3);
    assert.equal(list.cases[0].myAnswer, null);
    assert.equal((await handleArbitrage(req("/arbitrage/sim-cases/answer", "POST", { caseId: c.caseId, choiceId: "z" }, toks[0]), env, deps)).status, 400);
    const picks = ["a", "a", "b", "c", "a"];
    for (let i = 0; i < 5; i++) {
      t += 60_000;
      const r = await handleArbitrage(req("/arbitrage/sim-cases/answer", "POST", { caseId: c.caseId, choiceId: picks[i] }, toks[i]), env, deps);
      assert.equal(r.status, 200);
    }
    assert.equal((await handleArbitrage(req("/arbitrage/sim-cases/answer", "POST", { caseId: c.caseId, choiceId: "b" }, toks[0]), env, deps)).status, 409);
    // answered → hidden from the arbiter's pending list, but kept as evidence (owner results, ?include=answered)
    assert.equal((await (await handleArbitrage(req("/arbitrage/sim-cases", "GET", undefined, toks[2]), env, deps)).json()).cases.length, 0);
    assert.equal((await (await handleArbitrage(req("/arbitrage/sim-cases?include=answered", "GET", undefined, toks[2]), env, deps)).json()).cases[0].myAnswer, "b");
    assert.equal(store.simAns.length, 5);
    const res = await (await handleArbitrage(req("/arbitrage/admin/sim-results", "GET", undefined, S), env, deps)).json();
    assert.equal(res.cases[0].answerCount, 5);
    assert.deepEqual(res.cases[0].tally, { A: 3, B: 1, C: 1 });
    assert.equal(res.cases[0].answers[0].letter, "A");
    assert.equal(res.cases[0].followedSuggestion, null);
    assert.equal(res.cases[0].answers[0].responseSeconds, 60);
    const dump = JSON.stringify(res);
    for (const leak of ["Estigene", "Politzer", "AB12345", "passport"]) assert.ok(!dump.includes(leak), `no ${leak} in sim-results`);
    assert.equal(aiCalls, 0);
    assert.equal(fetches, 0);
    for (const a of store.arbiters.values()) assert.equal(a.reputation, 0);
    assert.equal(store.cases.get(c.caseId)!.decision_json, null);
    // close
    await handleArbitrage(req("/arbitrage/admin/sim-close", "POST", { caseId: c.caseId }, S), env, deps);
    assert.equal((await (await handleArbitrage(req("/arbitrage/sim-cases", "GET", undefined, toks[0]), env, deps)).json()).cases.length, 0);
  });

  it("sim-invite: a rescan_requested arbiter sees and answers simulations only; status unchanged", async () => {
    const env = await makeEnv();
    const store = memStore();
    const deps = { store };
    const S = env.ARBITER_ADMIN_SECRET;
    const a = await (await handleArbitrage(req("/arbitrage/apply", "POST", application), env, deps)).json();
    await handleArbitrage(req("/arbitrage/admin/review", "POST", { arbiterId: a.arbiterId, action: "rescan" }, S), env, deps);
    const c = await (await handleArbitrage(req("/arbitrage/admin/sim-cases", "POST", { title: "t", scenario: "s", choices: ["x", "y"] }, S), env, deps)).json();
    assert.equal((await handleArbitrage(req("/arbitrage/sim-cases", "GET", undefined, a.token), env, deps)).status, 403);
    assert.equal((await handleArbitrage(req("/arbitrage/admin/sim-invite", "POST", { arbiterId: a.arbiterId }, a.token), env, deps)).status, 401);
    const inv = await (await handleArbitrage(req("/arbitrage/admin/sim-invite", "POST", { arbiterId: a.arbiterId, invite: true }, S), env, deps)).json();
    assert.equal(inv.status, "rescan_requested");
    assert.equal(store.arbiters.get(a.arbiterId)!.status, "rescan_requested");
    assert.equal((await (await handleArbitrage(req("/arbitrage/sim-cases", "GET", undefined, a.token), env, deps)).json()).cases.length, 1);
    assert.equal((await handleArbitrage(req("/arbitrage/sim-cases/answer", "POST", { caseId: c.caseId, choiceId: "a" }, a.token), env, deps)).status, 200);
    // still no real cases, rescan flow still available
    assert.equal((await handleArbitrage(req("/arbitrage/cases", "GET", undefined, a.token), env, deps)).status, 403);
    assert.equal((await handleArbitrage(req("/arbitrage/rescan/photo", "GET", undefined, a.token), env, deps)).status, 200);
    const res = await (await handleArbitrage(req("/arbitrage/admin/sim-results", "GET", undefined, S), env, deps)).json();
    assert.equal(res.cases[0].answers[0].arbiterStatus, "rescan_requested");
    // revoke
    await handleArbitrage(req("/arbitrage/admin/sim-invite", "POST", { arbiterId: a.arbiterId, invite: false }, S), env, deps);
    assert.equal((await handleArbitrage(req("/arbitrage/sim-cases", "GET", undefined, a.token), env, deps)).status, 403);
    // rejected arbiters cannot be invited
    await handleArbitrage(req("/arbitrage/admin/review", "POST", { arbiterId: a.arbiterId, approve: false }, S), env, deps);
    assert.equal((await handleArbitrage(req("/arbitrage/admin/sim-invite", "POST", { arbiterId: a.arbiterId }, S), env, deps)).status, 409);
  });
  it("wallet: after the first simulated answer the arbiter is asked to connect; address stored, owner-readable, no payment", async () => {
    const env = await makeEnv();
    const store = memStore();
    let fetches = 0;
    const deps = { store, fetchImpl: (async () => { fetches++; return new Response(""); }) as typeof fetch };
    const S = env.ARBITER_ADMIN_SECRET;
    const a = await (await handleArbitrage(req("/arbitrage/apply", "POST", application), env, deps)).json();
    // not verified: no wallet endpoint
    assert.equal((await handleArbitrage(req("/arbitrage/wallet", "GET", undefined, a.token), env, deps)).status, 403);
    await handleArbitrage(req("/arbitrage/admin/review", "POST", { arbiterId: a.arbiterId, approve: true }, S), env, deps);
    const c = await (await handleArbitrage(req("/arbitrage/admin/sim-cases", "POST", { title: "t", scenario: "s", choices: ["x", "y"] }, S), env, deps)).json();
    let w = await (await handleArbitrage(req("/arbitrage/wallet", "GET", undefined, a.token), env, deps)).json();
    assert.equal(w.needsWallet, false);
    await handleArbitrage(req("/arbitrage/sim-cases/answer", "POST", { caseId: c.caseId, choiceId: "a" }, a.token), env, deps);
    w = await (await handleArbitrage(req("/arbitrage/wallet", "GET", undefined, a.token), env, deps)).json();
    assert.equal(w.needsWallet, true);
    assert.equal((await handleArbitrage(req("/arbitrage/wallet", "POST", { address: "0x123" }, a.token), env, deps)).status, 400);
    const addr = "0x000000000000000000000000000000000000dEaD";
    assert.equal((await handleArbitrage(req("/arbitrage/wallet", "POST", { address: addr, chainId: 84532 }, a.token), env, deps)).status, 200);
    w = await (await handleArbitrage(req("/arbitrage/wallet", "GET", undefined, a.token), env, deps)).json();
    assert.equal(w.needsWallet, false);
    assert.equal(w.address, addr);
    assert.equal((await handleArbitrage(req("/arbitrage/admin/wallets", "GET", undefined, a.token), env, deps)).status, 401);
    const list = await (await handleArbitrage(req("/arbitrage/admin/wallets", "GET", undefined, S), env, deps)).json();
    assert.deepEqual(list.wallets.map((x: { arbiterId: string; address: string }) => [x.arbiterId, x.address]), [[a.arbiterId, addr]]);
    assert.ok(!JSON.stringify(list).includes("Politzer"));
    assert.equal(fetches, 0);
  });

  it("push: opted-in arbiters get a payload-less VAPID push on new cases (real → verified; sim → verified + invited)", async () => {
    const env = await makeEnv();
    const kp = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
    const b64u = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
    const E = { ...env, VAPID_PUBLIC_KEY: b64u(raw), VAPID_PRIVATE_KEY: jwk.d!, VAPID_SUBJECT: "mailto:test@example.org" };
    const store = memStore();
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return new Response("", { status: String(url).includes("gone") ? 410 : 201 });
    }) as typeof fetch;
    const deps = { store, fetchImpl };
    const S = env.ARBITER_ADMIN_SECRET;
    const mk = async (n: string) => (await (await handleArbitrage(req("/arbitrage/apply", "POST", { ...application, docNumber: n }), E, deps)).json());
    const v = await mk("AA000001"), inv = await mk("AA000002"), pend = await mk("AA000003");
    await handleArbitrage(req("/arbitrage/admin/review", "POST", { arbiterId: v.arbiterId, approve: true }, S), E, deps);
    await handleArbitrage(req("/arbitrage/admin/review", "POST", { arbiterId: inv.arbiterId, action: "rescan" }, S), E, deps);
    await handleArbitrage(req("/arbitrage/admin/sim-invite", "POST", { arbiterId: inv.arbiterId }, S), E, deps);
    assert.equal((await (await handleArbitrage(req("/arbitrage/push/vapid-key", "GET"), E, deps)).json()).key, E.VAPID_PUBLIC_KEY);
    // pending, not invited: cannot subscribe
    assert.equal((await handleArbitrage(req("/arbitrage/push/subscribe", "POST", { endpoint: "https://fcm.googleapis.com/fcm/send/p" }, pend.token), E, deps)).status, 403);
    // SSRF guard
    assert.equal((await handleArbitrage(req("/arbitrage/push/subscribe", "POST", { endpoint: "https://evil.example/x" }, v.token), E, deps)).status, 400);
    assert.equal((await handleArbitrage(req("/arbitrage/push/subscribe", "POST", { endpoint: "https://fcm.googleapis.com/fcm/send/v" }, v.token), E, deps)).status, 200);
    assert.equal((await handleArbitrage(req("/arbitrage/push/subscribe", "POST", { endpoint: "https://web.push.apple.com/inv" }, inv.token), E, deps)).status, 200);
    await handleArbitrage(req("/arbitrage/push/subscribe", "POST", { endpoint: "https://fcm.googleapis.com/fcm/send/gone" }, v.token), E, deps);
    const sim = await (await handleArbitrage(req("/arbitrage/admin/sim-cases", "POST", { title: "t", scenario: "s", choices: ["x", "y"] }, S), E, deps)).json();
    assert.equal(sim.pushed, 2);
    assert.deepEqual(calls.map((c) => new URL(c.url).pathname).sort(), ["/fcm/send/gone", "/fcm/send/v", "/inv"]);
    assert.ok(!store.allPushSubs || !(await store.allPushSubs()).some((x) => x.endpoint.includes("gone")), "expired sub removed");
    // VAPID header verifies with the public key; no body
    const c0 = calls.find((c) => c.url.includes("/v"))!;
    const auth = String((c0.init!.headers as Record<string, string>).Authorization);
    const jwt = auth.match(/t=([^,]+)/)![1];
    const [h, p, sg] = jwt.split(".");
    const d = (x: string) => Uint8Array.from(atob(x.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((x.length + 3) % 4)), (ch) => ch.charCodeAt(0));
    assert.ok(await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, kp.publicKey, d(sg), new TextEncoder().encode(`${h}.${p}`)));
    assert.equal(JSON.parse(new TextDecoder().decode(d(p))).aud, "https://fcm.googleapis.com");
    assert.equal(c0.init!.body, undefined);
    // real case: verified only
    calls.length = 0;
    const real = await (await handleArbitrage(req("/arbitrage/admin/cases", "POST", { amountUsdc: 5, claimant: { agentId: "a", webhookUrl: "https://a.example/h" }, respondent: { agentId: "b", webhookUrl: "https://b.example/h" }, claim: "c", response: "r" }, S), E, deps)).json();
    assert.equal(real.ok, true);
    assert.equal(real.pushed, 1);
    assert.deepEqual(calls.map((c) => new URL(c.url).pathname), ["/fcm/send/v"]);
    // unsubscribe
    await handleArbitrage(req("/arbitrage/push/unsubscribe", "POST", { endpoint: "https://web.push.apple.com/inv" }, inv.token), E, deps);
    assert.equal((await store.allPushSubs()).length, 1);
    // not configured → no push, no error
    calls.length = 0;
    const s2 = await (await handleArbitrage(req("/arbitrage/admin/sim-cases", "POST", { title: "t2", scenario: "s", choices: ["x", "y"] }, S), env, deps)).json();
    assert.equal(s2.pushed, 0);
    assert.equal(calls.length, 0);
  });

  it("decision copy by email: OFF by default; when on, the arbiter gets their own choice; email stays encrypted", async () => {
    const env = await makeEnv();
    const store = memStore();
    const mails: { url: string; body: Record<string, unknown> }[] = [];
    const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
      if (String(url).includes("resend")) mails.push({ url: String(url), body: JSON.parse(String(init?.body)) });
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    const deps = { store, fetchImpl };
    const S = env.ARBITER_ADMIN_SECRET;
    const a = await (await handleArbitrage(req("/arbitrage/apply", "POST", { ...application, email: "" }), env, deps)).json();
    assert.equal(a.error, "email");
    const ok = await (await handleArbitrage(req("/arbitrage/apply", "POST", application), env, deps)).json();
    const row = store.arbiters.get(ok.arbiterId)!;
    assert.ok(row.email_enc && !row.email_enc.includes("arbitre@opc.test"), "email encrypted at rest");
    await handleArbitrage(req("/arbitrage/admin/review", "POST", { arbiterId: ok.arbiterId, approve: true }, S), env, deps);
    assert.equal((await (await handleArbitrage(req("/arbitrage/me", "GET", undefined, ok.token), env, deps)).json()).hasEmail, true);
    const c1 = await (await handleArbitrage(req("/arbitrage/admin/sim-cases", "POST", { title: "Logo en retard", scenario: "s", choices: ["x", "y"], suggestion: { letter: "B", text: "Je suggère B.", reasoning: "M-5.3." } }, S), env, deps)).json();
    // flag OFF (default): nothing emailed, D1 keeps the answer
    const r1 = await (await handleArbitrage(req("/arbitrage/sim-cases/answer", "POST", { caseId: c1.caseId, choiceId: "a" }, ok.token), env, deps)).json();
    assert.equal(r1.emailCopy, "off");
    assert.equal(mails.length, 0);
    assert.equal(store.simAns.length, 1);
    // flag ON
    const on = { ...env, ARBITER_DECISION_EMAILS: "on", RESEND_API_KEY: "re_test" };
    const c2 = await (await handleArbitrage(req("/arbitrage/admin/sim-cases", "POST", { title: "Traduction", scenario: "s", choices: ["x", "y"], suggestion: { letter: "B", text: "Je suggère B.", reasoning: "M-5.3." } }, S), on, deps)).json();
    const r2 = await (await handleArbitrage(req("/arbitrage/sim-cases/answer", "POST", { caseId: c2.caseId, choiceId: "b" }, ok.token), on, deps)).json();
    assert.equal(r2.emailCopy, "sent");
    assert.deepEqual(mails[0].body.to, ["arbitre@opc.test"]);
    const text = String(mails[0].body.text);
    for (const want of [c2.caseId, "SIMULATION — Traduction", "B. y", "Tu as suivi la suggestion", "https://essaim-agents.com/manuel-justice-v2.3.2.pdf"]) assert.ok(text.includes(want), want);
    // "Ajouter mon e-mail" for an existing arbiter + language
    assert.equal((await handleArbitrage(req("/arbitrage/email", "POST", { email: "bad" }, ok.token), on, deps)).status, 400);
    assert.equal((await handleArbitrage(req("/arbitrage/email", "POST", { email: "New@Opc.Test", lang: "en" }, ok.token), on, deps)).status, 200);
    const c3 = await (await handleArbitrage(req("/arbitrage/admin/sim-cases", "POST", { title: "t3", scenario: "s", choices: ["x", "y"] }, S), on, deps)).json();
    await handleArbitrage(req("/arbitrage/sim-cases/answer", "POST", { caseId: c3.caseId, choiceId: "a" }, ok.token), on, deps);
    assert.deepEqual(mails[1].body.to, ["new@opc.test"]);
    assert.ok(String(mails[1].body.subject).includes("Copy of your arbitration decision"));
    // never exposed to owner listings
    const dump = JSON.stringify(await (await handleArbitrage(req("/arbitrage/admin/sim-results", "GET", undefined, S), on, deps)).json());
    assert.ok(!dump.includes("opc.test"));
    // purge of ID data keeps the contact email
    await store.purgeExpired(Number.MAX_SAFE_INTEGER);
    assert.ok(store.arbiters.get(ok.arbiterId)!.email_enc);
  });

  it("red flag: 3 contradicted suggestions block real cases; owner clears; data kept", async () => {
    const env = await makeEnv();
    const store = memStore();
    let t = 1_000;
    const deps = { store, now: () => (t += 1000) };
    const S = env.ARBITER_ADMIN_SECRET;
    const a = await (await handleArbitrage(req("/arbitrage/apply", "POST", application), env, deps)).json();
    await handleArbitrage(req("/arbitrage/admin/review", "POST", { arbiterId: a.arbiterId, approve: true }, S), env, deps);
    const mk = async () => (await (await handleArbitrage(req("/arbitrage/admin/sim-cases", "POST", { title: "t", scenario: "s", choices: ["x", "y"], suggestion: { letter: "A", text: "Je suggère A.", reasoning: "M-5.3." } }, S), env, deps)).json()).caseId;
    const answer = async (id: string, choiceId: string) => (await (await handleArbitrage(req("/arbitrage/sim-cases/answer", "POST", { caseId: id, choiceId }, a.token), env, deps)).json());
    assert.equal((await answer(await mk(), "a")).red, false); // followed
    assert.equal((await answer(await mk(), "b")).red, false); // 1
    assert.equal((await answer(await mk(), "b")).red, false); // 2
    assert.equal((await handleArbitrage(req("/arbitrage/cases", "GET", undefined, a.token), env, deps)).status, 200);
    assert.equal((await answer(await mk(), "b")).red, true); // 3 → red
    const me = await (await handleArbitrage(req("/arbitrage/me", "GET", undefined, a.token), env, deps)).json();
    assert.equal(me.red, true);
    assert.equal(me.contradictions, 3);
    assert.equal(me.status, "verified");
    assert.equal((await handleArbitrage(req("/arbitrage/cases", "GET", undefined, a.token), env, deps)).status, 403);
    assert.equal((await handleArbitrage(req("/arbitrage/cases/decide", "POST", { caseId: "x", accept: true }, a.token), env, deps)).status, 403);
    // simulations still allowed
    assert.equal((await handleArbitrage(req("/arbitrage/sim-cases", "GET", undefined, a.token), env, deps)).status, 200);
    const list = await (await handleArbitrage(req("/arbitrage/admin/arbiters", "GET", undefined, S), env, deps)).json();
    assert.deepEqual(list.arbiters.map((x: { arbiterId: string; red: boolean }) => [x.arbiterId, x.red]), [[a.arbiterId, true]]);
    assert.ok(!JSON.stringify(list).includes("Politzer"));
    // owner clears → unblocked, counter restarts, all answers kept
    assert.equal((await handleArbitrage(req("/arbitrage/admin/red-clear", "POST", { arbiterId: a.arbiterId }, a.token), env, deps)).status, 401);
    await handleArbitrage(req("/arbitrage/admin/red-clear", "POST", { arbiterId: a.arbiterId }, S), env, deps);
    const me2 = await (await handleArbitrage(req("/arbitrage/me", "GET", undefined, a.token), env, deps)).json();
    assert.equal(me2.red, false);
    assert.equal(me2.contradictions, 0);
    assert.equal((await handleArbitrage(req("/arbitrage/cases", "GET", undefined, a.token), env, deps)).status, 200);
    assert.equal(store.simAns.length, 4);
  });

  it("rescan: admin requests it, candidate redoes only the face scan, back to pending", async () => {
    const env = await makeEnv();
    const store = memStore();
    const deps = { store };
    const S = env.ARBITER_ADMIN_SECRET;
    const a = await (await handleArbitrage(req("/arbitrage/apply", "POST", { ...application, face: { score: null, liveness: false, method: "unavailable" } }), env, deps)).json();
    const before = { ...store.arbiters.get(a.arbiterId)! };
    // not requested yet
    assert.equal((await handleArbitrage(req("/arbitrage/rescan/photo", "GET", undefined, a.token), env, deps)).status, 409);
    // only admin can request
    assert.equal((await handleArbitrage(req("/arbitrage/admin/review", "POST", { arbiterId: a.arbiterId, action: "rescan" }, a.token), env, deps)).status, 401);
    const r = await (await handleArbitrage(req("/arbitrage/admin/review", "POST", { arbiterId: a.arbiterId, action: "rescan" }, S), env, deps)).json();
    assert.equal(r.status, "rescan_requested");
    assert.equal((await (await handleArbitrage(req("/arbitrage/me", "GET", undefined, a.token), env, deps)).json()).status, "rescan_requested");
    // not verified: no cases
    assert.equal((await handleArbitrage(req("/arbitrage/cases", "GET", undefined, a.token), env, deps)).status, 403);
    const photo = await (await handleArbitrage(req("/arbitrage/rescan/photo", "GET", undefined, a.token), env, deps)).json();
    assert.equal(photo.base64, application.idPhotoBase64);
    assert.equal(photo.mime, "image/png");
    const done = await (await handleArbitrage(req("/arbitrage/rescan", "POST", { face: { score: 0.81, liveness: true, method: "human-3.3/faceres+yaw-liveness" } }, a.token), env, deps)).json();
    assert.equal(done.status, "pending");
    assert.equal(done.faceVerdict, "likely_match");
    const after = store.arbiters.get(a.arbiterId)!;
    assert.equal(after.status, "pending");
    assert.equal(after.face_score, 0.81);
    assert.equal(after.face_liveness, 1);
    assert.equal(after.identity_enc, before.identity_enc, "identity unchanged");
    assert.equal(after.photo_enc, before.photo_enc, "photo unchanged");
    assert.notEqual(after.identity_hash, before.identity_hash, "hash covers the new face result");
    assert.equal(store.arbiters.size, 1, "same application, no new row");
    // one-shot: a second rescan needs a new admin request
    assert.equal((await handleArbitrage(req("/arbitrage/rescan", "POST", { face: { score: 0.9, liveness: true } }, a.token), env, deps)).status, 409);
    // verified/rejected arbiters cannot be sent to rescan
    await handleArbitrage(req("/arbitrage/admin/review", "POST", { arbiterId: a.arbiterId, approve: true }, S), env, deps);
    assert.equal((await handleArbitrage(req("/arbitrage/admin/review", "POST", { arbiterId: a.arbiterId, action: "rescan" }, S), env, deps)).status, 409);
  });

  it("simulation: static Indiana suggestion (guarded), letters A–D, followed/contradicted in results", async () => {
    const env = await makeEnv();
    let aiCalls = 0;
    env.AI = { run: async () => { aiCalls++; return { response: "{}" }; } };
    const store = memStore();
    const deps = { store };
    const S = env.ARBITER_ADMIN_SECRET;
    const base = { title: "Rapport", scenario: "Un agent a livré un rapport.", choices: ["Un", "Deux", "Trois", "Quatre"] };
    const bad = async (suggestion: unknown) => (await (await handleArbitrage(req("/arbitrage/admin/sim-cases", "POST", { ...base, suggestion }, S), env, deps)).json()).error;
    assert.equal(await bad({ letter: "E", text: "x", reasoning: "y" }), "invalid_suggestion");
    assert.equal(await bad({ letter: "B", text: "x" }), "invalid_suggestion");
    assert.equal(await bad({ letter: "B", text: "Comme un tribunal", reasoning: "y" }), "forbidden_word");
    assert.equal(await bad({ letter: "B", text: "x", reasoning: "L'arbitre touche 25 $" }), "pay_figure_not_allowed");
    const c = await (await handleArbitrage(req("/arbitrage/admin/sim-cases", "POST", {
      ...base, suggestion: { letter: "b", text: "Je suggère B.", reasoning: "M-5.3 charge ; M-5.5 norme ; M-4.4 ambiguïté." },
    }, S), env, deps)).json();
    assert.equal(c.ok, true);
    const toks: string[] = [];
    for (let i = 0; i < 3; i++) {
      const a = await (await handleArbitrage(req("/arbitrage/apply", "POST", { ...application, docNumber: `CD12345${i}` }), env, deps)).json();
      await handleArbitrage(req("/arbitrage/admin/review", "POST", { arbiterId: a.arbiterId, approve: true }, S), env, deps);
      toks.push(a.token);
    }
    const list = await (await handleArbitrage(req("/arbitrage/sim-cases", "GET", undefined, toks[0]), env, deps)).json();
    assert.deepEqual(list.cases[0].choices.map((x: { letter: string }) => x.letter), ["A", "B", "C", "D"]);
    assert.equal(list.cases[0].suggestion.letter, "B");
    assert.equal(list.cases[0].suggestion.author, "Indiana");
    const r0 = await (await handleArbitrage(req("/arbitrage/sim-cases/answer", "POST", { caseId: c.caseId, choiceId: "b" }, toks[0]), env, deps)).json();
    assert.equal(r0.letter, "B");
    assert.equal(r0.followedSuggestion, true);
    await handleArbitrage(req("/arbitrage/sim-cases/answer", "POST", { caseId: c.caseId, choiceId: "b" }, toks[1]), env, deps);
    const r2 = await (await handleArbitrage(req("/arbitrage/sim-cases/answer", "POST", { caseId: c.caseId, choiceId: "d" }, toks[2]), env, deps)).json();
    assert.equal(r2.followedSuggestion, false);
    const res = await (await handleArbitrage(req("/arbitrage/admin/sim-results", "GET", undefined, S), env, deps)).json();
    const rc = res.cases.find((x: { caseId: string }) => x.caseId === c.caseId);
    assert.deepEqual(rc.tally, { A: 0, B: 2, C: 0, D: 1 });
    assert.equal(rc.followedSuggestion, 2);
    assert.equal(rc.contradictedSuggestion, 1);
    assert.deepEqual(rc.answers.map((a: { letter: string; followedSuggestion: boolean }) => [a.letter, a.followedSuggestion]), [["B", true], ["B", true], ["D", false]]);
    assert.equal(aiCalls, 0);
  });

  it("simulation: older cases without stored letters get A–D by position", async () => {
    const env = await makeEnv();
    const store = memStore();
    store.cases.set("sim_old", { id: "sim_old", status: "open", case_json: JSON.stringify({ title: "SIMULATION — x", scenario: "y" }), suggestion_json: null,
      decision_json: null, arbiter_id: null, created_at: 0, decided_at: null, simulation: 1, choices_json: JSON.stringify([{ id: "a", label: "1" }, { id: "b", label: "2" }, { id: "c", label: "3" }]) });
    const res = await (await handleArbitrage(req("/arbitrage/admin/sim-results", "GET", undefined, env.ARBITER_ADMIN_SECRET), env, { store })).json();
    assert.deepEqual(res.cases[0].choices.map((c: { letter: string }) => c.letter), ["A", "B", "C"]);
    assert.equal(res.cases[0].suggestion, null);
  });
  it("checklist: each item done/missing for the arbiter; manual-read stored; rejected → 403", async () => {
    const env = await makeEnv();
    const store = memStore();
    const deps = { store, now: () => 5_000 };
    const S = env.ARBITER_ADMIN_SECRET;
    const a = await (await handleArbitrage(req("/arbitrage/apply", "POST", application), env, deps)).json();
    const get = async () => (await (await handleArbitrage(req("/arbitrage/checklist", "GET", undefined, a.token), env, deps)).json());
    const doneOf = (c: { items: { id: string; done: boolean }[] }) => Object.fromEntries(c.items.map((x) => [x.id, x.done]));
    // pending arbiter (email given at signup, live face scan) already sees the checklist
    let c = await get();
    assert.equal(c.status, "pending");
    assert.deepEqual(doneOf(c), { email: true, notifications: false, wallet: false, face: true, test_case: false, manual: false });
    assert.equal(c.doneCount, 2);
    assert.equal(c.total, 6);
    await handleArbitrage(req("/arbitrage/admin/review", "POST", { arbiterId: a.arbiterId, approve: true }, S), env, deps);
    // wallet reported on chain_id 1 (phone wallet) → already done: no network switch required (22/10)
    await handleArbitrage(req("/arbitrage/wallet", "POST", { address: "0x" + "1".repeat(40), chainId: 1 }, a.token), env, deps);
    c = await get();
    assert.equal(c.items.find((x: { id: string }) => x.id === "wallet").state, "done");
    assert.equal(c.items.find((x: { id: string }) => x.id === "wallet").done, true);
    await handleArbitrage(req("/arbitrage/wallet", "POST", { address: "0x" + "1".repeat(40), chainId: 84532 }, a.token), env, deps);
    await store.addPushSub({ endpoint: "https://fcm.googleapis.com/x", arbiter_id: a.arbiterId, created_at: 1 });
    const sim = await (await handleArbitrage(req("/arbitrage/admin/sim-cases", "POST", { title: "t", scenario: "s", choices: ["x", "y"] }, S), env, deps)).json();
    await handleArbitrage(req("/arbitrage/sim-cases/answer", "POST", { caseId: sim.caseId, choiceId: "a" }, a.token), env, deps);
    const m = await (await handleArbitrage(req("/arbitrage/manual-read", "POST", {}, a.token), env, deps)).json();
    assert.equal(m.complete, true);
    assert.equal(store.arbiters.get(a.arbiterId)!.manual_read_at, 5_000);
    c = await get();
    assert.deepEqual(doneOf(c), { email: true, notifications: true, wallet: true, face: true, test_case: true, manual: true });
    // rescan requested → face missing again
    await store.updateArbiter(a.arbiterId, { status: "rescan_requested" });
    assert.equal(doneOf(await get()).face, false);
    // no identity data in the checklist
    assert.ok(!JSON.stringify(c).includes("Politzer") && !JSON.stringify(c).includes("opc.test"));
    // rejected and unauthenticated
    await store.updateArbiter(a.arbiterId, { status: "rejected" });
    assert.equal((await handleArbitrage(req("/arbitrage/checklist", "GET", undefined, a.token), env, deps)).status, 403);
    assert.equal((await handleArbitrage(req("/arbitrage/checklist", "GET"), env, deps)).status, 401);
  });
  it("training explanation: followed → why it was right, contradicted → gentle reasoning; Manuel excerpt; stored per case; in the email copy; no authority words or figures", async () => {
    const env = { ...(await makeEnv()), ARBITER_DECISION_EMAILS: "on", RESEND_API_KEY: "re_test" };
    const store = memStore();
    const mails: Record<string, unknown>[] = [];
    // Stubbed Resend: nothing leaves the test.
    const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
      if (String(url).includes("resend")) mails.push(JSON.parse(String(init?.body)));
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    let t = 10_000;
    const deps = { store, fetchImpl, now: () => (t += 1000) };
    const S = env.ARBITER_ADMIN_SECRET;
    const a = await (await handleArbitrage(req("/arbitrage/apply", "POST", application), env, deps)).json();
    await handleArbitrage(req("/arbitrage/admin/review", "POST", { arbiterId: a.arbiterId, approve: true }, S), env, deps);
    const mk = async () => (await (await handleArbitrage(req("/arbitrage/admin/sim-cases", "POST", {
      title: "Fichier non livré", scenario: "A dit que B n'a pas livré.", choices: ["Rembourser A", "Donner raison à B"],
      suggestion: { letter: "B", text: "Je suggère B.", reasoning: "M-5.3 : B montre le reçu signé de livraison." },
    }, S), env, deps)).json()).caseId;
    const banned = /(^|[^\p{L}])(cour|courts?|tribunal|tribunaux|tribunals|juridictions?|magistrats?|judges?|jury|jurés?)(?![\p{L}])/iu;
    const figures = /\d[\d\s.,]*\s*(\$|%|€|usdc|usd|dollars?)/iu;

    // followed
    const c1 = await mk();
    const r1 = await (await handleArbitrage(req("/arbitrage/sim-cases/answer", "POST", { caseId: c1, choiceId: "b" }, a.token), env, deps)).json();
    assert.equal(r1.explanation.followed, true);
    assert.equal(r1.explanation.manualRef, "M-5.3");
    assert.match(r1.explanation.text, /^Bravo ! Tu as choisi B\. Donner raison à B/);
    assert.ok(r1.explanation.text.includes("« Le fournisseur prouve la livraison."));
    const mail1 = String(mails[0].text);
    assert.ok(mail1.includes("Pourquoi — la formation d’Indiana :"), mail1);
    assert.ok(mail1.includes(r1.explanation.text));

    // contradicted
    const c2 = await mk();
    const r2 = await (await handleArbitrage(req("/arbitrage/sim-cases/answer", "POST", { caseId: c2, choiceId: "a" }, a.token), env, deps)).json();
    assert.equal(r2.explanation.followed, false);
    assert.match(r2.explanation.text, /Tu as choisi A\. Rembourser A\. Indiana suggérait B\. Donner raison à B\. Ce n’est pas grave/);
    assert.match(r2.explanation.text, /La prochaine fois, demande-toi/);
    assert.ok(String(mails[1].text).includes(r2.explanation.text));

    // stored per case as evidence; answering again does not overwrite
    assert.equal(store.explanations.length, 2);
    assert.deepEqual(store.explanations.map((e) => [e.case_id, e.followed, e.manual_ref, e.manual_version]), [[c1, 1, "M-5.3", "v2.3.2"], [c2, 0, "M-5.3", "v2.3.2"]]);
    assert.equal((await handleArbitrage(req("/arbitrage/sim-cases/answer", "POST", { caseId: c2, choiceId: "b" }, a.token), env, deps)).status, 409);
    assert.equal(store.explanations.length, 2);
    const mine = await (await handleArbitrage(req("/arbitrage/explanations", "GET", undefined, a.token), env, deps)).json();
    assert.deepEqual(mine.explanations.map((e: { caseId: string }) => e.caseId), [c2, c1]);
    const results = await (await handleArbitrage(req("/arbitrage/admin/sim-results", "GET", undefined, S), env, deps)).json();
    assert.ok(results.cases.every((c: { answers: { explanation: { text: string } | null }[] }) => c.answers.every((x) => x.explanation?.text)));

    // no suggestion → no explanation (nothing invented)
    const c3 = (await (await handleArbitrage(req("/arbitrage/admin/sim-cases", "POST", { title: "t", scenario: "s", choices: ["x", "y"] }, S), env, deps)).json()).caseId;
    const r3 = await (await handleArbitrage(req("/arbitrage/sim-cases/answer", "POST", { caseId: c3, choiceId: "a" }, a.token), env, deps)).json();
    assert.equal(r3.explanation, null);

    // real case: outcome in words only, no percentages
    const rc = await (await handleArbitrage(req("/arbitrage/admin/cases", "POST", {
      claimant: { agentId: "agent-A", webhookUrl: "https://a.test/hook" }, respondent: { agentId: "agent-B", webhookUrl: "https://b.test/hook" },
      amountUsdc: 500, claim: "Service non livré", response: "Livré",
    }, S), env, deps)).json();
    await handleArbitrage(req("/arbitrage/cases", "GET", undefined, a.token), env, deps);
    const d = await (await handleArbitrage(req("/arbitrage/cases/decide", "POST", { caseId: rc.caseId, accept: true }, a.token), env, deps)).json();
    assert.equal(d.explanation.followed, true);
    assert.match(d.explanation.text, /en faveur du plaignant/);

    // the words cour/tribunal/court (and pay figures) never appear in any generated explanation
    for (const text of [r1.explanation.text, r2.explanation.text, d.explanation.text, ...store.explanations.map((e) => e.text)]) {
      assert.doesNotMatch(text, banned, text);
      assert.doesNotMatch(text, figures, text);
    }
  });
});

