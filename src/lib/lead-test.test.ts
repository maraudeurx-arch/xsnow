import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LEAD_TEST_END_MS,
  LEAD_TEST_START_MS,
  LEAD_TEST_STEP_MS,
  LEAD_TEST_TOTAL,
  buildLeadTestAnswerMail,
  flushUnsentLeadTestAnswers,
  leadTestChiefStatus,
  leadTestPhase,
  leadTestPropState,
  leadTestScore,
  leadTestStartMsFor,
  leadTestUnlockAtMs,
  leadTestUnlockedCount,
  leadTestNextUnlockMs,
  parseLeadTestAnswers,
  parseLeadTestReport,
  type LeadTestAnswers,
} from "./lead-test.ts";
import {
  LEAD_TEST_ASSIGNMENTS,
  LEAD_TEST_ONBOARDING_INSTRUCTION,
  LEAD_TEST_START_ISO,
  LEAD_TESTS_BY_PROJECT_ID,
  leadTestAssignmentFor,
  leadTestForProject,
  type LeadTestAssignment,
} from "./lead-test-propositions.ts";
import { ESSAIM_AGENTS_INBOX_TO } from "./owner-mail.ts";

const MIN = 60_000;

describe("test des chefs — banque des propositions", () => {
  it("le début du test est la constante nommée (08/11/2026, 16 h 00 UTC = 11 h 00 HNE)", () => {
    assert.equal(LEAD_TEST_START_ISO, "2026-11-08T16:00:00Z");
    assert.equal(LEAD_TEST_START_MS, Date.parse("2026-11-08T16:00:00Z"));
    assert.equal(LEAD_TEST_END_MS, LEAD_TEST_START_MS + 6 * 60 * MIN);
  });

  it("chaque projet en test a 12 propositions complètes, rattachées au bon chef", () => {
    const education = leadTestForProject("education");
    assert.ok(education);
    assert.equal(education.chefOpcId, "OPC-5X78");
    assert.equal(education.chefName, "Steve Badinga");
    const couture = leadTestForProject("haute-couture");
    assert.ok(couture);
    assert.equal(couture.chefOpcId, "OPC-UBNZ");
    assert.equal(couture.chefName, "Alex Kumba");

    for (const test of Object.values(LEAD_TESTS_BY_PROJECT_ID)) {
      assert.equal(test.propositions.length, LEAD_TEST_TOTAL);
      test.propositions.forEach((proposition, index) => {
        assert.equal(proposition.n, index + 1);
        assert.ok(proposition.prompt.length > 10, `prompt nº ${proposition.n}`);
        for (const letter of ["A", "B", "C"] as const) {
          assert.ok(proposition.choices[letter].length > 0, `choix ${letter} nº ${proposition.n}`);
        }
        assert.ok(["A", "B", "C"].includes(proposition.suggestion));
        assert.ok(proposition.suggestionReason.length > 10, `raison nº ${proposition.n}`);
      });
    }
    assert.equal(leadTestForProject("projet-inconnu"), null);
    assert.equal(leadTestForProject(undefined), null);
  });

  it("les suggestions reprennent la banque de l'équipe (contrôles ponctuels)", () => {
    const education = leadTestForProject("education");
    assert.equal(education?.propositions[0]?.suggestion, "B"); // parcours d'accès d'abord
    assert.equal(education?.propositions[5]?.suggestion, "C"); // langues : français d'abord, architecture prête
    assert.equal(education?.propositions[6]?.suggestion, "A"); // consultation par élève
    const couture = leadTestForProject("haute-couture");
    assert.equal(couture?.propositions[0]?.suggestion, "B"); // bébé d'abord
    assert.match(couture?.propositions[0]?.suggestionReason ?? "", /franchise de droits/);
    assert.match(education?.propositions[1]?.prompt ?? "", /Comment les élèves entrent-ils/);
  });
});

describe("test des chefs — horaire de déverrouillage", () => {
  it("avant le début : rien n'est déverrouillé, tout est verrouillé", () => {
    const before = LEAD_TEST_START_MS - 1;
    assert.equal(leadTestPhase(before), "before");
    assert.equal(leadTestUnlockedCount(before), 0);
    assert.equal(leadTestPropState(1, false, before), "locked");
    assert.equal(leadTestNextUnlockMs(before), LEAD_TEST_START_MS);
  });

  it("au début : la proposition nº 1 s'ouvre, la nº 2 reste verrouillée", () => {
    assert.equal(leadTestPhase(LEAD_TEST_START_MS), "open");
    assert.equal(leadTestUnlockedCount(LEAD_TEST_START_MS), 1);
    assert.equal(leadTestPropState(1, false, LEAD_TEST_START_MS), "open");
    assert.equal(leadTestPropState(2, false, LEAD_TEST_START_MS), "locked");
    assert.equal(leadTestNextUnlockMs(LEAD_TEST_START_MS), LEAD_TEST_START_MS + LEAD_TEST_STEP_MS);
  });

  it("à +15 minutes : la nº 2 s'ouvre ; les ouvertes non répondues restent répondables", () => {
    const t = LEAD_TEST_START_MS + 15 * MIN;
    assert.equal(leadTestUnlockedCount(t), 2);
    assert.equal(leadTestPropState(1, false, t), "open"); // empilée, toujours répondable
    assert.equal(leadTestPropState(2, false, t), "open");
    assert.equal(leadTestPropState(3, false, t), "locked");
    assert.equal(leadTestUnlockAtMs(12), LEAD_TEST_START_MS + 11 * LEAD_TEST_STEP_MS);
    assert.equal(leadTestUnlockedCount(LEAD_TEST_START_MS + 11 * LEAD_TEST_STEP_MS), 12);
    assert.equal(leadTestNextUnlockMs(LEAD_TEST_START_MS + 11 * LEAD_TEST_STEP_MS), null);
  });

  it("après 6 heures : fenêtre fermée, les non-répondues sont expirées, le score est final", () => {
    assert.equal(leadTestPhase(LEAD_TEST_END_MS - 1), "open");
    assert.equal(leadTestPhase(LEAD_TEST_END_MS), "closed");
    assert.equal(leadTestPropState(5, false, LEAD_TEST_END_MS), "expired");
    assert.equal(leadTestPropState(5, true, LEAD_TEST_END_MS), "answered");
    assert.equal(leadTestPropState(5, true, LEAD_TEST_START_MS), "answered");
    assert.equal(leadTestUnlockedCount(LEAD_TEST_END_MS + 60 * MIN), 12);
  });
});

describe("test des chefs — réponses, score et signalement", () => {
  const education = leadTestForProject("education");
  assert.ok(education);

  it("parseLeadTestAnswers garde les réponses valides et jette le reste", () => {
    const parsed = parseLeadTestAnswers(
      {
        "1": { n: 1, choice: "B", reason: "", at: "2026-11-08T16:01:00.000Z", sent: true },
        "2": { n: 2, choice: "Z", reason: "", at: "", sent: false },
        "99": { n: 99, choice: "A", reason: "", at: "", sent: false },
        junk: "nonsense",
      },
      education,
    );
    assert.deepEqual(Object.keys(parsed), ["1"]);
    assert.equal(parsed["1"]?.choice, "B");
    assert.equal(parsed["1"]?.sent, true);
  });

  it("le score compte les répondues et les suggestions suivies", () => {
    const answers: LeadTestAnswers = {
      "1": { n: 1, choice: "B", reason: "", at: "", sent: true }, // suggestion B → suivie
      "2": { n: 2, choice: "A", reason: "je préfère", at: "", sent: true }, // suggestion B → écart
    };
    assert.deepEqual(leadTestScore(education, answers), { answered: 2, followed: 1 });
    assert.deepEqual(leadTestScore(education, {}), { answered: 0, followed: 0 });
  });

  it("parseLeadTestReport valide le rattachement chef ↔ projet et recalcule la suggestion", () => {
    const report = parseLeadTestReport({
      opcId: "OPC-5X78",
      projectId: "education",
      n: 1,
      choice: "A", // le client prétendrait « suivi » — le serveur recalcule : écart
      reason: "  je commence par le tableau de bord  ",
      at: "2026-11-08T16:02:00.000Z",
    });
    assert.ok(report);
    assert.equal(report.chefName, "Steve Badinga");
    assert.equal(report.suggested, "B");
    assert.equal(report.followed, false);
    assert.equal(report.answeredAt, "2026-11-08T16:02:00.000Z");

    // Mauvais chef pour ce projet, choix invalide, proposition inexistante, corps vide.
    assert.equal(
      parseLeadTestReport({ opcId: "OPC-UBNZ", projectId: "education", n: 1, choice: "B" }),
      null,
    );
    assert.equal(
      parseLeadTestReport({ opcId: "OPC-5X78", projectId: "education", n: 1, choice: "D" }),
      null,
    );
    assert.equal(
      parseLeadTestReport({ opcId: "OPC-5X78", projectId: "education", n: 13, choice: "B" }),
      null,
    );
    assert.equal(parseLeadTestReport(null), null);
    assert.equal(parseLeadTestReport({ projectId: "education", n: 1, choice: "B" }), null);
  });

  it("le courriel à l'équipe porte les bons champs et la boîte Essaim-Agents", () => {
    const report = parseLeadTestReport({
      opcId: "OPC-UBNZ",
      projectId: "haute-couture",
      n: 5,
      choice: "B",
      reason: "",
      at: "2026-11-08T17:00:00.000Z",
    });
    assert.ok(report);
    const mail = buildLeadTestAnswerMail(report, Date.parse("2026-11-08T17:00:05.000Z"));
    assert.equal(mail.to, ESSAIM_AGENTS_INBOX_TO);
    assert.equal(ESSAIM_AGENTS_INBOX_TO, "essaim.agents@gmail.com");
    assert.match(mail.subject, /Alex Kumba/);
    assert.match(mail.text, /Proposition : 5\/12/);
    assert.match(mail.text, /Suggestion suivie : oui/);
    assert.match(mail.text, /Haute couture/);
  });

  it("flushUnsentLeadTestAnswers ne marque « envoyé » que ce que le Worker confirme", async () => {
    const answers: LeadTestAnswers = {
      "1": { n: 1, choice: "B", reason: "", at: "2026-11-08T16:01:00.000Z", sent: false },
      "2": { n: 2, choice: "B", reason: "", at: "2026-11-08T16:16:00.000Z", sent: true },
    };
    const okFetch = (async () =>
      new Response(JSON.stringify({ ok: true, emailed: true }), { status: 200 })) as typeof fetch;
    const flushed = await flushUnsentLeadTestAnswers("OPC-5X78", "education", answers, okFetch);
    assert.equal(flushed["1"]?.sent, true);
    assert.equal(flushed["2"]?.sent, true);

    const failFetch = (async () =>
      new Response(JSON.stringify({ ok: false }), { status: 502 })) as typeof fetch;
    const unflushed = await flushUnsentLeadTestAnswers("OPC-5X78", "education", answers, failFetch);
    assert.equal(unflushed["1"]?.sent, false);
  });
});

describe("modèle permanent d'accueil — instruction, assignations, statut", () => {
  it("l'instruction du fondateur est conservée mot pour mot", () => {
    assert.equal(
      LEAD_TEST_ONBOARDING_INSTRUCTION,
      "Lorsqu'un nouveau chef de projet s'inscrit, l'équipe lui assigne l'un des deux dossiers modèles (Éducation ou Haute couture) comme dossier de test, et il répond aux douze questions du dossier, chacune accompagnée de la suggestion de l'IA du projet. Ce n'est qu'après avoir donné satisfaction dans sa façon de suivre les instructions de l'IA qu'il peut effectivement débuter son travail de chef de projet.",
    );
  });

  it("Steve et Alex sont assignés à leur propre projet, départ du 08/11/2026", () => {
    assert.deepEqual(leadTestAssignmentFor("OPC-5X78"), {
      dossierId: "education",
      startIso: LEAD_TEST_START_ISO,
      confirmed: false,
    });
    assert.deepEqual(leadTestAssignmentFor("opc-ubnz"), {
      dossierId: "haute-couture",
      startIso: LEAD_TEST_START_ISO,
      confirmed: false,
    });
    assert.equal(leadTestAssignmentFor("OPC-ZZZZ"), null);
    assert.equal(leadTestAssignmentFor(""), null);
    assert.equal(Object.keys(LEAD_TEST_ASSIGNMENTS).length, 2);
  });

  it("le départ est propre à chaque chef : l'horaire suit SON assignation", () => {
    const futureStart = Date.parse("2027-01-15T14:00:00Z");
    assert.equal(leadTestPhase(futureStart - 1, futureStart), "before");
    assert.equal(leadTestUnlockedCount(futureStart - 1, futureStart), 0);
    assert.equal(leadTestUnlockedCount(futureStart, futureStart), 1);
    assert.equal(leadTestUnlockedCount(futureStart + 15 * MIN, futureStart), 2);
    assert.equal(leadTestPropState(1, false, futureStart, futureStart), "open");
    assert.equal(leadTestPropState(2, false, futureStart, futureStart), "locked");
    assert.equal(leadTestPropState(1, false, futureStart + 6 * 60 * MIN, futureStart), "expired");
    // Le début par défaut (première instance) n'a pas bougé.
    assert.equal(leadTestUnlockedCount(LEAD_TEST_START_MS), 1);
    assert.equal(leadTestStartMsFor({ dossierId: "education", startIso: "2027-01-15T14:00:00Z", confirmed: false }), futureStart);
  });

  it("statut du chef : « En test » jusqu'à la confirmation de l'équipe, puis « Confirmé »", () => {
    const education = leadTestForProject("education");
    assert.ok(education);
    const assignment: LeadTestAssignment = {
      dossierId: "education",
      startIso: LEAD_TEST_START_ISO,
      confirmed: false,
    };
    const partial: LeadTestAnswers = {
      "1": { n: 1, choice: "B", reason: "", at: "", sent: true },
    };
    assert.deepEqual(leadTestChiefStatus(assignment, education, partial), {
      state: "en_test",
      answered: 1,
      followed: 1,
      complete: false,
    });
    const full: LeadTestAnswers = {};
    for (const proposition of education.propositions) {
      full[String(proposition.n)] = {
        n: proposition.n,
        choice: proposition.suggestion,
        reason: "",
        at: "",
        sent: true,
      };
    }
    const done = leadTestChiefStatus(assignment, education, full);
    assert.equal(done.complete, true);
    assert.equal(done.state, "en_test"); // 12/12 réponses ≠ satisfaction : l'équipe juge
    assert.equal(done.followed, 12);
    assert.equal(
      leadTestChiefStatus({ ...assignment, confirmed: true }, education, full).state,
      "confirme",
    );
  });

  it("un futur chef ASSIGNÉ peut signaler ses réponses ; un non-assigné est refusé", () => {
    const futureAssignments: Readonly<Record<string, LeadTestAssignment>> = {
      "OPC-T3ST": { dossierId: "education", startIso: "2027-01-15T14:00:00Z", confirmed: false },
    };
    const report = parseLeadTestReport(
      {
        opcId: "OPC-T3ST",
        projectId: "education",
        n: 2,
        choice: "B",
        reason: "",
        at: "2027-01-15T14:20:00.000Z",
        chefName: "Nouveau",
      },
      futureAssignments,
    );
    assert.ok(report);
    assert.equal(report.chefName, "Nouveau");
    assert.equal(report.suggested, "B");
    assert.equal(report.followed, true);

    // Dossier non assigné à ce chef, et chef sans aucune assignation : refusés.
    assert.equal(
      parseLeadTestReport(
        { opcId: "OPC-T3ST", projectId: "haute-couture", n: 1, choice: "B" },
        futureAssignments,
      ),
      null,
    );
    assert.equal(
      parseLeadTestReport(
        { opcId: "OPC-ZZZZ", projectId: "education", n: 1, choice: "B" },
        futureAssignments,
      ),
      null,
    );
    // Le chef du dossier modèle reste reconnu sans assignation synthétique.
    const model = parseLeadTestReport(
      { opcId: "OPC-UBNZ", projectId: "haute-couture", n: 1, choice: "B" },
      futureAssignments,
    );
    assert.equal(model?.chefName, "Alex Kumba");
  });
});
