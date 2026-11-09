import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cleanPseudonym,
  formatCad,
  newLivenessCode,
  requiredMediaFor,
  twinBankMonth,
  twinBankPayoutAfter,
  twinBankSplit,
  TWIN_BANK_LIVE_BILLING,
  TWIN_BANK_PRICE_CAD_CENTS,
  TWIN_BANK_SPLIT,
} from "./twin-bank.ts";
import { fetchLenderUsageLog, fetchTwinBank, newSubscriberId, recordTwinBankUse, reportTwinAbuse, requestTwinOutputLabel } from "./twin-bank-client.ts";
import { fr } from "./i18n/fr.ts";
import { en } from "./i18n/en.ts";
import { es } from "./i18n/es.ts";

describe("banque jumeau — tarif de base retenu le 09/11 (facturation réelle fermée)", () => {
  it("3 $ CA per borrowed item per month, split 60/30/10, live billing OFF", () => {
    assert.equal(TWIN_BANK_PRICE_CAD_CENTS, 300);
    assert.ok(Math.abs(TWIN_BANK_SPLIT.lender + TWIN_BANK_SPLIT.opc + TWIN_BANK_SPLIT.platform - 1) < 1e-9);
    assert.deepEqual(twinBankSplit(300), { lender: 180, opc: 90, platform: 30, total: 300 });
    const odd = twinBankSplit(301);
    assert.equal(odd.lender + odd.opc + odd.platform, 301);
    assert.equal(TWIN_BANK_LIVE_BILLING, false);
  });

  it("one line per calendar month; lender payout only after the 30-day refund window", () => {
    assert.equal(twinBankMonth(Date.UTC(2026, 10, 12)), "2026-11");
    assert.equal(twinBankPayoutAfter("2026-11"), Date.UTC(2026, 11, 1) + 30 * 86_400_000);
    assert.equal(twinBankPayoutAfter("2026-12"), Date.UTC(2027, 0, 1) + 30 * 86_400_000);
  });

  it("formats CAD in each language", () => {
    assert.equal(formatCad(300, "fr"), "3,00 $ CA");
    assert.equal(formatCad(300, "en"), "CA$3.00");
  });
});

describe("banque jumeau — validation partagée", () => {
  it("cleans pseudonyms and requires the selfie for every offer", () => {
    assert.equal(cleanPseudonym("  Jo<b>ase  "), "Jobase");
    assert.equal(cleanPseudonym("x"), "");
    assert.deepEqual(requiredMediaFor({ voice: true, image: false }), ["voice", "selfie"]);
    assert.deepEqual(requiredMediaFor({ voice: false, image: true }), ["image", "video", "selfie"]);
    assert.match(newLivenessCode(), /^[0-9]{6}$/);
    assert.match(newSubscriberId(), /^sub-[a-z0-9]{16}$/);
  });
});

describe("banque jumeau — client côté jumeau", () => {
  it("lists items, reports not-configured honestly", async () => {
    const ok = (async () => new Response(JSON.stringify({ ok: true, items: [{ id: "persona-a-1", pseudonym: "Joase", country: "Haïti", kinds: ["voice", "bad"], verified: false }], pricing: { perItemPerMonthCadCents: 300 } }), { status: 200 })) as typeof fetch;
    const list = await fetchTwinBank(ok, "https://w.example");
    assert.equal(list.state, "ok");
    if (list.state === "ok") assert.deepEqual(list.items[0].kinds, ["voice"]);
    const nc = (async () => new Response(JSON.stringify({ error: "storage_not_configured" }), { status: 503 })) as typeof fetch;
    assert.equal((await fetchTwinBank(nc)).state, "not-configured");
  });

  it("never records a use without the cost notice and the rules accepted, and refuses any real charge", async () => {
    let called = false;
    const spy = (async () => { called = true; return new Response("{}"); }) as typeof fetch;
    const r = await recordTwinBankUse({ subscriberId: "sub-abcdefgh12", itemId: "persona-a-1", kind: "voice", acceptCost: false, acceptRules: true }, spy);
    assert.equal(r.state, "failed");
    assert.equal(called, false);
    const charged = (async () => new Response(JSON.stringify({ ok: true, charged: true }), { status: 200 })) as typeof fetch;
    assert.equal((await recordTwinBankUse({ subscriberId: "sub-abcdefgh12", itemId: "persona-a-1", kind: "voice", acceptCost: true, acceptRules: true }, charged)).state, "failed");
  });

  it("twin copy shows the cost before use and the test mode, in FR, EN and ES", () => {
    for (const t of [fr.twinBank, en.twinBank, es.twinBank]) {
      assert.match(t.priceNotice, /\{price\}/);
      assert.match(t.testBadge, /test|prueba/i);
      assert.match(t.acceptRules, /IA|AI/);
    }
  });
});

describe("banque jumeau — étiquette IA, signalement et journal côté client", () => {
  const trio = { fr: "Contenu généré par IA", en: "AI-generated content", es: "Contenido generado por IA" };
  it("returns the label only when the server says aiGenerated, and maps refusals / missing use / review lock", async () => {
    const ok = (async () => new Response(JSON.stringify({ ok: true, aiGenerated: true, outputId: "out-0123456789abcdef0123", label: { visible: trio, audibleIntro: trio }, verifyUrl: "/twin-bank/provenance?id=out-0123456789abcdef0123" }), { status: 200 })) as typeof fetch;
    const r = await requestTwinOutputLabel({ subscriberId: "sub-abcdefgh12", itemId: "persona-a-1", kind: "voice", prompt: "Bonjour" }, ok, "https://w.example");
    assert.equal(r.state, "labelled");
    if (r.state === "labelled") assert.equal(r.verifyUrl, "https://w.example/twin-bank/provenance?id=out-0123456789abcdef0123");
    const noAi = (async () => new Response(JSON.stringify({ ok: true, outputId: "out-x", label: { visible: trio, audibleIntro: trio } }), { status: 200 })) as typeof fetch;
    assert.equal((await requestTwinOutputLabel({ subscriberId: "sub-abcdefgh12", itemId: "persona-a-1", kind: "voice", prompt: "x" }, noAi)).state, "failed");
    const refused = (async () => new Response(JSON.stringify({ error: "banned_use", reason: "political", refusals: 3, humanReview: true }), { status: 422 })) as typeof fetch;
    const rr = await requestTwinOutputLabel({ subscriberId: "sub-abcdefgh12", itemId: "persona-a-1", kind: "voice", prompt: "x" }, refused);
    assert.deepEqual(rr, { state: "refused", reason: "political", refusals: 3, humanReview: true });
    const need = (async () => new Response(JSON.stringify({ error: "use_required" }), { status: 402 })) as typeof fetch;
    assert.equal((await requestTwinOutputLabel({ subscriberId: "sub-abcdefgh12", itemId: "persona-a-1", kind: "voice", prompt: "x" }, need)).state, "needs-use");
    const locked = (async () => new Response(JSON.stringify({ error: "human_review_required" }), { status: 423 })) as typeof fetch;
    assert.equal((await requestTwinOutputLabel({ subscriberId: "sub-abcdefgh12", itemId: "persona-a-1", kind: "voice", prompt: "x" }, locked)).state, "locked");
  });

  it("report is accepted only on 202 received", async () => {
    const ok = (async () => new Response(JSON.stringify({ ok: true, received: true }), { status: 202 })) as typeof fetch;
    assert.equal(await reportTwinAbuse({ outputId: "out-1", reason: "abus" }, ok), "received");
    const bad = (async () => new Response(JSON.stringify({ error: "bad_request" }), { status: 400 })) as typeof fetch;
    assert.equal(await reportTwinAbuse({ outputId: "out-1", reason: "" }, bad), "failed");
  });

  it("the lender log needs the withdraw token and is parsed defensively", async () => {
    let called = false;
    const spy = (async () => { called = true; return new Response("{}"); }) as typeof fetch;
    assert.equal(await fetchLenderUsageLog({ id: "persona-a-1", withdrawToken: "" }, spy), null);
    assert.equal(called, false);
    const ok = (async (url: string) => {
      assert.match(String(url), /\/persona-deposits\/usage\?id=persona-a-1&token=tok/);
      return new Response(JSON.stringify({ ok: true, uses: [{ at: 1, month: "2026-11", kind: "image", subscriber: "abonne-1a2b3c", lenderCents: 180 }], outputs: [{ at: 2, kind: "voice", subscriber: "abonne-1a2b3c", summary: "Météo" }], totals: { uses: 1, outputs: 1, lenderCentsAccrued: 180 } }), { status: 200 });
    }) as unknown as typeof fetch;
    const log = await fetchLenderUsageLog({ id: "persona-a-1", withdrawToken: "tok" }, ok, "https://w.example");
    assert.equal(log?.uses[0].kind, "image");
    assert.equal(log?.totals.lenderCentsAccrued, 180);
  });

  it("new copy exists in FR, EN and ES with every banned-use reason", () => {
    for (const lang of [fr, en, es]) {
      assert.match(lang.twinBank.generateRefused, /\{reason\}/);
      for (const k of ["sexual", "political", "impersonation", "fraud", "hate", "minors", "advice", "empty"] as const) assert.ok(lang.twinBank.reasons[k]);
      assert.match(lang.earnNow.personaMonetise.logTotals, /\{amount\}/);
      assert.doesNotMatch(lang.twinBank.pricingProposal, /en attente|awaiting|pendiente/i);
    }
  });
});
