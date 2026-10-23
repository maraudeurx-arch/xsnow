import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { ARB_CONTRACT_SHA256, ARB_CONTRACT_TEXT, ARB_CONTRACT_VERSION } from "./arb-contract.ts";

describe("OPC arbiter agreement", () => {
  it("embedded text = docs file, and the hash matches it", () => {
    const file = readFileSync(new URL(`../../docs/arbitres/contrat-arbitre-OPC-v${ARB_CONTRACT_VERSION}.md`, import.meta.url), "utf8");
    assert.equal(ARB_CONTRACT_TEXT, file);
    assert.equal(createHash("sha256").update(ARB_CONTRACT_TEXT, "utf8").digest("hex"), ARB_CONTRACT_SHA256);
  });
  it("draft banner, signature, required clauses; no authority words, no founder", () => {
    const t = ARB_CONTRACT_TEXT;
    assert.match(t, /PROJET — à faire relire par un avocat avant usage/);
    assert.match(t, /La direction d'OPC/);
    assert.match(t, /Aucun revenu garanti/);
    assert.match(t, /1001770650/);
    assert.match(t, /siège est Toronto/);
    assert.doesNotMatch(t, /cour|tribunal|court|fondateur|founder/i);
    assert.equal((t.match(/l'équipe/g) ?? []).length, 1);
  });
});
