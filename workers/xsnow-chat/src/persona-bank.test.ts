import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  handlePersonaBank,
  isPersonaBankPath,
  parseDepositMeta,
  type BankStore,
  type BlobStore,
  type LenderRow,
  type SampleRow,
  type UsageRow,
} from "./persona-bank.ts";
import { TWIN_BANK_CONSENT_VERSION, TWIN_BANK_PRICE_CAD_CENTS, twinBankSplit } from "../../../src/lib/twin-bank.ts";

const NOW = Date.UTC(2026, 10, 12, 15, 0, 0);
const BASE = "https://xsnow-chat.example.workers.dev";

function memStore() {
  const lenders = new Map<string, LenderRow>();
  const samples: SampleRow[] = [];
  const usage: UsageRow[] = [];
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
  };
  return { store, lenders, samples, usage };
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
