import { expect, test } from "@playwright/test";
import { seedLocalProfile, skipConsent } from "./helpers";

// « Monétise-toi : image et voix » (décision Popol, 07/11/2026) — la collecte
// est ÉTEINTE (PERSONA_COLLECTION_ENABLED = false) tant que le texte de
// consentement d'Indiana Lane (IA) n'est pas validé : état sobre
// « En préparation », aucune capture ni dépôt possible.
test.describe("Monétise-toi : image et voix — en préparation", () => {
  test.beforeEach(async ({ page }) => {
    await skipConsent(page);
    await seedLocalProfile(page);
  });

  test("the Earn Now entry shows « En préparation » and is not a link", async ({ page }) => {
    await page.goto("gagner-maintenant/");
    const cta = page.locator("[data-earn-persona-cta]");
    await expect(cta).toBeVisible();
    await expect(cta).toContainText("Monétise ta voix et ton image");
    await expect(cta).toContainText("En préparation");
    const tag = await cta.evaluate((el) => el.tagName);
    expect(tag).toBe("DIV");
  });

  test("the /monetise page collects nothing: no step, no file input, no consent box", async ({ page }) => {
    await page.goto("monetise/");
    const board = page.locator("[data-persona-board]");
    await expect(board).toBeVisible();
    await expect(board).toContainText("En préparation");
    await expect(board).toContainText("rien n’est collecté");
    await expect(page.locator("[data-persona-step]")).toHaveCount(0);
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.locator("[data-persona-consent-check]")).toHaveCount(0);
    await expect(page.locator("[data-persona-deposit-id]")).toHaveCount(0);
  });
});
