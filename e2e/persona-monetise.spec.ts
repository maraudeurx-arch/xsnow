import { expect, test } from "@playwright/test";
import { seedLocalProfile, skipConsent } from "./helpers";
import { stubBank, voiceOnlyToBiometry } from "./persona-bank-helpers";

// « Monétise-toi : image et voix » — collecte OUVERTE (Popol, 09/11/2026),
// branchée à la banque des jumeaux. Aucun appel ne part vers le vrai Worker :
// toutes les routes de la banque sont simulées ici puis retirées (unrouteAll).
test.describe("Monétise-toi : image et voix — collecte ouverte", () => {
  test.beforeEach(async ({ page }) => {
    await skipConsent(page);
    await seedLocalProfile(page);
  });
  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  test("the Earn Now entry is a link to /monetise", async ({ page }) => {
    await page.goto("gagner-maintenant/");
    const cta = page.locator("[data-earn-persona-cta]");
    await expect(cta).toBeVisible();
    expect(await cta.evaluate((el) => el.tagName)).toBe("A");
  });

  test("choice + four consent boxes gate the journey; voice-only skips the image step", async ({ page }) => {
    const calls: string[] = [];
    await stubBank(page, "ok", calls);
    await voiceOnlyToBiometry(page);
    await expect(page.locator("[data-persona-step=voice] [data-persona-next]")).toBeDisabled();
    await expect(page.locator('input[data-persona-file="image"]')).toHaveCount(0);
    expect(calls).toEqual([]);
  });

  test("when the bank storage is not open the person is told honestly (no fake success)", async ({ page }) => {
    const calls: string[] = [];
    await stubBank(page, "not-configured", calls);
    await page.goto("jumeau-banque/");
    await expect(page.locator("[data-twin-state=not-configured]")).toBeVisible();
  });
});

test.describe("Jumeau — banque d'images et de voix (mode test)", () => {
  test.beforeEach(async ({ page }) => {
    await skipConsent(page);
  });
  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  test("lists consented items, shows the cost first, records a use only after both boxes", async ({ page }) => {
    const calls: string[] = [];
    await stubBank(page, "ok", calls);
    await page.goto("jumeau-banque/");
    await expect(page.locator("[data-twin-test-badge]")).toContainText("aucun prélèvement réel");
    await expect(page.locator("[data-twin-cost-notice]")).toContainText("3,00 $ CA");
    const item = page.locator('[data-twin-item="persona-abc-1234"]');
    await expect(item).toContainText("Joase");
    const useVoice = item.locator('[data-twin-use="voice"]');
    await expect(useVoice).toBeDisabled();
    await page.locator('[data-twin-accept="cost"]').check();
    await expect(useVoice).toBeDisabled();
    await page.locator('[data-twin-accept="rules"]').check();
    await useVoice.click();
    await expect(item.locator("[data-twin-note]")).toContainText("rien n’est prélevé");
    await expect(page.locator("[data-twin-summary]")).toContainText("3,00 $ CA");
    expect(calls.some((c) => c === "POST /twin-bank/use")).toBe(true);
  });
});
