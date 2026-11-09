import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { IDEA_TEXT_MAX } from "./ideas.ts";
import { parseIdeaInboxInput } from "./idea-inbox.ts";
import {
  appendDictationToDescription,
  clipIdeaSaleSummary,
  emptyIdeaSaleForm,
  ideaSaleInboxText,
  ideaSaleIssues,
  ideaSaleSummarySystemPrompt,
  IDEA_SALE_DESCRIPTION_MAX,
  IDEA_SALE_SUMMARY_MAX,
  IDEA_SALE_TAG,
  type IdeaSaleForm,
} from "./idea-sale.ts";
import { fr } from "./i18n/fr.ts";
import { en } from "./i18n/en.ts";
import { es } from "./i18n/es.ts";

const validForm: IdeaSaleForm = {
  title: "Cours de cuisine du quartier",
  category: "divertissement",
  description: "Des ateliers de cuisine locale pour les nouveaux arrivants, animés par des voisins. Petit prix, groupes de huit, recettes à emporter.",
  name: "Marie Tremblay",
  email: "marie@voisin.test",
  consent: true,
};

describe("vendre mes idées — micro et résumé (demande du fondateur, 08/11/2026)", () => {
  it("appends a final dictation transcript to the text already written", () => {
    assert.equal(appendDictationToDescription("", "Une idée simple"), "Une idée simple");
    assert.equal(appendDictationToDescription("Une idée", "simple"), "Une idée simple");
    // No double space when the current text already ends with whitespace.
    assert.equal(appendDictationToDescription("Une idée ", "simple"), "Une idée simple");
    // Whitespace inside the transcript is collapsed; an empty one changes nothing.
    assert.equal(appendDictationToDescription("Une idée", "  très\n simple  "), "Une idée très simple");
    assert.equal(appendDictationToDescription("Une idée", "   "), "Une idée");
    assert.equal(appendDictationToDescription("Une idée", ""), "Une idée");
  });

  it("never lets dictation push the description past the maximum", () => {
    const almostFull = "x".repeat(IDEA_SALE_DESCRIPTION_MAX - 5);
    const result = appendDictationToDescription(almostFull, "mot en trop qui dépasse largement");
    assert.equal(result.length, IDEA_SALE_DESCRIPTION_MAX);
    assert.ok(result.startsWith(almostFull));
  });

  it("builds the summary system prompt in the interface language", () => {
    const frPrompt = ideaSaleSummarySystemPrompt("fr");
    assert.match(frPrompt, /uniquement par le résumé/);
    assert.match(frPrompt, new RegExp(String(IDEA_SALE_SUMMARY_MAX)));
    assert.match(frPrompt, /à qui elle s'adresse/);
    const enPrompt = ideaSaleSummarySystemPrompt("en");
    assert.match(enPrompt, /summary only/);
    assert.match(enPrompt, /who it is for/);
    const esPrompt = ideaSaleSummarySystemPrompt("es");
    assert.match(esPrompt, /únicamente con el resumen/);
    assert.match(esPrompt, /a quién va dirigida/);
    // Any other locale falls back to French, the team's language.
    assert.equal(ideaSaleSummarySystemPrompt("de"), frPrompt);
  });

  it("clips a proposed summary into a valid one-line description", () => {
    assert.equal(clipIdeaSaleSummary("  Un résumé\nsur deux lignes.  "), "Un résumé sur deux lignes.");
    const clipped = clipIdeaSaleSummary("y".repeat(IDEA_SALE_DESCRIPTION_MAX + 100));
    assert.equal(clipped.length, IDEA_SALE_DESCRIPTION_MAX);
    assert.equal(clipIdeaSaleSummary(""), "");
  });

  it("micro and summary copy exists in FR/EN/ES, with no promised figure", () => {
    assert.equal(fr.earnNow.ideaSale.micStart, "Dicter mon idée");
    assert.equal(en.earnNow.ideaSale.micStart, "Dictate my idea");
    assert.equal(es.earnNow.ideaSale.micStart, "Dictar mi idea");
    for (const m of [fr, en, es]) {
      const g = m.earnNow.ideaSale;
      assert.ok(g.micStop && g.micUnsupported && g.micPermission && g.micError);
      assert.ok(g.summarize && g.summarizing && g.summaryTitle);
      assert.ok(g.summaryUse && g.summaryKeep && g.summaryFailed);
      const added = JSON.stringify({
        a: g.micStart, b: g.micStop, c: g.micUnsupported, d: g.micPermission, e: g.micError,
        f: g.summarize, g: g.summarizing, h: g.summaryTitle, i: g.summaryUse, j: g.summaryKeep,
        k: g.summaryFailed,
      });
      assert.doesNotMatch(added, /[$€]|\d+\s?%|\d+\s?(USD|CAD)/);
      assert.doesNotMatch(added, /crypto|token|jeton|solidaire|solidari/i);
    }
  });
});

describe("vendre mes idées", () => {
  it("requires title, description, name, a valid e-mail and consent", () => {
    assert.deepEqual(ideaSaleIssues(emptyIdeaSaleForm()), ["title", "description", "name", "email", "consent"]);
    assert.deepEqual(ideaSaleIssues(validForm), []);
    assert.deepEqual(ideaSaleIssues({ ...validForm, email: "pas-un-courriel" }), ["email"]);
    assert.deepEqual(ideaSaleIssues({ ...validForm, category: "inconnue" as never }), ["category"]);
    assert.deepEqual(ideaSaleIssues({ ...validForm, consent: false }), ["consent"]);
  });

  it("flattens into a tagged idea-inbox text that passes the inbox whitelist, without contact info", () => {
    const text = ideaSaleInboxText({
      title: "Titre\navec | retours",
      category: "affaires",
      description: "x".repeat(2000),
      name: "A".repeat(200),
      email: "a@b.co",
      consent: true,
    });
    assert.ok(text.startsWith(IDEA_SALE_TAG));
    assert.ok(text.length <= IDEA_TEXT_MAX, `text length ${text.length} <= ${IDEA_TEXT_MAX}`);
    assert.match(text, /Catégorie: Affaires \|/);
    assert.match(text, /Accord: oui$/);
    // The ideas inbox is a no-PII channel (it redacts e-mails): the seller's
    // name and e-mail must NOT be in the text — they travel by register notice.
    assert.ok(!text.includes("a@b.co"));
    assert.ok(!text.includes("A".repeat(50)));
    const parsed = parseIdeaInboxInput({ id: "s1", text, city: "Gatineau", opcId: "" });
    assert.ok(parsed);
    assert.equal(parsed.text, text);
  });

  it("copy is honest in FR/EN/ES: team review, no promised amount, idea stays the author's (décision Popol, 06/11/2026)", () => {
    assert.equal(fr.earnNow.ideaSale.cta, "Vendre mes idées");
    assert.equal(en.earnNow.ideaSale.cta, "Sell my ideas");
    assert.equal(es.earnNow.ideaSale.cta, "Vender mis ideas");
    for (const m of [fr, en, es]) {
      const g = m.earnNow.ideaSale;
      assert.ok(g.title && g.lead && g.submit && g.consent);
      assert.ok(g.stepsList.length >= 4);
      // Review by the three team members, named in full in every language.
      const steps = g.stepsList.join(" ");
      assert.match(steps, /Indiana Lane/);
      assert.match(steps, /Yves Knicks/);
      // No figure is ever promised: no currency, no percentage, no banned wording.
      const all = JSON.stringify(g);
      assert.doesNotMatch(all, /[$€]|\d+\s?%|\d+\s?(USD|CAD)/);
      assert.doesNotMatch(all, /crypto|token|jeton|solidaire|solidari/i);
      // The secret warning is present in every language.
      assert.match(g.secretWarning, /mot de passe|password|contraseña/i);
      // The categories cover business / entertainment / other in every language.
      assert.ok(g.categories.affaires && g.categories.divertissement && g.categories.autre);
    }
    assert.match(fr.earnNow.ideaSale.stepsList.join(" "), /reste la tienne/);
    assert.match(en.earnNow.ideaSale.stepsList.join(" "), /remains yours/);
    assert.match(es.earnNow.ideaSale.stepsList.join(" "), /sigue siendo tuya/);
  });

  it("creations are covered explicitly: categories and the invitation to creators (précision Popol, 06/11/2026 15 h 07)", () => {
    // The divertissement category names screenplays, music, songs and comics.
    assert.match(fr.earnNow.ideaSale.categories.divertissement, /scénario/);
    assert.match(fr.earnNow.ideaSale.categories.divertissement, /bande dessinée/);
    assert.match(fr.earnNow.ideaSale.categories.divertissement, /musique/);
    assert.match(fr.earnNow.ideaSale.categories.divertissement, /chanson/);
    assert.match(en.earnNow.ideaSale.categories.divertissement, /screenplay/);
    assert.match(en.earnNow.ideaSale.categories.divertissement, /comic book/);
    assert.match(es.earnNow.ideaSale.categories.divertissement, /guion/);
    assert.match(es.earnNow.ideaSale.categories.divertissement, /cómic/);
    // The explanatory text invites creators of screenplays, music and songs by name.
    assert.match(fr.earnNow.ideaSale.lead, /scénario de film ou de télésérie/);
    assert.match(fr.earnNow.ideaSale.lead, /musique, chanson/);
    assert.match(en.earnNow.ideaSale.lead, /screenplay/);
    assert.match(en.earnNow.ideaSale.lead, /music, a song/);
    assert.match(es.earnNow.ideaSale.lead, /guion de película/);
    assert.match(es.earnNow.ideaSale.lead, /música, canción/);
  });
});
