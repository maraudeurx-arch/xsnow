import { expect, test } from "@playwright/test";
import { seedLocalProfile, skipConsent, stubIdeaInbox } from "./helpers";

// « Vendre mes idées » (décision Popol, 06/11/2026) — mobile viewport (390×844, see playwright.config.ts).
test.describe("Vendre mes idées dialog on mobile", () => {
  test.beforeEach(async ({ page }) => {
    await skipConsent(page);
    await seedLocalProfile(page);
    await stubIdeaInbox(page);
    await page.goto("gagner-maintenant/");
  });

  test("the case opens the dialog; footer banner never overlaps « Fermer »", async ({ page }) => {
    const cta = page.locator("[data-earn-idea-sale-cta]");
    await expect(cta).toContainText("Vendre mes idées");
    await cta.click();
    const dialog = page.locator("[data-idea-sale-dialog]");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Vendre mes idées" })).toBeVisible();
    await expect(dialog.locator("[data-idea-sale-secret-warning]")).toContainText("mot de passe");
    await expect(page.locator("html")).toHaveClass(/opc-modal-open/);
    await expect(page.locator(".safe-frame > footer")).toBeHidden();
    const close = page.locator("[data-idea-sale-close]");
    await close.scrollIntoViewIfNeeded();
    // The topmost element at the centre of « Fermer » must be the button itself.
    const hit = await close.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!top && el.contains(top);
    });
    expect(hit).toBe(true);
    await close.click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveClass(/opc-modal-open/);
    await expect(page.locator(".safe-frame > footer")).toBeVisible();
  });

  test("an incomplete proposal is refused with the check message", async ({ page }) => {
    await page.locator("[data-earn-idea-sale-cta]").click();
    const form = page.locator("[data-idea-sale-form]");
    await expect(form).toBeVisible();
    await form.locator('button[type="submit"]').click();
    await expect(form.locator('[role="alert"]')).toContainText("Vérifie le titre");
    await expect(page.locator("[data-idea-sale-sent]")).toHaveCount(0);
  });

  test("a complete proposal is sent to the team inbox", async ({ page }) => {
    await page.locator("[data-earn-idea-sale-cta]").click();
    const form = page.locator("[data-idea-sale-form]");
    await expect(form).toBeVisible();
    // Name + e-mail are prefilled from the seeded device profile (Marie Tremblay).
    await expect(form.locator("input").nth(1)).toHaveValue("Marie Tremblay");
    await expect(form.locator("input").nth(2)).toHaveValue("marie@voisin.test");
    await form.locator("input").nth(0).fill("Cours de cuisine du quartier");
    await form.locator("select").selectOption("divertissement");
    await form.locator("textarea").fill(
      "Des ateliers de cuisine locale pour les nouveaux arrivants, animés par des voisins. Petit prix, groupes de huit, recettes à emporter.",
    );
    await form.locator('input[type="checkbox"]').check();
    await form.locator('button[type="submit"]').click();
    await expect(page.locator("[data-idea-sale-sent]")).toContainText("a reçu ton idée");
  });
});
