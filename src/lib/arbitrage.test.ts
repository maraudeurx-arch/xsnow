import { MANUEL_JUSTICE_PAGE_URL, MANUEL_JUSTICE_PDF_URL } from "./arbitrage.ts";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { en } from "./i18n/en.ts";
import { es } from "./i18n/es.ts";
import { fr } from "./i18n/fr.ts";
const DICTIONARIES = { fr, en, es };
import {
  ARBITER_TERMS_VERSION, parseTermsAcceptance,
  assertNoPii, bytesToB64, canonicalJson, decryptString, encryptString, faceVerdict, importEncKey,
  parseArbiterApplication, normalizeEmailInput,
} from "./arbitrage.ts";

const base = {
  consent: true, email: "Jane@Example.org", lastName: "Doe", firstName: "Jane", docType: "passport", docNumber: "ab 12345",
  issuingCountry: "ca", expiryDate: "2030-05-01", idPhotoBase64: "AAAA", idPhotoMime: "image/jpeg",
  face: { score: 0.8, liveness: true, method: "t" },
  terms: { version: ARBITER_TERMS_VERSION, acceptedAt: "2026-10-21T10:00:00Z" },
};

describe("parseArbiterApplication", () => {
  it("normalizes a valid application", () => {
    const r = parseArbiterApplication(base, new Date("2026-10-21"));
    assert.ok(r.ok);
    if (r.ok) { assert.equal(r.value.docNumber, "AB12345"); assert.equal(r.value.issuingCountry, "CA"); }
  });
  it("requires consent, valid expiry and photo", () => {
    const d = new Date("2026-10-21");
    assert.deepEqual(parseArbiterApplication({ ...base, consent: false }, d), { ok: false, error: "consent_required" });
    assert.deepEqual(parseArbiterApplication({ ...base, expiryDate: "2020-01-01" }, d), { ok: false, error: "expired" });
    assert.deepEqual(parseArbiterApplication({ ...base, idPhotoBase64: "" }, d), { ok: false, error: "photo" });
    assert.deepEqual(parseArbiterApplication({ ...base, docType: "selfie" }, d), { ok: false, error: "doc_type" });
  });
});

describe("faceVerdict", () => {
  it("needs liveness and a score", () => {
    assert.equal(faceVerdict({ score: 0.9, liveness: false, method: "" }), "unavailable");
    assert.equal(faceVerdict({ score: null, liveness: true, method: "" }), "unavailable");
    assert.equal(faceVerdict({ score: 0.3, liveness: true, method: "" }), "low_score");
    assert.equal(faceVerdict({ score: 0.7, liveness: true, method: "" }), "likely_match");
  });
});

describe("crypto helpers", () => {
  it("round-trips AES-GCM", async () => {
    const key = await importEncKey(bytesToB64(crypto.getRandomValues(new Uint8Array(32))));
    const sealed = await encryptString(key, "secret ID");
    assert.ok(!sealed.includes("secret"));
    assert.equal(await decryptString(key, sealed), "secret ID");
  });
  it("canonical JSON sorts keys", () => {
    assert.equal(canonicalJson({ b: 1, a: [2, { d: 1, c: 0 }] }), '{"a":[2,{"c":0,"d":1}],"b":1}');
  });
  it("assertNoPii rejects forbidden keys", () => {
    assert.throws(() => assertNoPii({ x: { docNumber: "1" } }));
    assert.doesNotThrow(() => assertNoPii({ arbiterId: "arb_1" }));
  });
});

describe("arbiter terms", () => {
  it("requires the current terms version and a valid timestamp", () => {
    const d = new Date("2026-10-21");
    assert.deepEqual(parseArbiterApplication({ ...base, terms: undefined }, d), { ok: false, error: "terms_required" });
    assert.equal(parseTermsAcceptance({ version: "old", acceptedAt: "2026-10-21T10:00:00Z" }), null);
    assert.equal(parseTermsAcceptance({ version: ARBITER_TERMS_VERSION, acceptedAt: "nope" }), null);
    const r = parseArbiterApplication(base, d);
    assert.ok(r.ok && r.value.terms.acceptedAt === "2026-10-21T10:00:00.000Z");
  });
  it("lists the 3 items in order (identity+face, training 250, pay 30/50 + 10%/10%) in fr/en/es", () => {
    for (const [lang, m] of Object.entries(DICTIONARIES)) {
      const items = m.arbitrage.termsItems;
      assert.equal(items.length, 3, lang);
      assert.match(items[0], /biom/i, lang);
      assert.match(items[1], /250/, lang);
      assert.match(items[1], /10/, lang);
      assert.match(items[2], /30/, lang);
      assert.match(items[2], /50/, lang);
      assert.match(items[2], /10 ?%.*10 ?%/, lang);
      assert.ok(m.arbitrage.termsAccept && m.arbitrage.termsCancel, lang);
    }
    assert.equal(DICTIONARIES.fr.arbitrage.termsAccept, "Accepter");
  });
});

it("manual links: exact existing essaim-agents.com URLs (https, PDF download)", () => {
  assert.equal(MANUEL_JUSTICE_PAGE_URL, "https://essaim-agents.com/manuel-justice");
  assert.equal(MANUEL_JUSTICE_PDF_URL, "https://essaim-agents.com/manuel-justice-v2.3.2.pdf");
});

describe("arbiter email", () => {
  it("is required, validated and normalised", () => {
    const ok = parseArbiterApplication(base, new Date("2026-10-21T12:00:00Z"));
    assert.ok(ok.ok && ok.value.email === "jane@example.org" && ok.value.lang === "fr");
    assert.deepEqual(parseArbiterApplication({ ...base, email: "" }, new Date("2026-10-21T12:00:00Z")), { ok: false, error: "email" });
    assert.deepEqual(parseArbiterApplication({ ...base, email: "not-an-email" }, new Date("2026-10-21T12:00:00Z")), { ok: false, error: "email" });
  });
});

describe("email typed on a phone", () => {
  it("normalises autofill quirks (spaces, zero-width, capitals, mailto:)", () => {
    assert.equal(normalizeEmailInput(" Popol.Test@Example.ORG "), "popol.test@example.org");
    assert.equal(normalizeEmailInput("mailto:a@b.co\u200B"), "a@b.co");
    assert.equal(normalizeEmailInput("ａ@b.co"), "a@b.co");
    const ok = parseArbiterApplication({ ...base, email: " Jane@Example.org\u00a0" }, new Date("2026-10-21T12:00:00Z"));
    assert.ok(ok.ok && ok.value.email === "jane@example.org");
  });
});
