import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { IDEA_TEXT_MAX } from "./ideas.ts";
import { parseIdeaInboxInput } from "./idea-inbox.ts";
import { emptyProjectLeadForm, projectLeadInboxText, projectLeadIssues, PROJECT_LEAD_TAG } from "./project-lead.ts";
import { fr } from "./i18n/fr.ts";
import { en } from "./i18n/en.ts";
import { es } from "./i18n/es.ts";

describe("chef de projet", () => {
  it("requires country, languages, adult and confidentiality", () => {
    assert.deepEqual(projectLeadIssues(emptyProjectLeadForm()), ["country", "languages", "adult", "confidentiality"]);
    const ok = { ...emptyProjectLeadForm(), country: "Haïti", languages: "FR, créole", adult: true, confidentiality: true };
    assert.deepEqual(projectLeadIssues(ok), []);
  });

  it("flattens into a tagged idea-inbox text that passes the inbox whitelist", () => {
    const text = projectLeadInboxText({
      country: "Sénégal\n", languages: "FR | wolof", hours: "20", motivation: "x".repeat(2000), adult: true, confidentiality: true,
    });
    assert.ok(text.startsWith(PROJECT_LEAD_TAG));
    assert.ok(text.length <= IDEA_TEXT_MAX);
    assert.match(text, /Pays: Sénégal \|/);
    const parsed = parseIdeaInboxInput({ id: "g1", text, city: "Dakar", opcId: "", email: "a@b.c" });
    assert.ok(parsed);
    assert.equal(parsed.text, text);
    assert.equal("email" in parsed, false);
  });

  it("copy states the limits in FR/EN/ES, with no amount and banned words absent", () => {
    for (const m of [fr, en, es]) {
      const g = m.earnNow.projectLead;
      assert.ok(g.title && g.cta && g.submit);
      assert.ok(g.doesList.length >= 3);
      assert.ok(g.neverList.length >= 6);
      const all = JSON.stringify(g);
      assert.doesNotMatch(all, /[$€]|\d+\s?(USD|CAD)/);
      assert.doesNotMatch(all, /crypto|token|jeton|solidaire|Cap Objectif/i);
    }
    assert.match(fr.earnNow.projectLead.payNote, /précisée au lancement/);
    assert.match(en.earnNow.projectLead.payNote, /announced at launch/);
    assert.match(fr.earnNow.projectLead.neverList.join(" "), /adultes/);
    assert.match(fr.earnNow.projectLead.lead, /pays en développement/);
    assert.equal(fr.earnNow.projectLead.title, "Chef de projet");
    assert.equal(en.earnNow.projectLead.title, "Project Lead");
    assert.equal(es.earnNow.projectLead.title, "Jefe de proyecto");
    for (const m of [fr, en, es]) {
      assert.doesNotMatch(JSON.stringify(m.earnNow.projectLead), /Guide de projet|Project Guide|Guía de proyecto/i);
      assert.match(m.earnNow.projectLead.lead, /révoqu|retir|revoke/i);
    }
  });
});
