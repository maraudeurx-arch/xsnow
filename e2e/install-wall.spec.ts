import { expect, test } from "@playwright/test";

// Mur d'installation obligatoire (Popol, 09/11/2026). The e2e server emulates the
// installed app by default; this spec turns that off with a cookie to see the real
// browser behaviour.
test.describe("OPC — mur d'installation", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    const url = new URL(baseURL || "http://127.0.0.1:4173/");
    await context.addCookies([{ name: "xsnow_e2e_install_wall", value: "on", domain: url.hostname, path: "/" }]);
  });

  test("a new visitor in the browser sees only the install guide (iPhone first), with a video placeholder", async ({ page }) => {
    await page.goto("");
    const wall = page.locator("[data-install-wall]");
    await expect(wall).toBeVisible();
    await expect(wall).toContainText("Installe d’abord OPC");
    await expect(page.locator('[data-install-guide="ios"]')).toContainText("Sur l’écran d’accueil");
    await expect(page.locator('[data-install-guide="android"]')).toContainText("Installer l’application");
    await expect(page.locator("[data-install-video]")).toBeVisible();
    await expect(page.locator("[data-avatar-chat], [data-earn-persona-cta]")).toHaveCount(0);
  });

  test("deep links are walled too, and the guide switches to English and Spanish", async ({ page }) => {
    await page.goto("gagner-maintenant/");
    await expect(page.locator("[data-install-wall]")).toBeVisible();
    await page.locator('[data-install-lang="en"]').click();
    await expect(page.locator("[data-install-wall]")).toContainText("First install OPC");
    await page.locator('[data-install-lang="es"]').click();
    await expect(page.locator("[data-install-wall]")).toContainText("Primero instala OPC");
  });

  test("terms and privacy stay readable before install", async ({ page }) => {
    await page.goto("vie-privee/");
    await expect(page.locator("[data-install-wall]")).toHaveCount(0);
  });

  test("an installed (standalone) app opens directly", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, "standalone", { get: () => true, configurable: true });
    });
    await page.goto("");
    await expect(page.locator("[data-install-wall]")).toHaveCount(0);
  });
});
