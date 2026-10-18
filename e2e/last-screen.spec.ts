import { expect, test, type Page } from "@playwright/test";

const KEY = "xsnow.lastScreen";

/** iPhone Home Screen app + returning visitor (avatar chosen, consents answered). */
async function installedApp(page: Page, { avatar = true, standalone = true } = {}) {
  await page.addInitScript(
    ({ avatar, standalone }) => {
      if (standalone) {
        Object.defineProperty(Navigator.prototype, "standalone", { configurable: true, get: () => true });
      }
      if (window.localStorage.getItem("e2e.seeded")) return;
      window.localStorage.setItem("e2e.seeded", "1");
      if (avatar) window.localStorage.setItem("xsnow.avatar", JSON.stringify("homme-blanc"));
      window.localStorage.setItem("xsnow.geoConsent", JSON.stringify("skipped"));
      window.localStorage.setItem("xsnow.analyticsConsent", JSON.stringify("denied"));
    },
    { avatar, standalone },
  );
}

const onAccueil = (page: Page) => expect(page).toHaveURL(/\/(\?.*)?$/);

test.describe("iPhone: reprendre l’écran quitté", () => {
  test("reload keeps the screen, relaunch resumes it, Accueil clears it", async ({ page }) => {
    await installedApp(page);
    await page.goto("./gagner-maintenant/");
    await expect(page.getByRole("heading", { name: "Télétravail" })).toBeVisible();
    await expect
      .poll(() => page.evaluate((key) => window.localStorage.getItem(key), KEY))
      .toContain("/gagner-maintenant");
    const stored = await page.evaluate((key) => window.localStorage.getItem(key) ?? "", KEY);
    expect(Object.keys(JSON.parse(stored)).sort()).toEqual(["at", "path"]);

    await page.reload();
    await expect(page).toHaveURL(/\/gagner-maintenant\/$/);
    await expect(page.getByRole("heading", { name: "Télétravail" })).toBeVisible();

    // Home Screen launch always opens start_url (Accueil): back to Gagner maintenant.
    await page.goto("./");
    await expect(page).toHaveURL(/\/gagner-maintenant\/$/);
    await expect(page.getByRole("heading", { name: "Télétravail" })).toBeVisible();

    await page.goto("./vos-idees/");
    await expect(page.getByLabel("Ton idée")).toBeVisible();
    await page.goto("./");
    await expect(page).toHaveURL(/\/vos-idees\/$/);
    await expect(page.getByLabel("Ton idée")).toBeVisible();

    // Leaving to Accueil means the next launch is Accueil.
    await page.locator("[data-home-back]").first().click();
    await onAccueil(page);
    await expect
      .poll(() => page.evaluate((key) => window.localStorage.getItem(key), KEY))
      .toBeNull();
    await page.goto("./");
    await page.waitForTimeout(500);
    await onAccueil(page);
    await expect(page.getByRole("link", { name: "Gagner maintenant" })).toBeVisible();
  });

  test("expired or invalid memory falls back to Accueil", async ({ page }) => {
    await installedApp(page);
    await page.goto("./");
    for (const raw of [
      JSON.stringify({ path: "/vos-idees", at: Date.now() - 25 * 60 * 60 * 1000 }),
      JSON.stringify({ path: "/proprietaire/idees", at: Date.now() }),
      "{oops",
    ]) {
      await page.evaluate(([key, value]) => window.localStorage.setItem(key, value), [KEY, raw]);
      await page.goto("./");
      await page.waitForTimeout(500);
      await onAccueil(page);
      expect(await page.evaluate((key) => window.localStorage.getItem(key), KEY)).toBeNull();
    }
  });

  test("a new visitor still starts with the avatar choice", async ({ page }) => {
    await installedApp(page, { avatar: false });
    await page.goto("./");
    await page.evaluate(
      (key) => window.localStorage.setItem(key, JSON.stringify({ path: "/mon-profil", at: Date.now() })),
      KEY,
    );
    await page.goto("./");
    await expect(page.getByText("Choisis ton avatar")).toBeVisible();
    await page.waitForTimeout(500);
    await onAccueil(page);
  });

  test("a plain Safari tab opened on Accueil stays on Accueil", async ({ page }) => {
    await installedApp(page, { standalone: false });
    await page.goto("./vos-idees/");
    await expect(page.getByLabel("Ton idée")).toBeVisible();
    await page.goto("./");
    await page.waitForTimeout(500);
    await onAccueil(page);
  });
});
