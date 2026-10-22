import { expect, test, type Page } from "@playwright/test";
import { seedLocalProfile, skipConsent } from "./helpers";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const FOLLOWED = [
  "Bravo ! Tu as choisi B. Donner raison à B, comme la suggestion d’Indiana. C’était un bon choix.",
  "Pourquoi c’est juste : Celui qui dit « j’ai livré » doit le montrer.",
  "Ce que dit le Manuel de justice (M-5.3) : « Le fournisseur prouve la livraison. Le client prouve le défaut qu'il allègue. »",
].join("\n");
const CONTRADICTED = [
  "Tu as choisi A. Rembourser A. Indiana suggérait B. Donner raison à B. Ce n’est pas grave : chaque dossier sert à apprendre.",
  "Voici le raisonnement suggéré : Celui qui dit « j’ai livré » doit le montrer.",
  "Ce que dit le Manuel de justice (M-5.3) : « Le fournisseur prouve la livraison. Le client prouve le défaut qu'il allègue. »",
  "La prochaine fois, demande-toi : qui devait prouver quoi, et l’a-t-il fait ?",
].join("\n");

/** Everything under /arbitrage/* on the Worker is stubbed: no real answer, no real email. */
async function stub(page: Page) {
  const local = `${process.env.E2E_HOST || "127.0.0.1"}:${process.env.E2E_PORT || "4173"}`;
  let past: unknown[] = [];
  await page.route((u) => u.host !== local && u.pathname.includes("/arbitrage/"), async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const path = new URL(req.url()).pathname;
    if (path.endsWith("/me")) return route.fulfill({ headers: cors, json: { status: "verified", arbiterId: "arb_1", reputation: 0, hasEmail: true } });
    if (path.endsWith("/sim-cases/answer")) {
      const followed = (req.postDataJSON() as { choiceId: string }).choiceId === "b";
      const explanation = { followed, manualRef: "M-5.3", manualVersion: "v2.3.2", text: followed ? FOLLOWED : CONTRADICTED };
      past = [{ ...explanation, caseId: "sim_1", createdAt: "2026-10-22T03:00:00.000Z" }];
      return route.fulfill({ headers: cors, json: { ok: true, simulation: true, followedSuggestion: followed, emailCopy: "off", explanation } });
    }
    if (path.endsWith("/sim-cases")) {
      return route.fulfill({ headers: cors, json: { simulation: true, cases: [{
        simulation: true, caseId: "sim_1", title: "SIMULATION — Fichier non livré", scenario: "L'agent A dit que B n'a pas livré.",
        choices: [{ id: "a", letter: "A", label: "Rembourser A" }, { id: "b", letter: "B", label: "Donner raison à B" }], myAnswer: null,
        suggestion: { letter: "B", text: "Je suggère B.", reasoning: "M-5.3 : B montre le reçu signé.", author: "Indiana" },
      }] } });
    }
    if (path.endsWith("/explanations")) return route.fulfill({ headers: cors, json: { explanations: past } });
    if (path.endsWith("/cases")) return route.fulfill({ headers: cors, json: { cases: [] } });
    if (path.endsWith("/checklist")) return route.fulfill({ status: 404, headers: cors, json: {} });
    if (path.endsWith("/wallet")) return route.fulfill({ headers: cors, json: { address: null, needsWallet: false } });
    return route.fulfill({ status: 404, headers: cors, json: {} });
  });
}

test.describe("training explanation after a decision", () => {
  for (const [choice, kind, title, must] of [
    ["b", "followed", "Bien joué ! Pourquoi c’est juste", "Bravo !"],
    ["a", "contradicted", "On apprend ensemble", "Ce n’est pas grave"],
  ] as const) {
    test(`simulation answer that ${kind} Indiana's suggestion shows the explanation with the Manuel excerpt`, async ({ page }) => {
      await skipConsent(page);
      await seedLocalProfile(page);
      await page.addInitScript(() => window.localStorage.setItem("opc.arbiter.token.v1", "tok-e2e"));
      await stub(page);
      await page.goto("arbitrage/");
      const card = page.locator('[data-arb-sim-case="sim_1"]');
      await card.locator(`[data-arb-sim-choice="${choice}"]`).check();
      await card.locator("[data-arb-sim-send]").click();
      const box = card.locator(`[data-arb-explanation="${kind}"]`);
      await expect(box).toBeVisible();
      await expect(box).toContainText(title);
      await expect(box.locator("[data-arb-explanation-text]")).toContainText(must);
      await expect(box.locator("[data-arb-explanation-text]")).toContainText("Manuel de justice (M-5.3)");
      await expect(box.locator("[data-arb-explanation-manual]")).toHaveAttribute("href", "https://essaim-agents.com/manuel-justice");
      await expect(box).not.toContainText(/tribunal|\bcour\b|\bcourt\b|\d\s*(%|\$)/i);
      // kept and listed in "Ce que j'ai appris"
      await expect(page.locator("[data-arb-learned]")).toContainText("Ce que j’ai appris");
    });
  }
});
