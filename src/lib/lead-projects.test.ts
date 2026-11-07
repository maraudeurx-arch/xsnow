import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LEAD_PROJECT_REGISTRY,
  LEAD_PROJECT_STATUSES,
  findLeadProject,
  leadProjectsFor,
  normalizeOpcId,
  projectsFromRegistry,
  type LeadProject,
} from "./lead-projects.ts";

describe("mes projets — registre des rattachements chef → projets", () => {
  it("les deux projets de test sont rattachés (07/11/2026)", () => {
    const steve = leadProjectsFor("OPC-5X78");
    assert.equal(steve.length, 1);
    assert.equal(steve[0]?.title, "Éducation");
    assert.equal(steve[0]?.clientCode, "CLE-PQ0ASQ");
    assert.ok(steve[0]?.spec && steve[0].spec.length > 500, "le cahier des charges d'Éducation est intégré");
    assert.match(steve[0]?.spec ?? "", /Code de classe/);

    const alex = leadProjectsFor("OPC-UBNZ");
    assert.equal(alex.length, 1);
    assert.equal(alex[0]?.title, "Haute couture");
    assert.equal(alex[0]?.spec, null, "cahier des charges encore en préparation");
    assert.match(alex[0]?.summary ?? "", /magasin/);
  });

  it("code inconnu ou vide → aucun projet ; la casse et les espaces sont tolérés", () => {
    assert.deepEqual(leadProjectsFor("OPC-ZZZZ"), []);
    assert.deepEqual(leadProjectsFor(""), []);
    assert.deepEqual(leadProjectsFor(null), []);
    assert.equal(normalizeOpcId(" opc-5x78 "), "OPC-5X78");
    assert.equal(leadProjectsFor("opc-ubnz").length, 1);
  });

  it("findLeadProject retrouve un projet par son identifiant, et seulement chez son chef", () => {
    assert.equal(findLeadProject("OPC-5X78", "education")?.title, "Éducation");
    assert.equal(findLeadProject("OPC-UBNZ", "education"), null);
    assert.equal(findLeadProject("OPC-5X78", "inconnu"), null);
  });

  it("intégrité du registre : ids uniques, statuts valides, étapes non vides", () => {
    const ids = new Set<string>();
    for (const list of Object.values(LEAD_PROJECT_REGISTRY)) {
      for (const p of list) {
        assert.ok(!ids.has(p.id), `id dupliqué: ${p.id}`);
        ids.add(p.id);
        assert.ok((LEAD_PROJECT_STATUSES as readonly string[]).includes(p.status));
        assert.ok(p.steps.length >= 2);
        assert.ok(p.steps.some((s) => s.state === "current") || p.status === "termine");
        assert.match(p.updatedAt, /^\d{4}-\d{2}-\d{2}$/);
        assert.ok(p.summary.length > 20);
        assert.ok(p.aiBrief.length > 20);
      }
    }
  });

  it("extensible : un chef avec 20 projets les reçoit tous, sans limite codée", () => {
    const many: LeadProject[] = Array.from({ length: 20 }, (_, i) => ({
      id: `p${i + 1}`,
      number: i + 1,
      title: `Projet ${i + 1}`,
      clientCode: `CLE-T${String(i + 1).padStart(5, "0")}`,
      status: "nouveau" as const,
      summary: "Résumé de test suffisamment long pour passer les contrôles.",
      spec: null,
      aiBrief: "Fiche de test suffisamment longue pour passer les contrôles.",
      steps: [{ label: "Projet reçu", state: "done" as const }, { label: "Suite", state: "current" as const }],
      updatedAt: "2026-11-07",
    }));
    const registry = { "OPC-TEST": many };
    const got = projectsFromRegistry(registry, "OPC-TEST");
    assert.equal(got.length, 20);
    assert.equal(got[19]?.title, "Projet 20");
  });

  it("vie privée : le registre chef ne contient ni courriel ni montant (le chef ne voit jamais le paiement)", () => {
    const flat = JSON.stringify(LEAD_PROJECT_REGISTRY);
    assert.ok(!flat.includes("@"), "aucune adresse courriel");
    assert.ok(!/\d+[.,]\d{2}\s*\$\s?CAD/.test(flat), "aucun montant en dollars");
    assert.ok(!flat.includes("74,99"), "le prix du projet ne fuit pas dans l'espace chef");
    assert.ok(!flat.includes("12,99"), "le prix de l'abonnement ne fuit pas dans l'espace chef");
  });
});
