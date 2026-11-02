import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { ARB_CONTRACT_SHA256, ARB_CONTRACT_TEXT, ARB_CONTRACT_VERSION, contractAccepted } from "./arb-contract.ts";

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
