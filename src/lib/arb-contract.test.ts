import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  ARB_CONTRACT_EFFECTIVE_AT, ARB_CONTRACT_GRACE_DAYS, ARB_CONTRACT_PREVIOUS_SHA256, ARB_CONTRACT_SHA256, ARB_CONTRACT_TEXT, ARB_CONTRACT_VERSION,
  canReceiveRealCases, contractAccepted, contractEffectiveAt, contractState,
} from "./arb-contract.ts";

describe("OPC arbiter agreement", () => {
  it("embedded text = docs file, and the hash matches it", () => {
    const file = readFileSync(new URL(`../../docs/arbitres/contrat-arbitre-OPC-v${ARB_CONTRACT_VERSION}.md`, import.meta.url), "utf8");
    assert.equal(ARB_CONTRACT_TEXT, file);
    assert.equal(createHash("sha256").update(ARB_CONTRACT_TEXT, "utf8").digest("hex"), ARB_CONTRACT_SHA256);
  });
  it("in-force banner, signature, required clauses; no authority words, no founder", () => {
    const t = ARB_CONTRACT_TEXT;
    assert.match(t, /Version 1\.1 du 25\/10\/2026 — en vigueur/);
    assert.doesNotMatch(t, /PROJET|DRAFT|Non en vigueur/);
    assert.match(t, /Loi 25/);
    assert.match(t, /15\.6 OPC's decisions/);
    assert.match(t, /La direction d'OPC/);
    assert.match(t, /Aucun revenu garanti/);
    assert.match(t, /1001770650/);
    assert.match(t, /siège est Toronto/);
    assert.doesNotMatch(t, /cour|tribunal|court|fondateur|founder/i);
    assert.equal((t.match(/l'équipe/g) ?? []).length, 1);
  });
  it("v1.1: art. 13.2 names who appoints the dispute arbitrator (FR + EN)", () => {
    const t = ARB_CONTRACT_TEXT;
    assert.match(t, /13\.2 [^\n]*nommé \*\*d'un commun accord\*\* par OPC et l'Arbitre dans les 15 jours/);
    assert.match(t, /13\.2 [^\n]*autorité judiciaire compétente de l'Ontario/);
    assert.match(t, /13\.2 [^\n]*ni un arbitre inscrit sur OPC/);
    assert.match(t, /13\.2 [^\n]*appointed \*\*by mutual agreement\*\* of OPC and the Arbiter within 15 days/);
    assert.match(t, /13\.2 [^\n]*competent judicial authority of Ontario/);
    assert.match(t, /13\.2 [^\n]*nor an arbiter registered on OPC/);
  });
  it("v1.0 acceptances no longer count: re-acceptance required", () => {
    assert.equal(contractAccepted("ed5194728feaf0a58376f74fe099339b7da72a341c3d1de17daa066f36dccaeb"), false);
    assert.equal(contractAccepted(ARB_CONTRACT_SHA256), true);
  });
});

describe("OPC arbiter agreement: 15-day grace period (art. 14)", () => {
  const V10 = "ed5194728feaf0a58376f74fe099339b7da72a341c3d1de17daa066f36dccaeb";
  const DAY = 86_400_000;
  const eff = Date.parse("2026-11-01T00:00:00-04:00");
  it("grace is 15 days; v1.0 is the known previous version; effective date is a valid constant", () => {
    assert.equal(ARB_CONTRACT_GRACE_DAYS, 15);
    assert.deepEqual([...ARB_CONTRACT_PREVIOUS_SHA256], [V10]);
    assert.ok(Number.isFinite(ARB_CONTRACT_EFFECTIVE_AT));
    assert.equal(contractEffectiveAt(undefined), ARB_CONTRACT_EFFECTIVE_AT);
    assert.equal(contractEffectiveAt("pas une date"), ARB_CONTRACT_EFFECTIVE_AT);
    assert.equal(contractEffectiveAt("2026-11-01T00:00:00-04:00"), eff);
  });
  it("current version accepted → always receives Dossiers", () => {
    assert.deepEqual(contractState(ARB_CONTRACT_SHA256, eff + 100 * DAY, eff), { state: "current" });
    assert.equal(canReceiveRealCases(ARB_CONTRACT_SHA256, eff + 100 * DAY, eff), true);
  });
  it("v1.0 accepted: keeps receiving for 15 days after the effective date, with days left", () => {
    let s = contractState(V10, eff, eff);
    assert.equal(s.state, "grace");
    assert.equal(s.state === "grace" && s.daysLeft, 15);
    assert.equal(s.state === "grace" && s.previousVersion, true);
    assert.equal(s.state === "grace" && s.graceEndsAt, eff + 15 * DAY);
    s = contractState(V10, eff + 14 * DAY + 1, eff);
    assert.equal(s.state === "grace" && s.daysLeft, 1);
    assert.equal(canReceiveRealCases(V10, eff + 15 * DAY - 1, eff), true);
    // before the effective date: still grace, never more than 15 days shown
    s = contractState(V10, eff - 3 * DAY, eff);
    assert.equal(s.state === "grace" && s.daysLeft, 15);
  });
  it("after the grace period, the block applies (v1.0 or nothing accepted)", () => {
    assert.deepEqual(contractState(V10, eff + 15 * DAY, eff), { state: "required", previousVersion: true });
    assert.equal(canReceiveRealCases(V10, eff + 15 * DAY, eff), false);
    assert.deepEqual(contractState(null, eff + 16 * DAY, eff), { state: "required", previousVersion: false });
    assert.equal(canReceiveRealCases("0".repeat(64), eff + 30 * DAY, eff), false);
  });
  it("never accepted: same grace window, flagged as not a previous version", () => {
    const s = contractState(null, eff + 2 * DAY, eff);
    assert.equal(s.state, "grace");
    assert.equal(s.state === "grace" && s.previousVersion, false);
    assert.equal(s.state === "grace" && s.daysLeft, 13);
  });
});
