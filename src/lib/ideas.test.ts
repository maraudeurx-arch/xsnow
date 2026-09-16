import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyticsSnippet,
  clipIdeaText,
  defaultIdeaShareText,
  emptyIdeaForm,
  ideaFormIssues,
  ideaFromForm,
  looksLikeCommunityIdea,
  parseInvolvement,
  parseStoredIdea,
  toggleInvolvement,
  WORKER_SYSTEM_PROMPT_MAX,
} from "./ideas.ts";
import { interpolate } from "./i18n/locales.ts";
import { fr } from "./i18n/fr.ts";
import { en } from "./i18n/en.ts";
import { es } from "./i18n/es.ts";

describe("idea form", () => {
  it("requires text only (involvement optional on soft-launch)", () => {
    assert.deepEqual(ideaFormIssues(emptyIdeaForm()), ["text"]);
    assert.deepEqual(
      ideaFormIssues({ text: "Déneiger les allées", involvement: [], hoursPerWeek: "", neighborhood: "" }),
      [],
    );
    assert.deepEqual(
      ideaFormIssues({
        text: "Déneiger les allées",
        involvement: ["mains"],
        hoursPerWeek: "2",
        neighborhood: "Hull",
      }),
      [],
    );
  });

  it("treats a valid local submit as the success path (receipt, then another idea)", () => {
    const form = {
      text: "Co-voiturage du matin",
      involvement: [] as [],
      hoursPerWeek: "",
      neighborhood: "",
    };
    assert.equal(ideaFormIssues(form).length, 0);
    const idea = ideaFromForm(form);
    assert.equal(idea.text, "Co-voiturage du matin");
    assert.equal(fr.ideas.thankYou, "Idée bien reçue");
    assert.equal(fr.ideas.newIdea, "Ajouter une autre idée");
    assert.match(fr.ideas.thankYouBody, /cet appareil/);
    assert.match(en.ideas.thankYouBody, /this device/);
    assert.match(es.ideas.thankYouBody, /este aparato/);
  });

  it("keeps involvement order tete → coeur → mains", () => {
    assert.deepEqual(parseInvolvement(["mains", "tete", "mains", "nope"]), ["tete", "mains"]);
    assert.deepEqual(toggleInvolvement(["tete"], "coeur"), ["tete", "coeur"]);
    assert.deepEqual(toggleInvolvement(["tete", "coeur"], "tete"), ["coeur"]);
  });

  it("parses stored ideas and drops junk", () => {
    const ok = parseStoredIdea({
      id: "idea-1",
      text: "  Un café de réparation vélo  ",
      involvement: ["coeur", "tete"],
      hoursPerWeek: "1-2",
      neighborhood: "Aylmer",
      createdAt: "2026-09-15T12:00:00.000Z",
      updatedAt: "2026-09-15T12:00:00.000Z",
    });
    assert.equal(ok?.text, "Un café de réparation vélo");
    assert.deepEqual(ok?.involvement, ["tete", "coeur"]);
    const textOnly = parseStoredIdea({
      id: "idea-text",
      text: "Une idée sans tag",
      involvement: [],
    });
    assert.equal(textOnly?.text, "Une idée sans tag");
    assert.deepEqual(textOnly?.involvement, []);
    assert.equal(parseStoredIdea({ involvement: ["tete"] }), null);
  });

  it("strips script tags and javascript: from stored ideas", () => {
    const ok = parseStoredIdea({
      id: "idea-xss",
      text: "<script>alert(1)</script> Déneiger les allées javascript:alert(1)",
      involvement: ["mains"],
    });
    assert.equal(ok?.text.includes("<script"), false);
    assert.equal(ok?.text.includes("javascript:"), false);
    assert.match(ok?.text ?? "", /Déneiger les allées/);
    assert.equal(
      parseStoredIdea({
        text: "<script>alert(1)</script>",
        involvement: ["mains"],
      }),
      null,
    );
  });

  it("builds a share text and an analytics snippet without emails", () => {
    const idea = ideaFromForm({
      text: "Partager une perceuse le samedi",
      involvement: ["tete", "mains"],
      hoursPerWeek: "2",
      neighborhood: "Plateau",
    });
    const share = defaultIdeaShareText(idea, {
      heading: "Idée Open Community",
      involvement: { tete: "Tête", coeur: "Cœur", mains: "Mains" },
      hours: "Heures / semaine",
      neighborhood: "Quartier",
    });
    assert.match(share, /Partager une perceuse/);
    assert.match(share, /Tête · Mains/);
    assert.match(share, /vos-idees/);
    assert.match(analyticsSnippet(idea), /\[tete\+mains 2h @Plateau\]/);
    assert.equal(clipIdeaText("a".repeat(600)).length, 500);
  });
});

describe("looksLikeCommunityIdea", () => {
  it("matches idea / involve phrasing without catching idéal", () => {
    assert.equal(looksLikeCommunityIdea("J’ai une idée pour le quartier"), true);
    assert.equal(looksLikeCommunityIdea("My idea: snow removal"), true);
    assert.equal(looksLikeCommunityIdea("Tengo una idea para el barrio"), true);
    assert.equal(looksLikeCommunityIdea("Je veux m’impliquer"), true);
    assert.equal(looksLikeCommunityIdea("C’est l’idéal pour ce soir"), false);
    assert.equal(looksLikeCommunityIdea("Bonjour, quel temps fait-il ?"), false);
  });
});

describe("GOV-like avatar prompt stays inside Workers AI clip", () => {
  it("keeps FR/EN/ES under the worker system-prompt cap", () => {
    const vars = { city: "Gatineau", placeName: "GATINEAU", avatar: "Homme, peau claire" };
    for (const prompt of [fr.systemPrompt, en.systemPrompt, es.systemPrompt]) {
      const filled = interpolate(prompt, vars);
      assert.ok(filled.length < WORKER_SYSTEM_PROMPT_MAX, `${filled.length} >= ${WORKER_SYSTEM_PROMPT_MAX}`);
    }
    assert.match(fr.systemPrompt, /Vos idées/);
    assert.doesNotMatch(fr.welcome, /Tête|Cœur|Mains/);
    assert.doesNotMatch(fr.systemPrompt, /Tête|Cœur|Mains/);
    assert.doesNotMatch(en.welcome, /\bHead\b|\bHeart\b|\bHands\b/);
    assert.doesNotMatch(en.systemPrompt, /\bHead\b|\bHeart\b|\bHands\b/);
    assert.doesNotMatch(es.welcome, /Cabeza|Corazón|Manos/);
    assert.doesNotMatch(es.systemPrompt, /Cabeza|Corazón|Manos/);
    assert.match(fr.systemPrompt, /Interac/);
    assert.match(fr.systemPrompt, /pas un agent/);
    assert.match(en.systemPrompt, /Your ideas/);
    assert.match(en.systemPrompt, /not an agent/);
    assert.match(es.systemPrompt, /Tus ideas/);
    assert.match(es.systemPrompt, /no eres un agente/);
  });
});
