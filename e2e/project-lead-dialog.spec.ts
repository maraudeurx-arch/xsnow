import { expect, test } from "@playwright/test";
import { seedLocalProfile, skipConsent, stubIdeaInbox } from "./helpers";

// Popol's iPhone video, 04/11/2026 — mobile viewport (390×844, see playwright.config.ts).
test.describe("Chef de projet dialog on mobile", () => {
  test.beforeEach(async ({ page }) => {
    await skipConsent(page);
    await seedLocalProfile(page);
    await stubIdeaInbox(page);
    await page.goto("gagner-maintenant/");
  });

  test("footer banner never overlaps « Fermer »; chrome hidden while open", async ({ page }) => {
    await page.locator("[data-earn-project-lead-cta]").click();
    const dialog = page.locator("[data-project-lead-dialog]");
    await expect(dialog).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/opc-modal-open/);
    await expect(page.locator(".safe-frame > footer")).toBeHidden();
    const close = page.locator("[data-project-lead-close]");
    await close.scrollIntoViewIfNeeded();
    // The topmost element at the centre of « Fermer » must be the button itself.
    const hit = await close.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!top && el.contains(top);
    });
    expect(hit).toBe(true);
    await close.click();
    await expect(page.locator("html")).not.toHaveClass(/opc-modal-open/);
    await expect(page.locator(".safe-frame > footer")).toBeVisible();
  });

  test("overlay follows the visual viewport (iOS keyboard) when the textarea is focused", async ({ page }) => {
    await page.locator("[data-earn-project-lead-cta]").click();
    const overlay = page.locator("[data-project-lead-overlay]");
    await page.locator("[data-project-lead-form] textarea").focus();
    const box = await overlay.boundingBox();
    const vv = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight);
    expect(Math.abs((box?.height ?? 0) - vv)).toBeLessThanOrEqual(1);
    await expect(page.locator(".chrome-panel")).toBeHidden();
  });

  test("reopening after « Fermer » shows the title and intro again", async ({ page }) => {
    for (let i = 0; i < 2; i += 1) {
      await page.locator("[data-earn-project-lead-cta]").click();
      const dialog = page.locator("[data-project-lead-dialog]");
      await expect(dialog.getByRole("heading", { name: "S’enregistrer comme Chef de projet" })).toBeVisible();
      await expect(dialog.locator("[data-project-lead-register] > p").first()).toBeVisible();
      await expect(dialog.locator("h2")).toBeInViewport();
      expect(await dialog.evaluate((el) => el.scrollTop)).toBe(0);
      await page.locator("[data-project-lead-close]").click();
      await expect(dialog).toHaveCount(0);
    }
  });
});
