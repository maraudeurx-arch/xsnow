import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AUTHORITY_WORDS_RE, DEFAULT_MANUAL_REF, FIGURE_RE, MANUAL_EXCERPTS, MANUEL_VERSION, OUTCOME_WORDS,
  buildExplanation, explanationTextOk, pickManualRef,
} from "./arb-training.ts";

/** Words that must never appear in a generated explanation (public text). */
const BANNED = /(^|[^\p{L}])(cour|courts?|tribunal|tribunaux|tribunals|tribunales|juridictions?|magistrats?|judges?|jury|jurés?)(?![\p{L}])/iu;

describe("training explanation (Indiana)", () => {
  it("followed: says why it was right, simply, and cites the Manuel excerpt", () => {
    const e = buildExplanation({ followed: true, chosen: "B. Donner raison à B", suggested: "B. Donner raison à B", reasoning: "Selon M-5.3, B a prouvé la livraison." });
    assert.equal(e.followed, true);
    assert.equal(e.manualRef, "M-5.3");
    assert.equal(e.manualVersion, MANUEL_VERSION);
    assert.match(e.text, /^Bravo ! Tu as choisi B\. Donner raison à B, comme la suggestion d’Indiana/);
    assert.match(e.text, /Pourquoi c’est juste : Celui qui dit « j’ai livré » doit le montrer/);
    assert.ok(e.text.includes("Ce que dit le Manuel de justice (M-5.3) : « Le fournisseur prouve la livraison."));
    assert.ok(e.text.includes("Le raisonnement d’Indiana : Selon M-5.3"));
  });

  it("contradicted: gentle, explains the suggested reasoning with the excerpt and a question for next time", () => {
    const e = buildExplanation({ followed: false, chosen: "A. Rembourser A", suggested: "B. Donner raison à B", reasoning: "M-4.4 : la consigne floue se lit contre A." });
    assert.equal(e.manualRef, "M-4.4");
    assert.match(e.text, /Tu as choisi A\. Rembourser A\. Indiana suggérait B\. Donner raison à B\. Ce n’est pas grave/);
    assert.match(e.text, /Voici le raisonnement suggéré : /);
    assert.match(e.text, /La prochaine fois, demande-toi : qui a écrit la consigne pas claire \?/);
    assert.ok(!/faute grave|erreur grave|nul/i.test(e.text));
  });

  it("picks the first known Manuel article, else the default (M-5.5)", () => {
    assert.equal(pickManualRef("voir M-99.1 puis M-5.6"), "M-5.6");
    assert.equal(pickManualRef("aucune référence"), DEFAULT_MANUAL_REF);
    assert.equal(pickManualRef(null, undefined, "M-6.1"), "M-6.1");
  });

  it("drops an Indiana reasoning or a label that contains a pay figure or an authority word", () => {
    const e = buildExplanation({ followed: true, chosen: "A. Payer 30 $ à A", suggested: "A", reasoning: "Comme un tribunal le ferait, 10 % pour OPC (M-5.3)." });
    assert.ok(!e.text.includes("tribunal") && !e.text.includes("30 $") && !e.text.includes("10 %"));
    assert.ok(!e.text.includes("Le raisonnement d’Indiana"));
    assert.match(e.text, /la même réponse/);
  });

  it("NO authority words and NO pay figures in any generated explanation (all excerpts × followed/contradicted × hostile inputs)", () => {
    const hostile = [
      "La cour décide.", "small claims court", "Tribunal de commerce", "tribunales", "le juré dit", "the judge said", "jury",
      "30 $ par arbitrage", "$50", "10 % OPC", "40 %", "500 USDC", "25 dollars", "dix pour cent: 10 pour cent", null, "",
    ];
    let n = 0;
    for (const ref of Object.keys(MANUAL_EXCERPTS)) {
      for (const followed of [true, false]) {
        for (const h of hostile) {
          const e = buildExplanation({ followed, chosen: `A. ${h ?? ""}`, suggested: `B. ${h ?? ""}`, reasoning: `${ref} ${h ?? ""}`, refHints: [h] });
          assert.doesNotMatch(e.text, BANNED, `${ref} ${followed} ${h}: ${e.text}`);
          assert.doesNotMatch(e.text, AUTHORITY_WORDS_RE);
          assert.doesNotMatch(e.text, FIGURE_RE, `${ref} ${followed} ${h}: ${e.text}`);
          assert.ok(explanationTextOk(e.text));
          assert.ok(e.text.includes(`(${e.manualRef})`));
          n++;
        }
      }
    }
    assert.ok(n > 400);
    for (const w of Object.values(OUTCOME_WORDS)) assert.ok(explanationTextOk(w));
  });

  it("every excerpt, simple text and question follows the rules", () => {
    for (const ex of Object.values(MANUAL_EXCERPTS)) {
      assert.ok(explanationTextOk(ex.excerpt) && explanationTextOk(ex.simple) && explanationTextOk(ex.question), ex.ref);
      assert.match(ex.ref, /^M-\d+\.\d+$/);
      assert.ok(ex.excerpt.length > 20 && ex.simple.length > 20 && ex.question.endsWith("?"), ex.ref);
    }
  });

});
