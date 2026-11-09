import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  handlePersonaBank,
  isPersonaBankPath,
  parseDepositMeta,
  type BankStore,
  type BlobStore,
  type LenderRow,
  type OutputRow,
  type RefusalRow,
  type ReportRow,
  type SampleRow,
  type SubscriberRow,
  type UsageRow,
} from "./persona-bank.ts";
import { TWIN_BANK_CONSENT_VERSION, TWIN_BANK_PRICE_CAD_CENTS, twinBankSplit } from "../../../src/lib/twin-bank.ts";

const NOW = Date.UTC(2026, 10, 12, 15, 0, 0);
const BASE = "https://xsnow-chat.example.workers.dev";

function memStore() {
  const lenders = new Map<string, LenderRow>();
  const samples: SampleRow[] = [];
  const usage: UsageRow[] = [];
  const subs = new Map<string, SubscriberRow>();
  const outputs: OutputRow[] = [];
  const refusals: RefusalRow[] = [];
  const reports: ReportRow[] = [];
  const store: BankStore = {
    async insertLender(r) { if (lenders.has(r.id)) return false; lenders.set(r.id, { ...r }); return true; },
    async getLender(id) { return lenders.get(id) ?? null; },
    async updateLender(id, p) { const r = lenders.get(id); if (r) Object.assign(r, p); },
    async listLenders(st) { return [...lenders.values()].filter((r) => st.includes(r.status) && r.revoked_at == null); },
    async insertSample(s) { samples.push({ ...s }); },
    async samples(id) { return samples.filter((s) => s.lender_id === id); },
    async markSamplesDeleted(id, at) { for (const s of samples) if (s.lender_id === id && s.deleted_at == null) s.deleted_at = at; },
    async insertUsage(u) {
      if (usage.some((x) => x.subscriber_id === u.subscriber_id && x.lender_id === u.lender_id && x.kind === u.kind && x.month === u.month)) return false;
      usage.push({ ...u }); return true;
    },
    async usageFor(sub, m) { return usage.filter((u) => u.subscriber_id === sub && u.month === m); },
    async usageForLender(id) { return usage.filter((u) => u.lender_id === id); },
    async getSubscriber(id) { return subs.get(id) ?? null; },
    async upsertSubscriber(r) { const e = subs.get(r.subscriber_id); subs.set(r.subscriber_id, e ? { ...e, tier: r.tier, updated_at: r.updated_at } : { ...r }); },
    async setSubscriberSuspended(id, at) { const r = subs.get(id); if (r) r.suspended_at = at; },
    async insertOutput(o) { outputs.push({ ...o }); },
    async getOutput(id) { return outputs.find((o) => o.id === id) ?? null; },
    async outputsForLender(id) { return outputs.filter((o) => o.lender_id === id); },
    async insertRefusal(r) { refusals.push({ ...r }); },
    async openRefusals(sub) { return refusals.filter((r) => r.subscriber_id === sub && r.reviewed_at == null).length; },
    async subscribersNeedingReview(t) {
      const n = new Map<string, number>();
      for (const r of refusals) if (r.reviewed_at == null) n.set(r.subscriber_id, (n.get(r.subscriber_id) ?? 0) + 1);
      return [...n].filter(([, c]) => c >= t).map(([subscriber_id, refusals]) => ({ subscriber_id, refusals }));
    },
    async clearRefusals(sub, at) { for (const r of refusals) if (r.subscriber_id === sub && r.reviewed_at == null) r.reviewed_at = at; },
    async insertReport(r) { reports.push({ ...r }); },
    async openReports() { return reports.filter((r) => r.closed_at == null); },
  };
  return { store, lenders, samples, usage, subs, outputs, refusals, reports };
}

function memBlobs() {
  const objects = new Map<string, { data: ArrayBuffer; type?: string }>();
  const blobs: BlobStore = {
    async put(k, v, o) { objects.set(k, { data: v, type: o?.httpMetadata?.contentType }); },
    async get(k) { const o = objects.get(k); return o ? { body: new Blob([o.data]).stream(), httpMetadata: { contentType: o.type } } : null; },
    async delete(keys) { for (const k of Array.isArray(keys) ? keys : [keys]) objects.delete(k); },
  };
  return { blobs, objects };
}

function meta(over: Record<string, unknown> = {}) {
  return {
    id: "persona-mhq1x2-7f4a",
    pseudonym: "Joase",
    country: "Haïti",
    offer: { voice: true, image: true },
    consent: { version: TWIN_BANK_CONSENT_VERSION, acceptedAt: NOW - 1000, terms: true, adult: true, noIncomeGuarantee: true, selfOnly: true },
    livenessCode: "482913",
    ...over,
  };
}

function depositRequest(m: unknown, files: Record<string, [string, string]> = {
  voice: ["audio/webm", "voix"], image: ["image/jpeg", "photo"], video: ["video/mp4", "video"], selfie: ["video/webm", "selfie"],
}) {
  const form = new FormData();
  form.set("meta", JSON.stringify(m));
  for (const [k, [type, body]] of Object.entries(files)) form.set(k, new File([body], `${k}.bin`, { type }));
  return new Request(`${BASE}/persona-deposits`, { method: "POST", body: form });
}

function deps(over: Record<string, unknown> = {}) {
  const s = memStore();
  const b = memBlobs();
  return { s, b, d: { store: s.store, blobs: b.blobs, now: () => NOW, adminSecret: "admin-test", signingKey: "sign-test", testMode: "on", ...over } };
}

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`${BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });

describe("banque jumeau — routes", () => {
  it("recognises the bank paths only", () => {
    assert.ok(isPersonaBankPath("/persona-deposits"));
    assert.ok(isPersonaBankPath("/persona-deposits/withdraw"));
    assert.ok(isPersonaBankPath("/twin-bank"));
    assert.ok(isPersonaBankPath("/twin-bank/use"));
    assert.ok(!isPersonaBankPath("/ideas"));
  });

  it("answers 503 storage_not_configured without R2 or D1 (nothing pretends to be stored)", async () => {
    const res = await handlePersonaBank(depositRequest(meta()), { store: null, blobs: null });
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, "storage_not_configured");
  });
});

describe("banque jumeau — consentement obligatoire au dépôt", () => {
  it("refuses under 18, missing boxes, an old text version, no offer, bad liveness code", () => {
    const c = meta().consent;
    assert.deepEqual(parseDepositMeta(meta({ consent: { ...c, adult: false } })), { ok: false, issue: "not_adult" });
    assert.deepEqual(parseDepositMeta(meta({ consent: { ...c, terms: false } })), { ok: false, issue: "consent_missing" });
    assert.deepEqual(parseDepositMeta(meta({ consent: { ...c, selfOnly: false } })), { ok: false, issue: "consent_missing" });
    assert.deepEqual(parseDepositMeta(meta({ consent: { ...c, noIncomeGuarantee: false } })), { ok: false, issue: "consent_missing" });
    assert.deepEqual(parseDepositMeta(meta({ consent: { ...c, version: "provisoire-2026-11-07-r2" } })), { ok: false, issue: "consent_version" });
    assert.deepEqual(parseDepositMeta(meta({ offer: { voice: false, image: false } })), { ok: false, issue: "no_offer" });
    assert.deepEqual(parseDepositMeta(meta({ livenessCode: "12ab" })), { ok: false, issue: "bad_liveness_code" });
    assert.deepEqual(parseDepositMeta(meta({ pseudonym: "<" })), { ok: false, issue: "bad_pseudonym" });
    assert.equal(parseDepositMeta(meta()).ok, true);
  });

  it("an under-18 deposit is rejected and nothing is written to R2", async () => {
    const { d, b, s } = deps();
    const res = await handlePersonaBank(depositRequest(meta({ consent: { ...meta().consent, adult: false } })), d);
    assert.equal(res.status, 400);
    assert.equal(b.objects.size, 0);
    assert.equal(s.lenders.size, 0);
  });

  it("requires the selfie video (code said aloud) and the media of the chosen offer", async () => {
    const { d } = deps();
    const res = await handlePersonaBank(depositRequest(meta({ offer: { voice: true, image: false } }), { voice: ["audio/webm", "v"] }), d);
    assert.equal(res.status, 400);
    assert.equal((await res.json()).asset, "selfie");
    const wrong = await handlePersonaBank(depositRequest(meta({ offer: { voice: true, image: false } }), { voice: ["text/html", "v"], selfie: ["video/webm", "s"] }), deps().d);
    assert.equal(wrong.status, 415);
  });

  it("voice-only deposit stores voice + selfie, pending review, returns a withdraw token (hash only kept)", async () => {
    const { d, b, s } = deps();
    const res = await handlePersonaBank(depositRequest(meta({ offer: { voice: true, image: false } }), { voice: ["audio/webm", "v"], selfie: ["video/webm", "s"] }), d);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.accepted, true);
    assert.equal(body.status, "pending_review");
    assert.match(body.withdrawToken, /^[A-Za-z0-9_-]{40,}$/);
    assert.deepEqual([...b.objects.keys()].sort(), ["persona/persona-mhq1x2-7f4a/selfie", "persona/persona-mhq1x2-7f4a/voice"]);
    const row = s.lenders.get("persona-mhq1x2-7f4a")!;
    assert.notEqual(row.withdraw_hash, body.withdrawToken);
    assert.equal(row.consent_version, TWIN_BANK_CONSENT_VERSION);
  });

  it("refuses a duplicate dossier id", async () => {
    const { d } = deps();
    assert.equal((await handlePersonaBank(depositRequest(meta()), d)).status, 200);
    assert.equal((await handlePersonaBank(depositRequest(meta()), d)).status, 409);
  });
});

async function seeded(over: Record<string, unknown> = {}) {
  const x = deps(over);
  const res = await handlePersonaBank(depositRequest(meta()), x.d);
  const { withdrawToken } = await res.json();
  return { ...x, token: withdrawToken as string };
}

describe("banque jumeau — retrait et suppression réelle", () => {
  it("withdraw deletes every media object at once and hides the item from the twin bank", async () => {
    const { d, b, token } = await seeded();
    assert.equal(b.objects.size, 4);
    const bad = await handlePersonaBank(post("/persona-deposits/withdraw", { id: "persona-mhq1x2-7f4a", token: "wrong" }), d);
    assert.equal(bad.status, 404);
    assert.equal(b.objects.size, 4);
    const res = await handlePersonaBank(post("/persona-deposits/withdraw", { id: "persona-mhq1x2-7f4a", token }), d);
    const body = await res.json();
    assert.equal(body.status, "revoked");
    assert.equal(body.deleted, 4);
    assert.equal(b.objects.size, 0);
    const list = await (await handlePersonaBank(new Request(`${BASE}/twin-bank`), d)).json();
    assert.equal(list.items.length, 0);
    const use = await handlePersonaBank(post("/twin-bank/use", { subscriberId: "sub-abcdefgh12", itemId: "persona-mhq1x2-7f4a", kind: "voice", acceptCost: true, acceptRules: true }), d);
    assert.equal(use.status, 404);
  });

  it("status needs the withdraw token", async () => {
    const { d, token } = await seeded();
    assert.equal((await handlePersonaBank(new Request(`${BASE}/persona-deposits/status?id=persona-mhq1x2-7f4a&token=nope`), d)).status, 404);
    const ok = await (await handlePersonaBank(new Request(`${BASE}/persona-deposits/status?id=persona-mhq1x2-7f4a&token=${token}`), d)).json();
    assert.equal(ok.status, "pending_review");
  });
});

describe("banque jumeau — côté jumeau (mode test)", () => {
  it("lists only consented items; pending ones only in test mode, flagged unverified; never a media URL", async () => {
    const { d } = await seeded();
    const list = await (await handlePersonaBank(new Request(`${BASE}/twin-bank`), d)).json();
    assert.equal(list.items.length, 1);
    assert.deepEqual(list.items[0].kinds, ["voice", "image"]);
    assert.equal(list.items[0].verified, false);
    assert.equal(list.pricing.liveBilling, false);
    assert.ok(!JSON.stringify(list).includes("persona/"));
    assert.ok(!JSON.stringify(list).includes("482913"), "liveness code never leaves the review queue");
    const strict = await (await handlePersonaBank(new Request(`${BASE}/twin-bank`), { ...d, testMode: "off" })).json();
    assert.equal(strict.items.length, 0);
  });

  it("team approval (admin secret) makes an item verified", async () => {
    const { d } = await seeded();
    assert.equal((await handlePersonaBank(post("/persona-bank/review", { id: "persona-mhq1x2-7f4a", decision: "approve" }), d)).status, 401);
    const q = await (await handlePersonaBank(new Request(`${BASE}/persona-bank/review`, { headers: { Authorization: "Bearer admin-test" } }), d)).json();
    assert.equal(q.pending[0].livenessCode, "482913");
    await handlePersonaBank(post("/persona-bank/review", { id: "persona-mhq1x2-7f4a", decision: "approve" }, { Authorization: "Bearer admin-test" }), d);
    const strict = await (await handlePersonaBank(new Request(`${BASE}/twin-bank`), { ...d, testMode: "off" })).json();
    assert.equal(strict.items[0].verified, true);
  });

  it("a use requires the cost notice + rules, is recorded once per month, never charged", async () => {
    const { d, s } = await seeded();
    const base = { subscriberId: "sub-abcdefgh12", itemId: "persona-mhq1x2-7f4a", kind: "voice" };
    assert.equal((await handlePersonaBank(post("/twin-bank/use", { ...base, acceptCost: false, acceptRules: true }), d)).status, 400);
    const first = await (await handlePersonaBank(post("/twin-bank/use", { ...base, acceptCost: true, acceptRules: true }), d)).json();
    assert.equal(first.testMode, true);
    assert.equal(first.charged, false);
    assert.equal(first.monthTotalCadCents, TWIN_BANK_PRICE_CAD_CENTS);
    assert.equal(first.month, "2026-11");
    assert.match(first.media.voice, /^\/twin-bank\/media\?/);
    const again = await (await handlePersonaBank(post("/twin-bank/use", { ...base, acceptCost: true, acceptRules: true }), d)).json();
    assert.equal(again.alreadyCountedThisMonth, true);
    assert.equal(again.monthTotalCadCents, TWIN_BANK_PRICE_CAD_CENTS);
    await handlePersonaBank(post("/twin-bank/use", { ...base, kind: "image", acceptCost: true, acceptRules: true }), d);
    const usage = await (await handlePersonaBank(new Request(`${BASE}/twin-bank/usage?subscriberId=sub-abcdefgh12`), d)).json();
    assert.equal(usage.totalCadCents, 2 * TWIN_BANK_PRICE_CAD_CENTS);
    assert.ok(s.usage.every((u) => u.test_mode === 1));
    const split = twinBankSplit(TWIN_BANK_PRICE_CAD_CENTS);
    assert.equal(s.usage[0].lender_cents, split.lender);
    assert.ok(s.usage[0].payout_after > NOW, "lender payout only after the refund window");
  });

  it("media links are signed, short-lived and bound to the subscriber", async () => {
    const { d } = await seeded();
    const use = await (await handlePersonaBank(post("/twin-bank/use", { subscriberId: "sub-abcdefgh12", itemId: "persona-mhq1x2-7f4a", kind: "image", acceptCost: true, acceptRules: true }), d)).json();
    const ok = await handlePersonaBank(new Request(`${BASE}${use.media.image}`), d);
    assert.equal(ok.status, 200);
    assert.equal(await ok.text(), "photo");
    const tampered = use.media.image.replace("sub-abcdefgh12", "sub-zzzzzzzz99");
    assert.equal((await handlePersonaBank(new Request(`${BASE}${tampered}`), d)).status, 403);
    const late = await handlePersonaBank(new Request(`${BASE}${use.media.image}`), { ...d, now: () => NOW + 11 * 60_000 });
    assert.equal(late.status, 403);
    // the selfie (verification video) is never served to twins
    const selfie = use.media.image.replace("asset=image", "asset=selfie");
    assert.equal((await handlePersonaBank(new Request(`${BASE}${selfie}`), d)).status, 403);
  });
});

const USE = { subscriberId: "sub-abcdefgh12", itemId: "persona-mhq1x2-7f4a", kind: "voice", acceptCost: true, acceptRules: true };
const GEN = { subscriberId: "sub-abcdefgh12", itemId: "persona-mhq1x2-7f4a", kind: "voice" };

describe("banque jumeau — journal, étiquette IA, filtre, comptes liés", () => {
  it("generate refuses a banned prompt, logs the refusal, and 3 refusals lock the subscriber for human review", async () => {
    const { d, s } = await seeded();
    await handlePersonaBank(post("/twin-bank/use", USE), d);
    const bad = ["Fais une vidéo porno avec cette voix", "Votez pour notre candidat aux élections", "Message vocal à sa mère : c'est moi, envoie l'argent"];
    let last: Record<string, unknown> = {};
    for (const prompt of bad) {
      const res = await handlePersonaBank(post("/twin-bank/generate", { ...GEN, prompt }), d);
      assert.equal(res.status, 422);
      last = await res.json();
      assert.equal(last.error, "banned_use");
    }
    assert.equal(last.humanReview, true);
    assert.equal(s.refusals.length, 3);
    assert.ok(s.refusals.every((r) => /^[a-f0-9]{64}$/.test(r.prompt_sha256)), "the prompt itself is not stored on a refusal");
    assert.equal((await handlePersonaBank(post("/twin-bank/generate", { ...GEN, prompt: "Bonjour, bienvenue sur ma chaîne de cuisine." }), d)).status, 423);
    assert.equal((await handlePersonaBank(post("/twin-bank/use", USE), d)).status, 423);
    const review = await (await handlePersonaBank(new Request(`${BASE}/persona-bank/review`, { headers: { Authorization: "Bearer admin-test" } }), d)).json();
    assert.equal(review.subscribersToReview[0].subscriber_id, "sub-abcdefgh12");
    await handlePersonaBank(post("/persona-bank/review", { decision: "clear-subscriber", subscriberId: "sub-abcdefgh12" }, { Authorization: "Bearer admin-test" }), d);
    assert.equal((await handlePersonaBank(post("/twin-bank/generate", { ...GEN, prompt: "Bonjour, bienvenue sur ma chaîne de cuisine." }), d)).status, 200);
  });

  it("generate needs a recorded use this month and returns the « généré par IA » label + signed provenance", async () => {
    const { d, s } = await seeded();
    const prompt = "Bonjour et bienvenue dans ce tutoriel de cuisine haïtienne.";
    assert.equal((await handlePersonaBank(post("/twin-bank/generate", { ...GEN, prompt }), d)).status, 402);
    await handlePersonaBank(post("/twin-bank/use", USE), d);
    const res = await handlePersonaBank(post("/twin-bank/generate", { ...GEN, prompt, outputSha256: "a".repeat(64), publishedUrl: "https://youtube.com/watch?v=x" }), d);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.aiGenerated, true);
    assert.match(body.label.visible.fr, /généré par IA/);
    assert.match(body.label.visible.en, /AI-generated/);
    assert.match(body.label.visible.es, /generado por IA/);
    assert.match(body.label.audibleIntro.fr, /intelligence artificielle/);
    assert.equal(body.youtube.syntheticContent, true);
    const actions = body.provenance.assertions.find((a: { label: string }) => a.label === "c2pa.actions");
    assert.match(actions.data.actions[0].digitalSourceType, /trainedAlgorithmicMedia$/);
    const lic = body.provenance.assertions.find((a: { label: string }) => a.label === "opc.twin.license");
    assert.match(lic.data.lender, /^pr-[a-f0-9]{12}$/);
    assert.equal(s.outputs.length, 1);
    assert.equal(s.outputs[0].prompt_summary, prompt);
    const check = await (await handlePersonaBank(new Request(`${BASE}${body.verifyUrl}`), d)).json();
    assert.equal(check.signatureValid, true);
    assert.equal(check.aiGenerated, true);
    assert.equal(check.lenderWithdrawn, false);
  });

  it("the lender usage log shows who (pseudonymised) used the voice/image and when — token required", async () => {
    const { d, token } = await seeded();
    await handlePersonaBank(post("/twin-bank/use", USE), d);
    await handlePersonaBank(post("/twin-bank/generate", { ...GEN, prompt: "Présente la météo de demain à Port-au-Prince." }), d);
    assert.equal((await handlePersonaBank(new Request(`${BASE}/persona-deposits/usage?id=persona-mhq1x2-7f4a&token=nope`), d)).status, 404);
    const log = await (await handlePersonaBank(new Request(`${BASE}/persona-deposits/usage?id=persona-mhq1x2-7f4a&token=${token}`), d)).json();
    assert.equal(log.paid, false);
    assert.equal(log.totals.uses, 1);
    assert.equal(log.totals.outputs, 1);
    assert.equal(log.uses[0].at, NOW);
    assert.match(log.uses[0].subscriber, /^abonne-[a-f0-9]{6}$/);
    assert.ok(!JSON.stringify(log).includes("sub-abcdefgh12"), "the subscriber id is never shown to the lender");
    assert.match(log.outputs[0].summary, /météo/);
    assert.equal(log.totals.lenderCentsAccrued, twinBankSplit(TWIN_BANK_PRICE_CAD_CENTS).lender);
  });

  it("links a real twin account (app secret), paid tiers only, and a linked id is unusable from a browser", async () => {
    const { d } = await seeded();
    const app = { Authorization: "Bearer twin-app-test" };
    const dd = { ...d, twinAppSecret: "twin-app-test" };
    assert.equal((await handlePersonaBank(post("/twin-bank/subscribers", { twinAccountId: "acct-42", tier: "pro" }), dd)).status, 401);
    assert.equal((await handlePersonaBank(post("/twin-bank/subscribers", { twinAccountId: "acct-42", tier: "pro" }), d)).status, 503);
    const free = await (await handlePersonaBank(post("/twin-bank/subscribers", { twinAccountId: "acct-7", tier: "decouverte" }, app), dd)).json();
    assert.equal(free.bankAccess, false);
    assert.equal((await handlePersonaBank(post("/twin-bank/use", { ...USE, subscriberId: free.subscriberId }, app), dd)).status, 402);
    const pro = await (await handlePersonaBank(post("/twin-bank/subscribers", { twinAccountId: "acct-42", tier: "pro" }, app), dd)).json();
    assert.match(pro.subscriberId, /^sub-[a-f0-9]{32}$/);
    const again = await (await handlePersonaBank(post("/twin-bank/subscribers", { twinAccountId: "acct-42", tier: "createur" }, app), dd)).json();
    assert.equal(again.subscriberId, pro.subscriberId, "stable id per account");
    const use = await (await handlePersonaBank(post("/twin-bank/use", { ...USE, subscriberId: pro.subscriberId }, app), dd)).json();
    assert.equal(use.linked, true);
    assert.equal(use.charged, false);
    assert.equal((await handlePersonaBank(post("/twin-bank/use", { ...USE, subscriberId: pro.subscriberId }), dd)).status, 401);
    // test mode off: unlinked browser ids are refused, linked app calls still work
    const live = { ...dd, testMode: "off" };
    assert.equal((await handlePersonaBank(post("/twin-bank/use", USE), live)).status, 401);
  });

  it("« Signaler un abus » records the report and suspends the output's subscriber pending review", async () => {
    const { d, s } = await seeded();
    await handlePersonaBank(post("/twin-bank/use", USE), d);
    const out = await (await handlePersonaBank(post("/twin-bank/generate", { ...GEN, prompt: "Lis cette recette de soupe joumou." }), d)).json();
    assert.equal((await handlePersonaBank(post("/twin-bank/report", { outputId: out.outputId }), d)).status, 400);
    const rep = await handlePersonaBank(post("/twin-bank/report", { outputId: out.outputId, reason: "On m'imite sans mon accord" }), d);
    assert.equal(rep.status, 202);
    assert.equal(s.reports.length, 1);
    assert.equal(s.reports[0].lender_id, "persona-mhq1x2-7f4a");
    assert.equal((await handlePersonaBank(post("/twin-bank/use", USE), d)).status, 423);
    const review = await (await handlePersonaBank(new Request(`${BASE}/persona-bank/review`, { headers: { Authorization: "Bearer admin-test" } }), d)).json();
    assert.equal(review.reports.length, 1);
  });

  it("after a withdrawal, past labels still verify and say the lender withdrew; no new output", async () => {
    const { d, token } = await seeded();
    await handlePersonaBank(post("/twin-bank/use", USE), d);
    const out = await (await handlePersonaBank(post("/twin-bank/generate", { ...GEN, prompt: "Présente ma boutique de jus." }), d)).json();
    await handlePersonaBank(post("/persona-deposits/withdraw", { id: "persona-mhq1x2-7f4a", token }), d);
    const check = await (await handlePersonaBank(new Request(`${BASE}/twin-bank/provenance?id=${out.outputId}`), d)).json();
    assert.equal(check.lenderWithdrawn, true);
    assert.equal(check.signatureValid, true);
    assert.equal((await handlePersonaBank(post("/twin-bank/generate", { ...GEN, prompt: "Encore une vidéo." }), d)).status, 404);
  });
});
