import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BASE_SEPOLIA_CHAIN_ID, CHECKLIST_ITEMS, computeChecklist, faceCheckDone, walletState, type ChecklistInput } from "./arb-checklist.ts";
import { ARB_CONTRACT_SHA256 } from "./arb-contract.ts";
import { en } from "./i18n/en.ts";
import { es } from "./i18n/es.ts";
import { fr } from "./i18n/fr.ts";

const empty: ChecklistInput = {
  status: "pending", hasEmail: false, pushSubscriptions: 0, wallet: null,
  faceScore: null, faceLiveness: false, faceReviewed: false, simAnswers: 0, manualReadAt: null,
};

describe("arbiter onboarding checklist", () => {
  it("lists the seven items in order, all missing for a brand-new arbiter", () => {
    const c = computeChecklist(empty);
    assert.deepEqual(c.items.map((x) => x.id), ["email", "notifications", "wallet", "face", "test_case", "manual", "contract"]);
    assert.equal(c.doneCount, 0);
    assert.equal(c.total, 7);
    assert.equal(c.complete, false);
    assert.equal(c.items.find((x) => x.id === "wallet")!.state, "missing");
  });

  it("marks everything done for a complete arbiter", () => {
    const c = computeChecklist({
      status: "verified", hasEmail: true, pushSubscriptions: 1,
      wallet: { address: "0x" + "a".repeat(40), chainId: BASE_SEPOLIA_CHAIN_ID },
      faceScore: 0.8, faceLiveness: true, faceReviewed: true, simAnswers: 2, manualReadAt: 1, contractHash: ARB_CONTRACT_SHA256,
    });
    assert.equal(c.complete, true);
    assert.equal(c.doneCount, 7);
  });

  it("wallet: any connected address is done, whatever the network (chain_id 1 bug, 22/10)", () => {
    assert.equal(BASE_SEPOLIA_CHAIN_ID, 84532);
    assert.equal(walletState(null), "missing");
    assert.equal(walletState({ address: "", chainId: 84532 }), "missing");
    assert.equal(walletState({ address: "0x" + "b".repeat(40), chainId: 1 }), "done");
    assert.equal(walletState({ address: "0x" + "b".repeat(40), chainId: null }), "done");
    assert.equal(walletState({ address: "0x" + "b".repeat(40), chainId: 84532 }), "done");
  });

  it("face check: rescan requested is missing; verified/reviewed or live scan with score is done", () => {
    assert.equal(faceCheckDone({ status: "rescan_requested", faceScore: 0.9, faceLiveness: true, faceReviewed: true }), false);
    assert.equal(faceCheckDone({ status: "verified", faceScore: 0.9, faceLiveness: true, faceReviewed: true, rescanRequested: true }), false);
    assert.equal(faceCheckDone({ status: "verified", faceScore: null, faceLiveness: false, faceReviewed: false }), true);
    assert.equal(faceCheckDone({ status: "pending", faceScore: 0.7, faceLiveness: true, faceReviewed: false }), true);
    assert.equal(faceCheckDone({ status: "pending", faceScore: null, faceLiveness: true, faceReviewed: false }), false);
    assert.equal(faceCheckDone({ status: "pending", faceScore: 0.7, faceLiveness: false, faceReviewed: false }), false);
  });

  it("has a title and simple steps for every item in FR/EN/ES, and the Manuel link", () => {
    for (const dict of [fr, en, es]) {
      const t = dict.arbitrage.checklist;
      for (const id of CHECKLIST_ITEMS) {
        const it = t.items[id];
        assert.ok(it.title && it.done, `${id} title/done`);
        assert.ok(Array.isArray(it.steps) && it.steps.length >= 1 && it.steps.length <= 4, `${id} steps`);
      }
      assert.ok(t.title && t.progress.includes("{done}") && t.progress.includes("{total}"));
    }
    assert.match(fr.arbitrage.checklist.items.manual.steps.join(" "), /Manuel de justice/);
  });

  it("French copy is encouraging and never uses authority words or pay figures", () => {
    const all = JSON.stringify(fr.arbitrage.checklist) + JSON.stringify(en.arbitrage.checklist) + JSON.stringify(es.arbitrage.checklist);
    assert.doesNotMatch(all, /(^|[^\p{L}])(cour|courts?|tribunal|tribunaux|tribunals|tribunales)(?![\p{L}])/iu);
    assert.doesNotMatch(all, /\d\s*(%|\$)/);
    assert.match(fr.arbitrage.checklist.lead, /Indiana/);
  });
});

import { arbContactHref as _ach } from "./arb-checklist.ts";
import { test as _t } from "node:test";
import _assert from "node:assert/strict";
_t("arbiter contact mailto prefills subject with arbiter id", () => {
  _assert.equal(_ach("Arbitre", "OPC-5X78"), "mailto:opencommunity.opc@gmail.com?subject=Arbitre%20OPC-5X78");
  _assert.equal(_ach("Arbitre", "<x>"), "mailto:opencommunity.opc@gmail.com?subject=Arbitre");
});

describe("arbiter checklist: contract step (7th)", () => {
  it("existing arbiter with 6 done sees 6/7 until the CURRENT contract is accepted", () => {
    const six: ChecklistInput = { status: "verified", hasEmail: true, pushSubscriptions: 1, wallet: { address: "0x" + "a".repeat(40), chainId: 1 },
      faceScore: 0.8, faceLiveness: true, faceReviewed: true, simAnswers: 1, manualReadAt: 1 };
    let c = computeChecklist(six);
    assert.equal(c.doneCount, 6); assert.equal(c.total, 7); assert.equal(c.complete, false);
    c = computeChecklist({ ...six, contractHash: "0".repeat(64) });
    assert.equal(c.complete, false, "an older version does not count");
    c = computeChecklist({ ...six, contractHash: ARB_CONTRACT_SHA256 });
    assert.equal(c.complete, true);
  });
});
