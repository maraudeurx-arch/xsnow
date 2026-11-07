import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { IDEA_TEXT_MAX } from "./ideas.ts";
import { parseIdeaInboxInput } from "./idea-inbox.ts";
import {
  emptyIdeaSaleForm,
  formatIdeaSalePrice,
  ideaSaleInboxText,
  ideaSaleIssues,
  parseIdeaSalePrice,
  proposeIdeaSummary,
  IDEA_SALE_SUMMARY_MAX,
  IDEA_SALE_TAG,
  IDEA_SALE_VIDEO_SRC,
  type IdeaSaleForm,
} from "./idea-sale.ts";
import { dictationSupported, getSpeechRecognitionCtor } from "./dictation.ts";
import { fr } from "./i18n/fr.ts";
import { en } from "./i18n/en.ts";
import { es } from "./i18n/es.ts";

const validForm: IdeaSaleForm = {
  title: "Cours de cuisine du quartier",
  category: "divertissement",
  description: "Des ateliers de cuisine locale pour les nouveaux arrivants, animés par des voisins. Petit prix, groupes de huit, recettes à emporter.",
  summary: "Des ateliers de cuisine locale pour les nouveaux arrivants, animés par des voisins.",
  summaryApproved: true,
  price: "250",
  name: "Marie Tremblay",
  email: "marie@voisin.test",
  consent: true,
};

describe("vendre mes idées", () => {
  it("requires title, description, name, a valid e-mail and consent", () => {
    assert.deepEqual(ideaSaleIssues(emptyIdeaSaleForm()), [
      "title",
      "description",
      "summary",
      "price",
      "name",
      "email",
      "consent",
    ]);
    assert.deepEqual(ideaSaleIssues(validForm), []);
    assert.deepEqual(ideaSaleIssues({ ...validForm, email: "pas-un-courriel" }), ["email"]);
    assert.deepEqual(ideaSaleIssues({ ...validForm, category: "inconnue" as never }), ["category"]);
    assert.deepEqual(ideaSaleIssues({ ...validForm, consent: false }), ["consent"]);
  });

  it("refuses to send without an approved summary (Popol, 07/11/2026)", () => {
    // The summary exists but was never approved, or was edited after approval.
    assert.deepEqual(ideaSaleIssues({ ...validForm, summaryApproved: false }), ["summary"]);
    // No summary at all.
    assert.deepEqual(ideaSaleIssues({ ...validForm, summary: "" }), ["summary"]);
    // A summary that is too short to describe anything.
    assert.deepEqual(ideaSaleIssues({ ...validForm, summary: "Trop court." }), ["summary"]);
  });

  it("requires a positive desired price in US dollars", () => {
    assert.deepEqual(ideaSaleIssues({ ...validForm, price: "" }), ["price"]);
    assert.deepEqual(ideaSaleIssues({ ...validForm, price: "abc" }), ["price"]);
    assert.deepEqual(ideaSaleIssues({ ...validForm, price: "0" }), ["price"]);
    assert.deepEqual(ideaSaleIssues({ ...validForm, price: "-50" }), ["price"]);
    assert.equal(parseIdeaSalePrice("250"), 250);
    assert.equal(parseIdeaSalePrice("1 234,50"), 1234.5);
    assert.equal(parseIdeaSalePrice("12.345"), null);
    assert.equal(formatIdeaSalePrice(250), "250");
    assert.equal(formatIdeaSalePrice(1234.5), "1234.50");
  });

  it("proposes an extractive summary: whole sentences, within the cap", () => {
    const short = "Une idée simple et claire pour le quartier.";
    assert.equal(proposeIdeaSummary(short), short);
    const long = Array.from({ length: 12 }, (_, i) => `Phrase numéro ${i + 1} qui décrit un aspect de cette idée de quartier.`).join(" ");
    const summary = proposeIdeaSummary(long);
    assert.ok(summary.length <= IDEA_SALE_SUMMARY_MAX, `${summary.length} <= ${IDEA_SALE_SUMMARY_MAX}`);
    assert.ok(summary.endsWith("."));
    assert.ok(summary.startsWith("Phrase numéro 1"));
    // One over-long sentence is clipped at a word boundary, still within the cap.
    const wall = "mot ".repeat(200).trim();
    const clipped = proposeIdeaSummary(wall);
    assert.ok(clipped.length <= IDEA_SALE_SUMMARY_MAX);
    assert.ok(clipped.length >= 20);
    assert.equal(proposeIdeaSummary(""), "");
    assert.equal(proposeIdeaSummary("   "), "");
  });

  it("dictation degrades cleanly without a speech API: no constructor, typed text still works", () => {
    // In this (non-browser) environment there is no SpeechRecognition:
    // the dialog hides the microphone button and the form stays fully
    // usable by typing — the summary is proposed from the typed text.
    assert.equal(getSpeechRecognitionCtor(), null);
    assert.equal(dictationSupported(), false);
    const typed = "Je décris mon idée au clavier, phrase après phrase. Elle sert les familles du quartier.";
    assert.equal(proposeIdeaSummary(typed), typed);
  });

  it("flattens into a tagged idea-inbox text that passes the inbox whitelist, without contact info", () => {
    const text = ideaSaleInboxText({
      title: "Titre\navec | retours",
      category: "affaires",
      description: "x".repeat(2000),
      summary: "",
      summaryApproved: false,
      price: "",
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

  it("flattens the desired price explicitly in USD, and sends the approved summary — never the raw description", () => {
    const text = ideaSaleInboxText({
      ...validForm,
      description: "TEXTE BRUT DICTÉ qui ne doit pas partir tel quel, avec beaucoup de détails supplémentaires.",
      price: "1 234,50",
    });
    assert.match(text, /Prix souhaité: 1234\.50 USD/);
    assert.ok(text.includes(validForm.summary));
    assert.ok(!text.includes("TEXTE BRUT DICTÉ"));
    assert.ok(text.length <= IDEA_TEXT_MAX);
    assert.match(text, /Accord: oui$/);
    // The price is the seller's wish, not personal information: it does
    // travel in the flattened text, unlike the name and the e-mail.
    assert.ok(!text.includes("marie@voisin.test"));
    assert.ok(!text.includes("Marie Tremblay"));
  });

  it("keeps the flattened text within budget with every field maxed out", () => {
    const text = ideaSaleInboxText({
      ...validForm,
      title: "T".repeat(200),
      category: "divertissement",
      summary: "S ".repeat(300),
      price: "100000000",
    });
    assert.ok(text.length <= IDEA_TEXT_MAX, `text length ${text.length} <= ${IDEA_TEXT_MAX}`);
    assert.match(text, /Prix souhaité: 100000000 USD/);
    assert.match(text, /Accord: oui$/);
  });

  it("video header stays dormant until a video file exists, with a sober label in FR/EN/ES", () => {
    // Sobriety rule: no file yet → the dialog renders no player at all.
    assert.equal(IDEA_SALE_VIDEO_SRC, null);
    assert.match(fr.earnNow.ideaSale.videoLabel, /45 secondes/);
    assert.match(en.earnNow.ideaSale.videoLabel, /45 seconds/);
    assert.match(es.earnNow.ideaSale.videoLabel, /45 segundos/);
  });

  it("consent covers the optional document or photo in FR/EN/ES (ajout Popol, 07/11/2026)", () => {
    assert.match(fr.earnNow.ideaSale.consent, /document ou ma photo/);
    assert.match(en.earnNow.ideaSale.consent, /document or photo/);
    assert.match(es.earnNow.ideaSale.consent, /documento o foto/);
    for (const m of [fr, en, es]) {
      const g = m.earnNow.ideaSale;
      assert.ok(g.attachment && g.attachmentHelp && g.attachmentRemove);
      assert.ok(g.dictate && g.summaryTitle && g.summaryApprove && g.price);
    }
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
