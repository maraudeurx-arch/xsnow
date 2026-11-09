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
import { fetchTwinBank, newSubscriberId, recordTwinBankUse } from "./twin-bank-client.ts";
import { fr } from "./i18n/fr.ts";
import { en } from "./i18n/en.ts";
import { es } from "./i18n/es.ts";

describe("banque jumeau — tarif proposé (en attente de l'accord de Popol)", () => {
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
