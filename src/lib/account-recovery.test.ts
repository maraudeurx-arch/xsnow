import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createRecoveryRecord,
  generateRecoverySalt,
  hashRecoveryCode,
  normalizeRecoveryCode,
  recoveryHashMatches,
  validateRecoveryCode,
  verifyRecoveryCode,
} from "./account-recovery.ts";

describe("normalizeRecoveryCode", () => {
  it("ignores case, accents and separators for words", () => {
    assert.equal(normalizeRecoveryCode("Éléphant"), "elephant");
    assert.equal(normalizeRecoveryCode("  Mon Arbre "), "monarbre");
    assert.equal(normalizeRecoveryCode("grand-père"), "grandpere");
  });
  it("ignores spaces inside a PIN", () => {
    assert.equal(normalizeRecoveryCode("12 34"), "1234");
  });
});

describe("validateRecoveryCode", () => {
  it("accepts a remembered word", () => {
    const v = validateRecoveryCode("mangue");
    assert.equal(v.ok, true);
    if (v.ok) assert.equal(v.kind, "word");
  });
  it("accepts a 4 to 6 digit PIN", () => {
    for (const pin of ["2741", "90210", "481516"]) {
      const v = validateRecoveryCode(pin);
      assert.equal(v.ok, true, pin);
      if (v.ok) assert.equal(v.kind, "pin");
    }
  });
  it("refuses trivial codes a thief tries first", () => {
    for (const bad of ["1234", "0000", "9876", "password", "aaaaaa", "soleil"]) {
      const v = validateRecoveryCode(bad);
      assert.equal(v.ok, false, bad);
      if (!v.ok) assert.equal(v.reason, "trivial", bad);
    }
  });
  it("refuses too short, mixed and empty codes", () => {
    assert.equal(validateRecoveryCode("").ok, false);
    assert.equal(validateRecoveryCode("abc").ok, false);
    const mixed = validateRecoveryCode("arbre2");
    assert.equal(mixed.ok, false);
    if (!mixed.ok) assert.equal(mixed.reason, "mixed");
    const longPin = validateRecoveryCode("1234567");
    assert.equal(longPin.ok, false);
    if (!longPin.ok) assert.equal(longPin.reason, "too_long");
  });
});

describe("hashing and verification", () => {
  it("verifies the same code typed differently, refuses a wrong one", async () => {
    const created = await createRecoveryRecord("Éléphant", { now: new Date("2026-11-11T00:00:00Z") });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    assert.equal(created.record.kind, "word");
    assert.equal(created.record.createdAt, "2026-11-11T00:00:00.000Z");
    assert.equal(await verifyRecoveryCode("elephant", created.record.salt, created.record.codeHash), true);
    assert.equal(await verifyRecoveryCode("ELEPHANT", created.record.salt, created.record.codeHash), true);
    assert.equal(await verifyRecoveryCode("girafe", created.record.salt, created.record.codeHash), false);
  });

  it("salts differ, so equal codes hash differently per account", async () => {
    const s1 = generateRecoverySalt();
    const s2 = generateRecoverySalt();
    assert.notEqual(s1, s2);
    const h1 = await hashRecoveryCode("mangue", s1);
    const h2 = await hashRecoveryCode("mangue", s2);
    assert.notEqual(h1, h2);
    assert.equal(await hashRecoveryCode("mangue", s1), h1);
  });

  it("never stores the code itself in the record", async () => {
    const created = await createRecoveryRecord("2741");
    assert.equal(created.ok, true);
    if (!created.ok) return;
    const serialized = JSON.stringify(created.record);
    assert.equal(serialized.includes("2741"), false);
    assert.equal("code" in created.record, false);
  });

  it("refuses to build a record for a trivial code", async () => {
    const created = await createRecoveryRecord("1234");
    assert.equal(created.ok, false);
  });

  it("hash comparison is exact and length-safe", () => {
    assert.equal(recoveryHashMatches("abc", "abc"), true);
    assert.equal(recoveryHashMatches("abc", "abd"), false);
    assert.equal(recoveryHashMatches("abc", "abcd"), false);
  });
});
