import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertNoPii, bytesToB64, canonicalJson, decryptString, encryptString, faceVerdict, importEncKey,
  parseArbiterApplication,
} from "./arbitrage.ts";

const base = {
  consent: true, lastName: "Doe", firstName: "Jane", docType: "passport", docNumber: "ab 12345",
  issuingCountry: "ca", expiryDate: "2030-05-01", idPhotoBase64: "AAAA", idPhotoMime: "image/jpeg",
  face: { score: 0.8, liveness: true, method: "t" },
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
