import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseArbiterApplication, ARBITER_TERMS_VERSION } from "./arbitrage.ts";
import {
  PROJECT_LEAD_INSTRUCTIONS_PDF, PROJECT_LEAD_INSTRUCTIONS_VERSION, PROJECT_LEAD_STEPS, PROJECT_LEAD_TERMS_VERSION,
  computeProjectLeadChecklist, instructionsAccepted, instructionsPdfFor, parseApplicantRole, type ProjectLeadChecklistInput,
} from "./project-lead-registration.ts";
import { en } from "./i18n/en.ts";
import { es } from "./i18n/es.ts";
import { fr } from "./i18n/fr.ts";

const base: ProjectLeadChecklistInput = {
  status: "pending", termsVersion: PROJECT_LEAD_TERMS_VERSION, hasIdentity: true, hasEmail: true, pushSubscriptions: 0,
  faceScore: 0.7, faceLiveness: true, faceReviewed: false, instructionsReadAt: null, instructionsVersion: null,
};
const app = {
  consent: true, role: "project_lead", email: "chef@opc.test", lastName: "A", firstName: "B", docType: "passport", docNumber: "AB123456",
  issuingCountry: "HT", expiryDate: "2030-01-01", idPhotoBase64: "iVBORw0KGgo=", idPhotoMime: "image/png",
  face: { score: 0.7, liveness: true, method: "t" }, terms: { version: PROJECT_LEAD_TERMS_VERSION, acceptedAt: "2026-11-02T12:00:00Z" },
};

describe("Chef de projet — S'enregistrer", () => {
  it("has 7 steps, the arbiter path with the instructions instead of the Manuel, and no wallet", () => {
    assert.deepEqual([...PROJECT_LEAD_STEPS], ["terms", "identity", "face", "email", "notifications", "instructions", "approval"]);
    assert.equal((PROJECT_LEAD_STEPS as readonly string[]).includes("wallet"), false);
    assert.equal((PROJECT_LEAD_STEPS as readonly string[]).includes("manual"), false);
  });

  it("parses the role and checks the right terms version", () => {
    assert.equal(parseApplicantRole("project_lead"), "project_lead");
    assert.equal(parseApplicantRole("admin"), "arbiter");
    assert.equal(parseApplicantRole(undefined), "arbiter");
    const ok = parseArbiterApplication(app, new Date("2026-11-02"));
    assert.equal(ok.ok, true);
    assert.equal(ok.ok && ok.value.role, "project_lead");
    assert.deepEqual(parseArbiterApplication({ ...app, terms: { ...app.terms, version: ARBITER_TERMS_VERSION } }), { ok: false, error: "terms_required" });
    assert.deepEqual(parseArbiterApplication({ ...app, consent: false }), { ok: false, error: "consent_required" });
  });

  it("requires a timestamped acceptance of the current instructions version", () => {
    assert.equal(instructionsAccepted(null, PROJECT_LEAD_INSTRUCTIONS_VERSION), false);
    assert.equal(instructionsAccepted(Date.now(), "old"), false);
    assert.equal(instructionsAccepted(Date.now(), PROJECT_LEAD_INSTRUCTIONS_VERSION), true);
    const c0 = computeProjectLeadChecklist(base);
    assert.equal(c0.items.find((x) => x.id === "instructions")!.done, false);
    assert.equal(c0.instructionsReadAt, null);
    const at = Date.parse("2026-11-02T20:00:00Z");
    const c1 = computeProjectLeadChecklist({ ...base, instructionsReadAt: at, instructionsVersion: PROJECT_LEAD_INSTRUCTIONS_VERSION });
    assert.equal(c1.instructionsReadAt, "2026-11-02T20:00:00.000Z");
    assert.equal(c1.complete, false);
    const c2 = computeProjectLeadChecklist({ ...base, status: "verified", pushSubscriptions: 1, instructionsReadAt: at, instructionsVersion: PROJECT_LEAD_INSTRUCTIONS_VERSION });
    assert.equal(c2.complete, true);
    assert.equal(c2.total, 7);
    // A requested rescan reopens the face step, as for arbiters.
    assert.equal(computeProjectLeadChecklist({ ...base, status: "rescan_requested" }).items.find((x) => x.id === "face")!.done, false);
  });

  it("ships both instruction PDFs as public assets", () => {
    for (const p of Object.values(PROJECT_LEAD_INSTRUCTIONS_PDF)) {
      const file = new URL(`../../public${p}`, import.meta.url);
      assert.ok(existsSync(file), p);
      assert.equal(readFileSync(file).subarray(0, 5).toString(), "%PDF-");
    }
    assert.equal(instructionsPdfFor("fr"), PROJECT_LEAD_INSTRUCTIONS_PDF.fr);
    assert.equal(instructionsPdfFor("en"), PROJECT_LEAD_INSTRUCTIONS_PDF.en);
    assert.equal(instructionsPdfFor("es"), PROJECT_LEAD_INSTRUCTIONS_PDF.en);
  });

  it("has Register copy in FR/EN/ES with privacy (PIPEDA/LPRPDE, Ontario) and no crypto, token or amount", () => {
    assert.equal(fr.earnNow.projectLead.register.cta, "S’enregistrer");
    assert.equal(en.earnNow.projectLead.register.cta, "Register");
    assert.equal(es.earnNow.projectLead.register.cta, "Registrarse");
    for (const [lang, msg] of [["fr", fr], ["en", en], ["es", es]] as const) {
      const r = msg.earnNow.projectLead.register;
      for (const id of PROJECT_LEAD_STEPS) assert.ok(r.steps[id], `${lang} ${id}`);
      assert.match(r.privacy, /LPRPDE|PIPEDA/);
      assert.match(r.privacy, /Ontario/);
      assert.match(r.privacy, /90/);
      const all = JSON.stringify(r);
      assert.doesNotMatch(all, /\$|USDC|wallet|crypto|token|Solidaire|€/i, lang);
      assert.equal(r.termsItems.length, 4);
    }
  });
});
